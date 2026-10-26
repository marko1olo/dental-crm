import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/lan_connection");
if (!existsSync(PROOFS_DIR)) mkdirSync(PROOFS_DIR, { recursive: true });

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => p && existsSync(p));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	};
	if (browserExecutable) launchOptions.executablePath = browserExecutable;
	return chromium.launch(launchOptions);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const root = document.documentElement;
		root.dataset.theme = th;
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		root.classList.toggle("dark", isDark);
		root.classList.toggle("light", !isDark);
		root.style.colorScheme = isDark ? "dark" : "light";
		document.body.className = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(500);
}

async function openLanQrModal(page) {
	await page.waitForSelector('.topbar, .mobile-tab-bar, [data-tour="schedule-booking"]', { timeout: 45000 });
	await wait(1500);
	await page.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-lan-qr"));
	});
	const modal = page.locator('[data-testid="lan-qr-connection-modal"]');
	const isVis = await modal.isVisible({ timeout: 2000 }).catch(() => false);
	if (!isVis) {
		await wait(1000);
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-lan-qr"));
		});
	}
	await modal.waitFor({ state: "visible", timeout: 8000 });
	await wait(800);
}

async function run() {
	console.log(`[LAN QR Proofs] Launching capture against ${APP_BASE}...`);
	const browser = await getBrowser();

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("[LAN QR Proofs] Creating PC context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto(`${APP_BASE}/?demo=true`, { waitUntil: "commit", timeout: 60000 });
		await openLanQrModal(pcPage);

		// PC Light
		console.log("[LAN QR Proofs] Capturing PC Light (1440x900)...");
		await applyTheme(pcPage, "light");
		const pcLightCanonical = path.join(PROOFS_DIR, "lan_qr_modal_pc_light.png");
		const pcLightCompat = path.join(PROOFS_DIR, "pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightCanonical, fullPage: false });
		copyFileSync(pcLightCanonical, pcLightCompat);
		const pcLightSize = statSync(pcLightCanonical).size;
		console.log(`  ✓ PC Light: ${pcLightCanonical} (${pcLightSize} bytes)`);
		if (pcLightSize < 40000) throw new Error(`PC Light screenshot too small: ${pcLightSize} bytes`);

		// PC Dark
		console.log("[LAN QR Proofs] Capturing PC Dark (1440x900)...");
		await applyTheme(pcPage, "dark");
		const pcDarkCanonical = path.join(PROOFS_DIR, "lan_qr_modal_pc_dark.png");
		const pcDarkCompat = path.join(PROOFS_DIR, "pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkCanonical, fullPage: false });
		copyFileSync(pcDarkCanonical, pcDarkCompat);
		const pcDarkSize = statSync(pcDarkCanonical).size;
		console.log(`  ✓ PC Dark: ${pcDarkCanonical} (${pcDarkSize} bytes)`);
		if (pcDarkSize < 40000) throw new Error(`PC Dark screenshot too small: ${pcDarkSize} bytes`);

		await pcPage.close();
		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844)
		console.log("[LAN QR Proofs] Creating Mobile context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(`${APP_BASE}/?demo=true`, { waitUntil: "commit", timeout: 60000 });
		await openLanQrModal(mobilePage);

		// Mobile Light
		console.log("[LAN QR Proofs] Capturing Mobile Light (390x844)...");
		await applyTheme(mobilePage, "light");
		const mobileLightCanonical = path.join(PROOFS_DIR, "lan_qr_modal_mobile_light.png");
		const mobileLightCompat = path.join(PROOFS_DIR, "mobile_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightCanonical, fullPage: false });
		copyFileSync(mobileLightCanonical, mobileLightCompat);
		const mobileLightSize = statSync(mobileLightCanonical).size;
		console.log(`  ✓ Mobile Light: ${mobileLightCanonical} (${mobileLightSize} bytes)`);
		if (mobileLightSize < 40000) throw new Error(`Mobile Light screenshot too small: ${mobileLightSize} bytes`);

		// Mobile Dark
		console.log("[LAN QR Proofs] Capturing Mobile Dark (390x844)...");
		await applyTheme(mobilePage, "dark");
		const mobileDarkCanonical = path.join(PROOFS_DIR, "lan_qr_modal_mobile_dark.png");
		const mobileDarkCompat = path.join(PROOFS_DIR, "mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: mobileDarkCanonical, fullPage: false });
		copyFileSync(mobileDarkCanonical, mobileDarkCompat);
		const mobileDarkSize = statSync(mobileDarkCanonical).size;
		console.log(`  ✓ Mobile Dark: ${mobileDarkCanonical} (${mobileDarkSize} bytes)`);
		if (mobileDarkSize < 40000) throw new Error(`Mobile Dark screenshot too small: ${mobileDarkSize} bytes`);

		await mobilePage.close();
		await mobileContext.close();

		console.log("[LAN QR Proofs] All 4 canonical states captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[LAN QR Proofs Error]:", err);
	process.exit(1);
});
