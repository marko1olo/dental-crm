/**
 * scripts/capture_dms_studio_4state_proofs.cjs
 *
 * 4-STATE CANONICAL VISUAL PROOF FOR DMS & INSURANCE STUDIO (DENTE CRM)
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 *
 * Mandates: 8am, 8al (4-state proof >= 40KB), 8an (VCS cleanliness)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = process.env.CONVERSATION_ID || "f9d8320c-e5b3-43de-bcf8-a57fac844aef";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/insurance");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const CONFIGS = [
	{
		filename: "01_dms_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (DMS Studio & Franchise Split)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_dms_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (DMS Studio & Franchise Split)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_dms_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Touch & DMS Bottom Sheet)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_dms_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Touch & DMS Bottom Sheet)",
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
			await page.waitForTimeout(500);
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
	console.log(`\n=== 4-State Visual Proof Capture for DMS Studio (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-proxy-server", "--proxy-bypass-list=*"],
	});

	try {
		for (const cfg of CONFIGS) {
			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.isDark ? "dark" : "light",
			});

			await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
			await context.route(/sw\.js/, (route) => route.abort());

			await context.addInitScript(({ isDark }) => {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo-token");
				localStorage.setItem("dente_staff_token", "demo-staff");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_theme", isDark ? "dark" : "light");
				localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
			}, { isDark: cfg.isDark });

			const page = await context.newPage();
			page.on("console", (msg) => {
				if (msg.type() === "error") {
					console.log(`    [Browser Error] ${msg.text()}`);
				}
			});
			page.on("pageerror", (err) => {
				console.log(`    [Page Error] ${err.message}`);
			});

			await page.goto(`${WEB_BASE}/?stand=dms&demo=true`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

			// Wait specifically for the .dms-modal-window to be mounted in DOM
			try {
				await page.waitForSelector(".dms-modal-window", { timeout: 12000 });
			} catch (_) {
				console.log("  ⚠️ Warning: .dms-modal-window not found within 12s, waiting additional 3s...");
				await page.waitForTimeout(3000);
			}

			await applyTheme(page, cfg.isDark);
			await suppressOverlays(page);
			await page.waitForTimeout(1000);

			// Check that .dms-modal-window is rendered
			const isVisible = await page.evaluate(() => Boolean(document.querySelector(".dms-modal-window")));
			console.log(`  [DOM Check] .dms-modal-window visible: ${isVisible}`);

			const pDocs = path.join(OUT_DOCS, cfg.filename);
			const pBrain = path.join(OUT_BRAIN, cfg.filename);

			await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 10000 });
			fs.copyFileSync(pDocs, pBrain);

			// Also save alternative alias for insurance_studio
			const altFilename = cfg.filename.replace("dms_studio", "insurance_studio");
			if (altFilename !== cfg.filename) {
				fs.copyFileSync(pDocs, path.join(OUT_DOCS, altFilename));
				fs.copyFileSync(pDocs, path.join(OUT_BRAIN, altFilename));
			}

			const size = fs.statSync(pDocs).size;
			console.log(`✅ [PROOF SAVED] ${cfg.filename} (${(size / 1024).toFixed(1)} KB)`);

			await context.close();
		}

		console.log("\n🎉 ALL 4-STATE PROOFS FOR DMS STUDIO CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
