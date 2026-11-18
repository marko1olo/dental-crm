import { chromium } from "playwright";
import * as esbuild from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/b1e5095a-2f36-4484-9df3-e3f1b7700cc0";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/3d_scanner";
const PORT = 5179;
const URL_PREVIEW = `http://127.0.0.1:${PORT}/scan3d-preview.html`;

if (!fs.existsSync(OUT_CONV)) fs.mkdirSync(OUT_CONV, { recursive: true });
if (!fs.existsSync(OUT_DOCS)) fs.mkdirSync(OUT_DOCS, { recursive: true });

async function saveProof(name, buffer) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${name} is too small: ${buffer.length} bytes (minimum 20KB required)`);
	}
	const p1 = path.join(OUT_CONV, name);
	const p2 = path.join(OUT_DOCS, name);
	fs.writeFileSync(p1, buffer);
	fs.writeFileSync(p2, buffer);
	console.log(`[PROOF CAPTURED] ${name} -> ${buffer.length} bytes (>= 20KB OK)`);
}

function startStaticServer() {
	return new Promise((resolve) => {
		const server = http.createServer((req, res) => {
			const cleanUrl = (req.url || "/").split("?")[0];
			const requestedFile = cleanUrl === "/" ? "/scan3d-preview.html" : cleanUrl;
			const filePath = path.join("C:/Clinic_MVP/dental-crm/apps/web/public", requestedFile);

			if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
				const ext = path.extname(filePath).toLowerCase();
				const mimeMap = {
					".html": "text/html; charset=utf-8",
					".js": "application/javascript; charset=utf-8",
					".css": "text/css; charset=utf-8",
					".svg": "image/svg+xml",
					".png": "image/png",
					".json": "application/json",
				};
				res.writeHead(200, {
					"Content-Type": mimeMap[ext] || "application/octet-stream",
					"Access-Control-Allow-Origin": "*",
				});
				fs.createReadStream(filePath).pipe(res);
			} else {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end(`File not found: ${cleanUrl}`);
			}
		});

		server.listen(PORT, "127.0.0.1", () => {
			console.log(`Static proof server listening on http://127.0.0.1:${PORT}`);
			resolve(server);
		});
	});
}

async function setPageTheme(page, theme) {
	await page.evaluate((t) => {
		document.documentElement.setAttribute("data-theme", t);
		document.body.setAttribute("data-theme", t);
		if (t === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.setProperty("--paper-strong", "#ffffff");
			document.documentElement.style.setProperty("--paper", "#f8fafc");
			document.documentElement.style.setProperty("--paper-soft", "#f1f5f9");
			document.documentElement.style.setProperty("--ink", "#0f172a");
			document.documentElement.style.setProperty("--muted", "#64748b");
			document.documentElement.style.setProperty("--line", "#cbd5e1");
			document.documentElement.style.setProperty("--line-subtle", "#e2e8f0");
			document.body.style.backgroundColor = "#f8fafc";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
			document.documentElement.style.setProperty("--paper-strong", "#090d16");
			document.documentElement.style.setProperty("--paper", "#0f172a");
			document.documentElement.style.setProperty("--paper-soft", "#1e293b");
			document.documentElement.style.setProperty("--ink", "#f8fafc");
			document.documentElement.style.setProperty("--muted", "#94a3b8");
			document.documentElement.style.setProperty("--line", "#334155");
			document.documentElement.style.setProperty("--line-subtle", "#1e293b");
			document.body.style.backgroundColor = "#090d16";
		}
	}, theme);
}

async function main() {
	console.log("=== 1. Building Standalone 3D Viewer Bundle ===");
	await esbuild.build({
		entryPoints: ["apps/web/src/scan3dPreviewEntry.tsx"],
		bundle: true,
		outfile: "apps/web/public/scan3d-bundle.js",
		format: "esm",
		jsx: "automatic",
		define: { "process.env.NODE_ENV": '"development"' },
	});
	console.log("Bundle created: apps/web/public/scan3d-bundle.js");

	console.log("=== 2. Starting In-Process Static Server ===");
	const server = await startStaticServer();

	console.log("=== 3. Starting 4-State Visual Proof Capture ===");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ══════════════════════════════════════════════════════════
		// 1. PC SESSION (1440x900)
		// ══════════════════════════════════════════════════════════
		console.log("--- 1. PC Session (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
		pcPage.on("pageerror", (err) => console.log("[BROWSER PAGE ERROR]", err.message));

		await pcPage.goto(URL_PREVIEW, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector("canvas", { timeout: 20000 });
		console.log("PC Canvas ready! Waiting for Three.js render ticks...");
		await sleep(2500);

		// 1.1 PC Light
		console.log("Capturing 01_scan_3d_viewer_pc_light_1440x900.png ...");
		await setPageTheme(pcPage, "light");
		await sleep(1500);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		await saveProof("01_scan_3d_viewer_pc_light_1440x900.png", pcLightBuf);

		// 1.2 PC Dark
		console.log("Capturing 02_scan_3d_viewer_pc_dark_1440x900.png ...");
		await setPageTheme(pcPage, "dark");
		await sleep(1500);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		await saveProof("02_scan_3d_viewer_pc_dark_1440x900.png", pcDarkBuf);
		await pcContext.close();

		// ══════════════════════════════════════════════════════════
		// 2. MOBILE SESSION (390x844 - iPhone 14 / Apple HIG)
		// ══════════════════════════════════════════════════════════
		console.log("--- 2. Mobile Session (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const mobilePage = await mobileContext.newPage();
		mobilePage.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
		mobilePage.on("pageerror", (err) => console.log("[BROWSER PAGE ERROR]", err.message));

		await mobilePage.goto(URL_PREVIEW, { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector("canvas", { timeout: 20000 });
		console.log("Mobile Canvas ready! Waiting for Three.js render ticks...");
		await sleep(2500);

		// 2.1 Mobile Light
		console.log("Capturing 03_scan_3d_viewer_mobile_light_390x844.png ...");
		await setPageTheme(mobilePage, "light");
		await sleep(1500);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		await saveProof("03_scan_3d_viewer_mobile_light_390x844.png", mobileLightBuf);

		// 2.2 Mobile Dark
		console.log("Capturing 04_scan_3d_viewer_mobile_dark_390x844.png ...");
		await setPageTheme(mobilePage, "dark");
		await sleep(1500);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		await saveProof("04_scan_3d_viewer_mobile_dark_390x844.png", mobileDarkBuf);
		await mobileContext.close();

		console.log("=== All 4-State Proofs Successfully Captured and Verified! ===");
	} finally {
		await browser.close();
		server.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in screenshot capture:", err);
	process.exit(1);
});
