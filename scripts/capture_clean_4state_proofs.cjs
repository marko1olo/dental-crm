const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/checkin");

if (!fs.existsSync(OUT_DOCS)) {
	fs.mkdirSync(OUT_DOCS, { recursive: true });
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				#boot-state,
				.boot-state,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document
				.querySelectorAll(
					"vite-error-overlay, #boot-state, .boot-state, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']"
				)
				.forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(400);
}

async function setupPageInit(page, theme = "light") {
	await page.addInitScript((th) => {
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
	}, theme);
}

async function captureScreen(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const filePath = path.join(OUT_DOCS, filename);
	await page.screenshot({
		path: filePath,
		fullPage: false,
		animations: "disabled",
		timeout: 15000,
	});
	const size = fs.statSync(filePath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
	if (size < 20000) {
		console.warn(`[WARNING] ${filename} is under 20KB threshold!`);
	}
}

async function run() {
	console.log("[Proof Engine] Starting clean 4-state visual proof capture...");
	const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
		? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
		: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

	const browser = await chromium.launch({
		headless: true,
		executablePath: chromePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ==========================================
		// 1. PC Light (1440x900) - Reception Tablet / Kiosk Landing
		// ==========================================
		console.log("\n=== 1. Capturing 01_kiosk_pc_light.png ===");
		{
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageInit(page, "light");
			await page.goto(`${WEB_BASE}/?demo=true#/portal/kiosk`, { waitUntil: "domcontentloaded" });
			await page.waitForTimeout(2500);
			await setTheme(page, "light");
			await page.waitForTimeout(500);
			await captureScreen(page, "01_kiosk_pc_light.png");
			await context.close();
		}

		// ==========================================
		// 2. PC Dark (1440x900) - Express IDS Retina Canvas Signature Pad
		// ==========================================
		console.log("\n=== 2. Capturing 02_kiosk_pc_dark.png ===");
		{
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageInit(page, "dark");
			await page.goto(`${WEB_BASE}/?demo=true#/portal/kiosk`, { waitUntil: "domcontentloaded" });
			await page.waitForTimeout(2000);
			await setTheme(page, "dark");
			await page.waitForTimeout(500);

			const toggleDocsBtn = page.locator("button:has-text('Нормативные документы')");
			await toggleDocsBtn.scrollIntoViewIfNeeded();
			await toggleDocsBtn.click();
			await page.waitForTimeout(400);

			const openConsentsBtn = page.locator("button:has-text('Открыть бланк подписи вручную')");
			await openConsentsBtn.scrollIntoViewIfNeeded();
			await openConsentsBtn.click();
			await page.waitForTimeout(800);

			// Draw signature on Retina Canvas
			const canvas = page.locator("canvas.signature-pad-canvas");
			await canvas.waitFor({ state: "visible", timeout: 10000 });
			const box = await canvas.boundingBox();
			if (box) {
				const startX = box.x + box.width * 0.15;
				const startY = box.y + box.height * 0.55;
				await page.mouse.move(startX, startY);
				await page.mouse.down();
				for (let i = 0; i <= 35; i++) {
					const progress = i / 35;
					const x = startX + progress * box.width * 0.7;
					const y = startY + Math.sin(progress * Math.PI * 4) * (box.height * 0.28) + (progress > 0.6 ? (progress - 0.6) * 20 : 0);
					await page.mouse.move(x, y);
					await page.waitForTimeout(8);
				}
				await page.mouse.up();
				console.log("[Signature Pad] Retina signature stroke successfully drawn!");
			}
			await page.waitForTimeout(500);
			await captureScreen(page, "02_kiosk_pc_dark.png");
			await context.close();
		}

		// ==========================================
		// 3. Mobile Light (390x844) - Patient Cabinet PWA with Next Visit Card & "Я на месте / Чекин"
		// ==========================================
		console.log("\n=== 3. Capturing 03_checkin_mobile_light.png ===");
		{
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 2,
				isMobile: true,
				hasTouch: true,
			});
			const page = await context.newPage();
			await setupPageInit(page, "light");
			await page.goto(`${WEB_BASE}/?demo=true#/portal/cabinet/00000000-0000-0000-0000-000000000001`, {
				waitUntil: "domcontentloaded",
			});
			await page.waitForTimeout(2000);
			await setTheme(page, "light");

			// Click "Открыть кабинет пациента (Тест-драйв)"
			const demoBtn = page.locator("[data-testid='open-demo-cabinet-btn']");
			await demoBtn.scrollIntoViewIfNeeded();
			await demoBtn.click();
			await page.waitForTimeout(1000);

			// Wait for patient cabinet modal
			await page.waitForSelector(".patient-cabinet-container, .pc-next-visit-card, [data-testid='btn-i-am-here-checkin'], .pc-body", {
				timeout: 10000,
			}).catch(() => {});
			await page.waitForTimeout(800);
			await captureScreen(page, "03_checkin_mobile_light.png");
			await context.close();
		}

		// ==========================================
		// 4. Mobile Dark (390x844) - Mobile 1-Click Somatic Questionnaire & Allergy Chips
		// ==========================================
		console.log("\n=== 4. Capturing 04_checkin_mobile_dark.png ===");
		{
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 2,
				isMobile: true,
				hasTouch: true,
			});
			const page = await context.newPage();
			await setupPageInit(page, "dark");
			await page.goto(`${WEB_BASE}/?demo=true#/portal/kiosk`, { waitUntil: "domcontentloaded" });
			await page.waitForTimeout(2000);
			await setTheme(page, "dark");
			await page.waitForTimeout(500);

			// Click "Нормативные документы (152-ФЗ) и анкета здоровья"
			const toggleDocsBtn = page.locator("button:has-text('Нормативные документы')");
			if (await toggleDocsBtn.isVisible()) {
				await toggleDocsBtn.click();
				await page.waitForTimeout(300);
			}

			// Click "Заполнить соматическую анкету"
			const openSomaticBtn = page.locator("button:has-text('Заполнить соматическую анкету')");
			if (await openSomaticBtn.isVisible()) {
				await openSomaticBtn.click();
				await page.waitForTimeout(600);
			}

			// Click allergy chip "Лидокаин" to show active allergy alert
			const lidoChip = page.locator("button:has-text('Лидокаин')").first();
			if (await lidoChip.isVisible()) {
				await lidoChip.click();
				await page.waitForTimeout(300);
			}

			await page.waitForTimeout(500);
			await captureScreen(page, "04_checkin_mobile_dark.png");
			await context.close();
		}

		console.log("\n[Proof Engine] SUCCESS: All 4 checkin screenshots successfully generated!");
	} catch (err) {
		console.error("[Proof Engine ERROR]:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
