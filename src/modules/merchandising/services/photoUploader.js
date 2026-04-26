// Two-step photo uploader (spec §7.1, decision: presigned URL flow).
//
// Step 1 — POST /upload/audit_photo/init { visit_report_id, audit_photo_id, hash_sha256, mime, size }
//          → { upload_id, presigned_url, fields, expires_at }
//          (idempotent: a previously-completed upload returns { status:'done', remote_url } and short-circuits)
// Step 2 — PUT presigned_url with file body (or POST multipart if `fields` provided, S3-style)
// Step 3 — POST /upload/audit_photo/{upload_id}/complete → { remote_url }
//
// Uses existing apiClient.js for auth headers on init/complete; raw fetch for the
// PUT to S3/MinIO so JWT isn't sent to storage.

import * as FileSystem from 'expo-file-system/legacy';
import { apiRequest } from '../../../services/apiClient';
import {
  listPendingAuditPhotos, updateAuditPhotoUpload,
} from '../../../database';
import useSettingsStore from '../../../store/settingsStore';
import { logInfo, logError } from '../../../services/loggerService';

const TAG = 'merch.photoUploader';

const INIT_ENDPOINT = '/upload/audit_photo/init';
const COMPLETE_ENDPOINT = (id) => `/upload/audit_photo/${encodeURIComponent(id)}/complete`;

let runInProgress = false;

// Pumps the queue: picks pending/failed photos and uploads them.
// Designed to be safe to call from multiple triggers (sync runner, app focus, manual).
export async function processPendingUploads({ batchSize = 5 } = {}) {
  if (runInProgress) return { skipped: 'already_running' };
  if (!useSettingsStore.getState().serverSyncEnabled) return { skipped: 'sync_disabled' };
  if (!useSettingsStore.getState().merchandisingEnabled) return { skipped: 'module_disabled' };

  runInProgress = true;
  try {
    const pending = await listPendingAuditPhotos(batchSize);
    if (pending.length === 0) return { uploaded: 0 };

    const results = await Promise.allSettled(pending.map(async (photo) => {
      try {
        await updateAuditPhotoUpload(photo.id, { upload_status: 'uploading' });
        const remoteUrl = await uploadOne(photo);
        await updateAuditPhotoUpload(photo.id, { upload_status: 'done', remote_url: remoteUrl });
        logInfo(TAG, `Uploaded photo ${photo.id} → ${remoteUrl}`);
        return true;
      } catch (e) {
        logError(TAG, `Upload failed for photo ${photo.id}: ${e.message}`);
        await updateAuditPhotoUpload(photo.id, { upload_status: 'failed' });
        return false;
      }
    }));
    const uploaded = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    return { uploaded };
  } finally {
    runInProgress = false;
  }
}

async function uploadOne(photo) {
  const sourceUri = photo.uri_compressed || photo.uri_original;
  const info = await FileSystem.getInfoAsync(sourceUri);
  if (!info.exists) throw new Error(`File missing on disk: ${sourceUri}`);

  // 1. Init
  const initBody = {
    visit_report_id: photo.visit_report_id,
    audit_photo_id: photo.id,
    hash_sha256: photo.hash_sha256 || null,
    mime: 'image/jpeg',
    size: info.size,
  };
  const init = await apiRequest(INIT_ENDPOINT, { method: 'POST', body: initBody });
  if (init.status === 'done' && init.remote_url) {
    // Server already has this hash — short-circuit (spec idempotency).
    return init.remote_url;
  }
  if (!init.upload_id || !init.presigned_url) {
    throw new Error(`init response invalid: ${JSON.stringify(init)}`);
  }

  // 2. PUT to presigned URL.
  await putToPresigned(init.presigned_url, sourceUri, init.fields, init.headers);

  // 3. Complete.
  const completeBody = { hash_sha256: photo.hash_sha256 || null };
  const complete = await apiRequest(COMPLETE_ENDPOINT(init.upload_id), {
    method: 'POST', body: completeBody,
  });
  if (!complete.remote_url) {
    throw new Error(`complete response missing remote_url: ${JSON.stringify(complete)}`);
  }
  return complete.remote_url;
}

async function putToPresigned(url, fileUri, fields, extraHeaders) {
  // For S3 POST policy with `fields`, we use multipart/form-data.
  // For straight presigned PUT (Yandex Object Storage / MinIO), we PUT raw bytes.
  if (fields && Object.keys(fields).length > 0) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append('file', { uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' });
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`POST presigned failed ${res.status}`);
    return;
  }

  // PUT — read file as binary and upload.
  // expo-file-system uploadAsync handles streaming to avoid loading into JS memory.
  const result = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': 'image/jpeg', ...(extraHeaders || {}) },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`PUT presigned failed ${result.status}: ${result.body?.slice?.(0, 200)}`);
  }
}

// Manual retry for a single photo (UI hook).
export async function retryUpload(photoId) {
  await updateAuditPhotoUpload(photoId, { upload_status: 'pending' });
  return processPendingUploads({ batchSize: 1 });
}
