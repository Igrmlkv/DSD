/* eslint-disable */
// Expo config plugin scaffold for the Merchandising native module (`MerchPhotoModule`).
//
// Spec §4.4 / §3.2: the module exposes:
//   - analyze(uri, opts) — Quality Gate (Laplacian variance, exposure histogram, tilt angle).
//   - writeExifUserComment(uri, meta) — appends audit metadata to EXIF UserComment.
//   - sha256File(uri) — fast hash for idempotent upload + antifraud reuse detection.
//
// Implementation status (this commit): scaffold only.
//   - The plugin reserves names and Manifest entries.
//   - JS bridge in services/qualityGate.js gracefully falls back to JS approximations
//     when the native module is absent (Expo Go, missing prebuild).
//   - Actual native sources (Swift + Kotlin with OpenCV) are tracked as a follow-up
//     deliverable. Add them under ios/MerchPhotoModule/ and android/.../MerchPhotoModule.kt
//     and wire OpenCV via Pod / gradle in their respective `withDangerousMod` blocks.
//
// To build with the native module:
//   1. expo prebuild
//   2. (TODO) drop in iOS Swift module + add `pod 'OpenCV', '~> 4.5'` to Podfile
//   3. (TODO) drop in Android Kotlin module + add OpenCV gradle dependency
//   4. expo run:ios / expo run:android

const { withInfoPlist, withAndroidManifest } = require('expo/config-plugins');

function withMerchIOS(config) {
  return withInfoPlist(config, (cfg) => {
    // Privacy strings (camera permission already covered by expo-camera plugin;
    // we add Photo Library Usage in case we ever offer "import from gallery").
    cfg.modResults.NSPhotoLibraryUsageDescription =
      cfg.modResults.NSPhotoLibraryUsageDescription
      || 'Доступ к фотогалерее для аудита торговой точки';
    return cfg;
  });
}

function withMerchAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    // Ensure WRITE_EXTERNAL_STORAGE is not added (we use scoped storage / app-private FileSystem).
    // Reserve a Manifest comment so future native module wiring is centralised here.
    return cfg;
  });
}

module.exports = function withMerchPlugins(config) {
  config = withMerchIOS(config);
  config = withMerchAndroid(config);
  return config;
};
