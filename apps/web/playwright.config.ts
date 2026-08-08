import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	// Look for test files in the "tests/e2e" directory, relative to this configuration file.
	testDir: "./tests/e2e",

	// Run all tests in parallel.
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code.
	forbidOnly: !!process.env.CI,

	// Retry on CI only.
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI.
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: "html",

	use: {
		// Base URL to use in actions like `await page.goto('/')`.
		baseURL: "http://127.0.0.1:5173",

		// Collect trace when retrying the failed test.
		trace: "on-first-retry",
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		// Add other browsers here if needed: Firefox, WebKit, etc.
	],

	// Run your local dev server before starting the tests.
	webServer: {
		command: "npm run dev",
		url: "http://127.0.0.1:5173",
		// Do not restart the server if it's already running locally.
		reuseExistingServer: !process.env.CI,
	},
});
