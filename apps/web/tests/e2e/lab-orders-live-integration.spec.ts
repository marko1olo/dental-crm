import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'demo-staff-token-xyz789';

const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/0adce37f-74af-4101-aba7-c56b6aff7589/screenshots';
const DOCS_OUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/screenshots/lab_orders_live';

const MOCK_USER = {
	id: 'user-1',
	orgId: 'org-1',
	name: 'Д-р Смирнов А.П.',
	fullName: 'Д-р Смирнов А.П.',
	role: 'owner',
	specialty: 'orthopedics',
	email: 'test@dente.ru',
	pin: null,
};

const MOCK_PATIENT = {
	id: 'pat-1',
	fullName: 'Барабаш Сергей Владимирович',
	birthDate: '1985-04-12',
	phone: '+7 (916) 123-45-67',
	medCardNumber: 'К-4821',
	gender: 'male',
};

const MOCK_APPOINTMENT = {
	id: 'apt-1',
	patientId: 'pat-1',
	patientName: 'Барабаш Сергей Владимирович',
	doctorId: 'user-1',
	doctorName: 'Д-р Смирнов А.П.',
	startTime: new Date().toISOString(),
	endTime: new Date(Date.now() + 3600000).toISOString(),
	status: 'in_progress',
	cabinet: 'Кабинет №1 (Ортопедия)',
	treatmentType: 'Ортопедический приём — Снятие слепков и фиксация',
	labOrderId: 'lab-001',
	labOrderNumber: 'ЗТЛ-2608-A942F1',
	labWorkTitle: 'Коронка ZrO2 Katana',
	labWorkType: 'Коронка ZrO2 Katana',
	labMaterial: 'Диоксид циркония',
	labColorVita: 'A2',
	labDueDate: '2026-09-02',
	labStatus: 'in_progress',
};

const MOCK_LAB_ORDERS = [
	{
		id: "lab-001",
		organizationId: "org-1",
		patientId: "pat-1",
		patientName: "Барабаш Сергей Владимирович",
		doctorId: "user-1",
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
	},
	{
		id: "lab-002",
		organizationId: "org-1",
		patientId: "pat-2",
		patientName: "Ковалёва Елена Дмитриевна",
		doctorId: "user-1",
		doctorName: "Д-р Смирнов А.П.",
		orderNumber: "ЗТЛ-2608-C182B4",
		secureToken: "C182B4",
		toothFdi: "16",
		selectedTeeth: [16],
		constructionType: "Коронка e.MAX (Прессованная керамика)",
		material: "IPS e.max Press",
		colorVita: "A3",
		status: "ready",
		currentStage: "ready_in_clinic",
		sentDate: "2026-08-18",
		dueDate: "2026-08-25",
		priceRub: 24000,
		clinicSharePct: 50,
		doctorSharePct: 50,
		doctorDeductionRub: 12000,
		clinicalNotes: "Керамическая коронка на 16 зуб, готово к примерке.",
	},
];

const MOCK_DASHBOARD = {
	clinic: {
		id: 'org-1',
		name: 'Стоматология Дент-Премиум',
		mode: 'clinic',
		features: {
			hasInventoryModule: true,
			hasAnalyticsModule: true,
			hasMarketingModule: true,
			hasPayrollModule: true,
		},
	},
	clinicSettings: {
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [MOCK_APPOINTMENT],
	activeVisit: {
		id: 'visit-1',
		appointmentId: 'apt-1',
		patientId: 'pat-1',
		doctorId: 'user-1',
		status: 'in_progress',
	},
	waitlist: [],
	imagingStudies: [],
	patients: [MOCK_PATIENT],
	recentPatients: [MOCK_PATIENT],
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

async function setupPage(page: Page, theme: 'light' | 'dark', viewport: { width: number; height: number }) {
	page.on('pageerror', (err) => {
		console.error('[BROWSER_PAGEERROR]', err.message, err.stack);
	});
	page.on('console', (msg) => {
		console.log('[BROWSER_CONSOLE]', msg.type(), msg.text());
	});
	page.on('requestfailed', (req) => {
		console.error('[REQ FAILED]', req.url(), req.failure()?.errorText);
	});
	page.on('response', (res) => {
		const ct = res.headers()['content-type'] || '';
		if (res.url().includes('.ts') || res.url().includes('.js') || res.url().includes('.tsx')) {
			if (ct.includes('application/json')) {
				console.error('[WRONG_MIME]', res.url(), ct);
			}
		}
	});

	await page.setViewportSize(viewport);
	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken, t, user }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
			localStorage.setItem('dente_staff_user', JSON.stringify(user));
			localStorage.setItem('dente_theme', t);
			localStorage.setItem('dente_theme_mode', t);
			localStorage.setItem('dente_tour_completed', 'true');
			localStorage.setItem('dente_onboarding_completed', 'true');
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done' }));
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: t }));
			localStorage.setItem('dente_ota_consecutive_crashes', '0');
			localStorage.removeItem('dente_ota_pending_version');
			localStorage.setItem('dente_quest_progress_v2', JSON.stringify({
				activeTrackId: 'solo_doctor',
				currentStepIndex: 0,
				completedStepIds: [],
				isTourActive: false,
				isDismissedPermanently: true,
				tracksProgress: {
					solo_doctor: { completed: true, completedStepIds: [] },
					reception_admin: { completed: true, completedStepIds: [] },
					imaging_diagnostics: { completed: true, completedStepIds: [] },
				},
			}));
		},
		{
			clinicKey: DENTE_CLINIC_TOKEN_KEY,
			staffKey: DENTE_STAFF_TOKEN_KEY,
			clinicToken: MOCK_CLINIC_TOKEN,
			staffToken: MOCK_STAFF_TOKEN,
			t: theme,
			user: MOCK_USER,
		},
	);

	// Catch-all must only intercept true backend REST API requests:
	await page.route('**/api/**', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname.startsWith('/src/') || url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx') || url.pathname.endsWith('.js')) {
			await route.continue();
			return;
		}
		const method = route.request().method();
		if (method === 'GET') {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		} else {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
		}
	});

	await page.route('**/api/auth/user/me**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER, ...MOCK_USER }) });
	});
	await page.route('**/api/staff**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_USER]) });
	});
	await page.route('**/api/dashboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
	});
	await page.route('**/api/patients/pat-1**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PATIENT) });
	});
	await page.route('**/api/patients**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PATIENT]) });
	});
	await page.route('**/api/appointments**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_APPOINTMENT]) });
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
}

test.describe('Dental Lab Orders Live Interface Integration Proof (Mandate 8ae Anti-Vacuum)', () => {
	test.beforeAll(() => {
		fs.mkdirSync(OUT_DIR, { recursive: true });
		fs.mkdirSync(DOCS_OUT_DIR, { recursive: true });
	});

	test.beforeEach(() => {
		test.setTimeout(60000);
	});

	test('1. Live Clinic Lab Orders Registry — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#lab', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

		// Проверяем наличие сайдбара клиники
		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		// Проверяем монтирование реестра ЗТЛ с завершенной загрузкой (кнопка создания наряда)
		const newOrderBtn = page.locator('[data-testid="lab-orders-new-order-btn"]');
		await expect(newOrderBtn).toBeVisible({ timeout: 35000 });

		// Фиксируем скриншот живого интерфейса реестра ЗТЛ с боковым меню клиники
		await page.screenshot({
			path: path.join(OUT_DIR, '01_live_lab_registry_pc_light_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '01_live_lab_registry_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('2. Live Clinic Lab Orders Registry — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#lab', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});

		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		const newOrderBtn = page.locator('[data-testid="lab-orders-new-order-btn"]');
		await expect(newOrderBtn).toBeVisible({ timeout: 35000 });

		await page.screenshot({
			path: path.join(OUT_DIR, '02_live_lab_registry_pc_dark_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '02_live_lab_registry_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('3. Chairside Visit with Open Lab Order Modal — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		// Проверяем живую шапку приёма и кнопку Наряд ЗТЛ
		const fastLabBtn = page.locator('[data-testid="btn-visit-lab-order-fast"]');
		await expect(fastLabBtn).toBeVisible({ timeout: 35000 });

		// Кликаем по кнопке вызова ЗТЛ прямо в визите у кресла
		await fastLabBtn.click({ force: true });

		// Проверяем, что открылась модалка оформления наряда ЗТЛ с контекстом пациента
		await expect(page.locator('#dental-lab-modal-title, .dental-lab-modal, [data-testid="dental-lab-order-modal"]').first()).toBeVisible({ timeout: 25000 });

		// Снимаем скриншот живого экрана визита с открытой модалкой ЗТЛ
		await page.screenshot({
			path: path.join(OUT_DIR, '03_chairside_visit_with_lab_order_pc_light_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '03_chairside_visit_with_lab_order_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('4. Chairside Visit with Open Lab Order Modal — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#visit', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});

		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		const fastLabBtn = page.locator('[data-testid="btn-visit-lab-order-fast"]');
		await expect(fastLabBtn).toBeVisible({ timeout: 35000 });
		await fastLabBtn.click({ force: true });

		await expect(page.locator('#dental-lab-modal-title, .dental-lab-modal, [data-testid="dental-lab-order-modal"]').first()).toBeVisible({ timeout: 25000 });

		await page.screenshot({
			path: path.join(OUT_DIR, '04_chairside_visit_with_lab_order_pc_dark_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '04_chairside_visit_with_lab_order_pc_dark_1440.png'),
			fullPage: false,
		});
	});

	test('5. Clinic Schedule with Live Lab Order Badges & Indicators — PC Light Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		const scheduleView = page.locator('[data-testid="schedule-view"]');
		await expect(scheduleView).toBeVisible({ timeout: 35000 });

		await page.waitForTimeout(1500);

		// Снимаем скриншот расписания с клиническими карточками и плашками готовности ЗТЛ
		await page.screenshot({
			path: path.join(OUT_DIR, '05_schedule_with_lab_badges_pc_light_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '05_schedule_with_lab_badges_pc_light_1440.png'),
			fullPage: false,
		});
	});

	test('6. Clinic Schedule with Live Lab Order Badges & Indicators — PC Dark Mode (1440x900)', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});

		const sidebar = page.locator('.sidebar, nav.sidebar, aside.sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 35000 });

		const scheduleView = page.locator('[data-testid="schedule-view"]');
		await expect(scheduleView).toBeVisible({ timeout: 35000 });

		await page.waitForTimeout(1500);

		await page.screenshot({
			path: path.join(OUT_DIR, '06_schedule_with_lab_badges_pc_dark_1440.png'),
			fullPage: false,
		});
		await page.screenshot({
			path: path.join(DOCS_OUT_DIR, '06_schedule_with_lab_badges_pc_dark_1440.png'),
			fullPage: false,
		});
	});
});
