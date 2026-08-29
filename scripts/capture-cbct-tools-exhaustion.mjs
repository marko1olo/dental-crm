import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const SCREENSHOT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_tools";
const BRAIN_DIRS = [
	"C:/Users/Admin/.gemini/antigravity/brain/85286d7d-5f84-4da0-b745-d7712b911374",
	"C:/Users/Admin/.gemini/antigravity/brain/81f27df3-489a-4b37-a422-bf0e829b9df5"
];

for (const dir of [SCREENSHOT_DIR, ...BRAIN_DIRS]) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
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

async function run() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable || undefined,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	page.setDefaultTimeout(30000);

	console.log("[CBCT-E2E] Navigating to Clinical Modals Studio...");
	await page.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "networkidle" });
	await page.waitForTimeout(1000);

	// Open 3D CBCT Studio Modal
	console.log("[CBCT-E2E] Opening 3D CBCT Studio (Barabash 300 slices)...");
	const openCbctBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]').first();
	await openCbctBtn.waitFor({ state: "visible", timeout: 10000 });
	await openCbctBtn.click();

	// Wait for modal and canvases
	const modalContainer = page.locator('[data-testid="cbct-mpr-implant-studio-modal"]').first();
	await modalContainer.waitFor({ state: "visible", timeout: 15000 });
	await page.waitForTimeout(2000);

	const capturedFiles = [];

	async function saveShot(filename, description) {
		const outPath = path.join(SCREENSHOT_DIR, filename);
		await modalContainer.screenshot({ path: outPath });
		for (const brainDir of BRAIN_DIRS) {
			const brainPath = path.join(brainDir, filename);
			copyFileSync(outPath, brainPath);
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
	await page.waitForTimeout(800);
	await saveShot("01_maximized_axial.png", "Maximized Axial 100% viewport with orientation cube and calibrated rulers");
	// Restore
	await maxAxialBtn.click();
	await page.waitForTimeout(500);

	// ─── SCENARIO 2: Maximized Coronal Viewport ────────────────────────────────
	console.log("[CBCT-E2E] Scenario 2: Maximizing Coronal Viewport...");
	const maxCoronalBtn = page.locator('[data-testid="cbct-maximize-coronal-btn"]').first();
	await maxCoronalBtn.waitFor({ state: "visible" });
	await maxCoronalBtn.click();
	await page.waitForTimeout(800);
	await saveShot("02_maximized_coronal.png", "Maximized Coronal 100% viewport with clinical metadata and rotation handles");
	// Restore
	await maxCoronalBtn.click();
	await page.waitForTimeout(500);

	// ─── SCENARIO 3: Maximized Sagittal Viewport ───────────────────────────────
	console.log("[CBCT-E2E] Scenario 3: Maximizing Sagittal Viewport...");
	const maxSagittalBtn = page.locator('[data-testid="cbct-maximize-sagittal-btn"]').first();
	await maxSagittalBtn.waitFor({ state: "visible" });
	await maxSagittalBtn.click();
	await page.waitForTimeout(800);
	await saveShot("03_maximized_sagittal.png", "Maximized Sagittal 100% viewport showing perfil anatomy and slice level");
	// Restore
	await maxSagittalBtn.click();
	await page.waitForTimeout(500);

	// ─── SCENARIO 4: Maximized Panorama (OPTG) Viewport ────────────────────────
	console.log("[CBCT-E2E] Scenario 4: Maximizing Panorama Viewport...");
	const maxPanoBtn = page.locator('[data-testid="cbct-maximize-panoramic-btn"]').first();
	await maxPanoBtn.waitFor({ state: "visible" });
	await maxPanoBtn.click();
	await page.waitForTimeout(800);
	await saveShot("04_maximized_panorama.png", "Maximized Panorama OPTG 100% curved planar reconstruction along dental arch");
	// Restore
	await maxPanoBtn.click();
	await page.waitForTimeout(500);

	// ─── SCENARIO 5: Caliper Ruler Drawn ───────────────────────────────────────
	console.log("[CBCT-E2E] Scenario 5: Drawing Caliper Ruler...");
	const rulerToolBtn = page.locator('[data-testid="cbct-tool-ruler"]').first();
	await rulerToolBtn.click();
	await page.waitForTimeout(300);

	const axialCanvas = page.locator('div[data-testid="cbct-viewport-container-axial"] canvas').first();
	const axialBox = await axialCanvas.boundingBox();
	if (axialBox) {
		await page.mouse.move(axialBox.x + axialBox.width * 0.25, axialBox.y + axialBox.height * 0.35);
		await page.mouse.down();
		await page.mouse.move(axialBox.x + axialBox.width * 0.65, axialBox.y + axialBox.height * 0.65, { steps: 10 });
		await page.mouse.up();
	}
	await page.waitForTimeout(600);
	await saveShot("05_caliper_ruler_drawn.png", "Caliper tool drawing calibrated millimeter measurement with tick marks");

	// ─── SCENARIO 6: Invert LUT Active (Negative X-Ray) ─────────────────────────
	console.log("[CBCT-E2E] Scenario 6: Inverting Grayscale LUT...");
	const invertLutBtn = page.locator('[data-testid="cbct-tool-invert-lut"]').first();
	await invertLutBtn.click();
	await page.waitForTimeout(700);
	await saveShot("06_invert_lut_active.png", "Inverted LUT rendering negative high-contrast radiological view");
	// Invert back to positive for next tests
	await invertLutBtn.click();
	await page.waitForTimeout(400);

	// ─── SCENARIO 7: WW/WL Endodontics Preset ──────────────────────────────────
	console.log("[CBCT-E2E] Scenario 7: Switching to Endodontics/Enamel HU Preset...");
	const presetsFlyoutBtn = page.locator('[data-testid="cbct-tool-hu-presets"]').first();
	await presetsFlyoutBtn.click();
	await page.waitForTimeout(400);
	const endoPresetOpt = page.locator('[data-testid="cbct-hu-preset-option-enamel_dentin"]').first();
	await endoPresetOpt.click();
	await page.waitForTimeout(700);
	await saveShot("07_ww_wl_endo_preset.png", "High-contrast Endodontics/Enamel HU preset (WW: 5500, WL: 1600)");

	// ─── SCENARIO 8: Auto-detect Dental Arch ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 8: Auto-detecting Dental Arch...");
	const autoArchBtn = page.locator('[data-testid="cbct-btn-auto-arch"]').first();
	await autoArchBtn.waitFor({ state: "visible", timeout: 10000 });
	await autoArchBtn.click();
	await page.waitForTimeout(800);
	await saveShot("08_auto_arch_detected.png", "Auto-detected dental arch spline and 16 FDI tooth landmarks across CT voxels");

	// ─── SCENARIO 9: Mandibular Nerve (IAN) Tracer Active ─────────────────────
	console.log("[CBCT-E2E] Scenario 9: Mandibular Canal (IAN) Nerve Tracer...");
	const nerveToolBtn = page.locator('[data-testid="cbct-tool-nerve"]').first();
	await nerveToolBtn.click();
	if (axialBox) {
		await page.mouse.click(axialBox.x + axialBox.width * 0.35, axialBox.y + axialBox.height * 0.6);
	}
	await page.waitForTimeout(700);
	await saveShot("09_nerve_tracer_active.png", "Mandibular canal IAN spline with 2.0 mm safety halo buffer corridor");

	// ─── SCENARIO 10: Virtual Implant Placed ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 10: Virtual Implant Mode...");
	const implantModeBtn = page.locator('[data-testid="cbct-mode-implant-btn"]').first();
	await implantModeBtn.click();
	await page.waitForTimeout(800);
	await saveShot("10_virtual_implant_placed.png", "Virtual implant Osstem 4.0x10.0 mm with 3D projection, nerve safety audit");

	// ─── SCENARIO 11: HU Density Probe Point ───────────────────────────────────
	console.log("[CBCT-E2E] Scenario 11: HU Densitometry Probe Point...");
	const probeToolBtn = page.locator('[data-testid="cbct-tool-probe"]').first();
	await probeToolBtn.click();
	await page.waitForTimeout(300);
	if (axialBox) {
		await page.mouse.click(axialBox.x + axialBox.width * 0.5, axialBox.y + axialBox.height * 0.5);
	}
	await page.waitForTimeout(700);
	await saveShot("11_hu_probe_point.png", "HU density probe badge displaying Hounsfield value, Misch bone class D1..D4");

	// ─── SCENARIO 12: Slab MIP 15 mm ──────────────────────────────────────────
	console.log("[CBCT-E2E] Scenario 12: Slab MIP 15 mm...");
	const slabToolBtn = page.locator('[data-testid="cbct-tool-slab"]').first();
	await slabToolBtn.click();
	await page.waitForTimeout(400);

	const mipModeBtn = page.locator('[data-testid="cbct-slab-mode-mip"]').first();
	await mipModeBtn.click();
	await page.waitForTimeout(300);

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
	await page.waitForTimeout(800);
	await saveShot("12_slab_mip_15mm.png", "15 mm Maximum Intensity Projection (MIP) volume slab with bounding corridors");

	// ─── SCENARIO 13: Layout 1+3 ──────────────────────────────────────────────
	console.log("[CBCT-E2E] Scenario 13: Layout 1+3 (Dominant View + 3 Side Slices)...");
	const layout1plus3Btn = page.locator('[data-testid="cbct-layout-1plus3-btn"]').first();
	await layout1plus3Btn.click();
	await page.waitForTimeout(800);
	await saveShot("13_layout_1_plus_3.png", "1+3 asymmetric layout with dominant panoramic OPG reconstruction and 3 MPR slices");

	console.log(`\n======================================================`);
	console.log(`[CBCT-E2E] ALL 13 SCENARIOS EXECUTED AND CAPTURED SUCCESSFULLY!`);
	console.log(`======================================================\n`);

	let allPassed = true;
	for (const shot of capturedFiles) {
		const sizeKb = shot.sizeBytes / 1024;
		const pass = sizeKb >= 40.0;
		if (!pass) allPassed = false;
		console.log(`[${pass ? "PASS" : "FAIL"}] ${shot.filename.padEnd(30)} ${sizeKb.toFixed(1).padStart(7)} KB - ${shot.description}`);
	}

	await browser.close();

	if (!allPassed) {
		console.error("\n[CBCT-E2E] ERROR: Some screenshots are below the 40 KB threshold!");
		process.exit(1);
	}
}

run().catch((err) => {
	console.error("[CBCT-E2E] Fatal execution error:", err);
	process.exit(1);
});
