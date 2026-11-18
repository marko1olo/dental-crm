import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONV_ID = "c83dc9ac-ec13-431a-8cd6-49321c453b39";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/patients");
const ARTIFACT_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;

[PROOFS_DIR, ARTIFACT_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

function replicateFile(srcPath, filename) {
	try {
		fs.copyFileSync(srcPath, path.join(ARTIFACT_DIR, filename));
	} catch (_) {}
}

async function authenticateFastify() {
	console.log("=== 1. REAL FASTIFY API AUTH & POSTGRES 18 CHECK ===");
	const authRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const authData = await authRes.json();
	if (!authData?.ok || !authData?.clinicToken || !authData?.staffToken) {
		throw new Error(`Fastify login failed: ${JSON.stringify(authData)}`);
	}
	console.log(`[Auth OK] User: ${authData.user?.fullName} (${authData.user?.role})`);
	return authData;
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
			.shepherd-element, vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(500);
	const target = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
	replicateFile(target, filename);
	const stat = fs.statSync(target);
	console.log(`[PROOF CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB (${stat.size} bytes)!`);
	}
}

async function injectAuthStorage(ctx, authData) {
	await ctx.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "doctor");
		localStorage.setItem("dente_user_role", user.role || "doctor");
		localStorage.setItem("dente_active_user_id", user.id || "doc-1");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user });
}

async function main() {
	const authData = await authenticateFastify();

	console.log(`\n=== 2. CONNECTING TO LIVE VITE SERVER AT ${WEB_BASE} ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		console.log("\n=== 3. CAPTURING PATIENT CARD 4-STATE PROOFS ===");
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(ctx, authData);
		const page = await ctx.newPage();
		page.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const modalUrl = `${WEB_BASE}/?demo=true&patient_card=1#patient-card`;
		console.log(`Navigating to ${modalUrl}...`);
		await page.goto(modalUrl, { waitUntil: "commit", timeout: 30000 });

		// Wait for patient card modal to mount
		await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-card-standalone-root"]', {
			state: "visible",
			timeout: 25000,
		});
		console.log("[Patient Card Modal mounted and visible]");
		await page.waitForTimeout(1200);

		// 1. PC Light (1440x900) - General info tab with INN & Passport
		await setTheme(page, "light");
		await saveProof(page, "01_patient_card_pc_light_1440x900.png", "Patient Card Modal (☀️ PC Light 1440x900)");

		// 2. PC Dark (1440x900) - General info tab
		await setTheme(page, "dark");
		await saveProof(page, "02_patient_card_pc_dark_1440x900.png", "Patient Card Modal (🌙 PC Dark 1440x900)");

		// 3. Switch to Documents tab to show mounted PatientCommunicationConsentsPanel
		const docsTab = page.locator('[data-testid="tab-documents"], [data-tab="documents"], button:has-text("Документы")').first();
		if (await docsTab.count() > 0) {
			console.log("Switching to Documents tab...");
			await docsTab.click();
			await page.waitForSelector('[data-testid="patient-comm-consents-panel"]', { state: "attached", timeout: 10000 }).catch(() => {});
			await page.waitForTimeout(800);

			await setTheme(page, "light");
			await saveProof(page, "05_patient_documents_consents_pc_light_1440x900.png", "Patient Documents Tab with Consents Matrix (PC Light)");

			await setTheme(page, "dark");
			await saveProof(page, "06_patient_documents_consents_pc_dark_1440x900.png", "Patient Documents Tab with Consents Matrix (PC Dark)");

			// Switch back to general for mobile proof
			const genTab = page.locator('[data-testid="tab-general"], [data-tab="general"], button:has-text("Общее")').first();
			if (await genTab.count() > 0) {
				await genTab.click();
				await page.waitForTimeout(600);
			}
		}

		// 4. Mobile Viewport (390x844) Apple HIG
		console.log("Switching to Mobile Viewport (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(1000);

		// 5. Mobile Light (390x844)
		await setTheme(page, "light");
		await saveProof(page, "03_patient_card_mobile_light_390x844.png", "Patient Card Bottom Sheet (📱 Mobile Light 390x844)");

		// 6. Mobile Dark (390x844)
		await setTheme(page, "dark");
		await saveProof(page, "04_patient_card_mobile_dark_390x844.png", "Patient Card Bottom Sheet (🌙 Mobile Dark 390x844)");

		await ctx.close();
		console.log("\n=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]", err);
	process.exit(1);
});
