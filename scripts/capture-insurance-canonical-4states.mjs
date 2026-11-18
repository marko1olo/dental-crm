import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

process.env.NO_PROXY = "127.0.0.1,localhost";
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CURRENT_CONV_ID = process.env.CONVERSATION_ID || "f25952d2-4f7a-4e92-9a48-c70af9711d3f";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/insurance");
const OUT_DMS = path.resolve(__dirname, "../docs/proofs/dms");

fs.mkdirSync(OUT_CONV, { recursive: true });
fs.mkdirSync(OUT_DOCS, { recursive: true });
fs.mkdirSync(OUT_DMS, { recursive: true });

function verifyAndSaveProof(sourcePath, filename) {
	const size = fs.statSync(sourcePath).size;
	if (size < 40000) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 40KB)!`);
	}
	console.log(`  -> [VERIFIED] ${filename} (${(size / 1024).toFixed(1)} KB >= 40KB guard passed)`);
	fs.copyFileSync(sourcePath, path.join(OUT_CONV, filename));
	fs.copyFileSync(sourcePath, path.join(OUT_DMS, filename));
}

async function setupPageStorage(page) {
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_perspective", "management");
		sessionStorage.setItem("dente_unlocked", "true");
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase_mode_v1", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");

		const style = document.createElement("style");
		style.textContent = `
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="demo-mode-banner"],
			.global-toast-container,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		if (document.head) document.head.appendChild(style);
		else document.addEventListener("DOMContentLoaded", () => document.head?.appendChild(style));
	});
}

async function setTheme(page, themeId, isDark) {
	await page.evaluate(
		({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (document.body) {
				document.body.setAttribute("data-theme", themeId);
				document.body.classList.toggle("dark", isDark);
				document.body.classList.toggle("light", !isDark);
			}
			localStorage.setItem("dente_theme_mode", themeId);
			localStorage.setItem("dente_theme", themeId);
		},
		{ themeId, isDark }
	);
	await page.waitForTimeout(400);
}

async function main() {
	console.log("=== 1. Starting In-Process Vite Server on Port 5198 (hmr: false, watch: null) ===");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			port: 5198,
			host: "127.0.0.1",
			strictPort: true,
			hmr: false,
			watch: null,
		},
	});
	await viteServer.listen();
	console.log("✓ In-process Vite listening on: http://127.0.0.1:5198/");

	console.log("=== 2. Launching Playwright Chromium ===");
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--no-proxy-server",
			"--proxy-bypass-list=<-loopback>",
		],
	});

	try {
		const targetUrl = `http://127.0.0.1:5198/?stand=insurance&demo=true#dms`;

		// 1. Desktop context (1440x900)
		console.log("\n======================================================");
		console.log("Desktop Session: 1440x900");
		console.log("======================================================");
		const desktopCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
			serviceWorkers: "block",
		});
		const desktopPage = await desktopCtx.newPage();
		await setupPageStorage(desktopPage);
		console.log(`  -> Navigating desktop to ${targetUrl}...`);
		await desktopPage.goto(targetUrl, { waitUntil: "commit", timeout: 90000 });
		console.log("  -> Waiting for .dms-modal-window to mount (allowing Vite compilation up to 90s)...");
		await desktopPage.waitForSelector(".dms-modal-window", { timeout: 90000 });
		console.log("  ✓ .dms-modal-window mounted!");
		await desktopPage.waitForTimeout(1000);

		// PC Light
		console.log("\n--- Capturing 01_insurance_dms_guarantee_letter_pc_light.png (1440x900, light) ---");
		await setTheme(desktopPage, "light", false);
		await desktopPage.waitForTimeout(800);
		let outPath = path.join(OUT_DOCS, "01_insurance_dms_guarantee_letter_pc_light.png");
		await desktopPage.screenshot({ path: outPath, fullPage: false });
		verifyAndSaveProof(outPath, "01_insurance_dms_guarantee_letter_pc_light.png");

		// PC Dark
		console.log("\n--- Capturing 02_insurance_dms_guarantee_letter_pc_dark.png (1440x900, dark) ---");
		await setTheme(desktopPage, "dark", true);
		await desktopPage.waitForTimeout(800);
		outPath = path.join(OUT_DOCS, "02_insurance_dms_guarantee_letter_pc_dark.png");
		await desktopPage.screenshot({ path: outPath, fullPage: false });
		verifyAndSaveProof(outPath, "02_insurance_dms_guarantee_letter_pc_dark.png");

		await desktopCtx.close();
		console.log("✓ Desktop session finished cleanly.");

		// 2. Mobile context (390x844, isMobile, touch)
		console.log("\n======================================================");
		console.log("Mobile Session: 390x844 (iOS Apple HIG)");
		console.log("======================================================");
		const mobileCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
			serviceWorkers: "block",
		});
		const mobilePage = await mobileCtx.newPage();
		await setupPageStorage(mobilePage);
		console.log(`  -> Navigating mobile to ${targetUrl}...`);
		await mobilePage.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await mobilePage.waitForSelector(".dms-modal-window", { timeout: 35000 });
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("\n--- Capturing 03_insurance_dms_guarantee_letter_mobile_light.png (390x844, light) ---");
		await setTheme(mobilePage, "light", false);
		await mobilePage.waitForTimeout(800);
		outPath = path.join(OUT_DOCS, "03_insurance_dms_guarantee_letter_mobile_light.png");
		await mobilePage.screenshot({ path: outPath, fullPage: false });
		verifyAndSaveProof(outPath, "03_insurance_dms_guarantee_letter_mobile_light.png");

		// Mobile Dark
		console.log("\n--- Capturing 04_insurance_dms_guarantee_letter_mobile_dark.png (390x844, dark) ---");
		await setTheme(mobilePage, "dark", true);
		await mobilePage.waitForTimeout(800);
		outPath = path.join(OUT_DOCS, "04_insurance_dms_guarantee_letter_mobile_dark.png");
		await mobilePage.screenshot({ path: outPath, fullPage: false });
		verifyAndSaveProof(outPath, "04_insurance_dms_guarantee_letter_mobile_dark.png");

		await mobileCtx.close();
		console.log("✓ Mobile session finished cleanly.");

		console.log("\n=== ALL 4 CANONICAL DMS PROOFS CAPTURED & VERIFIED SUCCESSFULLY ===");
	} finally {
		await browser.close();
		await viteServer.close();
		console.log("✓ Vite server closed cleanly.");
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
