import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5f886082-5514-4654-acef-90d3a19ccc74';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/telegram_webapp';

// Ensure directories exist
for (const dir of [BRAIN_DIR, PROOFS_DIR]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function saveProofScreenshot(page: Page, fileName: string) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	const brainPath = path.join(BRAIN_DIR, fileName);

	await page.waitForTimeout(300);
	await page.screenshot({ path: proofPath, fullPage: false, animations: 'disabled' });
	try {
		fs.copyFileSync(proofPath, brainPath);
	} catch {
		// Ignore copy errors
	}
}

async function setupTelegramMobilePage(page: Page, theme: 'light' | 'dark') {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ colorScheme: theme });

	await page.addInitScript(({ t }) => {
		// Mock Telegram WebApp SDK
		window.Telegram = {
			WebApp: {
				initData: 'query_id=AAHd&user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80%22%2C%22username%22%3A%22alex_dente%22%7D&auth_date=1710000000&hash=mock',
				initDataUnsafe: {
					user: {
						id: 12345,
						first_name: 'Александр',
						last_name: 'Иванов',
						username: 'alex_dente',
					},
				},
				themeParams: t === 'dark' ? {
					bg_color: '#0f172a',
					text_color: '#f8fafc',
					button_color: '#0d9488',
					button_text_color: '#ffffff',
					secondary_bg_color: '#1e293b',
				} : {
					bg_color: '#f8fafc',
					text_color: '#0f172a',
					button_color: '#0d9488',
					button_text_color: '#ffffff',
					secondary_bg_color: '#ffffff',
				},
				isExpanded: true,
				viewportHeight: 844,
				ready: () => {},
				expand: () => {},
				close: () => {},
				sendData: () => {},
				HapticFeedback: {
					impactOccurred: () => {},
					notificationOccurred: () => {},
					selectionChanged: () => {},
				},
			},
		};

		localStorage.setItem('dente_theme', t);
		localStorage.setItem('dente_theme_mode', t);
		document.documentElement.setAttribute('data-theme', t);
		if (t === 'dark') {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		} else {
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('light');
		}
	}, { t: theme });

	// Mock API slots endpoint
	await page.route('**/api/telegram/webapp/slots**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				schedule: [
					{
						date: new Date().toISOString().split('T')[0],
						dayOfWeek: 'Сегодня',
						doctors: [
							{
								doctorId: 'doc-1',
								doctorName: 'Д-р Смирнов А.В.',
								specialty: 'Стоматолог-терапевт',
								slots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'],
							},
						],
					},
				],
			}),
		});
	});
}

test.describe('Telegram WebApp Mobile Screen Visual Inquisitions (390x844)', () => {
	test('1. Tooth Picker Screen (Mobile Light)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'light');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		// Wait for tooth formula component
		await expect(page.locator('.tg-app-container')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('.tg-quadrant-card')).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_teeth_light_390x844.png');
	});

	test('2. Tooth Picker Screen (Mobile Dark)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'dark');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.tg-app-container')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('.tg-quadrant-card')).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_teeth_dark_390x844.png');
	});

	test('3. Bottom Sheet Complaint Drawer (Mobile Dark)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'dark');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		// Click on tooth 16 to open Bottom Sheet
		const tooth16Btn = page.locator('button.tg-tooth-cell').filter({ hasText: '16' }).first();
		await tooth16Btn.click();

		// Wait for Bottom Sheet drawer
		await expect(page.locator('.tg-bottom-sheet')).toBeVisible({ timeout: 5000 });
		await expect(page.locator('.tg-symptom-card').first()).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_bottomsheet_dark_390x844.png');
	});

	test('4. Online Booking Screen (Mobile Light)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'light');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		// Switch to booking tab
		const bookingNavBtn = page.locator('.tg-nav-btn').filter({ hasText: 'Онлайн-запись' });
		await bookingNavBtn.click();

		await expect(page.locator('.tg-booking-container')).toBeVisible({ timeout: 5000 });
		await expect(page.locator('.tg-specialist-chip').first()).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_booking_light_390x844.png');
	});

	test('5. Online Booking Screen (Mobile Dark)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'dark');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		const bookingNavBtn = page.locator('.tg-nav-btn').filter({ hasText: 'Онлайн-запись' });
		await bookingNavBtn.click();

		await expect(page.locator('.tg-booking-container')).toBeVisible({ timeout: 5000 });
		await expect(page.locator('.tg-specialist-chip').first()).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_booking_dark_390x844.png');
	});

	test('6. Pediatric Dentition Screen (Mobile Dark)', async ({ page }) => {
		await setupTelegramMobilePage(page, 'dark');
		await page.goto('/#/portal/tgapp/demo-clinic-org');
		await page.waitForLoadState('networkidle');

		// Switch to pediatric dentition toggle
		const pediatricChip = page.locator('.tg-toggle-chip').filter({ hasText: 'Молочные зубы' });
		await pediatricChip.click();

		await expect(page.locator('.tg-tooth-cell').filter({ hasText: '55' }).first()).toBeVisible();

		await saveProofScreenshot(page, 'telegram_webapp_pediatric_dark_390x844.png');
	});
});
