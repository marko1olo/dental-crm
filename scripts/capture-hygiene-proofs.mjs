import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/hygiene");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/d8a342b3-6b6a-49f0-a466-a3a73289c581";

const ALL_DIRS = [PROOFS_DIR, BRAIN_DIR];
for (const dir of ALL_DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(600);
}

async function saveProof(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(proofPath).size;
	if (size < 20000) {
		console.warn(`[WARNING] ${fileName} size is small (${size} bytes)`);
	}
	for (const d of ALL_DIRS) {
		const dest = path.join(d, fileName);
		if (dest !== proofPath) {
			fs.copyFileSync(proofPath, dest);
		}
	}
	console.log(`[SAVED] ${fileName} (${(size / 1024).toFixed(1)} KB)`);
}

async function capture() {
	console.log("=== CAPTURING 4 RED TEAM HYGIENE VISUAL PROOF SCREENSHOTS ===");

	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : undefined);

	const browser = await chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : { channel: "msedge" }),
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. Desktop Context (1440x900)
		console.log("[DESKTOP] Creating context 1440x900...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const pcPage = await pcContext.newPage();
		pcPage.on("pageerror", (err) => console.log("[PC PAGEERROR]:", err.message));
		pcPage.on("console", (msg) => {
			if (msg.type() === "error") console.log("[PC CONSOLE ERROR]:", msg.text());
		});

		await pcPage.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:demo-mode:v1", "true");
		});

		console.log("[NAV] Navigating desktop to http://127.0.0.1:5173/?demo=true&hygiene=true...");
		await pcPage.goto(`${APP_BASE}/?demo=true&hygiene=true`, { waitUntil: "commit", timeout: 60000 });
		await wait(4000);

		console.log("[WAIT] Waiting for hygiene panel...");
		await pcPage.waitForSelector('[data-testid="hygiene-standalone-workspace"]', { timeout: 30000 }).catch((e) => {
			console.log("[WARN] Timeout waiting for hygiene-standalone-workspace selector:", e.message);
		});
		await wait(2000);

		// PC Light (1440x900)
		console.log("1. Capturing 01_pc_light_hygiene_indices.png (1440x900)...");
		await applyTheme(pcPage, "light");
		await saveProof(pcPage, "01_pc_light_hygiene_indices.png");

		// PC Dark (1440x900)
		console.log("2. Capturing 02_pc_dark_hygiene_indices.png (1440x900)...");
		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "02_pc_dark_hygiene_indices.png");

		await pcContext.close();

		// 2. Mobile Context (390x844)
		console.log("[MOBILE] Creating context 390x844...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const mobilePage = await mobileContext.newPage();
		mobilePage.on("pageerror", (err) => console.log("[MOBILE PAGEERROR]:", err.message));
		mobilePage.on("console", (msg) => {
			if (msg.type() === "error") console.log("[MOBILE CONSOLE ERROR]:", msg.text());
		});

		await mobilePage.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:demo-mode:v1", "true");
		});

		console.log("[NAV] Navigating mobile to http://127.0.0.1:5173/?demo=true&hygiene=true...");
		await mobilePage.goto(`${APP_BASE}/?demo=true&hygiene=true`, { waitUntil: "commit", timeout: 60000 });
		await wait(4000);

		console.log("[WAIT] Waiting for hygiene panel on mobile...");
		await mobilePage.waitForSelector('[data-testid="hygiene-standalone-workspace"]', { state: "visible", timeout: 60000 });
		await wait(3000);

		// Mobile Light (390x844)
		console.log("3. Capturing 03_mobile_light_hygiene_indices.png (390x844)...");
		await applyTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_mobile_light_hygiene_indices.png");

		// Mobile Dark (390x844)
		console.log("4. Capturing 04_mobile_dark_hygiene_indices.png (390x844)...");
		await applyTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_mobile_dark_hygiene_indices.png");

		await mobileContext.close();

		console.log("=== ALL 4 RED TEAM HYGIENE PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture script failed:", err);
	process.exit(1);
});
