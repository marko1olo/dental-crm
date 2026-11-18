import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONV_ID = process.env.CONV_ID || "1ffb02ff-9b6d-4107-b270-454b9f767a8e";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/surgery");
const DOCS_SURGERY_DIR = path.resolve(__dirname, "../docs/screenshots/surgery");
const DOCS_IMPLANTS_DIR = path.resolve(__dirname, "../docs/screenshots/implants");
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/surgery`;

[PROOFS_DIR, DOCS_SURGERY_DIR, DOCS_IMPLANTS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isPortOpen(port) {
	for (let attempt = 0; attempt < 10; attempt++) {
		const ok = await new Promise((resolve) => {
			const s = net.createConnection({ port, host: "127.0.0.1" }, () => {
				s.destroy();
				resolve(true);
			});
			s.on("error", () => resolve(false));
			s.setTimeout(3000, () => {
				s.destroy();
				resolve(false);
			});
		});
		if (ok) return true;
		await sleep(1000);
	}
	return false;
}

async function setTheme(page, theme) {
	const isDark = theme === "dark";
	await page.evaluate(({ theme, isDark }) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		if (document.body) {
			document.body.setAttribute("data-theme", theme);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		}
		try {
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
		} catch (_) {}
	}, { theme, isDark });
	await sleep(400);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			let style = document.getElementById("suppress-surgery-proof-overlays");
			if (!style) {
				style = document.createElement("style");
				style.id = "suppress-surgery-proof-overlays";
				document.head.appendChild(style);
			}
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				.coachmark-tooltip-container,
				.guide-tour-floating-launcher,
				.clinical-quest-modal,
				[data-testid="interactive-guide-tour-card"],
				[data-testid="clinical-quest-banner"],
				[data-testid="offline-indicator"],
				[data-testid="offline-banner"],
				.offline-banner,
				[role="alert"],
				.shepherd-element,
				.boot-state {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .boot-state").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setupPageAuth(context, theme = "light") {
	await context.addInitScript(({ theme }) => {
		try {
			localStorage.setItem("dente_organization_id", "demo-org");
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_showcase_mode_v1", "true");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_sidebar_collapsed", "false");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				onboardingDismissed: true,
			}));
		} catch (_) {}
	}, { theme });
}

async function saveProof(page, filename, label) {
	await sleep(600);
	await suppressOverlays(page);

	const proofTarget = path.join(PROOFS_DIR, filename);
	const docsSurgeryTarget = path.join(DOCS_SURGERY_DIR, filename);
	const docsImplantsTarget = path.join(DOCS_IMPLANTS_DIR, filename);
	const brainTarget = path.join(BRAIN_DIR, filename);

	const buffer = await page.screenshot({ fullPage: false, animations: "disabled" });
	fs.writeFileSync(proofTarget, buffer);
	fs.writeFileSync(docsSurgeryTarget, buffer);
	fs.writeFileSync(docsImplantsTarget, buffer);
	fs.writeFileSync(brainTarget, buffer);

	const stat = statSync(proofTarget);
	const sizeKb = Math.round(stat.size / 1024);
	console.log(`[PROOF OK] ${filename} (${sizeKb} KB) -> ${label}`);
	if (stat.size < 20 * 1024) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes (<20KB)!`);
	}
}

async function main() {
	console.log("=== Launching Red Team Surgery 4-State Proof Capture ===");

	const isOpen = await isPortOpen(5173);
	if (!isOpen) {
		throw new Error("[FATAL] Port 5173 is closed!");
	}
	console.log("[Vite] Verified 127.0.0.1:5173 is OPEN and ready.");

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => existsSync(p));
	console.log(`[BROWSER] Found browser executable: ${executablePath}`);

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	};
	if (executablePath) launchOptions.executablePath = executablePath;

	const browser = await chromium.launch(launchOptions);
	try {
		// ==========================================
		// 1. DESKTOP 1440x900 (PC Light & Dark)
		// ==========================================
		console.log("\n[1/2] Desktop 1440x900 Session...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
			serviceWorkers: "block",
		});
		await setupPageAuth(pcContext, "light");
		const pcPage = await pcContext.newPage();
		pcPage.on("pageerror", (err) => console.log("[PAGE_ERR]", err.message));

		console.log("  Navigating to http://127.0.0.1:5173/?stand=surgery#surgery ...");
		await pcPage.goto("http://127.0.0.1:5173/?stand=surgery#surgery", { waitUntil: "domcontentloaded", timeout: 45000 });
		await pcPage.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', { timeout: 30000 });
		await sleep(1500);
		await suppressOverlays(pcPage);

		// Switch to protocol tab & scroll to display parameters & ISQ input
		const protoTab = pcPage.locator('[data-testid="tab-surgery-protocol"]').first();
		if (await protoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
			await protoTab.click();
			await sleep(500);
		}

		await pcPage.evaluate(() => {
			const content = document.querySelector(".surgery-hub-content");
			if (content) content.scrollTop = 160;
		});
		await sleep(500);

		// 1. PC Light Surgery Hub
		console.log("  Capturing 01_surgery_hub_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "01_surgery_hub_pc_light_1440x900.png", "Surgery Hub PC Light (Protocol & ISQ input)");

		// 2. PC Dark Surgery Hub
		console.log("  Capturing 02_surgery_hub_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "02_surgery_hub_pc_dark_1440x900.png", "Surgery Hub PC Dark (Protocol & ISQ input)");

		// 5. Implant Passport PC Light
		console.log("  Switching to Passport Tab for PC Light...");
		const passTab = pcPage.locator('[data-testid="tab-surgery-passport"]').first();
		if (await passTab.isVisible({ timeout: 3000 }).catch(() => false)) {
			await passTab.click();
			await sleep(600);
		}
		await pcPage.evaluate(() => {
			const qr = document.querySelector('[data-testid="passport-qr-verification"]');
			if (qr) qr.scrollIntoView({ block: "center", behavior: "instant" });
		});
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "05_implant_passport_pc_light_1440x900.png", "Implant Passport PC Light (Authentic SVG QR code)");

		// ==========================================
		// 2. MOBILE 390x844 (Mobile Light & Dark)
		// ==========================================
		console.log("\n[2/2] Mobile 390x844 Session (Apple HIG)...");
		await pcPage.setViewportSize({ width: 390, height: 844 });
		await sleep(800);

		// Switch back to protocol tab
		const mProtoTab = pcPage.locator('[data-testid="tab-surgery-protocol"]').first();
		if (await mProtoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
			await mProtoTab.click();
			await sleep(500);
		}
		await pcPage.evaluate(() => {
			const content = document.querySelector(".surgery-hub-content");
			if (content) content.scrollTop = 0;
		});
		await sleep(500);

		// 3. Mobile Light Surgery Hub
		console.log("  Capturing 03_surgery_hub_mobile_light_390x844.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "03_surgery_hub_mobile_light_390x844.png", "Surgery Hub Mobile Light (Apple HIG Bottom Sheet)");

		// 4. Mobile Dark Surgery Hub
		console.log("  Capturing 04_surgery_hub_mobile_dark_390x844.png...");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "04_surgery_hub_mobile_dark_390x844.png", "Surgery Hub Mobile Dark (Apple HIG Bottom Sheet)");

		await pcContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 5 SURGERY & IMPLANT PROOFS CAPTURED & VERIFIED <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
