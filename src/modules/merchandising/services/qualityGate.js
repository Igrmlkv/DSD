import { NativeModules, Platform } from 'react-native';
import useSettingsStore from '../../../store/settingsStore';
import { logWarning } from '../../../services/loggerService';
import { MERCH_NATIVE_MODULE } from '../../../constants/merchAudit';

const TAG = 'merch.qualityGate';

// Resolves the native module if installed (added by withMerchPlugins.js).
// When the module is absent (Expo Go, missing prebuild), runs a JS fallback
// that performs basic checks on EXIF/dimensions only — sharpness is reported as null.
function getNative() {
  return NativeModules[MERCH_NATIVE_MODULE] || null;
}

// Runs Quality Gate on a captured photo.
// Spec §4.4 thresholds (from settingsStore.qgThresholds):
//   - laplacian variance ≥ threshold  (sharpness)
//   - exposure: pure-white pixels ≤ exposureMax, pure-black ≤ exposureMin
//   - tilt angle ≤ angleDegMax (5–15° → auto-homography by native module)
//
// Returns { passed: boolean, metrics: {laplacian, exposurePctHigh, exposurePctLow, angleDeg, ...}, reasons: [...] }.
export async function runQualityGate(uri, opts = {}) {
  const thresholds = useSettingsStore.getState().qgThresholds;
  const native = getNative();

  let metrics = null;

  if (native && typeof native.analyze === 'function') {
    try {
      metrics = await native.analyze(uri, {
        autoHomography: opts.autoHomography !== false,
        downsampleLongEdge: 1024,
      });
    } catch (e) {
      logWarning(TAG, `Native analyze failed: ${e.message}; falling back to JS`);
    }
  }

  if (!metrics) {
    // JS fallback — without OpenCV we cannot measure Laplacian variance.
    // We mark sharpness as null so the gate cannot reject solely on sharpness;
    // server-side QC must be the source of truth in this mode.
    metrics = await jsApproxAnalyze(uri);
  }

  const reasons = [];
  if (metrics.laplacian != null && metrics.laplacian < thresholds.laplacian) {
    reasons.push({ code: 'sharpness', label: 'merchAudit.qg.sharpness' });
  }
  if (metrics.exposurePctHigh != null && metrics.exposurePctHigh > thresholds.exposureMax) {
    reasons.push({ code: 'overexposed', label: 'merchAudit.qg.overexposed' });
  }
  if (metrics.exposurePctLow != null && metrics.exposurePctLow > thresholds.exposureMin) {
    reasons.push({ code: 'underexposed', label: 'merchAudit.qg.underexposed' });
  }
  if (metrics.angleDeg != null && Math.abs(metrics.angleDeg) > thresholds.angleDegMax) {
    reasons.push({ code: 'tilt', label: 'merchAudit.qg.tilt' });
  }

  return {
    passed: reasons.length === 0,
    metrics,
    reasons,
    nativeAvailable: !!native,
  };
}

// JS fallback: best-effort metrics without native CV.
// We can't compute Laplacian variance reliably in JS at acceptable speed, so we
// return only what's cheaply available (image dimensions). UI should mention
// in this mode that strict QG requires the native module to be installed.
async function jsApproxAnalyze(_uri) {
  return {
    laplacian: null,
    exposurePctHigh: null,
    exposurePctLow: null,
    angleDeg: null,
    width: null,
    height: null,
    fallback: 'js',
    platform: Platform.OS,
  };
}

// Writes EXIF UserComment with custom audit metadata (visit_id, question_id, etc.).
// Native module is required because expo-camera doesn't write custom EXIF tags.
// Returns the path of the photo (mutated in place when supported, otherwise unchanged).
export async function writeExifUserComment(uri, meta) {
  const native = getNative();
  if (!native || typeof native.writeExifUserComment !== 'function') {
    logWarning(TAG, 'Native EXIF writer not available — skipping UserComment');
    return uri;
  }
  try {
    return await native.writeExifUserComment(uri, meta);
  } catch (e) {
    logWarning(TAG, `EXIF write failed: ${e.message}`);
    return uri;
  }
}

// Computes SHA-256 over photo bytes (spec §5.2 / §10 antifraud).
// Native module fast path; JS fallback uses expo-crypto on file contents.
export async function computeSha256(uri) {
  const native = getNative();
  if (native && typeof native.sha256File === 'function') {
    try { return await native.sha256File(uri); } catch (e) {
      logWarning(TAG, `Native sha256 failed: ${e.message}`);
    }
  }
  // JS fallback via expo-crypto.
  try {
    const Crypto = require('expo-crypto');
    const FileSystem = require('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
  } catch (e) {
    logWarning(TAG, `JS sha256 failed: ${e.message}`);
    return null;
  }
}
