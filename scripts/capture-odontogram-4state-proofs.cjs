const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
const CONV_ID = "1d4e6597-c38f-4831-86a6-1b7724878323";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
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
	await sleep(500);
}

async function takeProof(page, filename, description) {
	await suppressOverlays(page);
	await sleep(600);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const stat = fs.statSync(targetPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

	const brainPath = path.join(BRAIN_DIR, filename);
	fs.copyFileSync(targetPath, brainPath);
}

async function waitForAppReady(page) {
	console.log("[Setup] Waiting for app shell...");
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return !text.includes("Загрузка системы") && text.length > 200;
	}, { timeout: 45000 });
	console.log("[Setup] App ready!");
	await sleep(2000);
	await suppressOverlays(page);
}

async function navigateToOdontogram(page) {
	console.log("[Navigate] Setting view to visit...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("visit");
		}
		window.location.hash = "visit";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(2000);
	await suppressOverlays(page);

	// Click Odontogram tab / Examination tab
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button, [role='tab'], .tab-button, .nav-link"));
		const odontoTab = buttons.find((b) => 
			b.innerText.includes("Зубная формула") || 
			b.innerText.includes("Одонтограмма") ||
			b.innerText.includes("2. Осмотр") ||
			b.innerText.includes("Осмотр")
		);
		if (odontoTab) odontoTab.click();
	});
	await sleep(2000);
	await suppressOverlays(page);
}

async function main() {
	console.log("=== STARTING RED TEAM 4-STATE ODONTOGRAM SCREENSHOT CAPTURE ===");
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
		await page.setViewport({ width: 1440, height: 900 });

		console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
		await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 35000 });
		await waitForAppReady(page);

		// Handle login if present
		const hasPassword = await page.$('input[type="password"]');
		if (hasPassword) {
			console.log("Entering login credentials...");
			const inputs = await page.$$("input");
			if (inputs.length >= 2) {
				await inputs[0].click({ clickCount: 3 });
				await inputs[0].type("doctor@clinic.com");
				await inputs[1].click({ clickCount: 3 });
				await inputs[1].type("dente2026");
				await sleep(500);
				const submitBtn = await page.$('button[type="submit"]');
				if (submitBtn) await submitBtn.click();
				await waitForAppReady(page);
			}
		}

		await suppressOverlays(page);
		await navigateToOdontogram(page);

		// 1. PC Light (1440x900)
		console.log("\n--- Phase 1: PC Light (1440x900) ---");
		await setTheme(page, "light");
		await takeProof(page, "01_odontogram_pc_light.png", "Odontogram Tooth Chart (PC Light 1440x900)");

		// 2. PC Dark (1440x900)
		console.log("\n--- Phase 2: PC Dark (1440x900) ---");
		await setTheme(page, "dark");
		await takeProof(page, "02_odontogram_pc_dark.png", "Odontogram Tooth Chart (PC Dark 1440x900)");

		// 3. Mobile Viewport (390x844)
		console.log("\n--- Phase 3: Mobile Viewport (390x844) ---");
		await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
		await sleep(2500);
		await suppressOverlays(page);

		// Handle offline / retry banner if present
		await page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const offlineBtn = buttons.find((b) => b.innerText.includes("автономный режим"));
			if (offlineBtn) offlineBtn.click();
		});
		await sleep(1500);

		// Wait for mobile visit flow to be ready
		await page.waitForFunction(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			return buttons.some((b) => b.innerText.includes("2. Осмотр") || b.innerText.includes("Осмотр"));
		}, { timeout: 15000 }).catch(() => {});

		// Click inspection / odontogram step on mobile
		console.log("Switching to Mobile Step 2: Осмотр / Зубная формула...");
		await page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button, .btn, [role='tab'], div[role='button']"));
			const step2 = buttons.find((b) => 
				b.innerText.includes("Далее: 2. Осмотр") ||
				b.innerText.trim() === "2. Осмотр" ||
				b.innerText.includes("2. Осмотр")
			);
			if (step2) step2.click();
		});
		await sleep(2500);
		await suppressOverlays(page);

		console.log("Capturing 03_odontogram_mobile_light.png...");
		await setTheme(page, "light");
		await takeProof(page, "03_odontogram_mobile_light.png", "Odontogram Tooth Chart (Mobile Light 390x844)");

		// 4. Mobile Dark (390x844)
		console.log("\n--- Phase 4: Mobile Dark (390x844) ---");
		await setTheme(page, "dark");
		await takeProof(page, "04_odontogram_mobile_dark.png", "Odontogram Tooth Chart (Mobile Dark 390x844)");

		console.log("\n=== ALL 4 RED TEAM ODONTOGRAM SCREENSHOTS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
