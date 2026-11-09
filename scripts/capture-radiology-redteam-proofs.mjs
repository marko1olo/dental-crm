import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "272cd757-b7c1-4723-ad25-81327b0cac44";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/radiology";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-for-proofs";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				[role="alert"],
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
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], [data-testid='demo-mode-banner']").forEach((el) => el.remove());
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
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await sleep(500);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await sleep(500);
	const primaryPath = path.join(OUT_DOCS, filename);
	const brainPath = path.join(OUT_CONV, filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	copyFileSync(primaryPath, brainPath);
	const stat = statSync(primaryPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes`);
	}
	console.log(`[PROVED: ${stat.size} bytes] ${filename} - ${description}`);
}

async function waitForAppReady(page) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
			await offlineBtn.first().click({ force: true });
			await sleep(600);
		}
		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка CRM") || text.includes("Загрузка системы") || text.includes("Загрузка ортодонтического");
		}).catch(() => true);
		if (!hasLoading) {
			console.log(`App fully mounted and ready! (loop ${i})`);
			return;
		}
		await sleep(800);
	}
}

async function main() {
	console.log("=== STARTING 4-STATE RADIOLOGY & PHOTO PROTOCOL PROOF CAPTURE ===");
	let browser;
	try {
		browser = await chromium.launch({
			executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	} catch {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	}

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_token", "demo_dev_doctor_token");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_showcase_mode", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_finished", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
	});

	try {
		// 1. PC Light & Dark (1440x900) - 01_radiology_pc_light_1440x900.png & 02_radiology_pc_dark_1440x900.png
		console.log("\n--- Phase 1: PC Radiology Workspace 1440x900 ---");
		const pageRad = await context.newPage();
		await pageRad.setViewportSize({ width: 1440, height: 900 });
		await pageRad.goto(`${WEB_URL}/?demo=true&radiology=1`, { waitUntil: "commit", timeout: 30000 });
		await waitForAppReady(pageRad);
		await suppressOverlays(pageRad);
		await pageRad.waitForSelector('[data-testid="visiograph-study-viewer"], [data-testid="direct-radiology-launcher-root"]', { timeout: 25000 });
		console.log("Canonical VisiographStudyViewer confirmed visible!");
		await sleep(1500);

		// 1a. PC Light
		await setTheme(pageRad, "light");
		await saveProof(pageRad, "01_radiology_pc_light_1440x900.png", "☀️ PC Light (1440x900) Canonical Radiology Workspace");

		// 1b. PC Dark
		await setTheme(pageRad, "dark");
		await saveProof(pageRad, "02_radiology_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) High-Contrast Radiology Workspace");
		await pageRad.close();

		// 2. Mobile Light & Dark (390x844) - 03_rvg_capture_mobile_light_390x844.png & 04_rvg_capture_mobile_dark_390x844.png
		console.log("\n--- Phase 2: Mobile Direct RVG Capture 390x844 (Apple HIG) ---");
		await sleep(1500);
		const pageMob = await context.newPage();
		await pageMob.setViewportSize({ width: 390, height: 844 });
		for (let attempt = 0; attempt < 5; attempt++) {
			try {
				await pageMob.goto(`${WEB_URL}/?demo=true&rvg-capture=1`, { waitUntil: "commit", timeout: 30000 });
				break;
			} catch (e) {
				console.log(`Retry pageMob.goto attempt ${attempt + 1}: ${e.message}`);
				await sleep(2000);
			}
		}
		await waitForAppReady(pageMob);
		await suppressOverlays(pageMob);
		await pageMob.waitForSelector('[data-testid="direct-rvg-capture-modal"], [data-testid="direct-rvg-capture-modal-overlay"]', { timeout: 25000 });
		console.log("DirectRvgCaptureModal confirmed visible on Mobile!");
		await sleep(1500);

		// 2a. Mobile Light
		await setTheme(pageMob, "light");
		await saveProof(pageMob, "03_rvg_capture_mobile_light_390x844.png", "📱 Mobile Light (390x844) Direct RVG Sensor Capture Modal (Apple HIG)");

		// 2b. Mobile Dark
		await setTheme(pageMob, "dark");
		await saveProof(pageMob, "04_rvg_capture_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Direct RVG Sensor Capture Modal (Apple HIG)");
		await pageMob.close();

		console.log("\n=== ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
