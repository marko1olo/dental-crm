import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "8ab44c15-807b-49ce-a4e2-89005e5bb8c2";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/analytics";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function verifyFileSize(filepath) {
	const s = await stat(filepath);
	console.log(`[PROOF VERIFIED] ${path.basename(filepath)}: ${(s.size / 1024).toFixed(1)} KB (Required >20 KB)`);
	if (s.size < 20 * 1024) {
		throw new Error(`File ${filepath} is too small: ${s.size} bytes`);
	}
}

async function loginAsOwner(page) {
	await page.goto(`${WEB_URL}/#analytics`);
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });

	const demoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур")');
	if ((await demoBtn.count()) > 0) {
		console.log("Clicking demo tour entry...");
		await demoBtn.first().click({ force: true });
		await page.waitForTimeout(800);

		const ownerCard = page.locator('div:has-text("Главврач / Владелец")').last();
		if ((await ownerCard.count()) > 0) {
			console.log("Selecting owner card...");
			await ownerCard.click({ force: true });
			await page.waitForTimeout(500);
		}

		const enterBtn = page.locator('button:has-text("Войти в демо-тур")');
		if ((await enterBtn.count()) > 0) {
			console.log("Clicking enter demo tour button...");
			await enterBtn.first().click({ force: true });
			await page.waitForTimeout(2000);
		}
	}

	await page.waitForSelector('.executive-dashboard, .executive-mobile-layout, [data-testid="analytics-dashboard-view"]', { timeout: 20000 });
}

async function capture() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });

	const hideOverlaysCss = `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"],
		.tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"],
		.global-toast-container, [role="alert"] {
			display: none !important;
		}
	`;

	try {
		// =========================================================================
		// 1. PC Light (1440x900) - Executive Analytics (Week)
		// =========================================================================
		console.log("\n=== 1. PC Light (1440x900) - Executive Analytics ===");
		const ctxPcLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pagePcLight = await ctxPcLight.newPage();
		await loginAsOwner(pagePcLight);
		await pagePcLight.addStyleTag({ content: hideOverlaysCss });

		// Switch to "Неделя" period button
		const weekBtnLight = pagePcLight.locator('button:has-text("Неделя")').first();
		if ((await weekBtnLight.count()) > 0) {
			console.log("Selecting 'Неделя' in PC Light...");
			await weekBtnLight.click({ force: true });
			await pagePcLight.waitForTimeout(1500);
		}

		const p1Conv = path.join(OUT_CONV, "01_analytics_weekly_pc_light_1440x900.png");
		const p1Docs = path.join(OUT_DOCS, "01_analytics_weekly_pc_light_1440x900.png");
		await pagePcLight.screenshot({ path: p1Conv, fullPage: false });
		await pagePcLight.screenshot({ path: p1Docs, fullPage: false });
		await verifyFileSize(p1Docs);

		// -------------------------------------------------------------------------
		// 1b. PC Light - Doctor Payroll Modal (Наёмный 13-15%)
		// -------------------------------------------------------------------------
		console.log("Opening Doctor Payroll Modal in PC Light...");
		await pagePcLight.evaluate(() => {
			window.location.hash = "#analytics?payout=true";
		});
		await pagePcLight.waitForTimeout(1500);

		const detailBtnLight = pagePcLight.locator('button:has-text("Детализация ▼")').first();
		await detailBtnLight.scrollIntoViewIfNeeded();
		await detailBtnLight.click({ force: true });
		await pagePcLight.waitForTimeout(800);

		const vedBtn = pagePcLight.locator('button:has-text("Зарплатная ведомость")').first();
		await vedBtn.scrollIntoViewIfNeeded();
		await vedBtn.click({ force: true });
		await pagePcLight.waitForTimeout(1200);

		await pagePcLight.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 15000 });
		await pagePcLight.waitForTimeout(800);

		const p5Conv = path.join(OUT_CONV, "05_doctor_payroll_modal_pc_light_1440x900.png");
		const p5Docs = path.join(OUT_DOCS, "05_doctor_payroll_modal_pc_light_1440x900.png");
		await pagePcLight.screenshot({ path: p5Conv, fullPage: false });
		await pagePcLight.screenshot({ path: p5Docs, fullPage: false });
		await verifyFileSize(p5Docs);

		await ctxPcLight.close();

		// =========================================================================
		// 2. PC Dark (1440x900) - Executive Analytics (Week)
		// =========================================================================
		console.log("\n=== 2. PC Dark (1440x900) - Executive Analytics ===");
		const ctxPcDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pagePcDark = await ctxPcDark.newPage();
		await loginAsOwner(pagePcDark);
		await pagePcDark.addStyleTag({ content: hideOverlaysCss });
		await pagePcDark.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		const weekBtnDark = pagePcDark.locator('button:has-text("Неделя")').first();
		if ((await weekBtnDark.count()) > 0) {
			console.log("Selecting 'Неделя' in PC Dark...");
			await weekBtnDark.click({ force: true });
			await pagePcDark.waitForTimeout(1500);
		}

		const p2Conv = path.join(OUT_CONV, "02_analytics_weekly_pc_dark_1440x900.png");
		const p2Docs = path.join(OUT_DOCS, "02_analytics_weekly_pc_dark_1440x900.png");
		await pagePcDark.screenshot({ path: p2Conv, fullPage: false });
		await pagePcDark.screenshot({ path: p2Docs, fullPage: false });
		await verifyFileSize(p2Docs);

		// -------------------------------------------------------------------------
		// 2b. PC Dark - Doctor Payroll Modal (ИП / Самозанятый 0%)
		// -------------------------------------------------------------------------
		console.log("Opening Doctor Payroll Modal in PC Dark (Self-employed 0% NDFL)...");
		await pagePcDark.evaluate(() => {
			window.location.hash = "#analytics?payout=true";
		});
		await pagePcDark.waitForTimeout(1500);

		const detailBtnDark = pagePcDark.locator('button:has-text("Детализация ▼")').first();
		await detailBtnDark.scrollIntoViewIfNeeded();
		await detailBtnDark.click({ force: true });
		await pagePcDark.waitForTimeout(800);

		const vedBtnDark = pagePcDark.locator('button:has-text("Зарплатная ведомость")').first();
		await vedBtnDark.scrollIntoViewIfNeeded();
		await vedBtnDark.click({ force: true });
		await pagePcDark.waitForTimeout(1200);

		await pagePcDark.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 15000 });

		// Switch to ИП / Самозанятый (0%) regime
		const selfEmployedBtn = pagePcDark.locator('button:has-text("ИП / Самозанятый (0%)")').first();
		if ((await selfEmployedBtn.count()) > 0) {
			console.log("Selecting 'ИП / Самозанятый (0%)' regime in PC Dark...");
			await selfEmployedBtn.click({ force: true });
			await pagePcDark.waitForTimeout(1000);
		}

		const p6Conv = path.join(OUT_CONV, "06_doctor_payroll_modal_pc_dark_1440x900.png");
		const p6Docs = path.join(OUT_DOCS, "06_doctor_payroll_modal_pc_dark_1440x900.png");
		await pagePcDark.screenshot({ path: p6Conv, fullPage: false });
		await pagePcDark.screenshot({ path: p6Docs, fullPage: false });
		await verifyFileSize(p6Docs);

		await ctxPcDark.close();

		// =========================================================================
		// 3. Mobile Light (390x844) - iPhone 14
		// =========================================================================
		console.log("\n=== 3. Mobile Light (390x844) - Executive Analytics ===");
		const ctxMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const pageMobLight = await ctxMobLight.newPage();
		await loginAsOwner(pageMobLight);
		await pageMobLight.addStyleTag({ content: hideOverlaysCss });

		const weekTabMobLight = pageMobLight.locator('[data-testid="period-btn-week"], .mobile-exec-segmented-btn:has-text("Неделя")').first();
		if ((await weekTabMobLight.count()) > 0) {
			console.log("Selecting 'Неделя' in Mobile Light...");
			await weekTabMobLight.scrollIntoViewIfNeeded();
			await weekTabMobLight.click({ force: true });
			await pageMobLight.waitForTimeout(1500);
		}

		const p3Conv = path.join(OUT_CONV, "03_analytics_weekly_mobile_light_390x844.png");
		const p3Docs = path.join(OUT_DOCS, "03_analytics_weekly_mobile_light_390x844.png");
		await pageMobLight.screenshot({ path: p3Conv, fullPage: false });
		await pageMobLight.screenshot({ path: p3Docs, fullPage: false });
		await verifyFileSize(p3Docs);

		// Mobile Light - Doctor Payroll Modal
		console.log("Opening Doctor Payroll Modal in Mobile Light...");
		await pageMobLight.evaluate(() => {
			window.location.hash = "#analytics?payout=true";
		});
		await pageMobLight.waitForTimeout(1500);

		const vedBtnMobLight = pageMobLight.locator('button:has-text("Ведомость"), button:has-text("Детализация")').first();
		if ((await vedBtnMobLight.count()) > 0) {
			await vedBtnMobLight.scrollIntoViewIfNeeded();
			await vedBtnMobLight.click({ force: true });
			await pageMobLight.waitForTimeout(1500);
		}

		await pageMobLight.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 15000 });
		const modalContainerMob = pageMobLight.locator('.payroll-modal-container');
		if ((await modalContainerMob.count()) > 0) {
			await modalContainerMob.first().scrollIntoViewIfNeeded();
		}
		await pageMobLight.waitForTimeout(800);

		const p7Conv = path.join(OUT_CONV, "07_doctor_payroll_modal_mobile_light_390x844.png");
		const p7Docs = path.join(OUT_DOCS, "07_doctor_payroll_modal_mobile_light_390x844.png");
		await pageMobLight.screenshot({ path: p7Conv, fullPage: false });
		await pageMobLight.screenshot({ path: p7Docs, fullPage: false });
		await verifyFileSize(p7Docs);

		await ctxMobLight.close();

		// =========================================================================
		// 4. Mobile Dark (390x844) - iPhone 14
		// =========================================================================
		console.log("\n=== 4. Mobile Dark (390x844) - Executive Analytics ===");
		const ctxMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const pageMobDark = await ctxMobDark.newPage();
		await loginAsOwner(pageMobDark);
		await pageMobDark.addStyleTag({ content: hideOverlaysCss });
		await pageMobDark.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		const weekTabMobDark = pageMobDark.locator('[data-testid="period-btn-week"], .mobile-exec-segmented-btn:has-text("Неделя")').first();
		if ((await weekTabMobDark.count()) > 0) {
			console.log("Selecting 'Неделя' in Mobile Dark...");
			await weekTabMobDark.scrollIntoViewIfNeeded();
			await weekTabMobDark.click({ force: true });
			await pageMobDark.waitForTimeout(1500);
		}

		const p4Conv = path.join(OUT_CONV, "04_analytics_weekly_mobile_dark_390x844.png");
		const p4Docs = path.join(OUT_DOCS, "04_analytics_weekly_mobile_dark_390x844.png");
		await pageMobDark.screenshot({ path: p4Conv, fullPage: false });
		await pageMobDark.screenshot({ path: p4Docs, fullPage: false });
		await verifyFileSize(p4Docs);

		// Mobile Dark - Doctor Payroll Modal (Self-Employed)
		console.log("Opening Doctor Payroll Modal in Mobile Dark (Self-employed)...");
		await pageMobDark.evaluate(() => {
			window.location.hash = "#analytics?payout=true";
		});
		await pageMobDark.waitForTimeout(1500);

		const vedBtnMobDark = pageMobDark.locator('button:has-text("Ведомость"), button:has-text("Детализация")').first();
		if ((await vedBtnMobDark.count()) > 0) {
			await vedBtnMobDark.scrollIntoViewIfNeeded();
			await vedBtnMobDark.click({ force: true });
			await pageMobDark.waitForTimeout(1500);
		}

		await pageMobDark.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 15000 });
		await pageMobDark.waitForTimeout(800);

		const selfEmployedBtnMob = pageMobDark.locator('button:has-text("ИП / Самозанятый (0%)")').first();
		if ((await selfEmployedBtnMob.count()) > 0) {
			console.log("Selecting 'ИП / Самозанятый (0%)' in Mobile Dark...");
			await selfEmployedBtnMob.click({ force: true });
			await pageMobDark.waitForTimeout(1000);
		}

		const p8Conv = path.join(OUT_CONV, "08_doctor_payroll_modal_mobile_dark_390x844.png");
		const p8Docs = path.join(OUT_DOCS, "08_doctor_payroll_modal_mobile_dark_390x844.png");
		await pageMobDark.screenshot({ path: p8Conv, fullPage: false });
		await pageMobDark.screenshot({ path: p8Docs, fullPage: false });
		await verifyFileSize(p8Docs);

		await ctxMobDark.close();

		console.log("\n🎉 ALL 8 RED TEAM VISUAL PROOFS SUCCESSFULLY CAPTURED AND VERIFIED >20 KB! 🎉");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
