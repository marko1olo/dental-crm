import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "c66126e5-869c-485a-96a1-07a033dd83d3";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/dentalpro_schedule_realtime";
const webBaseUrl = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function injectCleanStyles(page) {
	await page.addStyleTag({
		content: `
			.tour-spotlight-root,
			[data-testid="guided-tour-spotlight-overlay"],
			.tour-backdrop-clickable-zone,
			[data-testid="coach-mark-tooltip"],
			.guided-tour-spotlight-overlay,
			[class*="CoachMarkTooltip"],
			[class*="onboarding-tour"],
			.onboarding-compact-strip,
			.sa-toast,
			[data-testid="global-toast"] {
				display: none !important;
				pointer-events: none !important;
			}
		`,
	});

	// Кликаем кнопку пропуска тура если она видна
	const dismissTour = page.getByRole("button", { name: /Больше не показывать|Пропустить/i });
	if ((await dismissTour.count()) > 0) {
		await dismissTour.first().click({ force: true }).catch(() => {});
	}

	const hideCompact = page.getByRole("button", { name: /Скрыть/i });
	if ((await hideCompact.count()) > 0) {
		await hideCompact.first().click({ force: true }).catch(() => {});
	}
}

async function run() {
	console.log("Launching Chromium via Playwright...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	// ==========================================
	// 1. PC CONTEXT (1440x900)
	// ==========================================
	console.log("PC: Setting up 1440x900 viewport...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const pcPage = await pcContext.newPage();

	await pcPage.goto(`${webBaseUrl}/`, { waitUntil: "domcontentloaded" });
	await pcPage.waitForTimeout(1500);

	// Быстрый вход в Демо-тур
	const quickDemoBtn = pcPage.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		await quickDemoBtn.click();
		await pcPage.waitForTimeout(800);
		const enterRoleBtn = pcPage.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await pcPage.waitForTimeout(2000);
		}
	}

	await pcPage.evaluate(() => {
		window.location.hash = "schedule";
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_onboarding_dismissed", "true");
	});
	await pcPage.waitForTimeout(1500);
	await injectCleanStyles(pcPage);
	await pcPage.waitForTimeout(500);

	// --- PC LIGHT ---
	console.log("Capturing PC LIGHT...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await pcPage.waitForTimeout(600);
	await injectCleanStyles(pcPage);

	const pcLightDocPath = path.join(OUT_DOCS, "proof_01_schedule_pc_light.png");
	const pcLightConvPath = path.join(OUT_CONV, "proof_01_schedule_pc_light.png");
	await pcPage.screenshot({ path: pcLightDocPath, fullPage: false });
	await pcPage.screenshot({ path: pcLightConvPath, fullPage: false });
	console.log(`Saved: ${pcLightDocPath}`);

	// --- PC DARK ---
	console.log("Capturing PC DARK (Mandate 8c: Zero Blinding White Spots)...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await pcPage.waitForTimeout(600);
	await injectCleanStyles(pcPage);

	const pcDarkDocPath = path.join(OUT_DOCS, "proof_02_schedule_pc_dark.png");
	const pcDarkConvPath = path.join(OUT_CONV, "proof_02_schedule_pc_dark.png");
	await pcPage.screenshot({ path: pcDarkDocPath, fullPage: false });
	await pcPage.screenshot({ path: pcDarkConvPath, fullPage: false });
	console.log(`Saved: ${pcDarkDocPath}`);

	await pcContext.close();

	// ==========================================
	// 2. MOBILE CONTEXT (390x844 - iPhone 14)
	// ==========================================
	console.log("Mobile: Setting up 390x844 viewport...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const mobilePage = await mobileContext.newPage();

	await mobilePage.goto(`${webBaseUrl}/`, { waitUntil: "domcontentloaded" });
	await mobilePage.waitForTimeout(1500);

	const mobQuickDemoBtn = mobilePage.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await mobQuickDemoBtn.count()) > 0) {
		await mobQuickDemoBtn.click();
		await mobilePage.waitForTimeout(800);
		const enterRoleBtn = mobilePage.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await mobilePage.waitForTimeout(2000);
		}
	}

	await mobilePage.evaluate(() => {
		window.location.hash = "schedule";
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_onboarding_dismissed", "true");
	});
	await mobilePage.waitForTimeout(1500);
	await injectCleanStyles(mobilePage);

	// Переключаем в режим «Лента» (Timeline / List view)
	const feedBtn = mobilePage.getByRole("button", { name: /Лента/i });
	if ((await feedBtn.count()) > 0) {
		console.log("Switching to 'Лента' view for mobile...");
		await feedBtn.click({ force: true });
		await mobilePage.waitForTimeout(1000);
	}
	await injectCleanStyles(mobilePage);

	const scrollToCard = async () => {
		await mobilePage.evaluate(() => {
			const card = document.querySelector('[data-appointment-id], article, [data-testid*="appointment"]');
			if (card) {
				card.scrollIntoView({ behavior: 'instant', block: 'start' });
				window.scrollBy(0, -60);
			} else {
				window.scrollBy(0, 150);
			}
		});
		await mobilePage.waitForTimeout(500);
	};

	// --- MOBILE LIGHT ---
	console.log("Capturing Mobile LIGHT...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await mobilePage.waitForTimeout(600);
	await injectCleanStyles(mobilePage);
	await scrollToCard();

	const mobLightDocPath = path.join(OUT_DOCS, "proof_03_schedule_mobile_light.png");
	const mobLightConvPath = path.join(OUT_CONV, "proof_03_schedule_mobile_light.png");
	await mobilePage.screenshot({ path: mobLightDocPath, fullPage: false });
	await mobilePage.screenshot({ path: mobLightConvPath, fullPage: false });
	console.log(`Saved: ${mobLightDocPath}`);

	// --- MOBILE DARK ---
	console.log("Capturing Mobile DARK...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await mobilePage.waitForTimeout(600);
	await injectCleanStyles(mobilePage);
	await scrollToCard();

	const mobDarkDocPath = path.join(OUT_DOCS, "proof_04_schedule_mobile_dark.png");
	const mobDarkConvPath = path.join(OUT_CONV, "proof_04_schedule_mobile_dark.png");
	await mobilePage.screenshot({ path: mobDarkDocPath, fullPage: false });
	await mobilePage.screenshot({ path: mobDarkConvPath, fullPage: false });
	console.log(`Saved: ${mobDarkDocPath}`);

	await mobileContext.close();
	await browser.close();
	console.log("All 4 clean screenshots successfully recaptured!");
}

run().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
