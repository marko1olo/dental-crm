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

let patients = [];

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

const MOCK_PREFERENCES = {
	theme: "dark",
	sidebarCollapsed: false,
	language: "ru",
};

const MOCK_CLINIC_PROFILE = {
	id: "org-1",
	name: "ДЕНТ-ТЕСТ Клиника",
	address: "ул. Тестовая, 1",
	phone: "+7 (000) 000-00-00",
	mode: "clinic",
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

async function mockApi(page: Page) {
	await page.route("**/api/auth/login", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ token: "test-token-123", user: MOCK_USER }),
		});
	});
	await page.route("**/api/auth/user/me", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_USER),
		});
	});
	await page.route("**/api/dashboard", async (route) => {
        const dashboard = { ...MOCK_DASHBOARD, recentPatients: patients };
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(dashboard),
		});
	});
    await page.route("**/api/patients", async (route) => {
        if (route.request().method() === 'POST') {
            const data = JSON.parse(route.request().postData() || "{}");
            const newPatient = { id: 'patient-' + Date.now(), fullName: data.fullName, phone: data.phone, birthDate: data.birthDate, status: 'active' };
            patients.push(newPatient);
            await route.fulfill({ json: newPatient });
        } else {
            await route.fulfill({ json: patients });
        }
    });
	await page.route("**/api/settings/preferences**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PREFERENCES),
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true }),
			});
		}
	});
	await page.route("**/api/settings/clinic/profile**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_CLINIC_PROFILE),
		});
	});
	await page.route("**/api/system/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				healthy: true,
				ready: true,
				issues: [],
				plans: [],
			}),
		});
	});
	await page.route("**/api/hr/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/communications/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/settings/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/imaging/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/visits/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/audit/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ items: [], total: 0 }),
		});
	});
	// Catch-all for any remaining /api/* endpoints
	await page.route("**/api/**", async (route) => {
		const method = route.request().method();
		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "[]",
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true }),
			});
		}
	});
}

test.describe('E2E Interactive Audit', () => {
  test('Core clinic workflow', async ({ page }) => {
    patients = []; // reset state
    await mockApi(page);
    await page.goto(BASE_URL, { waitUntil: 'load' });
    
    // Login
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

    // Wait for workspace
    const workspace = page.locator('[class*="workspace"], [class*="shell"], nav, aside, #root').first();
    await expect(workspace).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    // 1. Shift Management
    const openShiftBtn = page.getByRole('button', { name: /Открыть смену/i }).or(page.locator('button:has-text("Открыть смену")'));
    const hasShift = await openShiftBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (hasShift) {
        await openShiftBtn.first().click();
        const cashInput = page.locator('input[type="number"], input[name="initialCash"], input[name="cash"]').first();
        await expect(cashInput).toBeVisible({ timeout: 5000 });
        await cashInput.fill('5000');
        const confirmBtn = page.locator('button:has-text("Подтвердить"), button:has-text("Открыть"), button:has-text("Сохранить")').first();
        await confirmBtn.click();
        await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_shift_opened.png') });

    // 2. Patient Creation
    const patientsLink = page.locator('a[href*="#patients"], button:has-text("Пациенты"), nav a:has-text("Пациенты")').first();
    const hasPatientsLink = await patientsLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPatientsLink) {
        await patientsLink.click();
    } else {
        await page.evaluate(() => { window.location.hash = '#patients'; });
    }
    
    // Wait for transition and DOM update
    await page.waitForTimeout(2000);
    
    // Fill the fields
    const fullNameInput = page.locator('#patient-create-full-name').first();
    await expect(fullNameInput).toBeVisible({ timeout: 10000 });
    await fullNameInput.fill('Тестовый Пациент');
    
    const phoneInput = page.locator('#patient-create-phone').first();
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('+79991234567');
    
    const savePatientBtn = page.locator('button:has-text("Создать")').first();
    await savePatientBtn.click();
    
    // Wait for optimistic UI or refetch to display the patient
    const patientCard = page.locator('text="Тестовый Пациент"').first();
    await patientCard.waitFor({ state: 'visible', timeout: 10000 });
    
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_patient_created.png') });
  });
});
