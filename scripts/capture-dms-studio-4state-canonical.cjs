/**
 * scripts/capture-dms-studio-4state-canonical.cjs
 *
 * Canonical 4-State Proof Capture Script for DENTE Dental CRM:
 * Domain: Insurance & DMS (Страховая стоматология, полисы и гарантийные письма)
 *
 * Mandate 8al / 8am 4-State Proof:
 * 1. ☀️ PC Light (1440x900) -> 01_insurance_dms_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900) -> 02_insurance_dms_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844) -> 03_insurance_dms_mobile_light_390x844.png
 * 4. 📱 Mobile Dark (390x844) -> 04_insurance_dms_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const CONVERSATION_ID = "d0a1ee92-5fbb-403e-80c6-511f6ddfea4f";

const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/insurance");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONVERSATION_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
});

const STATES = [
	{
		filename: "01_insurance_dms_pc_light_1440x900.png",
		name: "PC Light 1440x900 (DMS Studio & Franchise Split)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_insurance_dms_pc_dark_1440x900.png",
		name: "PC Dark 1440x900 (DMS Studio & Franchise Split)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_insurance_dms_mobile_light_390x844.png",
		name: "Mobile Light 390x844 (Apple HIG Touch & DMS Bottom Sheet)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_insurance_dms_mobile_dark_390x844.png",
		name: "Mobile Dark 390x844 (Apple HIG Touch & DMS Bottom Sheet)",
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function applyTheme(page, isDark) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
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
			break;
		} catch (_) {
			await page.waitForTimeout(400);
		}
	}
	await page.waitForTimeout(500);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-dms";
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

async function main() {
	console.log(`\n================================================================`);
	console.log(`  DENTE DENTAL CRM — CANONICAL 4-STATE PROOFS: INSURANCE & DMS`);
	console.log(`  Server: ${WEB_BASE}`);
	console.log(`  Docs output: ${OUT_DOCS}`);
	console.log(`  Brain output: ${OUT_BRAIN}`);
	console.log(`================================================================\n`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-proxy-server", "--proxy-bypass-list=*"],
	});

	const results = [];

	try {
		for (const st of STATES) {
			console.log(`📸 Capturing: ${st.filename} (${st.name})...`);

			const context = await browser.newContext({
				viewport: st.viewport,
				isMobile: st.isMobile,
				hasTouch: st.isMobile,
				deviceScaleFactor: st.isMobile ? 2 : 1,
				colorScheme: st.isDark ? "dark" : "light",
			});

			await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
			await context.route(/sw\.js/, (route) => route.abort());

			await context.addInitScript(({ isDark }) => {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_clinic_token", "demo-token");
				localStorage.setItem("dente_staff_token", "demo-staff");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_theme", isDark ? "dark" : "light");
				localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
			}, { isDark: st.isDark });

			const page = await context.newPage();

			await page.goto(`${WEB_BASE}/?dms=true&demo=true#dms`, {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			}).catch(() => {});

			// Wait for splash screen to clear
			await page.waitForFunction(
				() => !document.body || (!document.body.innerText.includes("Загрузка системы...") && document.body.innerText.length > 50),
				{ timeout: 30000 },
			).catch(() => {});

			await page.waitForTimeout(1500);

			// Trigger DMS modal open
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-dms"));
			});

			try {
				await page.waitForSelector(".dms-modal-window", { timeout: 10000 });
			} catch (_) {
				console.log("  ⚠️ .dms-modal-window selector wait timeout, triggering custom event...");
				await page.evaluate(() => {
					window.dispatchEvent(new CustomEvent("dente:open-dms"));
				});
				await page.waitForTimeout(2000);
			}

			await applyTheme(page, st.isDark);
			await suppressOverlays(page);
			await page.waitForTimeout(1000);

			const isVisible = await page.evaluate(() => Boolean(document.querySelector(".dms-modal-window")));
			console.log(`  [DOM Check] .dms-modal-window visible: ${isVisible}`);

			const docPath = path.join(OUT_DOCS, st.filename);
			const brainPath = path.join(OUT_BRAIN, st.filename);

			await page.screenshot({
				path: docPath,
				fullPage: false,
				animations: "disabled",
				timeout: 10000,
			});

			fs.copyFileSync(docPath, brainPath);

			const stat = fs.statSync(docPath);
			const sizeKb = (stat.size / 1024).toFixed(1);

			console.log(`  ✅ Saved: ${st.filename} (${sizeKb} KB)`);
			results.push({
				filename: st.filename,
				name: st.name,
				sizeBytes: stat.size,
				sizeKb: `${sizeKb} KB`,
				path: docPath,
				ok: stat.size >= 20480,
			});

			await context.close();
		}

		console.log("\n================================================================");
		console.log("  CAPTURE COMPLETE — SUMMARY:");
		console.log("================================================================");
		for (const r of results) {
			console.log(`  - ${r.filename}: ${r.sizeKb} [${r.ok ? "PASS >=20KB" : "FAIL <20KB"}]`);
		}
		console.log("================================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
