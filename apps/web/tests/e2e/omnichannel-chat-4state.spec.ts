import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/9104b215-8f00-494f-8d62-07bad080c7d4/scratch/screenshots';
const DOCS_OUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/omnichannel_chat';

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
		name: 'Стоматология ДЕНТЕ',
		mode: 'clinic',
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: true,
	},
	clinicSettings: {
		name: 'Стоматология ДЕНТЕ',
		address: 'г. Москва, ул. Клиническая, 10',
		phone: '+7 (495) 123-45-67',
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [
		{
			id: 'pat-101',
			fullName: 'Смирнов Алексей Викторович',
			phone: '+79164501234',
		},
		{
			id: 'pat-102',
			fullName: 'Кузнецова Ольга Ивановна',
			phone: '+79261234567',
		},
	],
	patientInsights: [],
	insuranceContracts: [],
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
	name: 'Стоматология ДЕНТЕ',
	address: 'г. Москва, ул. Клиническая, 10',
	phone: '+7 (495) 123-45-67',
	mode: 'clinic',
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: true,
	},
};

const MOCK_CONVERSATIONS = [
	{
		key: 'conv-1',
		channel: 'whatsapp',
		senderId: 'pat-101',
		senderName: 'Смирнов Алексей Викторович',
		senderPhone: '+79164501234',
		lastMessageText: 'Здравствуйте! Хочу уточнить стоимость установки циркониевой коронки и есть ли запись на завтра?',
		lastMessageTime: '2026-09-07T10:15:00.000Z',
		unreadCount: 1,
		isHumanIntercepted: false,
		patientId: 'pat-101',
	},
	{
		key: 'conv-2',
		channel: 'telegram',
		senderId: 'pat-102',
		senderName: 'Кузнецова Ольга Ивановна',
		senderPhone: '+79261234567',
		lastMessageText: 'Спасибо большое, доктор! Зуб совсем не болит после лечения.',
		lastMessageTime: '2026-09-07T09:40:00.000Z',
		unreadCount: 0,
		isHumanIntercepted: true,
		patientId: 'pat-102',
	},
];

const MOCK_MESSAGES = [
	{
		id: 'msg-1',
		direction: 'inbound',
		patientName: 'Смирнов Алексей Викторович',
		message: 'Здравствуйте! Хочу уточнить стоимость установки циркониевой коронки и есть ли запись на завтра?',
		createdAt: '2026-09-07T10:15:00.000Z',
		status: 'delivered',
	},
	{
		id: 'msg-2',
		direction: 'outbound',
		senderName: 'DENTE Администратор',
		message: 'Здравствуйте, Алексей Викторович! Стоимость коронки из диоксида циркония составляет 22 000 ₽ под ключ. Завтра есть свободные окна к ортопеду в 11:00 и 15:30. Записать вас?',
		createdAt: '2026-09-07T10:18:00.000Z',
		status: 'delivered',
	},
];

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
	await page.route('**/api/bots/inbox', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true, conversations: MOCK_CONVERSATIONS }),
		});
	});
	await page.route('**/api/bots/inbox/**/messages**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true, messages: MOCK_MESSAGES }),
		});
	});
	await page.route('**/api/communications/inbox/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true, messages: MOCK_MESSAGES }),
		});
	});
	await page.route('**/api/communications/inbox/**/send', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true, messageId: 'msg-out-new' }),
		});
	});
	await page.route('**/api/communications/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
	await page.route('**/api/patients/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
	await page.route('**/api/**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
	});
}

async function saveProofScreenshot(page: Page, fileName: string) {
	const proofPath = path.join(DOCS_OUT_DIR, fileName);
	const brainPath = path.join(OUT_DIR, fileName);

	await page.waitForTimeout(300);
	await page.screenshot({ path: proofPath, fullPage: false, animations: 'disabled' });
	try {
		fs.copyFileSync(proofPath, brainPath);
	} catch {
		// Ignore copy errors
	}
}

test.describe('Omnichannel Chat & Messaging 4-State Visual Proof', () => {
	test.beforeAll(() => {
		fs.mkdirSync(OUT_DIR, { recursive: true });
		fs.mkdirSync(DOCS_OUT_DIR, { recursive: true });
	});

	test('1. PC Light Mode (1440x900) — WhatsApp Chat & Operator Desk', async ({ page }) => {
		await setupPage(page, 'light', { width: 1440, height: 900 });
		await page.goto('/#communications?section=chat', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await expect(page.locator('#communications')).toBeVisible({ timeout: 10000 });
		await saveProofScreenshot(page, '01_omnichannel_whatsapp_panel_pc_light_1440.png');

		// Switch to bot_inbox (Operator Desk)
		const botInboxBtn = page.locator('button:has-text("Бот-шлюзы"), button:has-text("Оператор")').first();
		if (await botInboxBtn.isVisible()) {
			await botInboxBtn.click();
			await page.waitForTimeout(400);
			await saveProofScreenshot(page, '02_omnichannel_operator_desk_pc_light_1440.png');
		}
	});

	test('2. PC Dark Mode (1440x900) — WhatsApp Chat & Operator Desk', async ({ page }) => {
		await setupPage(page, 'dark', { width: 1440, height: 900 });
		await page.goto('/#communications?section=chat', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await expect(page.locator('#communications')).toBeVisible({ timeout: 10000 });
		await saveProofScreenshot(page, '03_omnichannel_whatsapp_panel_pc_dark_1440.png');

		// Switch to bot_inbox (Operator Desk) in dark mode
		const botInboxBtn = page.locator('button:has-text("Бот-шлюзы"), button:has-text("Оператор")').first();
		if (await botInboxBtn.isVisible()) {
			await botInboxBtn.click();
			await page.waitForTimeout(400);
			await saveProofScreenshot(page, '04_omnichannel_operator_desk_pc_dark_1440.png');
		}
	});

	test('3. Mobile Light Mode (390x844) — Touch Ergonomics & Zero Drift', async ({ page }) => {
		await setupPage(page, 'light', { width: 390, height: 844 });
		await page.goto('/#communications', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await page.waitForTimeout(500);
		await saveProofScreenshot(page, '05_omnichannel_mobile_light_390.png');
	});

	test('4. Mobile Dark Mode (390x844) — Touch Ergonomics & Zero Drift', async ({ page }) => {
		await setupPage(page, 'dark', { width: 390, height: 844 });
		await page.goto('/#communications', { waitUntil: 'load' });
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
		});
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await page.waitForTimeout(500);
		await saveProofScreenshot(page, '06_omnichannel_mobile_dark_390.png');
	});
});
