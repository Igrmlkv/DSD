const { withAppDelegate, withDangerousMod, withAndroidManifest } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const { YANDEX_MAP_API_KEY } = require('../constants/config');

function withYandexMapsIOS(config) {
  return withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    // Add import
    if (!contents.includes('#import <YandexMapsMobile/YMKMapKitFactory.h>')) {
      config.modResults.contents = contents.replace(
        /#import "AppDelegate.h"/g,
        '#import "AppDelegate.h"\n#import <YandexMapsMobile/YMKMapKitFactory.h>'
      );
    }

    const apiKey = YANDEX_MAP_API_KEY;
    const mapKitInit = [
      `\t[YMKMapKit setApiKey:@"${apiKey}"];`,
      `\t[YMKMapKit setLocale:@"ru_RU"];`,
      `\t[YMKMapKit mapKit];`,
    ].join('\n');

    if (!config.modResults.contents.includes('[YMKMapKit setApiKey')) {
      config.modResults.contents = config.modResults.contents.replace(
        /\s+return YES;/,
        `\n\n${mapKitInit}\n\n\treturn YES;`
      );
    }

    return config;
  });
}

function withYandexMapsAndroid(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Add tools:overrideLibrary for Yandex Maps SDK (requires minSdk 26, project uses 24)
    if (!manifest['uses-sdk']) {
      manifest['uses-sdk'] = [{}];
    }
    manifest['uses-sdk'][0].$= manifest['uses-sdk'][0].$ || {};
    manifest['uses-sdk'][0].$['tools:overrideLibrary'] = 'com.yandex.maps.mobile, ru.vvdev.yamap';

    return config;
  });
}

module.exports = function withYandexMaps(config) {
  config = withYandexMapsIOS(config);
  config = withYandexMapsAndroid(config);
  return config;
};
