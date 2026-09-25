import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/6b8a2fa9-34c5-4ecc-b9e3-54fc0ea094de';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/treatment_plans';

const MOCK_USER = {
	id: 'user-1',
	orgId: 'org-1',
	name: 'Д-р Смирнов А.П.',
	role: 'owner',
	email: 'test@dente.ru',
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: 'pat-1',
	organizationId: 'org-1',
	fullName: 'Иванов Иван Иванович',
	phone: '+7 (999) 111-22-33',
	balanceRub: 15000,
	birthDate: '1985-05-15',
	status: 'active',
	createdAt: '2025-01-10T10:00:00.000Z',
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
		profile: {
			organizationId: 'org-1',
			clinicName: 'Стоматология Дент-Премиум',
			mode: 'clinic',
		},
		chairs: [{ id: 'c1', name: 'Кресло 1 (Терапия)', active: true }],
		doctors: [MOCK_USER],
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	appointments: [
		{
			id: 'app-1',
			patientId: 'pat-1',
			doctorUserId: 'user-1',
			chairId: 'c1',
			status: 'in_treatment',
			startsAt: new Date().toISOString(),
			endsAt: new Date(Date.now() + 3600000).toISOString(),
			serviceTitle: 'Комплексный план лечения',
		},
	],
	serviceCatalog: [
		{ id: 's1', code: 'A16.07.051', name: 'Профессиональная гигиена полости рта', priceRub: 5500, category: 'hygiene' },
		{ id: 's2', code: 'A16.07.002', name: 'Лечение глубокого кариеса с реставрацией', priceRub: 6800, category: 'therapy' },
		{ id: 's3', code: 'A16.07.006', name: 'Установка имплантата Straumann BLX', priceRub: 45000, category: 'surgery' },
		{ id: 's4', code: 'A16.07.004', name: 'Коронка из диоксида циркония Prettau', priceRub: 28000, category: 'orthopedics' },
	],
	inventoryItems: [
		{ id: 'inv-1', name: 'Анестетик Ультракаин Д-С форте', quantity: 45, unit: 'карпула' },
		{ id: 'inv-2', name: 'Имплантат Straumann BLX 4.0x10mm', quantity: 2, unit: 'шт' },
	],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 145000, appointments: 12, newPatients: 4 },
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

async function setupPage(page: Page, theme: 'light' | 'dark', viewport: { width: number; height: number }) {
	await page.setViewportSize(viewport);
	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken, t }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
			localStorage.setItem('dente_workspace_perspective', 'presentation');
			localStorage.setItem('dente_theme', t);
			localStorage.setItem('dente_theme_mode', t);
			localStorage.setItem('dente_active_session_token', 'mock-session-token');
			localStorage.setItem('dente_user_role', 'doctor');
			localStorage.setItem('dente_user_name', 'Д-р Смирнов А.П.');
			localStorage.setItem('dente_onboarding_completed', 'true');
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done' }));
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: t }));
			localStorage.setItem('dente_offline_readiness_banner_dismissed_v1', 'true');
			document.documentElement.setAttribute('data-theme', t);
			if (t === 'dark') {
				document.documentElement.classList.add('dark');
				document.documentElement.classList.remove('light');
			} else {
				document.documentElement.classList.remove('dark');
				document.documentElement.classList.add('light');
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

	await page.route('**/api/settings/clinic/profile**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CLINIC_PROFILE) });
	});

	await page.route('**/api/settings/preferences**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme, language: 'ru' }) });
	});

	await page.route('**/api/dashboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
	});

	await page.route('**/api/auth/user/me**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER }) });
	});
}

async function saveProofScreenshot(page: Page, fileName: string) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	const brainPath = path.join(BRAIN_DIR, fileName);

	await page.waitForTimeout(400);
	await page.screenshot({ path: proofPath, fullPage: false, animations: 'disabled' });

	try {
		fs.copyFileSync(proofPath, brainPath);
	} catch (e) {
		console.warn(`Could not copy to brain dir: ${e}`);
	}
}

async function openPresenterModal(page: Page) {
	const optionsBtn = page.locator('[data-testid="treatment-plan-options-menu-btn"]');
	await expect(optionsBtn).toBeVisible({ timeout: 15000 });
	await optionsBtn.click();
	await page.waitForTimeout(300);

	const presenterMenuItem = page.locator('[data-testid="options-menu-presenter-btn"]');
	if (await presenterMenuItem.isVisible()) {
		await presenterMenuItem.click();
	} else {
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="options-menu-presenter-btn"], [data-testid="module-copilot-ai-audit-btn"]') as HTMLButtonElement | null;
			if (btn) btn.click();
		});
	}

	await expect(page.locator('[data-testid="treatment-plan-presenter-modal"]')).toBeVisible({ timeout: 10000 });
}

test.describe('Treatment Plans & Patient Presentation 4-State Visual Proof', () => {
	test.beforeAll(() => {
		fs.mkdirSync(PROOFS_DIR, { recursive: true });
		fs.mkdirSync(BRAIN_DIR, { recursive: true });
	});

	// =========================================================================
	// DOMAIN 1: 3-TIER COMPARISON (Economy, Optimum, Premium)
	// =========================================================================
	test('1. TreatmentPlan3Tier — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('[data-testid="treatment-3tier-comparison"]')).toBeVisible({ timeout: 15000 });
		await expect(page.locator('.treatment-3tier-comparison')).toBeVisible();

		const cards = page.locator('[data-testid="tier-card-optimum"], [data-testid="treatment-tier-card-optimum"]');
		await expect(cards.first()).toBeVisible();

		await saveProofScreenshot(page, '01_treatment_plan_3tier_pc_light.png');
	});

	test('2. TreatmentPlan3Tier — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('[data-testid="treatment-3tier-comparison"]')).toBeVisible({ timeout: 15000 });
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await saveProofScreenshot(page, '02_treatment_plan_3tier_pc_dark.png');
	});

	test('3. TreatmentPlan3Tier — Mobile Light Mode (390x844) with Segmented Control', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('[data-testid="treatment-3tier-comparison"]')).toBeVisible({ timeout: 15000 });

		// Verify Apple HIG Segmented Control is visible on mobile
		const segmentedControl = page.locator('[data-testid="treatment-3tier-segmented-control"]');
		await expect(segmentedControl).toBeVisible();

		await saveProofScreenshot(page, '03_treatment_plan_3tier_mobile_light.png');
	});

	test('4. TreatmentPlan3Tier — Mobile Dark Mode (390x844) with Segmented Control', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('[data-testid="treatment-3tier-comparison"]')).toBeVisible({ timeout: 15000 });

		const segmentedControl = page.locator('[data-testid="treatment-3tier-segmented-control"]');
		await expect(segmentedControl).toBeVisible();

		await saveProofScreenshot(page, '04_treatment_plan_3tier_mobile_dark.png');
	});

	// =========================================================================
	// DOMAIN 2: 4-PHASE CLINICAL PROTOCOLS VIEW (804n Order)
	// =========================================================================
	test('5. TreatmentPlanPhased4Stage — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		// Switch to 4-phase tab
		const tabBtn = page.locator('[data-testid="tp-tab-phased4"]');
		await expect(tabBtn).toBeVisible({ timeout: 15000 });
		await tabBtn.click();

		await expect(page.locator('[data-testid="treatment-plan-phased-4stage-view"]')).toBeVisible({ timeout: 10000 });

		// Verify 1-click stage-to-visit booking button is present
		const bookBtn = page.locator('[data-testid^="phased-book-stage-"]').first();
		await expect(bookBtn).toBeVisible();

		await saveProofScreenshot(page, '05_treatment_plan_phased4_pc_light.png');
	});

	test('6. TreatmentPlanPhased4Stage — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		const tabBtn = page.locator('[data-testid="tp-tab-phased4"]');
		await expect(tabBtn).toBeVisible({ timeout: 15000 });
		await tabBtn.click();

		await expect(page.locator('[data-testid="treatment-plan-phased-4stage-view"]')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await saveProofScreenshot(page, '06_treatment_plan_phased4_pc_dark.png');
	});

	test('7. TreatmentPlanPhased4Stage — Mobile Light Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		const tabBtn = page.locator('[data-testid="tp-tab-phased4"]');
		await expect(tabBtn).toBeVisible({ timeout: 15000 });
		await tabBtn.click();

		await expect(page.locator('[data-testid="treatment-plan-phased-4stage-view"]')).toBeVisible({ timeout: 10000 });

		await saveProofScreenshot(page, '07_treatment_plan_phased4_mobile_light.png');
	});

	test('8. TreatmentPlanPhased4Stage — Mobile Dark Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		const tabBtn = page.locator('[data-testid="tp-tab-phased4"]');
		await expect(tabBtn).toBeVisible({ timeout: 15000 });
		await tabBtn.click();

		await expect(page.locator('[data-testid="treatment-plan-phased-4stage-view"]')).toBeVisible({ timeout: 10000 });

		await saveProofScreenshot(page, '08_treatment_plan_phased4_mobile_dark.png');
	});

	// =========================================================================
	// DOMAIN 3: CHAIRSIDE PRESENTER MODAL & ROADMAP
	// =========================================================================
	test('9. TreatmentPlanPresenterModal — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		await saveProofScreenshot(page, '09_treatment_plan_presenter_modal_pc_light.png');
	});

	test('10. TreatmentPlanPresenterModal — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		await saveProofScreenshot(page, '10_treatment_plan_presenter_modal_pc_dark.png');
	});

	test('11. TreatmentPlanPresenterModal — Mobile Light Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		await saveProofScreenshot(page, '11_treatment_plan_presenter_modal_mobile_light.png');
	});

	test('12. TreatmentPlanPresenterModal — Mobile Dark Mode (390x844)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		await saveProofScreenshot(page, '12_treatment_plan_presenter_modal_mobile_dark.png');
	});

	// =========================================================================
	// DOMAIN 4: TREATMENT PLAN ROADMAP (5-Stage Patient Roadmap)
	// =========================================================================
	test('13. TreatmentPlanRoadmap — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		const roadmapTab = page.locator('[data-testid="tab-roadmap-btn"]').first();
		await expect(roadmapTab).toBeVisible({ timeout: 8000 });
		await roadmapTab.click();

		await expect(page.locator('[data-testid="treatment-plan-roadmap-view"]')).toBeVisible({ timeout: 8000 });

		await saveProofScreenshot(page, '13_treatment_plan_roadmap_pc_light.png');
	});

	test('14. TreatmentPlanRoadmap — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		const roadmapTab = page.locator('[data-testid="tab-roadmap-btn"]').first();
		await expect(roadmapTab).toBeVisible({ timeout: 8000 });
		await roadmapTab.click();

		await expect(page.locator('[data-testid="treatment-plan-roadmap-view"]')).toBeVisible({ timeout: 8000 });

		await saveProofScreenshot(page, '14_treatment_plan_roadmap_pc_dark.png');
	});

	// =========================================================================
	// DOMAIN 5: PRINTABLE CONTRACT & COMPLETED ACT (High Typography 804n)
	// =========================================================================
	test('15. TreatmentPlanContractPrint — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		const printTab = page.locator('[data-testid="tab-print-btn"]').first();
		await expect(printTab).toBeVisible({ timeout: 8000 });
		await printTab.click();

		await expect(page.locator('[data-testid="appendix-print-document"]').first()).toBeVisible({ timeout: 8000 });

		await saveProofScreenshot(page, '15_treatment_plan_contract_print_pc_light.png');
	});

	test('16. TreatmentPlanContractPrint — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');

		await openPresenterModal(page);

		const printTab = page.locator('[data-testid="tab-print-btn"]').first();
		await expect(printTab).toBeVisible({ timeout: 8000 });
		await printTab.click();

		await expect(page.locator('[data-testid="appendix-print-document"]').first()).toBeVisible({ timeout: 8000 });

		await saveProofScreenshot(page, '16_treatment_plan_contract_print_pc_dark.png');
	});
});
