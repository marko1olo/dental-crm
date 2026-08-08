import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('React app shell mounts successfully', async ({ page }) => {
    // Navigate to the base URL (automatically uses the one from playwright.config.ts)
    await page.goto('/');

    // Verify the root div where React mounts the application is present and visible
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    // Example: verify some global layout element is loaded
    // await expect(page.getByRole('main')).toBeVisible();
  });
});
