// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * https://playwright.dev/docs/test-configuration
 */

export default defineConfig({

  /* Directory where tests are located */
  testDir: './tests',

  /* Run tests in parallel */
  fullyParallel: false,

  /* Allow slower headed runs with slowMo */
  timeout: 120000,

  /* Fail the build on CI if test.only is left in code */
  forbidOnly: !!process.env.CI,

  /* Retry failing tests on CI */
  retries: process.env.CI ? 2 : 0,

  /* Limit workers on CI */
  workers: 1,

  /* Test reporter */
  reporter: 'html',

  /* Shared settings for all tests */
  use: {

    /* Base URL for your React Vite app */
    baseURL: 'http://localhost:5173',

    /* SHOW BROWSER UI */
    headless: false,

    /* Slow down actions so you can see them */
    launchOptions: {
      slowMo: 800
    },

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video for failed tests */
    video: 'retain-on-failure',

    /* Collect trace for debugging */
    trace: 'on-first-retry',

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 15000

  },

  /* Configure browser projects */
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      }
    }
  ],

  /* Automatically start the dev server before running tests */
  webServer: {

    command: 'npm run dev --prefix frontend -- --host 127.0.0.1 --port 5173',

    port: 5173,

    timeout: 120 * 1000,

    reuseExistingServer: !process.env.CI

  }

});
