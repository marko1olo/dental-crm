/**
 * capture_queue_proofs.mjs
 *
 * Captures 4-state visual proofs for:
 * 1. TodayQueueBoard (PC Light, PC Dark, Mobile Light, Mobile Dark)
 * 2. QueueBillboardView (Lobby TV Billboard PC Light, PC Dark)
 *
 * Adheres to:
 * - PC 1440x900, Mobile 390x844
 * - Apple HIG touch ergonomics & UI standards (h-9 / min-h-[36px], min-h-[44px] mobile)
 * - 152-FZ patient privacy on TV Billboard
 * - Zero cartoon emojis
 * - Output files strictly >= 20KB each
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/queue");

if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
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
	await wait(600);
}

async function run() {
	console.log(`[Queue Proofs] Starting capture engine at ${APP_BASE}`);
	const browser = await getBrowser();

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("[Queue Proofs] Creating PC context (1440x900)");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		// A. TODAY QUEUE BOARD (PC LIGHT & DARK)
		console.log("[Queue Proofs] Navigating to Shift Queue (#queue) on PC...");
		const queuePage = await pcContext.newPage();
		await queuePage.goto(`${APP_BASE}/?demo=true#queue`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await queuePage.waitForSelector('[data-testid="today-queue-board"]', { timeout: 15000 });
		await wait(1200);

		// PC Light
		console.log("[Queue Proofs] Capturing PC Light TodayQueueBoard...");
		await applyTheme(queuePage, "light");
		const pcLightPath = path.join(PROOFS_DIR, "queue_today_board_pc_light.png");
		await queuePage.screenshot({ path: pcLightPath, fullPage: false });
		console.log(`  ✓ Saved: ${pcLightPath} (${statSync(pcLightPath).size} bytes)`);

		// PC Dark
		console.log("[Queue Proofs] Capturing PC Dark TodayQueueBoard...");
		await applyTheme(queuePage, "dark");
		const pcDarkPath = path.join(PROOFS_DIR, "queue_today_board_pc_dark.png");
		await queuePage.screenshot({ path: pcDarkPath, fullPage: false });
		console.log(`  ✓ Saved: ${pcDarkPath} (${statSync(pcDarkPath).size} bytes)`);

		await queuePage.close();

		// B. LOBBY TV BILLBOARD (PC LIGHT & DARK)
		console.log("[Queue Proofs] Navigating to Lobby TV Billboard (#lobby) on PC...");
		const lobbyPage = await pcContext.newPage();
		await lobbyPage.goto(`${APP_BASE}/?demo=true#lobby`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await lobbyPage.waitForSelector('[data-testid="queue-billboard-view"]', { timeout: 15000 });
		await wait(1200);

		// PC Billboard Light
		console.log("[Queue Proofs] Capturing PC Light Lobby Billboard...");
		await applyTheme(lobbyPage, "light");
		const billboardLightPath = path.join(PROOFS_DIR, "queue_lobby_billboard_pc_light.png");
		await lobbyPage.screenshot({ path: billboardLightPath, fullPage: false });
		console.log(`  ✓ Saved: ${billboardLightPath} (${statSync(billboardLightPath).size} bytes)`);

		// PC Billboard Dark
		console.log("[Queue Proofs] Capturing PC Dark Lobby Billboard...");
		await applyTheme(lobbyPage, "dark");
		const billboardDarkPath = path.join(PROOFS_DIR, "queue_lobby_billboard_pc_dark.png");
		await lobbyPage.screenshot({ path: billboardDarkPath, fullPage: false });
		console.log(`  ✓ Saved: ${billboardDarkPath} (${statSync(billboardDarkPath).size} bytes)`);

		await lobbyPage.close();
		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844)
		console.log("[Queue Proofs] Creating Mobile context (390x844)");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();

		console.log("[Queue Proofs] Navigating to Shift Queue (#queue) on Mobile...");
		await mobilePage.goto(`${APP_BASE}/?demo=true#queue`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="today-queue-board"]', { timeout: 30000 });
		await wait(2000);

		// Mobile Light
		console.log("[Queue Proofs] Capturing Mobile Light TodayQueueBoard...");
		await applyTheme(mobilePage, "light");
		const mobileLightPath = path.join(PROOFS_DIR, "queue_today_board_mobile_light.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		console.log(`  ✓ Saved: ${mobileLightPath} (${statSync(mobileLightPath).size} bytes)`);

		// Mobile Dark
		console.log("[Queue Proofs] Capturing Mobile Dark TodayQueueBoard...");
		await applyTheme(mobilePage, "dark");
		const mobileDarkPath = path.join(PROOFS_DIR, "queue_today_board_mobile_dark.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		console.log(`  ✓ Saved: ${mobileDarkPath} (${statSync(mobileDarkPath).size} bytes)`);

		await mobilePage.close();
		await mobileContext.close();

		// Verification of sizes >= 20480 bytes
		const files = [
			pcLightPath,
			pcDarkPath,
			billboardLightPath,
			billboardDarkPath,
			mobileLightPath,
			mobileDarkPath,
		];

		console.log("\n[Queue Proofs] Asserting file sizes (>= 20KB)...");
		for (const f of files) {
			const size = statSync(f).size;
			if (size < 20480) {
				throw new Error(`Proof file ${f} is too small: ${size} bytes (< 20KB)`);
			}
			console.log(`  ✓ ${path.basename(f)}: ${size} bytes -> OK`);
		}

		console.log("\n[Queue Proofs] All 6 proofs captured and verified successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Queue Proofs ERROR]", err);
	process.exit(1);
});
