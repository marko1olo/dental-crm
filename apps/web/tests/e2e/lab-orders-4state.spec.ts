import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/9dd3bb34-0878-4b36-a6ee-9044219c6519/scratch/screenshots';

const MOCK_USER = {
	id: 'user-1',
	orgId: 'org-1',
	name: 'Д-р Смирнов А.П.',
	role: 'owner',
	email: 'test@dente.ru',
	pin: null,
};

const MOCK_DASHBOARD = {
	clinic: {
		id: 'org-1',
		name: 'Стоматология Дент-Премиум',
		mode: 'clinic',
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: true,
	},
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [],
	waitlist: [],
	imagingStudies: [],
	recentPatients: [],
	todayStats: { revenue: 3842500, appointments: 812, newPatients: 428 },
	notifications: [],
};

const MOCK_CLINIC_PROFILE = {
	id: 'org-1',
	name: 'Стоматология Дент-Премиум',
	address: 'ул. Медицинская, 12',
	phone: '+7 (495) 123-45-67',
	mode: 'clinic',
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: true,
	},
};

const MOCK_LAB_ORDERS = [
	{
		id: "lab-001",
		organizationId: "org-1",
		patientId: "pat-1",
		patientName: "Барабаш Сергей Владимирович",
		doctorId: "doc-1",
		doctorName: "Д-р Смирнов А.П.",
		orderNumber: "ЗТЛ-2608-A942F1",
		secureToken: "A942F1",
		toothFdi: "21, 22",
		selectedTeeth: [21, 22],
		constructionType: "Диоксид циркония Prettau (Multi-layer)",
		material: "Диоксид циркония Katana / Prettau (Multi-layer)",
		colorVita: "A2",
		status: "in_progress",
		currentStage: "framework_wax_milling",
		sentDate: "2026-08-20",
		dueDate: "2026-09-02",
		frameworkTrialDate: "2026-08-28",
		ceramicTrialDate: "2026-08-30",
		priceRub: 36000,
		clinicSharePct: 50,
		doctorSharePct: 50,
		doctorDeductionRub: 18000,
		clinicalNotes: "Коронки 21, 22 под цвет соседних зубов. Умеренная прозрачность HT.",
	}
];

async function setupPage(page: Page, theme: 'light' | 'dark', viewport: { width: number; height: number }) {
	await page.setViewportSize(viewport);
	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken, t }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
			localStorage.setItem('dente_theme', t);
			localStorage.setItem('dente_theme_mode', t);
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: t }));
			document.documentElement.setAttribute('data-theme', t);
			if (t === 'dark') {
				document.documentElement.classList.add('dark');
			}
		},
		{
			clinicKey: DENTE_CLINIC_TOKEN_KEY,
			staffKey: DENTE_STAFF_TOKEN_KEY,
			clinicToken: MOCK_CLINIC_TOKEN,
			staffToken: MOCK_STAFF_TOKEN,
			t: theme,
		},
	);

	await page.route('**/api/auth/user/me', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
	});
	await page.route('**/api/dashboard', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
	});
	await page.route('**/api/settings/preferences**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme, language: 'ru' }) });
	});
	await page.route('**/api/settings/clinic/profile**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CLINIC_PROFILE) });
	});
	await page.route('**/api/clinical/lab-orders**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LAB_ORDERS) });
	});
	await page.route('**/api/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
}

test.describe('Dental Lab Orders 4-State Visual Proof', () => {
	test('1. DentalLabOrderModal — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('#dental-lab-modal-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '01_dental_lab_order_modal_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('2. DentalLabOrderModal — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		await expect(page.locator('#dental-lab-modal-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '02_dental_lab_order_modal_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('3. DentalLabOrderModal — Mobile Light Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('#dental-lab-modal-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '03_dental_lab_order_modal_mobile_light_390.png'),
			fullPage: false,
		});
	});

	test('4. DentalLabOrderModal — Mobile Dark Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		await expect(page.locator('#dental-lab-modal-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '04_dental_lab_order_modal_mobile_dark_390.png'),
			fullPage: false,
		});
	});

	test('5. DentalLabOrderModal Shade Selector Tab — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		// Click on Tab 2: VITA Shades & Stump
		const shadeTabBtn = page.getByRole('button', { name: /2\.\s*Расцветка VITA/i });
		await expect(shadeTabBtn).toBeVisible({ timeout: 10000 });
		await shadeTabBtn.click();
		await expect(shadeTabBtn).toHaveClass(/is-active/);

		await page.screenshot({
			path: path.join(OUT_DIR, '05_dental_lab_shades_tab_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('6. DentalLabOrderModal Shade Selector Tab — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		// Click on Tab 2: VITA Shades & Stump
		const shadeTabBtn = page.getByRole('button', { name: /2\.\s*Расцветка VITA/i });
		await expect(shadeTabBtn).toBeVisible({ timeout: 10000 });
		await shadeTabBtn.click();
		await expect(shadeTabBtn).toHaveClass(/is-active/);

		await page.screenshot({
			path: path.join(OUT_DIR, '06_dental_lab_shades_tab_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('7. LabWorkOrderModal — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_work_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('.lab-order-modal-container')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '07_lab_work_order_modal_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('8. LabWorkOrderModal — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_work_order', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		await expect(page.locator('.lab-order-modal-container')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '08_lab_work_order_modal_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('9. LabTrackingDrawer — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_tracking', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('#lab-drawer-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '09_lab_tracking_drawer_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('10. LabTrackingDrawer — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#clinical-modals-studio?modal=lab_tracking', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		await expect(page.locator('#lab-drawer-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '10_lab_tracking_drawer_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('11. LabTrackingDrawer — Mobile Light Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#clinical-modals-studio?modal=lab_tracking', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('#lab-drawer-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '11_lab_tracking_drawer_mobile_light_390.png'),
			fullPage: false,
		});
	});

	test('12. LabTrackingDrawer — Mobile Dark Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#clinical-modals-studio?modal=lab_tracking', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('html')).toHaveClass(/dark/);

		await expect(page.locator('#lab-drawer-title')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '12_lab_tracking_drawer_mobile_dark_390.png'),
			fullPage: false,
		});
	});
});
