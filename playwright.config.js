// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Test Configuration
 * Production-grade configuration for civic issue tracking platform
 */

module.exports = defineConfig({

  /* Global setup to authenticate all roles */
  // globalSetup: './global-setup.js',

  /* Directory where tests are located */
  testDir: './tests',

  /* Run tests in parallel for speed */
  fullyParallel: true,

  /* Timeout settings */
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  /* Fail the build on CI if test.only is left in code */
  forbidOnly: !!process.env.CI,

  /* Retry failing tests */
  retries: process.env.CI ? 2 : 1,

  /* Limit workers */
  workers: 1, // Force single worker

  /* Test reporter */
  reporter: process.env.CI
    ? [['github'], ['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html'], ['list']],

  /* Shared settings for all tests */
  use: {

    /* Base URL for the React Vite app */
    baseURL: 'http://localhost:5173',

    /* Run headless in CI, headed locally for debugging */
    headless: !!process.env.CI,

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure in CI */
    video: process.env.CI ? 'retain-on-failure' : 'off',

    /* Browser context options */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Collect trace on failure */
    trace: 'retain-on-failure'
  },

  /* Configure projects for different browsers and roles */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // }
  ],

  /* Test output directory */
  outputDir: 'test-results/',

  /* Test metadata */
  metadata: {
    platform: process.platform,
    nodeVersion: process.version,
    testEnvironment: process.env.NODE_ENV || 'test'
  },

  /* Automatically start both backend and frontend servers before running tests */
  // webServer: {

  //   command: 'node start-test-servers.js',

  //   port: 5173,

  //   timeout: 120 * 1000,

  //   reuseExistingServer: !process.env.CI

  // }
});
