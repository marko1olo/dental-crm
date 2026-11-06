import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const DOCS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/communications';
if (!fs.existsSync(DOCS_DIR)) {
	fs.mkdirSync(DOCS_DIR, { recursive: true });
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

const MOCK_CONVERSATIONS = [
	{
		key: 'conv-1',
		channel: 'whatsapp',
		senderId: 'pat-101',
		senderName: 'Смирнов Алексей Викторович',
		senderPhone: '+79164501234',
		lastMessageText: 'Здравствуйте! Уточните, пожалуйста, рекомендации после удаления зуба 38.',
		lastMessageTime: '2026-11-06T10:15:00.000Z',
		unreadCount: 1,
		isHumanIntercepted: false,
		patientId: 'pat-101',
	},
];

const MOCK_MESSAGES = [
	{
		id: 'msg-1',
		direction: 'inbound',
		patientName: 'Смирнов Алексей Викторович',
		message: 'Здравствуйте! Уточните, пожалуйста, рекомендации после удаления зуба 38.',
		createdAt: '2026-11-06T10:15:00.000Z',
		status: 'delivered',
	},
	{
		id: 'msg-2',
		direction: 'outbound',
		senderName: 'DENTE Администратор',
		message: 'Здравствуйте, Алексей Викторович! Марлевый тампон удерживайте 20 минут. Не полоскать рот в первые сутки, избегать горячей пищи. Завтра отправим опрос самочувствия.',
		createdAt: '2026-11-06T10:18:00.000Z',
		status: 'delivered',
	},
];

async function saveProofScreenshot(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	await page.screenshot({ path: docsPath, fullPage: false });
	const stat = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> ${stat.size} bytes`);
}

async function main() {
	console.log('Starting Playwright browser for Communications Visual Proof...');
	const browser = await chromium.launch({
		executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		headless: true,
		args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();

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
					return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD.clinicSettings) });
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

		await page.waitForSelector('.app-shell', { timeout: 35000 });
		await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
		await page.waitForSelector('.dente-segmented-bar', { state: 'visible', timeout: 30000 });

		const waTab = page.locator('button:has-text("WhatsApp Чат")').first();

		// ─── 1. ☀️ PC Light Mode (1440x900) ───
		console.log('1. Capturing 01_patient_chat_pc_light_1440x900.png ...');
		await waTab.waitFor({ state: 'visible', timeout: 15000 });
		await waTab.click();
		await page.waitForSelector('[data-testid="whatsapp-chat-panel"]', { state: 'visible', timeout: 20000 });
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '01_patient_chat_pc_light_1440x900.png');

		// ─── 2. 🌙 PC Dark Mode (1440x900) ───
		console.log('2. Capturing 02_patient_chat_pc_dark_1440x900.png ...');
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
		await saveProofScreenshot(page, '02_patient_chat_pc_dark_1440x900.png');

		// ─── 3. 📱 Mobile Light Mode (390x844) ───
		console.log('3. Capturing mobile light screenshots ...');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			localStorage.setItem('dente_theme', 'light');
			localStorage.setItem('dente_theme_mode', 'light');
			document.documentElement.setAttribute('data-theme', 'light');
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('light');
		});
		await page.waitForTimeout(600);
		await page.waitForSelector('.mobile-communications-container, .mobile-messenger-root', { state: 'visible', timeout: 15000 }).catch(() => {});
		await saveProofScreenshot(page, '03_mobile_messenger_list_mobile_light_390x844.png');

		// Open active chat dialog
		const patientCard = page.locator('text=Смирнов Алексей Викторович').first();
		if (await patientCard.isVisible()) {
			await patientCard.click();
			await page.waitForSelector('[data-testid="mobile-chat-fullscreen"], .mobile-chat-fullscreen', { state: 'visible', timeout: 10000 }).catch(() => {});
			await page.waitForTimeout(600);
			await saveProofScreenshot(page, '03_mobile_messenger_mobile_light_390x844.png');
		}

		// ─── 4. 📱 Mobile Dark Mode (390x844) ───
		console.log('4. Capturing mobile dark screenshots ...');
		await page.evaluate(() => {
			localStorage.setItem('dente_theme', 'dark');
			localStorage.setItem('dente_theme_mode', 'dark');
			document.documentElement.setAttribute('data-theme', 'dark');
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		});
		await page.waitForTimeout(600);
		await saveProofScreenshot(page, '04_mobile_messenger_mobile_dark_390x844.png');

		console.log('All 4 proof screenshots captured successfully!');
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Capture error:', err);
	process.exit(1);
});
