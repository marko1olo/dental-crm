import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/9a13b70b-0f54-44e9-a24b-d1745fdeeae2/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/staff_chat_intercom_4state";
const webBaseUrl = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function run() {
	console.log("Starting browser via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	const page = await context.newPage();

	console.log("Navigating to home page for demo entrance...");
	await page.goto(`${webBaseUrl}/`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Быстрый вход в Демо-тур
	console.log("Entering demo tour...");
	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);

		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await page.waitForTimeout(3000);
		}
	}

	// Переключаем hash на #communications
	console.log("Navigating to #communications...");
	await page.evaluate(() => {
		window.location.hash = "communications";
	});
	await page.waitForTimeout(2000);

	// Закрываем любые онбординг подсказки
	const dismissTourBtn = page.getByRole("button", { name: /Больше не показывать/i });
	if ((await dismissTourBtn.count()) > 0) {
		await dismissTourBtn.click({ force: true }).catch(() => {});
		await page.waitForTimeout(500);
	}

	const cleanDom = async () => {
		await page.evaluate(() => {
			document
				.querySelectorAll(
					'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="coach-mark-tooltip"], .guided-tour-spotlight-overlay, [class*="CoachMarkTooltip"]',
				)
				.forEach((el) => el.remove());
		});
	};

	await cleanDom();
	await page.waitForTimeout(500);

	// Переключаемся на вкладку "Чат клиники / Интерком"
	console.log("Clicking 'Чат клиники / Интерком' tab...");
	const chatTab = page.getByRole("button", { name: /Чат клиники \/ Интерком/i });
	await chatTab.click({ force: true });
	await page.waitForSelector('[data-testid="staff-messenger-panel"]', { timeout: 10000 });
	console.log("Staff messenger panel is visible!");

	// Выбираем канал #интерком-ассистенты для отображения богатого клинического потока
	const intercomChannelBtn = page.locator(
		'[data-testid="staff-chat-channel-intercom_assistants"]',
	);
	if ((await intercomChannelBtn.count()) > 0) {
		await intercomChannelBtn.click();
		await page.waitForTimeout(1000);
	}

	// 1. PC Light (1440x900)
	console.log("Capturing 1. PC Light (1440x900)...");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await cleanDom();
	await page.waitForTimeout(800);
	await page.screenshot({ path: path.join(OUT_CONV, "pc-light-staff-messenger.png") });
	await page.screenshot({ path: path.join(OUT_DOCS, "pc-light-staff-messenger.png") });

	// 2. PC Light с отправленным 1-клик вызовом и вводом клинической заметки
	console.log("Capturing 2. PC Light Intercom Ping & Chat Note...");
	const callAsstBtn = page.locator('[data-testid="intercom-btn-call-assistant"]');
	if ((await callAsstBtn.count()) > 0) {
		await callAsstBtn.click({ force: true });
		await page.waitForTimeout(1000);

		const chatInput = page.locator('[data-testid="staff-chat-input"]');
		if ((await chatInput.count()) > 0) {
			await chatInput.fill("Срочно: шовный материал Vicryl 4-0 и гемостатик");
			await page.waitForTimeout(400);
		}

		await cleanDom();
		await page.screenshot({
			path: path.join(OUT_CONV, "pc-light-intercom-assistant-modal.png"),
		});
		await page.screenshot({
			path: path.join(OUT_DOCS, "pc-light-intercom-assistant-modal.png"),
		});
	}

	// 3. PC Dark (1440x900)
	console.log("Capturing 3. PC Dark (1440x900)...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await cleanDom();
	await page.waitForTimeout(800);
	await page.screenshot({ path: path.join(OUT_CONV, "pc-dark-staff-messenger.png") });
	await page.screenshot({ path: path.join(OUT_DOCS, "pc-dark-staff-messenger.png") });

	// 4. Mobile Light (390x844) — в активном чате с кнопкой "Назад к каналам" и карточками вызова
	console.log("Capturing 4. Mobile Light (390x844)...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await cleanDom();
	await page.waitForTimeout(800);
	await page.screenshot({
		path: path.join(OUT_CONV, "mobile-light-staff-messenger.png"),
	});
	await page.screenshot({
		path: path.join(OUT_DOCS, "mobile-light-staff-messenger.png"),
	});

	// 5. Mobile Dark (390x844)
	console.log("Capturing 5. Mobile Dark (390x844)...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await cleanDom();
	await page.waitForTimeout(800);
	await page.screenshot({
		path: path.join(OUT_CONV, "mobile-dark-staff-messenger.png"),
	});
	await page.screenshot({
		path: path.join(OUT_DOCS, "mobile-dark-staff-messenger.png"),
	});

	console.log("All 5 state screenshots successfully captured!");
	await browser.close();
}

run().catch((e) => {
	console.error("Screenshot capture failed:", e);
	process.exit(1);
});
