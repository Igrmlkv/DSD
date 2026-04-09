/**
 * WebDriverIO + Appium configuration for DSD Mini Android E2E tests.
 *
 * Prerequisites:
 *   - Appium 2 installed:  npm i -g appium
 *   - UiAutomator2 driver: appium driver install uiautomator2
 *   - Android emulator running or device connected
 *   - App built & installed:  npx expo run:android
 */

const path = require('path');

exports.config = {
  runner: 'local',
  port: 4723,
  specs: [path.join(__dirname, '*.test.js')],

  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.anonymous.DSDMini',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': false,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 120,
    },
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: [
    'spec',
    [
      'json',
      {
        outputDir: path.join(__dirname, 'results'),
        outputFileFormat: () => 'test-results.json',
      },
    ],
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
};
