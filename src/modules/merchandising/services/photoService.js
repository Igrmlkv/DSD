import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  addAuditPhoto, findAuditPhotoByHash, deleteAuditPhoto, generateId,
} from '../../../database';
import useSettingsStore from '../../../store/settingsStore';
import { logWarning } from '../../../services/loggerService';
import { haversineMeters } from '../../../services/locationService';
import { runQualityGate, writeExifUserComment, computeSha256 } from './qualityGate';

const TAG = 'merch.photoService';

// Returns the directory where a question's originals are stored.
// Spec §4.4: FileSystem.documentDirectory + 'merch/<visit_id>/<question_id>/<idx>.jpg'.
function dirFor(visitId, questionId) {
  return `${FileSystem.documentDirectory}merch/${visitId}/${questionId || 'misc'}`;
}

async function ensureDir(path) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

// Saves a captured photo to permanent storage:
//   1. Move original (no recompression) to merch/<visit>/<question>/orig-<id>.jpg
//   2. Create compressed copy (longest edge ≤ photoMaxLongEdgeUpload, q=0.85)
//   3. Run Quality Gate
//   4. Compute hash_sha256
//   5. Write EXIF UserComment with audit metadata
//   6. Insert into audit_photos
//
// Returns the inserted audit_photos row id, or throws on duplicate hash.
export async function persistCapturedPhoto({
  capturedUri, visitId, questionId, photoType, templateVersion,
  geoCoords, capturedExif,
}) {
  if (!capturedUri || !visitId) throw new Error('persistCapturedPhoto: missing args');

  const dir = dirFor(visitId, questionId);
  await ensureDir(dir);

  const id = generateId();
  const origPath = `${dir}/orig-${id}.jpg`;
  const compPath = `${dir}/comp-${id}.jpg`;
  const capturedAt = new Date().toISOString();

  // Move original. expo-camera saves to a cache dir; copy to documents.
  try {
    await FileSystem.copyAsync({ from: capturedUri, to: origPath });
  } catch (e) {
    throw new Error(`Failed to copy original photo: ${e.message}`);
  }

  // Run compression, Quality Gate, and SHA-256 in parallel — all read the original
  // from disk once it's persisted. Cuts shutter-to-saved latency on slower devices.
  const maxEdge = useSettingsStore.getState().photoMaxLongEdgeUpload;
  const [compressedUri, qgResult, hash] = await Promise.all([
    (async () => {
      try {
        const result = await ImageManipulator.manipulateAsync(
          origPath,
          [{ resize: { width: maxEdge } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
        );
        await FileSystem.copyAsync({ from: result.uri, to: compPath });
        return compPath;
      } catch (e) {
        logWarning(TAG, `Compression failed; using original: ${e.message}`);
        return origPath;
      }
    })(),
    runQualityGate(origPath).catch((e) => {
      logWarning(TAG, `QG run failed: ${e.message}`);
      return { passed: null, metrics: null, reasons: [] };
    }),
    computeSha256(origPath),
  ]);

  // Block duplicates within the project (antifraud — same photo reused across visits).
  if (hash) {
    const existing = await findAuditPhotoByHash(hash);
    if (existing && existing.visit_report_id !== visitId) {
      await safeUnlink(origPath);
      await safeUnlink(compPath);
      const err = new Error('photo_reuse_detected');
      err.code = 'photo_reuse_detected';
      err.detail = { existingVisit: existing.visit_report_id };
      throw err;
    }
  }

  await writeExifUserComment(origPath, {
    visit_id: visitId,
    question_id: questionId || null,
    photo_type: photoType || null,
    template_version: templateVersion || null,
    captured_at: capturedAt,
    geo: geoCoords || null,
  });

  // Antifraud (spec §10): EXIF GPS vs device GPS drift. Non-blocking — recorded as
  // a metric for backoffice analytics, not a submit gate. Suspicious drift is
  // anything beyond ~2× geofence radius (default 200 m).
  const exifDriftM = computeExifGpsDrift(capturedExif, geoCoords);
  if (exifDriftM != null) {
    const radius = useSettingsStore.getState().geofenceRadiusM;
    if (exifDriftM > radius * 2) {
      logWarning(TAG, `EXIF GPS drift ${Math.round(exifDriftM)} m > 2× geofence — flagged for review`);
    }
  }

  const qgMetrics = qgResult.metrics ? { ...qgResult.metrics } : {};
  if (exifDriftM != null) qgMetrics.exif_gps_drift_m = Math.round(exifDriftM);

  const photoId = await addAuditPhoto({
    id,
    visit_report_id: visitId,
    question_id: questionId || null,
    photo_type: photoType || null,
    uri_original: origPath,
    uri_compressed: compressedUri,
    exif_json: { geo: geoCoords || null, captured_at: capturedAt },
    qg_passed: qgResult.passed === true ? 1 : qgResult.passed === false ? 0 : null,
    qg_metrics: Object.keys(qgMetrics).length > 0 ? qgMetrics : null,
    upload_status: 'pending',
    hash_sha256: hash,
  });

  return { id: photoId, qg: qgResult, uri_original: origPath, uri_compressed: compressedUri, hash_sha256: hash };
}

export async function removeAuditPhoto(photoRow) {
  await safeUnlink(photoRow.uri_original);
  if (photoRow.uri_compressed && photoRow.uri_compressed !== photoRow.uri_original) {
    await safeUnlink(photoRow.uri_compressed);
  }
  await deleteAuditPhoto(photoRow.id);
}

async function safeUnlink(path) {
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch (e) {
    logWarning(TAG, `Failed to unlink ${path}: ${e.message}`);
  }
}

// Returns the distance in metres between EXIF-embedded GPS and the device GPS at
// capture time, or null when either side is missing. expo-camera returns EXIF as a
// flat dict; latitude/longitude may be already-signed decimals or absolute values
// paired with N/S/E/W refs — we handle both shapes.
function computeExifGpsDrift(exif, geoCoords) {
  if (!exif || !geoCoords || geoCoords.lat == null || geoCoords.lon == null) return null;
  let lat = exif.GPSLatitude;
  let lon = exif.GPSLongitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (exif.GPSLatitudeRef === 'S') lat = -Math.abs(lat);
  if (exif.GPSLongitudeRef === 'W') lon = -Math.abs(lon);
  return haversineMeters(lat, lon, geoCoords.lat, geoCoords.lon);
}
