/**
 * scripts/capture_mobile_inventory_screenshots.cjs
 *
 * Captures mobile inventory screenshots at 390x844 (iPhone 14/15/16)
 * in Light and Dark themes per Apple Store Inventory Style HIG:
 * 1. docs/screenshots/inquisition_live/proof_mobile_inventory_light.png
 * 2. docs/screenshots/inquisition_live/proof_mobile_inventory_dark.png
 *
 * Copies to C:\Users\Admin\.gemini\antigravity\brain\beb92312-c6d7-426d-a438-12dcad022abc\
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const outputDirs = [
	path.resolve(__dirname, "../docs/screenshots/inquisition_live"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc"),
];

for (const dir of outputDirs) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function checkPort(port, host = "127.0.0.1") {
	return new Promise((resolve) => {
		const req = http.get(`http://${host}:${port}/`, (res) => {
			resolve(true);
		});
		req.on("error", () => resolve(false));
		req.setTimeout(1000, () => {
			req.destroy();
			resolve(false);
		});
	});
}

async function waitForServer(url, timeoutMs = 25000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const ok = await new Promise((res) => {
				const req = http.get(url, (response) => {
					res(response.statusCode >= 200 && response.statusCode < 400);
				});
				req.on("error", () => res(false));
				req.setTimeout(1000, () => {
					req.destroy();
					res(false);
				});
			});
			if (ok) return true;
		} catch {
			// retry
		}
		await new Promise((r) => setTimeout(r, 600));
	}
	throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function main() {
	console.log("=== STARTING MOBILE INVENTORY PLAYWRIGHT SCREENSHOTS (390x844) ===");

	let viteProcess = null;
	const isViteLive = await checkPort(5173);

	if (!isViteLive) {
		console.log(">>> Vite server is not running on 5173. Spawning Vite dev server...");
		const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
		const webDir = path.resolve(__dirname, "../apps/web");

		viteProcess = spawn("node", [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
			cwd: webDir,
			stdio: "inherit",
			shell: true,
		});

		await waitForServer("http://127.0.0.1:5173/inventory_mobile_preview.html");
		console.log(">>> Vite dev server ready on http://127.0.0.1:5173/");
	} else {
		console.log(">>> Detected existing Vite server on port 5173.");
	}

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

	console.log(`>>> Launching Chromium (executable: ${executablePath || "bundled"})...`);
	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
		});

		const page = await context.newPage();

		// ─── 1. MOBILE LIGHT (390x844) ───
		console.log(">>> Navigating to Mobile Inventory (Light Theme 390x844)...");
		await page.goto("http://127.0.0.1:5173/inventory_mobile_preview.html?theme=light", {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		await page.waitForSelector('[data-testid="mobile-inventory-grouped-card"]', {
			state: "visible",
			timeout: 15000,
		});
		await page.waitForTimeout(1000);

		const lightFile = "proof_mobile_inventory_light.png";
		const primaryLightPath = path.join(outputDirs[0], lightFile);
		await page.screenshot({ path: primaryLightPath, fullPage: false });

		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryLightPath, path.join(outputDirs[i], lightFile));
		}

		console.log(
			`[CAPTURED] ${lightFile} (${(fs.statSync(primaryLightPath).size / 1024).toFixed(1)} KB)`,
		);

		// Capture Light Bottom Sheet Drawer
		console.log(">>> Opening Bottom Sheet Drawer (Light)...");
		await page.click('[data-testid="mobile-btn-inbound-batch"]');
		await page.waitForSelector('[data-testid="mobile-inventory-drawer"]', { visible: true, timeout: 10000 });
		await page.waitForTimeout(600);

		const lightSheetFile = "proof_mobile_inventory_sheet_light.png";
		const primaryLightSheetPath = path.join(outputDirs[0], lightSheetFile);
		await page.screenshot({ path: primaryLightSheetPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryLightSheetPath, path.join(outputDirs[i], lightSheetFile));
		}
		console.log(`[CAPTURED] ${lightSheetFile} (${(fs.statSync(primaryLightSheetPath).size / 1024).toFixed(1)} KB)`);

		// ─── 2. MOBILE DARK (390x844) ───
		console.log(">>> Navigating to Mobile Inventory (Dark Theme 390x844)...");
		await page.goto("http://127.0.0.1:5173/inventory_mobile_preview.html?theme=dark", {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		await page.waitForSelector('[data-testid="mobile-inventory-grouped-card"]', {
			state: "visible",
			timeout: 15000,
		});
		await page.waitForTimeout(1000);

		const darkFile = "proof_mobile_inventory_dark.png";
		const primaryDarkPath = path.join(outputDirs[0], darkFile);
		await page.screenshot({ path: primaryDarkPath, fullPage: false });

		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryDarkPath, path.join(outputDirs[i], darkFile));
		}

		console.log(
			`[CAPTURED] ${darkFile} (${(fs.statSync(primaryDarkPath).size / 1024).toFixed(1)} KB)`,
		);

		// Capture Dark Bottom Sheet Drawer
		console.log(">>> Opening Bottom Sheet Drawer (Dark)...");
		await page.waitForSelector('[data-testid="mobile-btn-inbound-batch"]', { state: "visible" });
		await page.click('[data-testid="mobile-btn-inbound-batch"]');
		await page.waitForSelector('[data-testid="mobile-inventory-drawer"]', { state: "visible", timeout: 10000 });
		await page.waitForTimeout(800);

		const darkSheetFile = "proof_mobile_inventory_sheet_dark.png";
		const primaryDarkSheetPath = path.join(outputDirs[0], darkSheetFile);
		await page.screenshot({ path: primaryDarkSheetPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryDarkSheetPath, path.join(outputDirs[i], darkSheetFile));
		}
		console.log(`[CAPTURED] ${darkSheetFile} (${(fs.statSync(primaryDarkSheetPath).size / 1024).toFixed(1)} KB)`);

		console.log(">>> ALL MOBILE INVENTORY SCREENSHOTS CAPTURED CLEANLY!");
	} finally {
		await browser.close();
		if (viteProcess) {
			console.log(">>> Shutting down spawned Vite process...");
			try {
				process.kill(-viteProcess.pid);
			} catch {
				try {
					viteProcess.kill();
				} catch {}
			}
		}
	}
}

main().catch((err) => {
	console.error("FATAL in capture_mobile_inventory_screenshots:", err);
	process.exit(1);
});
