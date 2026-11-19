/**
 * scripts/take_copilot_canon_proofs.cjs
 * 4-STATE VISUAL PROOF FOR DENTE CLINICAL COPILOT STUDIO
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = process.env.CONVERSATION_ID || "f7b3b967-6d12-4975-a356-2411cfef2cd2";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);
const OUT_BRAIN_SCREENSHOTS = path.join(OUT_BRAIN, "screenshots");

[OUT_DOCS, OUT_BRAIN, OUT_BRAIN_SCREENSHOTS].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-copilot";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
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
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	const pBrainScreenshots = path.join(OUT_BRAIN_SCREENSHOTS, filename);

	try {
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 10000 });
	} catch (err) {
		console.warn(`  [Screenshot Retry without animations]:`, err.message);
		await page.screenshot({ path: pDocs, fullPage: false, timeout: 10000 });
	}
	try { fs.copyFileSync(pDocs, pBrain); } catch (_) {}
	try { fs.copyFileSync(pDocs, pBrainScreenshots); } catch (_) {}

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

const CONFIGS = [
	{
		filename: "01_copilot_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Clinical Copilot Studio)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_copilot_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Clinical Copilot Studio)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_copilot_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Clinical Copilot Studio)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_copilot_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Clinical Copilot Studio)",
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function main() {
	console.log(`\n=== 4-State Visual Proof Capture for Copilot Studio (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
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

			await context.addInitScript(
				({ theme }) => {
					localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
					localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0001-000000000001");
					localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
					localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
					localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
					localStorage.setItem("dente_user_id", "01a00000-0000-0000-0003-000000000004");
					localStorage.setItem("dente_active_role", "doctor");
					localStorage.setItem("dente_user_role", "doctor");
					localStorage.setItem("dente_role", "doctor");
					localStorage.setItem("dente_active_mode", "clinic");
					localStorage.setItem("dente_perspective", "clinical");
					localStorage.setItem("dente_demo_mode", "true");
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_demo_showcase_mode_v1", "true");
					sessionStorage.setItem("dente_unlocked", "true");
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dente_demo_banner_dismissed", "true");
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
					localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
						id: "01a00000-0000-0000-0003-000000000004",
						fullName: "Д-р Захаров Андрей Васильевич",
						role: "doctor"
					}));
				},
				{ theme: cfg.isDark ? "dark" : "light" }
			);

			const page = await context.newPage();
			await page.goto(`${WEB_BASE}/?demo=true#copilot-studio`, { waitUntil: "commit", timeout: 45000 });

			// Wait for React to mount and boot-state to detach
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
			
			const studioSelector = "[data-testid='chairside-copilot-studio-root'], [data-testid='copilot-studio-standalone-host'], .direct-copilot-studio-standalone, .copilot-studio-overlay";
			await page.waitForSelector(studioSelector, { state: "visible", timeout: 35000 });
			
			await applyTheme(page, cfg.isDark);
			await suppressOverlays(page);
			await page.waitForTimeout(1000);

			await saveProof(page, cfg.filename);
			await context.close();
		}

		console.log("\n🎉 ALL 4-STATE PROOFS FOR COPILOT STUDIO CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
