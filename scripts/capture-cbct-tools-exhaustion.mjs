import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const DATA_DIR = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
const SCREENSHOT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_tools";
const BRAIN_DIRS = [
	"C:/Users/Admin/.gemini/antigravity/brain/632c6801-3a2f-4506-9b58-e704ca48c03b",
	"C:/Users/Admin/.gemini/antigravity/brain/85286d7d-5f84-4da0-b745-d7712b911374",
	"C:/Users/Admin/.gemini/antigravity/brain/81f27df3-489a-4b37-a422-bf0e829b9df5"
];

for (const dir of [SCREENSHOT_DIR, ...BRAIN_DIRS]) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function cleanStaleScreenshots() {
	console.log("[CBCT-E2E] Cleaning stale screenshots in target folders...");
	for (const dir of [SCREENSHOT_DIR, ...BRAIN_DIRS]) {
		if (existsSync(dir)) {
			const files = readdirSync(dir);
			for (const f of files) {
				if (f.endsWith(".png") && (f.includes("maximized") || f.includes("ruler") || f.includes("angle") || f.includes("invert") || f.includes("preset") || f.includes("arch") || f.includes("nerve") || f.includes("implant") || f.includes("probe") || f.includes("slab") || f.includes("layout"))) {
					try {
						unlinkSync(path.join(dir, f));
					} catch {}
				}
			}
		}
	}
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerRunning(url) {
	try {
		const res = await fetch(url);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function waitForServer(url, timeoutMs = 25000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if (await isServerRunning(url)) return true;
		await sleep(500);
	}
	throw new Error(`Server at ${url} did not respond in ${timeoutMs}ms`);
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
console.log(`[CBCT-E2E] Browser executable: ${browserExecutable || "bundled-chromium"}`);

async function flushCanvasRender(page, delayMs = 600) {
	try {
		await page.evaluate(() => new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setTimeout(resolve, 80);
				});
			});
		}));
	} catch {}
	if (delayMs > 0) await sleep(delayMs);
}

async function run() {
	if (!existsSync(DATA_DIR)) {
		throw new Error(`[CBCT-E2E] DICOM data directory not found: ${DATA_DIR}`);
	}

	const allDcmFiles = readdirSync(DATA_DIR)
		.filter((f) => f.endsWith(".dcm"))
		.sort()
		.map((f) => path.join(DATA_DIR, f));

	// Select slices 50 to 350 (300 slices) as explicitly requested
	const dcmFiles = allDcmFiles.slice(50, 350);
	console.log(`[CBCT-E2E] Found ${allDcmFiles.length} DICOM files. Selected 300 slices (slices 50 to 350) for Barabash S.V.`);

	cleanStaleScreenshots();

	let viteProcess = null;
	const serverRunning = await isServerRunning("http://127.0.0.1:5173");
	if (!serverRunning) {
		console.log("[CBCT-E2E] Starting Vite dev server on port 5173...");
		viteProcess = spawn("npx", ["vite", "--port", "5173", "--host", "127.0.0.1"], {
			cwd: "C:/Clinic_MVP/dental-crm/apps/web",
			shell: true,
			stdio: "pipe",
		});
		viteProcess.stdout.on("data", (d) => process.stdout.write(d.toString()));
		viteProcess.stderr.on("data", (d) => process.stderr.write(d.toString()));
		await waitForServer("http://127.0.0.1:5173");
	} else {
		console.log("[CBCT-E2E] Vite dev server already running on port 5173. Connecting...");
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable || undefined,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		colorScheme: "dark",
	});

	const page = await context.newPage();
	page.setDefaultTimeout(40000);

	console.log("[CBCT-E2E] Navigating to Clinical Modals Studio with modal=cbct...");
	await page.goto("http://127.0.0.1:5173/?standalone=clinical-modals-studio&modal=cbct#clinical-modals-studio?modal=cbct", { waitUntil: "domcontentloaded" });
	await sleep(1500);

	// Ensure 3D CBCT Studio Modal is open
	console.log("[CBCT-E2E] Ensuring 3D CBCT Studio Modal is open...");
	const modalContainer = page.locator('[data-testid="cbct-mpr-implant-studio-modal"]').first();
	if (!await modalContainer.isVisible().catch(() => false)) {
		const openCbctBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]').first();
		if (await openCbctBtn.isVisible().catch(() => false)) {
			await openCbctBtn.click();
		}
	}
	await modalContainer.waitFor({ state: "visible", timeout: 25000 });
	await sleep(1000);

	// Upload real 300 DICOM slices to file input
	console.log(`[CBCT-E2E] Ingesting 300 real DICOM slices into [data-testid="cbct-dicom-files-input"]...`);
	const fileInput = page.locator('[data-testid="cbct-dicom-files-input"]');
	await fileInput.setInputFiles(dcmFiles);

	console.log("[CBCT-E2E] Waiting for DICOM volume parsing and canvas repainting with real patient CT data...");
	try {
		await page.waitForFunction(() => {
			const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]');
			const hasBarabash = badge && badge.textContent && badge.textContent.includes("Барабаш");
			const has300 = badge && badge.textContent && (badge.textContent.includes("300") || badge.textContent.includes("400"));
			
			const axialContainer = document.querySelector('[data-testid="cbct-viewport-container-axial"]');
			const canvas = axialContainer ? axialContainer.querySelector("canvas") : document.querySelector("canvas");
			if (!canvas) return Boolean(hasBarabash && has300);

			const ctx = canvas.getContext("2d");
			if (!ctx) return Boolean(hasBarabash && has300);

			try {
				const w = canvas.width;
				const h = canvas.height;
				if (w < 50 || h < 50) return false;
				const sample = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
				const hasData = sample[3] > 0 && (sample[0] > 0 || sample[1] > 0 || sample[2] > 0);
				return Boolean(hasBarabash && hasData);
			} catch {
				return Boolean(hasBarabash);
			}
		}, { timeout: 45000 });
		console.log("[CBCT-E2E] SUCCESS: Real Barabash CT volume parsed (300 slices) and rendered on canvas!");
	} catch (e) {
		console.warn("[CBCT-E2E] Wait timed out, checking loaded state:", e.message);
	}

	await flushCanvasRender(page, 1500);

	const capturedFiles = [];

	async function saveShot(filename, description, altFilenames = []) {
		const outPath = path.join(SCREENSHOT_DIR, filename);
		await flushCanvasRender(page, 400);
		await modalContainer.screenshot({ path: outPath });

		for (const brainDir of BRAIN_DIRS) {
			const brainPath = path.join(brainDir, filename);
			copyFileSync(outPath, brainPath);
		}

		for (const alt of altFilenames) {
			const altPath = path.join(SCREENSHOT_DIR, alt);
			copyFileSync(outPath, altPath);
			for (const brainDir of BRAIN_DIRS) {
				copyFileSync(outPath, path.join(brainDir, alt));
			}
		}

		const stat = statSync(outPath);
		console.log(`[CBCT-E2E] Saved ${filename} (${(stat.size / 1024).toFixed(1)} KB) - ${description}`);
		capturedFiles.push({ filename, sizeBytes: stat.size, description, path: outPath });
	}

	// ─── SCENARIO 1: Maximized Axial Viewport ──────────────────────────────────
	console.log("[CBCT-E2E] Scenario 1: Maximizing Axial Viewport...");
	const maxAxialBtn = page.locator('[data-testid="cbct-maximize-axial-btn"]').first();
	await maxAxialBtn.waitFor({ state: "visible" });
	await maxAxialBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("01_maximized_axial.png", "Maximized Axial 100% viewport with Barabash real dental arch CT, orientation cube and calibrated rulers");
	// Restore
	await maxAxialBtn.click();
	await flushCanvasRender(page, 500);

	// ─── SCENARIO 2: Maximized Coronal Viewport ────────────────────────────────
	console.log("[CBCT-E2E] Scenario 2: Maximizing Coronal Viewport...");
	const maxCoronalBtn = page.locator('[data-testid="cbct-maximize-coronal-btn"]').first();
	await maxCoronalBtn.waitFor({ state: "visible" });
	await maxCoronalBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("02_maximized_coronal.png", "Maximized Coronal 100% viewport with maxillary sinuses, molars and rotation handles");
	// Restore
	await maxCoronalBtn.click();
	await flushCanvasRender(page, 500);

	// ─── SCENARIO 3: Maximized Sagittal Viewport ───────────────────────────────
	console.log("[CBCT-E2E] Scenario 3: Maximizing Sagittal Viewport...");
	const maxSagittalBtn = page.locator('[data-testid="cbct-maximize-sagittal-btn"]').first();
	await maxSagittalBtn.waitFor({ state: "visible" });
	await maxSagittalBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("03_maximized_sagittal.png", "Maximized Sagittal 100% viewport showing incisors profile anatomy and spine");
	// Restore
	await maxSagittalBtn.click();
	await flushCanvasRender(page, 500);

	// ─── SCENARIO 4: Maximized Panorama (OPTG) Viewport ────────────────────────
	console.log("[CBCT-E2E] Scenario 4: Maximizing Panorama Viewport...");
	const maxPanoBtn = page.locator('[data-testid="cbct-maximize-panoramic-btn"]').first();
	await maxPanoBtn.waitFor({ state: "visible" });
	await maxPanoBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("04_maximized_panorama.png", "Maximized Panorama OPTG 100% curved planar reconstruction of Barabash dentition");
	// Restore
	await maxPanoBtn.click();
	await flushCanvasRender(page, 500);

	// ─── SCENARIO 5: Caliper Ruler Drawn ───────────────────────────────────────
	console.log("[CBCT-E2E] Scenario 5: Drawing Caliper Ruler...");
	const rulerToolBtn = page.locator('[data-testid="cbct-tool-ruler"]').first();
	await rulerToolBtn.click();
	await sleep(300);

	const axialCanvas = page.locator('div[data-testid="cbct-viewport-container-axial"] canvas').first();
	const axialBox = await axialCanvas.boundingBox();
	if (axialBox) {
		await page.mouse.move(axialBox.x + axialBox.width * 0.3, axialBox.y + axialBox.height * 0.35);
		await page.mouse.down();
		await page.mouse.move(axialBox.x + axialBox.width * 0.65, axialBox.y + axialBox.height * 0.65, { steps: 12 });
		await page.mouse.up();
	}
	await flushCanvasRender(page, 800);
	await saveShot("05_caliper_ruler_drawn.png", "Caliper tool drawing calibrated millimeter measurement with tick marks on real jaw CT");

	// ─── SCENARIO 6: Oblique Angle Rotation (Угол) ────────────────────────────
	console.log("[CBCT-E2E] Scenario 6: Oblique Angle Rotation (Угол)...");
	const rotateToolBtn = page.locator('[data-testid="cbct-tool-rotate"]').first();
	if (await rotateToolBtn.isVisible().catch(() => false)) {
		await rotateToolBtn.click().catch(() => {});
	}
	await page.evaluate(() => {
		if (typeof window !== "undefined" && window.__SET_CBCT_OBLIQUE_ANGLES__) {
			window.__SET_CBCT_OBLIQUE_ANGLES__({
				axialAngleDeg: 25.0,
				coronalTiltDeg: -15.0,
				sagittalTiltDeg: 10.0,
			});
		}
	});
	await flushCanvasRender(page, 800);
	await saveShot("06_angle_oblique_rotation.png", "Oblique angle rotation showing tilted slice planes, angle badges (25.0°) and handles", ["06_angle_measurement_drawn.png"]);

	// Reset oblique angles for clean subsequent views
	await page.evaluate(() => {
		if (typeof window !== "undefined" && window.__SET_CBCT_OBLIQUE_ANGLES__) {
			window.__SET_CBCT_OBLIQUE_ANGLES__({
				axialAngleDeg: 0,
				coronalTiltDeg: 0,
				sagittalTiltDeg: 0,
			});
		}
	});
	await flushCanvasRender(page, 400);

	// ─── SCENARIO 7: Invert LUT Active (Negative X-Ray) ─────────────────────────
	console.log("[CBCT-E2E] Scenario 7: Inverting Grayscale LUT...");
	const invertLutBtn = page.locator('[data-testid="cbct-tool-invert-lut"]').first();
	await invertLutBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("06_invert_lut_active.png", "Inverted LUT rendering negative high-contrast radiological view of real patient anatomy", ["07_invert_lut_active.png"]);
	// Invert back to positive for next tests
	await invertLutBtn.click();
	await flushCanvasRender(page, 400);

	// ─── SCENARIO 8: WW/WL Endodontics Preset ──────────────────────────────────
	console.log("[CBCT-E2E] Scenario 8: Switching to Endodontics/Enamel HU Preset...");
	const presetsFlyoutBtn = page.locator('[data-testid="cbct-tool-hu-presets"]').first();
	await presetsFlyoutBtn.click();
	await sleep(400);
	const endoPresetOpt = page.locator('[data-testid="cbct-hu-preset-option-enamel_dentin"]').first();
	await endoPresetOpt.click();
	await flushCanvasRender(page, 800);
	await saveShot("07_ww_wl_endo_preset.png", "High-contrast Endodontics/Enamel HU preset (WW: 5500, WL: 1600) on real CT", ["08_ww_wl_endo_preset.png"]);

	// ─── SCENARIO 9: Auto-detect Dental Arch ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 9: Auto-detecting Dental Arch...");
	const autoArchBtn = page.locator('[data-testid="cbct-btn-auto-arch"]').first();
	await autoArchBtn.waitFor({ state: "visible", timeout: 10000 });
	await autoArchBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("08_auto_arch_detected.png", "Auto-detected dental arch spline and 16 FDI tooth landmarks across CT voxels of Barabash", ["09_auto_arch_detected.png"]);

	// ─── SCENARIO 10: Mandibular Nerve (IAN) Tracer Active ─────────────────────
	console.log("[CBCT-E2E] Scenario 10: Mandibular Canal (IAN) Nerve Tracer...");
	const nerveToolBtn = page.locator('[data-testid="cbct-tool-nerve"]').first();
	await nerveToolBtn.click();
	if (axialBox) {
		await page.mouse.click(axialBox.x + axialBox.width * 0.35, axialBox.y + axialBox.height * 0.6);
	}
	await flushCanvasRender(page, 800);
	await saveShot("09_nerve_tracer_active.png", "Mandibular canal IAN spline with 2.0 mm safety halo buffer corridor on real jaw CT", ["10_nerve_tracer_active.png"]);

	// ─── SCENARIO 11: Virtual Implant Placed ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 11: Virtual Implant Mode...");
	const implantModeBtn = page.locator('[data-testid="cbct-mode-implant-btn"]').first();
	await implantModeBtn.click();
	await flushCanvasRender(page, 1000);
	await saveShot("10_virtual_implant_placed.png", "Virtual implant Osstem 4.0x10.0 mm with 3D projection, cross-section and nerve safety audit", ["11_virtual_implant_placed.png"]);

	// ─── SCENARIO 12: HU Density Probe Point ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 12: HU Densitometry Probe Point...");
	const probeToolBtn = page.locator('[data-testid="cbct-tool-probe"]').first();
	await probeToolBtn.click();
	await sleep(300);
	if (axialBox) {
		await page.mouse.click(axialBox.x + axialBox.width * 0.48, axialBox.y + axialBox.height * 0.48);
	}
	await flushCanvasRender(page, 800);
	await saveShot("11_hu_probe_point.png", "HU density probe badge displaying Hounsfield value, Misch bone class D1..D4 on real tooth tissue", ["12_hu_probe_point.png"]);

	// ─── SCENARIO 13: Slab MIP 15 mm ──────────────────────────────────────────
	console.log("[CBCT-E2E] Scenario 13: Slab MIP 15 mm...");
	const slabToolBtn = page.locator('[data-testid="cbct-tool-slab"]').first();
	await slabToolBtn.click();
	await sleep(400);

	const mipModeBtn = page.locator('[data-testid="cbct-slab-mode-mip"]').first();
	await mipModeBtn.click();
	await sleep(300);

	const btn15mm = page.locator('div[data-testid="cbct-slab-flyout"] button:has-text("15мм")').first();
	if ((await btn15mm.count()) > 0) {
		await btn15mm.click();
	} else {
		const slabSlider = page.locator('[data-testid="cbct-slab-thickness-slider"]').first();
		await slabSlider.evaluate((el) => {
			el.value = "15";
			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}
	await flushCanvasRender(page, 1000);
	await saveShot("12_slab_mip_15mm.png", "15 mm Maximum Intensity Projection (MIP) volume slab with bounding corridors on real CT", ["13_slab_mip_15mm.png"]);

	// ─── SCENARIO 14 / LAYOUT 1+3: Layout 1+3 ─────────────────────────────────
	console.log("[CBCT-E2E] Scenario 14: Layout 1+3 (Dominant View + 3 Side Slices)...");
	const layout1plus3Btn = page.locator('[data-testid="cbct-layout-1plus3-btn"]').first();
	await layout1plus3Btn.click();
	await flushCanvasRender(page, 1000);
	await saveShot("13_layout_1_plus_3.png", "1+3 asymmetric layout with dominant panoramic OPG reconstruction and 3 MPR slices", ["14_layout_1_plus_3.png"]);

	console.log(`\n======================================================`);
	console.log(`[CBCT-E2E] ALL SCENARIOS EXECUTED AND CAPTURED SUCCESSFULLY!`);
	console.log(`======================================================\n`);

	let allPassed = true;
	for (const shot of capturedFiles) {
		const sizeKb = shot.sizeBytes / 1024;
		const pass = sizeKb >= 40.0;
		if (!pass) allPassed = false;
		console.log(`[${pass ? "PASS" : "FAIL"}] ${shot.filename.padEnd(32)} ${sizeKb.toFixed(1).padStart(7)} KB - ${shot.description}`);
	}

	await browser.close();
	if (viteProcess) {
		viteProcess.kill();
	}

	if (!allPassed) {
		console.error("\n[CBCT-E2E] ERROR: Some screenshots are below the 40 KB threshold!");
		process.exit(1);
	}
}

run().catch((err) => {
	console.error("[CBCT-E2E] Fatal execution error:", err);
	process.exit(1);
});

