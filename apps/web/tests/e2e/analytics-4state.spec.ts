import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/2bdb4728-5b5b-4333-a035-2405c7c56bac/scratch/screenshots';
const DOCS_OUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/analytics';

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
	clinicSettings: {
		staff: [MOCK_USER],
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

const MOCK_LOST_PATIENTS = [
	{
		id: 'pat-1',
		organizationId: 'org-1',
		patientName: 'Барабаш Сергей Владимирович',
		phone: '+79161234567',
		daysSinceLastVisit: 195,
		hasFutureAppointment: false,
		createdAt: '2025-01-10T10:00:00.000Z',
		lastTreatmentCategory: 'sanitation',
	},
	{
		id: 'pat-2',
		organizationId: 'org-1',
		patientName: 'Смирнова Елена Александровна',
		phone: '+79269876543',
		daysSinceLastVisit: 385,
		hasFutureAppointment: false,
		createdAt: '2024-08-15T12:00:00.000Z',
		lastTreatmentCategory: 'implantation',
	},
	{
		id: 'pat-3',
		organizationId: 'org-1',
		patientName: 'Васильев Дмитрий Павлович',
		phone: '+79035551234',
		daysSinceLastVisit: 760,
		hasFutureAppointment: false,
		createdAt: '2023-06-20T14:30:00.000Z',
		lastTreatmentCategory: 'general_therapy',
	},
	{
		id: 'pat-4',
		organizationId: 'org-1',
		patientName: 'Ковалёва Анна Игоревна',
		phone: '+79854442211',
		daysSinceLastVisit: 215,
		hasFutureAppointment: false,
		createdAt: '2024-12-05T09:15:00.000Z',
		lastTreatmentCategory: 'sanitation',
	},
];

const MOCK_ANALYTICS_DATA = {
	success: true,
	data: {
		kpis: {
			totalPatients: 428,
			totalRevenue: 3842500,
			totalAppointments: 812,
			avgRevenuePerPatient: 8977.8,
		},
		cohortLtvJson: [
			{ cohort: 'Янв', 'Month 12': 1450000 },
			{ cohort: 'Фев', 'Month 12': 1820000 },
			{ cohort: 'Мар', 'Month 12': 2150000 },
			{ cohort: 'Апр', 'Month 12': 2480000 },
			{ cohort: 'Май', 'Month 12': 2980000 },
			{ cohort: 'Июн', 'Month 12': 3842500 },
		],
		planFunnelJson: [
			{ name: 'Черновик', value: 45, fill: '#0d9488' },
			{ name: 'В работе', value: 38, fill: '#0f766e' },
			{ name: 'Согласован', value: 52, fill: '#14b8a6' },
			{ name: 'Завершён', value: 29, fill: '#10b981' },
			{ name: 'Отклонён', value: 8, fill: '#f59e0b' },
		],
		chairUtilizationJson: [
			{ name: 'Кресло 1 (Терапия)', value: 84, fill: '#0f766e' },
			{ name: 'Кресло 2 (Хирургия)', value: 76, fill: '#14b8a6' },
			{ name: 'Кресло 3 (Ортодонтия)', value: 68, fill: '#06b6d4' },
			{ name: 'Кресло 4 (Детское)', value: 52, fill: '#0284c7' },
		],
		doctorProfitabilityJson: [
			{
				name: 'Д-р Смирнов А.П.',
				revenue: 1420000,
				margin: 497000,
				completionRate: 92,
			},
			{
				name: 'Д-р Барабаш С.В.',
				revenue: 1180500,
				margin: 413175,
				completionRate: 88,
			},
			{
				name: 'Д-р Васильева Е.А.',
				revenue: 890000,
				margin: 311500,
				completionRate: 84,
			},
			{
				name: 'Д-р Ковалёв Д.М.',
				revenue: 352000,
				margin: null,
				completionRate: 75,
			},
		],
		isEmpty: false,
	},
};

async function setupPage(page: Page, theme: 'light' | 'dark', viewport: { width: number; height: number }) {
	await page.setViewportSize(viewport);
	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken, t }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: t }));
			localStorage.setItem('dente_theme', t);
			localStorage.setItem('dente_theme_mode', t);
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

	await page.route('**/api/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
	await page.route('**/api/schedule/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
	await page.route('**/api/patients/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
	await page.route('**/api/settings/preferences**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme, language: 'ru' }) });
	});
	await page.route('**/api/settings/clinic/profile**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CLINIC_PROFILE) });
	});
	await page.route('**/api/reports/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				isEmpty: true,
				rows: [],
				cells: [],
				summary: null,
				period: null,
				busiestWeekday: null,
				busiestHour: null,
			}),
		});
	});
	await page.route('**/api/analytics/lost-patients-filters**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LOST_PATIENTS) });
	});
	await page.route('**/api/analytics/dashboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS_DATA) });
	});
	await page.route('**/api/dashboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
	});
	await page.route('**/api/auth/user/me**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER }) });
	});
}

test.describe('Analytics Dashboard 4-State Visual Proof', () => {
	test.beforeAll(() => {
		fs.mkdirSync(OUT_DIR, { recursive: true });
		fs.mkdirSync(DOCS_OUT_DIR, { recursive: true });
	});

	test('1. PC Light Mode (1440x900) — Overview & Retention Hub', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#analytics', { waitUntil: 'load' });
		await page.waitForTimeout(2000);
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await page.waitForTimeout(500);

		await expect(page.locator('#analytics')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '01_analytics_pc_light_1440.png'),
			fullPage: false,
		});

		const panel = page.locator('[data-testid="lost-patients-panel"]');
		await expect(panel).toBeVisible({ timeout: 10000 });
		await panel.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);

		await panel.screenshot({
			path: path.join(OUT_DIR, '05_retention_hub_tab1_pc_light.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '05_retention_hub_tab1_pc_light.png'),
		});

		// 1-Click Offer Modal in PC Light
		const offerBtn = panel.locator('button:has-text("1-Клик")').first();
		if (await offerBtn.isVisible()) {
			await offerBtn.click();
			const modal = page.locator('#offer-modal-title');
			await expect(modal).toBeVisible({ timeout: 5000 });
			await page.waitForTimeout(300);
			await page.screenshot({
				path: path.join(OUT_DIR, '06_retention_1click_offer_modal_pc_light.png'),
				fullPage: false,
			});
			await page.screenshot({
				path: path.join(DOCS_OUT_DIR, '06_retention_1click_offer_modal_pc_light.png'),
				fullPage: false,
			});
			await page.locator('button[aria-label="Закрыть"]').click();
			await page.waitForTimeout(300);
		}

		// Tab 2: Cohorts Recall 6/12m in PC Light
		await panel.locator('button:has-text("Когорты")').click();
		await page.waitForTimeout(300);
		await panel.screenshot({
			path: path.join(OUT_DIR, '07_retention_hub_tab2_cohorts_pc_light.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '07_retention_hub_tab2_cohorts_pc_light.png'),
		});

		// Tab 3: Chair Utilization Calculator in PC Light
		await panel.locator('button:has-text("Утилизация кресел")').click();
		await page.waitForTimeout(300);
		await panel.screenshot({
			path: path.join(OUT_DIR, '08_retention_hub_tab3_chair_calc_pc_light.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '08_retention_hub_tab3_chair_calc_pc_light.png'),
		});
	});

	test('2. PC Dark Mode (1440x900) — Overview & Retention Hub', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#analytics', { waitUntil: 'load' });
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
			localStorage.setItem('dente_theme_mode', 'dark');
			localStorage.setItem('dente_theme', 'dark');
			(window as any).__useThemeStore?.getState()?.setThemeMode?.('dark');
		});
		await page.waitForTimeout(500);

		await expect(page.locator('#analytics')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '02_analytics_pc_dark_1440.png'),
			fullPage: false,
		});

		const panel = page.locator('[data-testid="lost-patients-panel"]');
		await expect(panel).toBeVisible({ timeout: 10000 });
		await panel.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);

		await panel.screenshot({
			path: path.join(OUT_DIR, '09_retention_hub_tab1_pc_dark.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '09_retention_hub_tab1_pc_dark.png'),
		});

		// 1-Click Offer Modal in PC Dark
		const offerBtn = panel.locator('button:has-text("1-Клик")').first();
		if (await offerBtn.isVisible()) {
			await offerBtn.click();
			const modal = page.locator('#offer-modal-title');
			await expect(modal).toBeVisible({ timeout: 5000 });
			await page.waitForTimeout(300);
			await page.screenshot({
				path: path.join(OUT_DIR, '10_retention_1click_offer_modal_pc_dark.png'),
				fullPage: false,
			});
			await page.screenshot({
				path: path.join(DOCS_OUT_DIR, '10_retention_1click_offer_modal_pc_dark.png'),
				fullPage: false,
			});
			await page.locator('button[aria-label="Закрыть"]').click();
			await page.waitForTimeout(300);
		}

		// Tab 2: Cohorts Recall 6/12m in PC Dark
		await panel.locator('button:has-text("Когорты")').click();
		await page.waitForTimeout(300);
		await panel.screenshot({
			path: path.join(OUT_DIR, '11_retention_hub_tab2_cohorts_pc_dark.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '11_retention_hub_tab2_cohorts_pc_dark.png'),
		});

		// Tab 3: Chair Utilization Calculator in PC Dark
		await panel.locator('button:has-text("Утилизация кресел")').click();
		await page.waitForTimeout(300);
		await panel.screenshot({
			path: path.join(OUT_DIR, '12_retention_hub_tab3_chair_calc_pc_dark.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '12_retention_hub_tab3_chair_calc_pc_dark.png'),
		});
	});

	test('3. Mobile Light Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#analytics', { waitUntil: 'load' });
		await page.waitForTimeout(2000);
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await page.waitForTimeout(500);

		await expect(page.locator('#analytics')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '03_analytics_mobile_light_390.png'),
			fullPage: false,
		});

		const panel = page.locator('[data-testid="lost-patients-panel"]');
		await expect(panel).toBeVisible({ timeout: 10000 });
		await panel.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);

		await panel.screenshot({
			path: path.join(OUT_DIR, '13_retention_hub_mobile_light.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '13_retention_hub_mobile_light.png'),
		});
	});

	test('4. Mobile Dark Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#analytics', { waitUntil: 'load' });
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
			localStorage.setItem('dente_theme_mode', 'dark');
			localStorage.setItem('dente_theme', 'dark');
			(window as any).__useThemeStore?.getState()?.setThemeMode?.('dark');
		});
		await page.waitForTimeout(500);

		await expect(page.locator('#analytics')).toBeVisible({ timeout: 10000 });
		await page.screenshot({
			path: path.join(OUT_DIR, '04_analytics_mobile_dark_390.png'),
			fullPage: false,
		});

		const panel = page.locator('[data-testid="lost-patients-panel"]');
		await expect(panel).toBeVisible({ timeout: 10000 });
		await panel.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);

		await panel.screenshot({
			path: path.join(OUT_DIR, '14_retention_hub_mobile_dark.png'),
		});
		await panel.screenshot({
			path: path.join(DOCS_OUT_DIR, '14_retention_hub_mobile_dark.png'),
		});
	});
});
