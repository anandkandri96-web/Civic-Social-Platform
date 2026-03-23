/**
 * Global Setup for Playwright Tests
 * Sets up authentication state for all roles
 */

const { chromium } = require('@playwright/test');
const { loginUser } = require('./helpers/auth');

module.exports = async function globalSetup() {
  console.log('Setting up global authentication state...');

  // Launch browser
  const browser = await chromium.launch();

  try {
    // Setup authentication for each role
    const roles = ['citizen', 'volunteer', 'officer', 'worker', 'admin'];

    for (const role of roles) {
      console.log(`Setting up ${role} authentication...`);

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Login and save storage state
        await loginUser(page, role, { useStorageState: false });

        // Save the storage state
        await context.storageState({ path: `storage/${role}.json` });

        console.log(`${role} authentication setup complete`);
      } catch (error) {
        console.error(`Failed to setup ${role} authentication:`, error);
        // Continue with other roles
      } finally {
        await context.close();
      }
    }

    console.log('Global setup complete');
  } finally {
    await browser.close();
  }
};