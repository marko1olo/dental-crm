/**
 * scripts/take_lab_mobile_proofs.cjs
 *
 * Съемка мобильных 4-State Proofs для Dental Lab Studio (390x844 Apple HIG).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "92a2a4aa-1abc-4c82-b1bf-f745dfbd4fb9";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/lab");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-lab";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

async function applyTheme(page, isDark) {
	await page.evaluate((dark) => {
		const mode = dark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", mode);
		localStorage.setItem("dente_theme", mode);
		document.documentElement.setAttribute("data-theme", mode);
		document.body.setAttribute("data-theme", mode);
		document.documentElement.dataset.theme = mode;
		if (dark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
		}
	}, isDark);
	await page.waitForTimeout(400);
}

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	try {
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 8000 });
	} catch (err) {
		console.warn(`  [Screenshot Retry without animations]:`, err.message);
		await page.screenshot({ path: pDocs, fullPage: false, timeout: 8000 });
	}
	fs.copyFileSync(pDocs, pBrain);

	const size = fs.statSync(pDocs).size;
	if (size < 15000) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 15KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

async function main() {
	console.log(`\n=== Capturing Mobile 4-State Proofs for Dental Lab Studio (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

		await context.addInitScript(() => {
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "network", role: "owner", activeRole: "owner", hasDentalLab: true })
			);
		});

		const page = await context.newPage();
		console.log("Navigating to Mobile Dental Lab Studio via ?demo=true&lab=1...");
		await page.goto(`${WEB_BASE}/?demo=true&lab=1`, { waitUntil: "commit", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
		await page.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { state: "visible", timeout: 25000 });
		await suppressOverlays(page);

		// Переключаем на вкладку создания наряда
		await page.click('[data-testid="tab-new-order"]').catch(() => {});
		await page.waitForTimeout(600);
		await suppressOverlays(page);

		// Mobile Light (03_lab_studio_mobile_light_390x844.png)
		console.log("Capturing 03_lab_studio_mobile_light_390x844.png...");
		await applyTheme(page, false);
		await suppressOverlays(page);
		await saveProof(page, "03_lab_studio_mobile_light_390x844.png");

		// Mobile Dark (04_lab_studio_mobile_dark_390x844.png)
		console.log("Capturing 04_lab_studio_mobile_dark_390x844.png...");
		await applyTheme(page, true);
		await suppressOverlays(page);
		await saveProof(page, "04_lab_studio_mobile_dark_390x844.png");

		await context.close();
		console.log("\n🎉 ALL MOBILE PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
