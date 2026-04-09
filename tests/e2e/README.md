# DSD Mini — E2E Tests (Android)

## Prerequisites

1. **Appium 2** installed globally:
   ```bash
   npm install -g appium
   appium driver install uiautomator2
   ```

2. **Android emulator** running (e.g. `Pixel_9`) or physical device connected.

3. **App built and installed** on the device:
   ```bash
   npx expo run:android
   ```

## Setup

```bash
cd tests/e2e
npm install
```

## Run

Start Appium server in a separate terminal:
```bash
appium
```

Run the tests:
```bash
npm test
```

Or start Appium and run in one command:
```bash
npm run test:all
```

## Results

After a test run, the `results/` folder will contain:
- `01_login_screen.png` — login screen loaded
- `02_credentials_entered.png` — credentials filled in
- `03_sign_in_clicked.png` — after tapping Sign In
- `04_admin_home_screen.png` — admin dashboard visible
- `05_test_complete.png` — final state
- `report.json` — test summary
- `test-results.json` — detailed WDIO test results
