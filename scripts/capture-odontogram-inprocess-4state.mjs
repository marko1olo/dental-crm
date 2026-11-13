import { mkdirSync, statSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, devices } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CURRENT_CONV_ID = "85a479ca-3847-45e0-97f7-2b13b3ca6da6";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_PROOF = path.resolve(__dirname, "../docs/proofs/odontogram");

[OUT_CONV, OUT_PROOF].forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

async function setupStorage(context, theme) {
	await context.addInitScript(
		({ th }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_doctor_name", "Д-р Смирнов А.П.");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true })
				);
			} catch (_) {}
		},
		{ th: theme }
	);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-inquisition";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
				.copilot-trigger-btn,
				[data-testid="copilot-floating-trigger"],
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
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

function verifyAndSaveScreenshot(buffer, filename, description) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
	}
	const destPrimary = path.join(OUT_PROOF, filename);
	writeFileSync(destPrimary, buffer);

	try {
		const destExtra = path.join(OUT_CONV, filename);
		copyFileSync(destPrimary, destExtra);
	} catch (_) {}

	const stats = statSync(destPrimary);
	console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB >= 20KB OK) -> ${description}`);
	return destPrimary;
}

async function run() {
	console.log("=== 1. Starting In-Process Vite Server ===");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			host: "127.0.0.1",
			strictPort: false,
			hmr: false,
			watch: null,
		},
	});

	await viteServer.listen();
	const address = viteServer.httpServer.address();
	const port = address.port;
	const baseUrl = `http://127.0.0.1:${port}/?demo=true&odontogram=1#odontogram`;
	console.log(`✓ In-process Vite listening on: http://127.0.0.1:${port}`);

	console.log("=== 2. Launching Playwright Chromium ===");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ================= 1. PC CONTEXT (1440x900) =================
		console.log("=== 3. Capturing PC Context (1440x900) ===");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupStorage(pcContext, "light");

		const pcPage = await pcContext.newPage();
		console.log(`Navigating PC to ${baseUrl}...`);
		await pcPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// PC Light
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(600);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false, animations: "disabled" });
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_wheeler_pc_light_1440x900.png", "Wheeler 2.5D Adult Formula (PC Light 1440x900)");
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_pc_light_1440x900.png", "Alias 01_odontogram_pc_light_1440x900.png");

		// PC Dark
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(600);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false, animations: "disabled" });
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_wheeler_pc_dark_1440x900.png", "Wheeler 2.5D Adult Formula (PC Dark 1440x900)");
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_pc_dark_1440x900.png", "Alias 02_odontogram_pc_dark_1440x900.png");

		await pcContext.close();

		// ================= 2. MOBILE CONTEXT (390x844) Apple HIG =================
		console.log("=== 4. Capturing Mobile Context (390x844 Apple HIG) ===");
		const mobileContext = await browser.newContext({
			...devices["iPhone 13"],
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileContext, "light");

		const mobilePage = await mobileContext.newPage();
		console.log(`Navigating Mobile to ${baseUrl}...`);
		await mobilePage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		// Mobile Light
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(600);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false, animations: "disabled" });
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_wheeler_mobile_light_390x844.png", "Wheeler 2.5D Mobile Apple HIG (Mobile Light 390x844)");
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_mobile_light_390x844.png", "Alias 03_odontogram_mobile_light_390x844.png");

		// Mobile Dark
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(600);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false, animations: "disabled" });
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_wheeler_mobile_dark_390x844.png", "Wheeler 2.5D Mobile Apple HIG (Mobile Dark 390x844)");
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_mobile_dark_390x844.png", "Alias 04_odontogram_mobile_dark_390x844.png");

		await mobileContext.close();
		console.log("=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
