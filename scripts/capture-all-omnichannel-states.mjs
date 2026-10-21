import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/9104b215-8f00-494f-8d62-07bad080c7d4/scratch/screenshots';
const DOCS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/omnichannel_chat';

for (const dir of [BRAIN_DIR, DOCS_DIR]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

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
		message: 'Здравствуйте, Алексей Викторович! Стоимость коронки из диоксида циркония составляет 22 000 ₽ по нашему прейскуранту. Завтра есть свободное окно у ортопеда в 15:00. Записать вас?',
		createdAt: '2026-09-07T10:18:00.000Z',
		status: 'delivered',
	},
];

async function saveProofScreenshot(page, filename) {
	const brainPath = path.join(BRAIN_DIR, filename);
	const docsPath = path.join(DOCS_DIR, filename);
	await page.screenshot({ path: brainPath, fullPage: false });
	fs.copyFileSync(brainPath, docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> docs & brain (${fs.statSync(docsPath).size} bytes)`);
}

async function main() {
	console.log('Starting Playwright Chrome runner...');
	const browser = await chromium.launch({
		executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		headless: true,
		args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.log('BROWSER CONSOLE ERROR:', msg.text());
			}
		});

		await page.addInitScript(
			({ clinicKey, staffKey, clinicToken, staffToken }) => {
				localStorage.setItem(clinicKey, clinicToken);
				localStorage.setItem(staffKey, staffToken);
				localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
				localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: 'light', selectedWorkspaceRole: 'owner' }));
				localStorage.setItem('dente_theme', 'light');
				localStorage.setItem('dente_theme_mode', 'light');
				localStorage.setItem('dente_active_view', 'communications');
			},
			{
				clinicKey: DENTE_CLINIC_TOKEN_KEY,
				staffKey: DENTE_STAFF_TOKEN_KEY,
				clinicToken: MOCK_CLINIC_TOKEN,
				staffToken: MOCK_STAFF_TOKEN,
			},
		);

		await page.route(
			(url) => {
				const pathname = url.pathname;
				return pathname.startsWith('/api/') && !pathname.endsWith('.ts') && !pathname.endsWith('.js') && !pathname.endsWith('.tsx');
			},
			async (route) => {
				const url = route.request().url();
				if (url.includes('/api/auth/user/me')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
				}
				if (url.includes('/api/dashboard')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
				}
				if (url.includes('/api/settings/preferences')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme: 'light', language: 'ru' }) });
				}
				if (url.includes('/api/settings/clinic/profile')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CLINIC_PROFILE) });
				}
				if (url.includes('/api/system/')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }) });
				}
				if (url.includes('/api/bots/inbox/') && url.includes('/messages')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, messages: MOCK_MESSAGES }) });
				}
				if (url.includes('/api/bots/inbox')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, conversations: MOCK_CONVERSATIONS }) });
				}
				if (url.includes('/api/communications/inbox/') && url.includes('/send')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, messageId: 'msg-out-new' }) });
				}
				if (url.includes('/api/communications/inbox/')) {
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, messages: MOCK_MESSAGES }) });
				}
				return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
			},
		);

		console.log('Navigating to http://127.0.0.1:5173/#communications ...');
		await page.goto('http://127.0.0.1:5173/#communications', { waitUntil: 'commit', timeout: 30000 });

		console.log('Waiting for .app-shell to mount...');
		await page.waitForSelector('.app-shell', { timeout: 35000 });

		console.log('Waiting for boot splash to detach...');
		await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});

		console.log('Waiting for actual communications segmented bar (not loading fallback)...');
		await page.waitForSelector('.dente-segmented-bar', { state: 'visible', timeout: 30000 });
		console.log('Communications segmented bar loaded!');

		const waTab = page.locator('button:has-text("WhatsApp Чат")').first();
		const deskBtn = page.locator('[data-testid="communications-tab-bot-inbox"], button:has-text("Пульт ботов")').first();
		const hubBtn = page.locator('[data-testid="communications-omnichannel-hub-btn"], button:has-text("Омниканальный чат")').first();

		// ─── 1. ☀️ PC Light Mode (1440x900) ───
		console.log('\n--- 1. PC Light ---');
		await waTab.waitFor({ state: 'visible', timeout: 15000 });
		await waTab.click();
		await page.waitForSelector('[data-testid="whatsapp-chat-panel"]', { state: 'visible', timeout: 20000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '01_omnichannel_whatsapp_panel_pc_light_1440.png');

		await deskBtn.waitFor({ state: 'visible', timeout: 15000 });
		await deskBtn.click();
		await page.waitForSelector('h3:has-text("Пульт оператора ботов"), button:has-text("Тест-бот")', { state: 'visible', timeout: 15000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '02_omnichannel_operator_desk_pc_light_1440.png');

		await hubBtn.waitFor({ state: 'visible', timeout: 15000 });
		await hubBtn.click();
		await page.waitForSelector('h2:has-text("Омниканальный центр"), .omnichannel-hub-modal', { state: 'visible', timeout: 15000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '02b_omnichannel_hub_modal_pc_light_1440.png');

		const closeBtn = page.locator('.omnichannel-modal-close, button:has-text("Закрыть")').last();
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
			await page.waitForTimeout(400);
		}

		// ─── 2. 🌙 PC Dark Mode (1440x900) ───
		console.log('\n--- 2. PC Dark ---');
		await page.evaluate(() => {
			localStorage.setItem('dente_theme', 'dark');
			localStorage.setItem('dente_theme_mode', 'dark');
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		});
		await page.waitForTimeout(600);

		await waTab.click();
		await page.waitForSelector('[data-testid="whatsapp-chat-panel"]', { state: 'visible', timeout: 20000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '03_omnichannel_whatsapp_panel_pc_dark_1440.png');

		await deskBtn.click();
		await page.waitForSelector('h3:has-text("Пульт оператора ботов"), button:has-text("Тест-бот")', { state: 'visible', timeout: 15000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '04_omnichannel_operator_desk_pc_dark_1440.png');

		await hubBtn.click();
		await page.waitForSelector('h2:has-text("Омниканальный центр"), .omnichannel-hub-modal', { state: 'visible', timeout: 15000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '04b_omnichannel_hub_modal_pc_dark_1440.png');

		if (await closeBtn.isVisible()) {
			await closeBtn.click();
			await page.waitForTimeout(400);
		}

		// ─── 3. 📱 Mobile Light Mode (390x844) ───
		console.log('\n--- 3. Mobile Light (390x844) ---');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			localStorage.setItem('dente_theme', 'light');
			localStorage.setItem('dente_theme_mode', 'light');
			document.documentElement.setAttribute('data-theme', 'light');
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('light');
		});
		await page.waitForTimeout(1000);
		await page.waitForSelector('.mobile-communications-container, .mobile-messenger-root', { state: 'visible', timeout: 15000 }).catch(() => {});
		await saveProofScreenshot(page, '05_omnichannel_mobile_light_390.png');

		// ─── 4. 📱 Mobile Dark Mode (390x844) ───
		console.log('\n--- 4. Mobile Dark (390x844) ---');
		await page.evaluate(() => {
			localStorage.setItem('dente_theme', 'dark');
			localStorage.setItem('dente_theme_mode', 'dark');
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		});
		await page.waitForTimeout(1000);
		await saveProofScreenshot(page, '06_omnichannel_mobile_dark_390.png');

		console.log('\n[ALL STATES COMPLETED SUCCESSFULLY]');
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Execution error:', err);
	process.exit(1);
});
