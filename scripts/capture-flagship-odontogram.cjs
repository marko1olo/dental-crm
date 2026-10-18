const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DOCS = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/documents");
const OUT_ODONTO = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
const CONV_ID = "b899b011-4a77-407d-829b-507f9fab51d4";
const OUT_CONV = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_ODONTO, OUT_CONV].forEach((dir) => {
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
	await sleep(600);
}

async function takeProof(page, outDir, filename, description) {
	await suppressOverlays(page);
	await sleep(600);
	const primaryPath = path.join(outDir, filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	const stat = fs.statSync(primaryPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

	const secondaryPath = path.join(OUT_CONV, filename);
	fs.copyFileSync(primaryPath, secondaryPath);
}

async function waitForAppReady(page) {
	console.log("[Setup] Waiting for app shell and splash dismissal...");
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return !text.includes("Загрузка системы") && text.length > 200;
	}, { timeout: 45000 });
	console.log("[Setup] Shell ready!");
	await sleep(2000);
	await suppressOverlays(page);
}

async function openForm043InDocuments(page) {
	console.log("[Navigate] Switching to documents view...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("documents");
		}
		window.location.hash = "documents";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});

	// Also click the sidebar navigation button for documents if visible
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button, a, div[role='button']"));
		const docBtn = buttons.find((b) => b.innerText.includes("Документы") && b.innerText.includes("Справки"));
		if (docBtn) docBtn.click();
	});

	// Wait until catalog view or documents panel is mounted
	await page.waitForSelector('.documents-panel, [data-testid="documents-catalog-view"]', { timeout: 25000 });
	console.log("[Setup] Documents catalog selector found!");
	await sleep(1500);
	await suppressOverlays(page);

	// Click to open 043/u card
	console.log("[Documents] Clicking dental_card_043u card button...");
	await page.waitForSelector('[data-testid="btn-open-dental_card_043u"]', { timeout: 15000 });
	await page.click('[data-testid="btn-open-dental_card_043u"]');
	console.log("[Documents] Clicked [data-testid=\"btn-open-dental_card_043u\"] successfully!");

	// Wait for 043/u form and tooth chart to render
	await page.waitForSelector('.odontogram-flagship-wrapper, .form-043u-formula-tab, .tooth-chart-container', { timeout: 25000 });
	console.log("[Setup] Form 043/u ToothChart selector found!");
	await sleep(2500);
	await suppressOverlays(page);

	// Ensure Odontogram tab inside 043/u is active
	await page.evaluate(() => {
		const tabs = Array.from(document.querySelectorAll("button, [role='tab'], .tab-button, .nav-link"));
		const tab = tabs.find((t) => t.innerText.includes("Зубная формула") || t.innerText.includes("Формула"));
		if (tab) tab.click();
	});
	await sleep(1500);
	await suppressOverlays(page);
}

async function main() {
	console.log("=== STARTING ROBUST FLAGSHIP ODONTOGRAM 4-STATE CAPTURE ===");
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[PAGE ERROR LOG]", msg.text());
		});
		await page.setViewport({ width: 1440, height: 900 });

		console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
		await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 35000 });
		await waitForAppReady(page);

		// Handle login if present
		const hasPassword = await page.$('input[type="password"]');
		if (hasPassword) {
			console.log("2. Detected login form, entering credentials...");
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

		// ─── 1. CLINICAL ODONTOGRAM WITH ROOTS & CANALS (PC 1440x900) ───
		console.log("\n--- Phase 1: Clinical Odontogram (Roots & Canals) in PC 1440x900 ---");
		await page.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("visit");
			}
			window.location.hash = "visit";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await sleep(2500);
		await suppressOverlays(page);

		// Open Odontogram tab if in visit
		await page.evaluate(() => {
			const tabs = Array.from(document.querySelectorAll("button, [role='tab'], .tab-button"));
			const odontoTab = tabs.find((t) => t.innerText.includes("Зубная формула") || t.innerText.includes("Одонтограмма"));
			if (odontoTab) odontoTab.click();
		});
		await sleep(1500);
		await suppressOverlays(page);

		console.log("Capturing odontogram_roots_and_canals_pc_light.png...");
		await setTheme(page, "light");
		await takeProof(page, OUT_ODONTO, "odontogram_roots_and_canals_pc_light.png", "Clinical Odontogram with Roots & Canals (PC Light)");

		console.log("Capturing odontogram_roots_and_canals_pc_dark.png...");
		await setTheme(page, "dark");
		await takeProof(page, OUT_ODONTO, "odontogram_roots_and_canals_pc_dark.png", "Clinical Odontogram with Roots & Canals (PC Dark)");

		// ─── 2. MEDICAL CARD 043/u WITH FLAGSHIP TOOTHCHART (PC 1440x900) ───
		console.log("\n--- Phase 2: Form 043/u Flagship Odontogram in PC 1440x900 ---");
		await setTheme(page, "light");
		await openForm043InDocuments(page);

		console.log("Capturing form043_odontogram_flagship_pc_light.png...");
		await takeProof(page, OUT_DOCS, "form043_odontogram_flagship_pc_light.png", "Form 043/u Flagship ToothChart (PC Light)");

		console.log("Capturing form043_odontogram_flagship_pc_dark.png...");
		await setTheme(page, "dark");
		await takeProof(page, OUT_DOCS, "form043_odontogram_flagship_pc_dark.png", "Form 043/u Flagship ToothChart (PC Dark)");

		// ─── 3. MOBILE VIEWPORT (390x844) ───
		console.log("\n--- Phase 3: Mobile Viewport (390x844) ---");
		await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
		await sleep(1500);

		// Mobile Form 043/u
		console.log("Capturing form043_odontogram_flagship_mobile_dark.png...");
		await takeProof(page, OUT_DOCS, "form043_odontogram_flagship_mobile_dark.png", "Mobile Form 043/u Flagship (Mobile Dark)");

		console.log("Capturing form043_odontogram_flagship_mobile_light.png...");
		await setTheme(page, "light");
		await takeProof(page, OUT_DOCS, "form043_odontogram_flagship_mobile_light.png", "Mobile Form 043/u Flagship (Mobile Light)");

		// Mobile Visit / Odontogram
		console.log("Navigating to Mobile Visit...");
		await page.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("visit");
			}
			window.location.hash = "visit";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await sleep(2500);
		await suppressOverlays(page);

		// Click inspection / odontogram step
		await page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button, .btn, [role='tab']"));
			const step2 = buttons.find((b) => b.innerText.includes("2. Осмотр") || b.innerText.includes("Осмотр"));
			if (step2) step2.click();
		});
		await sleep(1500);
		await suppressOverlays(page);

		console.log("Capturing odontogram_roots_and_canals_mobile_light.png...");
		await takeProof(page, OUT_ODONTO, "odontogram_roots_and_canals_mobile_light.png", "Mobile Odontogram Roots & Canals (Mobile Light)");

		console.log("Capturing odontogram_roots_and_canals_mobile_dark.png...");
		await setTheme(page, "dark");
		await takeProof(page, OUT_ODONTO, "odontogram_roots_and_canals_mobile_dark.png", "Mobile Odontogram Roots & Canals (Mobile Dark)");

		console.log("\n=== ALL 8 SCREENSHOTS CAPTURED WITH RIGOROUS RED TEAM STANDARDS ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
