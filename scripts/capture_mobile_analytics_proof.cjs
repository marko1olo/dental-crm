/**
 * scripts/capture_mobile_analytics_proof.cjs
 *
 * Red Team Inquisitor: Снятие доказательных скриншотов суверенного мобильного дашборда
 * аналитики и KPI (Apple Fitness & Health HIG) в разрешении iPhone 14/15/16 (390x844).
 *
 * Требуемые файлы:
 * 1. docs/screenshots/inquisition_live/proof_mobile_analytics_light.png
 * 2. docs/screenshots/inquisition_live/proof_mobile_analytics_dark.png
 *
 * Копия в brain:
 * C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc/
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
		const req = http.get(`http://${host}:${port}/`, () => {
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

async function captureScreenshot(page, filename) {
	const primaryPath = path.join(outputDirs[0], filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	for (let i = 1; i < outputDirs.length; i++) {
		fs.copyFileSync(primaryPath, path.join(outputDirs[i], filename));
	}
	const sizeKb = (fs.statSync(primaryPath).size / 1024).toFixed(1);
	console.log(`[CAPTURED] ${filename} (${sizeKb} KB)`);
	return primaryPath;
}

async function main() {
	console.log("=== STARTING MOBILE ANALYTICS (APPLE FITNESS HIG) 390x844 SCREENSHOT CAPTURE ===");

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

		await waitForServer("http://127.0.0.1:5173/mobile_analytics_preview.html");
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

		async function loadAndCapture(url, selector, filename) {
			console.log(`>>> Loading ${url}...`);
			const page = await context.newPage();
			try {
				await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
				if (selector) {
					await page.waitForSelector(selector, { state: "visible", timeout: 15000 });
				}
				await page.waitForTimeout(800);
				await captureScreenshot(page, filename);
			} finally {
				await page.close();
			}
		}

		// ─── 1. MOBILE ANALYTICS LIGHT (390x844) ───
		await loadAndCapture(
			"http://127.0.0.1:5173/mobile_analytics_preview.html?theme=light",
			'[data-testid="mobile-executive-dashboard"]',
			"proof_mobile_analytics_light.png"
		);

		// ─── 2. MOBILE ANALYTICS DARK (390x844) ───
		await loadAndCapture(
			"http://127.0.0.1:5173/mobile_analytics_preview.html?theme=dark",
			'[data-testid="mobile-executive-dashboard"]',
			"proof_mobile_analytics_dark.png"
		);

		console.log("=== SCREENSHOT HARVEST COMPLETED SUCCESSFULLY ===");
	} finally {
		await browser.close();
		if (viteProcess) {
			console.log(">>> Cleaning up spawned Vite process...");
			try {
				process.kill(viteProcess.pid);
			} catch {
				// ignore
			}
		}
	}
}

main().catch((err) => {
	console.error("FATAL ERROR capturing mobile analytics screenshots:", err);
	process.exit(1);
});
