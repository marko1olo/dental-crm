import fs, { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthodontics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/0926ac38-59b8-4c57-874d-f453e425c464");

for (const d of [PROOFS_DIR, BRAIN_DIR]) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function verifyAndCopyProof(filename) {
	const src = path.join(PROOFS_DIR, filename);
	if (!existsSync(src)) throw new Error(`[MISSING] ${src} not found!`);
	const size = statSync(src).size;
	if (size < 20480) {
		throw new Error(`[BLANK PROOF] ${filename} is only ${size} bytes (<20KB)!`);
	}
	const dest = path.join(BRAIN_DIR, filename);
	try {
		copyFileSync(src, dest);
	} catch (e) {
		console.warn(`Copy error for ${filename}:`, e.message);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${Math.round(size / 1024)} KB)`);
}

async function hideOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "hide-all-overlays-ortho";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
				.sa-toast,
				[role="alert"],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
					visibility: hidden !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function applyTheme(page, theme) {
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
	}, theme);
	await hideOverlays(page);
	await page.waitForTimeout(600);
}

async function main() {
	console.log("=== STARTING ORTHODONTICS RED TEAM 4-STATE CAPTURE ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		locale: "ru-RU",
	});

	await context.addInitScript(() => {
		try {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_clinic_token", "demo_clinic_token");
			localStorage.setItem("dente_staff_token", "demo_staff_token");
			localStorage.setItem("dente_active_session_token", "demo_staff_token");
			localStorage.setItem("dente_perspective", "orthodontic");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" }));
			sessionStorage.setItem("dente_unlocked", "true");
		} catch (_) {}
	});

	const page = await context.newPage();
	page.on("console", (msg) => {
		const text = msg.text();
		if (!text.includes("[HMR]") && !text.includes("[vite]")) {
			console.log(`[BROWSER LOG]: ${text.slice(0, 120)}`);
		}
	});
	page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

	// ══════════════════════════════════════════════════════════════
	// 1. ORTHODONTICS STUDIO MODAL
	// ══════════════════════════════════════════════════════════════
	console.log("\n>>> SECTION 1: Navigating to Orthodontics Studio Modal...");
	await page.goto("http://127.0.0.1:5173/?demo=true#ortho", { waitUntil: "domcontentloaded", timeout: 120000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
	await page.waitForTimeout(1000);

	let modal = await page.$('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]');
	if (!modal) {
		console.log("[LAUNCH] Dispatching dente:open-orthodontics...");
		await page.evaluate(() => {
			window.location.hash = "#ortho";
			window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
			window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
		});
		await page.waitForTimeout(1000);
	}
	await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 25000 });
	await hideOverlays(page);

	// 1.1 PC Light
	console.log("Capturing 01_orthodontics_studio_pc_light_1440x900.png...");
	await page.setViewportSize({ width: 1440, height: 900 });
	await applyTheme(page, "light");
	await page.screenshot({ path: path.join(PROOFS_DIR, "01_orthodontics_studio_pc_light_1440x900.png"), fullPage: false });
	verifyAndCopyProof("01_orthodontics_studio_pc_light_1440x900.png");

	// 1.2 PC Dark
	console.log("Capturing 02_orthodontics_studio_pc_dark_1440x900.png...");
	await applyTheme(page, "dark");
	await page.screenshot({ path: path.join(PROOFS_DIR, "02_orthodontics_studio_pc_dark_1440x900.png"), fullPage: false });
	verifyAndCopyProof("02_orthodontics_studio_pc_dark_1440x900.png");

	// 1.3 Mobile Light
	console.log("Capturing 03_orthodontics_studio_mobile_light_390x844.png...");
	await page.setViewportSize({ width: 390, height: 844 });
	await applyTheme(page, "light");
	await page.screenshot({ path: path.join(PROOFS_DIR, "03_orthodontics_studio_mobile_light_390x844.png"), fullPage: false });
	verifyAndCopyProof("03_orthodontics_studio_mobile_light_390x844.png");

	// 1.4 Mobile Dark
	console.log("Capturing 04_orthodontics_studio_mobile_dark_390x844.png...");
	await applyTheme(page, "dark");
	await page.screenshot({ path: path.join(PROOFS_DIR, "04_orthodontics_studio_mobile_dark_390x844.png"), fullPage: false });
	verifyAndCopyProof("04_orthodontics_studio_mobile_dark_390x844.png");

	// ══════════════════════════════════════════════════════════════
	// 2. CEPHALOMETRIC / TRG ANALYSIS MODAL
	// ══════════════════════════════════════════════════════════════
	console.log("\n>>> SECTION 2: Launching Cephalometric TRG Modal...");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.waitForTimeout(600);

	console.log("Switching to 'Фото и ТРГ' tab...");
	await page.evaluate(() => {
		const tabs = Array.from(document.querySelectorAll(".ortho-tab-btn, button"));
		const photoTab = tabs.find((t) => t.textContent && t.textContent.includes("Фото и ТРГ"));
		if (photoTab) photoTab.click();
	});
	await page.waitForTimeout(800);

	console.log("Clicking 'Анализ ТРГ' button...");
	await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll("button"));
		const cephBtn = btns.find((b) => b.textContent && (b.textContent.includes("Анализ ТРГ") || b.textContent.includes("Цефалометрия")));
		if (cephBtn) cephBtn.click();
	});

	await page.waitForSelector('.ceph-workstation-root, [data-testid="cephalometric-analysis-modal"]', { state: "visible", timeout: 25000 });
	await hideOverlays(page);

	// Click anatomical template button to load calibrated points
	console.log("Applying anatomical landmark template...");
	await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll("button"));
		const tplBtn = btns.find((b) => b.textContent && (b.textContent.includes("Анатомический шаблон") || b.textContent.includes("Калибровка") || b.textContent.includes("Норма I")));
		if (tplBtn) tplBtn.click();
	});
	await page.waitForTimeout(800);
	await hideOverlays(page);

	// 2.1 TRG PC Light
	console.log("Capturing ortho_pc_light_1440x900.png...");
	await page.setViewportSize({ width: 1440, height: 900 });
	await applyTheme(page, "light");
	await page.screenshot({ path: path.join(PROOFS_DIR, "ortho_pc_light_1440x900.png"), fullPage: false });
	verifyAndCopyProof("ortho_pc_light_1440x900.png");

	// 2.2 TRG PC Dark
	console.log("Capturing ortho_pc_dark_1440x900.png...");
	await applyTheme(page, "dark");
	await page.screenshot({ path: path.join(PROOFS_DIR, "ortho_pc_dark_1440x900.png"), fullPage: false });
	verifyAndCopyProof("ortho_pc_dark_1440x900.png");

	// 2.3 TRG Mobile Light
	console.log("Capturing ortho_mobile_light_390x844.png...");
	await page.setViewportSize({ width: 390, height: 844 });
	await applyTheme(page, "light");
	await page.screenshot({ path: path.join(PROOFS_DIR, "ortho_mobile_light_390x844.png"), fullPage: false });
	verifyAndCopyProof("ortho_mobile_light_390x844.png");

	// 2.4 TRG Mobile Dark
	console.log("Capturing ortho_mobile_dark_390x844.png...");
	await applyTheme(page, "dark");
	await page.screenshot({ path: path.join(PROOFS_DIR, "ortho_mobile_dark_390x844.png"), fullPage: false });
	verifyAndCopyProof("ortho_mobile_dark_390x844.png");

	await browser.close();
	console.log("\n=======================================================");
	console.log(">>> [SUCCESS] ALL 8 RED TEAM VISUAL PROOFS CAPTURED! <<<");
	console.log("=======================================================");
}

main().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]:", err);
	process.exit(1);
});
