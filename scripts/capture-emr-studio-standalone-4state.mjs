/**
 * scripts/capture-emr-studio-standalone-4state.mjs
 *
 * Canonical 4-State Visual Proof Capture for EMR Medical Record Studio Modal:
 * 1. ☀️ PC Light (1440x900): docs/proofs/emr/01_emr_studio_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/proofs/emr/02_emr_studio_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/proofs/emr/03_emr_studio_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/proofs/emr/04_emr_studio_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = "a11acdee-8a25-44e7-b018-b764be1fcc4b";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/emr");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/emr");
const OUT_BRAIN = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/emr`;

for (const d of [OUT_DOCS, OUT_SCREENSHOTS, OUT_BRAIN]) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STATES = [
	{
		name: "01_emr_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (EMR Medical Record Studio Modal)",
		width: 1440,
		height: 900,
		theme: "light",
		isMobile: false,
	},
	{
		name: "02_emr_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (EMR Medical Record Studio Modal)",
		width: 1440,
		height: 900,
		theme: "dark",
		isMobile: false,
	},
	{
		name: "03_emr_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet EMR Medical Record)",
		width: 390,
		height: 844,
		theme: "light",
		isMobile: true,
	},
	{
		name: "04_emr_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet EMR Medical Record)",
		width: 390,
		height: 844,
		theme: "dark",
		isMobile: true,
	},
];

async function capture() {
	console.log("=== CAPTURING 4-STATE EMR STUDIO STANDALONE PROOFS ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const st of STATES) {
			console.log(`\n📸 Capturing ${st.name} (${st.desc})...`);
			const context = await browser.newContext({
				viewport: { width: st.width, height: st.height },
				deviceScaleFactor: st.isMobile ? 2 : 1,
				hasTouch: st.isMobile,
				isMobile: st.isMobile,
				colorScheme: st.theme,
			});

			await context.addInitScript(({ theme }) => {
				try {
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_demo_mode", "true");
					localStorage.setItem("dente_clinic_token", "demo-clinic-token");
					localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
					localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-chief");
					localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
					localStorage.setItem("dente_user_id", "doc-1");
					localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
					localStorage.setItem("dente_user_role", "doctor");
					localStorage.setItem("dente_role", "doctor");
					localStorage.setItem("dente_perspective", "doctor");
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("dente-theme", theme);
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				} catch (_) {}
			}, { theme: st.theme });

			const page = await context.newPage();
			const targetUrl = `http://127.0.0.1:5173/?standalone=emr&diaries=1&demo=true`;
			await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

			await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
			await page.waitForSelector('[data-testid="emr-medical-record-standalone-root"], .emr-studio-window, .emr043-modal-window', { timeout: 25000 });

			await page.evaluate((theme) => {
				const style = document.createElement("style");
				style.id = "suppress-all-overlays";
				style.innerHTML = `
					.tour-spotlight-root,
					.tour-backdrop-clickable-zone,
					[data-testid="guided-tour-spotlight-overlay"],
					[data-testid="guided-tour-coach-mark-card"],
					[data-testid="demo-mode-banner"],
					.global-toast-container,
					.shepherd-element {
						display: none !important;
						pointer-events: none !important;
					}
				`;
				document.head.appendChild(style);

				document.documentElement.setAttribute("data-theme", theme);
				const isDark = theme === "dark";
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				document.body.setAttribute("data-theme", theme);
				document.body.classList.toggle("dark", isDark);
				document.body.classList.toggle("light", !isDark);
			}, st.theme);

			await sleep(1200);

			const pDocs = path.join(OUT_DOCS, st.name);
			const pScreens = path.join(OUT_SCREENSHOTS, st.name);
			const pBrain = path.join(OUT_BRAIN, st.name);

			await page.screenshot({ path: pDocs, fullPage: false });
			copyFileSync(pDocs, pScreens);
			copyFileSync(pDocs, pBrain);

			const size = statSync(pDocs).size;
			if (size < 30720) {
				throw new Error(`[BLANK DETECTED] ${st.name} is ${size} bytes (< 30KB)!`);
			}
			console.log(`✅ [SAVED] ${st.name} (${Math.round(size / 1024)} KB)`);

			await context.close();
		}
		console.log("\n🎉 ALL 4-STATE PROOFS VERIFIED AND CAPTURED!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
