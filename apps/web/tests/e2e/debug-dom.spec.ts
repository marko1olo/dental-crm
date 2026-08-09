import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/e9f8756d-9431-4905-afc7-fb6cb7873828';
const BASE_URL = 'http://127.0.0.1:5173';

const MOCK_USER = {
	id: "user-1",
	orgId: "org-1",
	name: "Admin",
	role: "owner",
	email: "admin@dente.ru",
	pin: null,
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "ДЕНТ-ТЕСТ Клиника",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [],
	waitlist: [],
	imagingStudies: [],
	recentPatients: [],
    patientInsights: [],
	todayStats: { revenue: 0, appointments: 0, newPatients: 0 },
	notifications: [],
};

async function mockApi(page: Page) {
    await page.route("**/api/auth/user/me", async (route) => {
		await route.fulfill({ json: MOCK_USER });
	});
    await page.route("**/api/auth/login", async (route) => {
		await route.fulfill({ json: { token: 'mock-token', user: MOCK_USER } });
	});
	await page.route("**/api/dashboard", async (route) => {
		await route.fulfill({ json: MOCK_DASHBOARD });
	});
	await page.route("**/api/settings/preferences**", async (route) => {
        await route.fulfill({ json: { theme: "dark", sidebarCollapsed: false, language: "ru" } });
	});
    await page.route("**/api/settings/clinic/profile**", async (route) => {
        await route.fulfill({ json: MOCK_DASHBOARD.clinic });
    });
    // catch all other api routes
    await page.route("**/api/**", async (route) => {
        const method = route.request().method();
        if (method === 'GET') await route.fulfill({ json: [] });
        else await route.fulfill({ json: { ok: true } });
    });
}

test.describe('Debug patients page', () => {
  test('Print DOM', async ({ page }) => {
    await mockApi(page);
    await page.goto(BASE_URL, { waitUntil: 'load' });
    
    const loginInput = page.locator('input[type="text"], input[type="email"], input[name="login"], input[name="email"]').first();
    const isLoginVisible = await loginInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (isLoginVisible) {
      await loginInput.fill('admin');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('admin');
      const submitBtn = page.locator('button[type="submit"], button:has-text("Войти"), button:has-text("Login")').first();
      await submitBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }

    const workspace = page.locator('[class*="workspace"], [class*="shell"], nav, aside, #root').first();
    await expect(workspace).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.evaluate(() => { window.location.hash = '#patients'; });
    await page.waitForTimeout(3000);

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHtml.substring(0, 5000));
    console.log('... (truncated) ...');
    console.log(bodyHtml.substring(bodyHtml.length - 5000));
    
    // Check if error boundary is present
    const hasError = bodyHtml.includes('пошло не так');
    console.log('Has Error Boundary:', hasError);
  });
});
