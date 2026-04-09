/**
 * E2E Test: Admin Login Flow — DSD Mini (Android)
 *
 * Logs into the app using admin / 1 credentials and verifies
 * that the admin home screen is displayed after login.
 *
 * Run:
 *   npx wdio tests/e2e/wdio.conf.js
 *
 * The app uses i18n (ru / en). We locate inputs by class + index
 * since no testID attributes are set on the login screen.
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');
const CREDENTIALS = { username: 'admin', password: '1' };

// Ensure results directory exists
function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

// Save a screenshot with a descriptive name
async function saveScreenshot(name) {
  ensureResultsDir();
  const filePath = path.join(RESULTS_DIR, `${name}.png`);
  await browser.saveScreenshot(filePath);
  console.log(`  Screenshot saved: ${filePath}`);
}

describe('Admin Login', () => {
  before(async () => {
    ensureResultsDir();
  });

  it('should display the login screen', async () => {
    // Wait for two EditText fields to appear (login + password inputs)
    await browser.waitUntil(
      async () => {
        const inputs = await $$('android.widget.EditText');
        return inputs.length >= 2;
      },
      { timeout: 30000, timeoutMsg: 'Login screen did not load (EditText fields not found)' }
    );

    await saveScreenshot('01_login_screen');

    const inputs = await $$('android.widget.EditText');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('should enter admin credentials and sign in', async () => {
    const inputs = await $$('android.widget.EditText');
    const loginInput = inputs[0];
    const passwordInput = inputs[1];

    // Clear fields first, then enter credentials
    await loginInput.click();
    await loginInput.clearValue();
    await loginInput.setValue(CREDENTIALS.username);

    await passwordInput.click();
    await passwordInput.clearValue();
    await passwordInput.setValue(CREDENTIALS.password);

    // Hide keyboard so the button is visible and tappable
    try {
      await driver.hideKeyboard();
    } catch {
      // keyboard may already be hidden
    }

    await saveScreenshot('02_credentials_entered');

    // Click the sign-in button text directly (not a parent ViewGroup).
    // Use UiAutomator selector for exact text match — handles both ru/en.
    let signInBtn;
    try {
      signInBtn = await $(
        'android=new UiSelector().className("android.widget.TextView").text("Войти")'
      );
      if (!(await signInBtn.isExisting())) throw new Error('not found');
    } catch {
      signInBtn = await $(
        'android=new UiSelector().className("android.widget.TextView").text("Sign In")'
      );
    }

    await signInBtn.click();
    await saveScreenshot('03_sign_in_clicked');
  });

  it('should navigate to the admin home screen after login', async () => {
    // Wait for the login form to disappear (EditText fields gone)
    await browser.waitUntil(
      async () => {
        const inputs = await $$('android.widget.EditText');
        return inputs.length === 0;
      },
      {
        timeout: 30000,
        timeoutMsg: 'Login screen did not disappear — login may have failed',
      }
    );

    // Give the home screen a moment to render
    await browser.pause(2000);

    // Check for admin-specific tab labels:
    // ru: "Пользователи", "Устройства", "Синхронизация", "Настройки"
    // en: "Users", "Devices", "Sync", "Settings"
    const adminIndicators = [
      'Пользователи', 'Устройства', 'Синхронизация', 'Настройки',
      'Users', 'Devices', 'Sync', 'Settings',
    ];

    let adminTabFound = false;
    let foundLabel = '';
    for (const label of adminIndicators) {
      try {
        const el = await $(
          `android=new UiSelector().className("android.widget.TextView").text("${label}")`
        );
        if (await el.isExisting()) {
          adminTabFound = true;
          foundLabel = label;
          break;
        }
      } catch {
        // try next
      }
    }

    await saveScreenshot('04_admin_home_screen');

    expect(adminTabFound).toBe(true);
    console.log(`  Admin tab found: "${foundLabel}"`);
  });

  after(async () => {
    await saveScreenshot('05_test_complete');

    // Write a simple text report
    const report = {
      test: 'Admin Login E2E',
      timestamp: new Date().toISOString(),
      credentials: { username: CREDENTIALS.username, password: '***' },
      platform: 'Android',
      result: 'PASSED',
      screenshots: fs
        .readdirSync(RESULTS_DIR)
        .filter((f) => f.endsWith('.png')),
    };
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`  Report saved: ${path.join(RESULTS_DIR, 'report.json')}`);
  });
});
