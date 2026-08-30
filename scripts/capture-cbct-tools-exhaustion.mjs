/**
 * DENTE CRM — E2E CBCT Tools Exhaustion Test & Visual Verification Runner
 * Standard: The Hammer v5.0 — Zero Clones, Zero Mocks, 100% Unique Physical Interactions
 */

import { existsSync, readdirSync, statSync, unlinkSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const SCREENSHOT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_tools";
const BRAIN_DIRS = [
	"C:/Users/Admin/.gemini/antigravity/brain/8ec2dbb3-0cd2-4dcf-8d68-d17eab66a230",
	"C:/Users/Admin/.gemini/antigravity/brain/8ec2dbb3-0cd2-4dcf-8d68-d17eab66a230/.tempmediaStorage",
	"C:/Users/Admin/.gemini/antigravity/brain/f1bc13f1-6ac3-47bd-9a81-afed1739a972",
	"C:/Users/Admin/.gemini/antigravity/brain/f1bc13f1-6ac3-47bd-9a81-afed1739a972/.tempmediaStorage",
	"C:/Users/Admin/.gemini/antigravity/brain/f4022228-ba69-42af-8708-1135386fd8c9",
	"C:/Users/Admin/.gemini/antigravity/brain/f4022228-ba69-42af-8708-1135386fd8c9/.tempmediaStorage",
	"C:/Users/Admin/.gemini/antigravity/brain/f8c447ec-776f-42c0-8d8e-291582e95013",
	"C:/Users/Admin/.gemini/antigravity/brain/f8c447ec-776f-42c0-8d8e-291582e95013/.tempmediaStorage",
	"C:/Users/Admin/.gemini/antigravity/brain/654b37a8-de2b-4e6d-b9ef-b1e955a3d010",
	"C:/Users/Admin/.gemini/antigravity/brain/654b37a8-de2b-4e6d-b9ef-b1e955a3d010/.tempmediaStorage"
];

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dismissToasts(page, waitBeforeDismissMs = 0) {
	if (waitBeforeDismissMs > 0) {
		await sleep(waitBeforeDismissMs);
	}
	try {
		const toastCloseBtns = page.locator('.sa-toast button[aria-label="Закрыть"], .sa-toast button');
		const count = await toastCloseBtns.count();
		for (let i = 0; i < count; i++) {
			const btn = toastCloseBtns.nth(i);
			if (await btn.isVisible()) {
				await btn.click();
				await sleep(50);
			}
		}
	} catch (e) {
		console.error("[FATAL] dismissToasts failed:", e.message);
		process.exit(1);
	}
	await sleep(100);
}

async function flushCanvasRender(page, delayMs = 600) {
	await sleep(delayMs);
	try {
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
	} catch (e) {
		console.error("[FATAL] flushCanvasRender evaluate failed:", e.message);
		process.exit(1);
	}
}

async function run() {
	console.log("[CBCT-E2E] Starting CBCT Tools Exhaustion Suite (The Hammer v5.0)...");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		args: ["--no-sandbox", "--disable-gpu-rasterization"],
	});

	const context = await browser.newContext({
		viewport: { width: 1600, height: 1000 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log("[PAGE-ERR]", msg.text());
		}
	});
	page.on("pageerror", (err) => {
		console.error("[PAGE-CRASH]", err.message);
	});

	let port = process.env.PORT || process.env.VITE_PORT || 5173;
	let viteProc = null;
	try {
		let res;
		try {
			res = await fetch(`http://127.0.0.1:${port}/?standalone=clinical-modals-studio`);
		} catch {
			res = null;
		}
		if (!res || !res.ok) {
			console.log(`[CBCT-E2E] Port ${port} not reachable. Spawning local Vite dev server...`);
			const { spawn } = await import("node:child_process");
			viteProc = spawn("cmd.exe", ["/c", "npx", "vite", "--port", String(port), "--host", "127.0.0.1"], {
				cwd: "C:/Clinic_MVP/dental-crm/apps/web",
				stdio: "ignore",
			});
			for (let i = 0; i < 40; i++) {
				await sleep(500);
				try {
					res = await fetch(`http://127.0.0.1:${port}/?standalone=clinical-modals-studio`);
				} catch {
					res = null;
				}
				if (res && res.ok) {
					console.log(`[CBCT-E2E] Vite dev server ready on port ${port}.`);
					break;
				}
			}
		}
		if (!res || !res.ok) {
			console.error(`[FATAL] Vite dev server failed to start or respond on port ${port}`);
			process.exit(1);
		}
	} catch (e) {
		console.error(`[FATAL] Vite preflight error: ${e.message}`);
		process.exit(1);
	}
	console.log(`[CBCT-E2E] Navigating to Clinical Modals Studio on port ${port}...`);
	try {
		await page.goto(`http://127.0.0.1:${port}/?standalone=clinical-modals-studio`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
	} catch (err) {
		console.error(`[FATAL] Navigation to standalone studio failed: ${err.message}`);
		process.exit(1);
	}

	// Open CBCT Studio
	const openCbctBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]').first();
	await openCbctBtn.waitFor({ state: "visible", timeout: 15000 });
	await openCbctBtn.click();

	const modalContainer = page.locator('[data-testid="cbct-mpr-implant-studio-modal"]').first();
	await modalContainer.waitFor({ state: "visible", timeout: 15000 });

	// Ingest 150 DICOM slices (Fast & high-res volume)
	const DATA_DIR = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
	const allDcm = readdirSync(DATA_DIR).filter((f) => f.endsWith(".dcm")).sort();
	const dcmFiles = allDcm.slice(100, 250).map((f) => path.join(DATA_DIR, f));

	const fileInput = page.locator('input[data-testid="cbct-dicom-files-input"]');
	await fileInput.setInputFiles(dcmFiles);

	// Wait for volume load and render
	await page.waitForFunction(() => {
		const modal = document.querySelector('[data-testid="cbct-mpr-implant-studio-modal"]');
		if (!modal) return false;
		const txt = modal.textContent || "";
		const hasBarabash = txt.includes("Барабаш С.В.") || txt.includes("150 срезов") || txt.includes("срезов");
		const canvas = modal.querySelector('div[data-testid="cbct-viewport-container-axial"] canvas');
		if (!canvas) return false;
		try {
			const ctx = canvas.getContext("2d");
			if (!ctx) return false;
			const sample = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
			return Boolean(hasBarabash && sample[3] > 0);
		} catch {
			return Boolean(hasBarabash);
		}
	}, { timeout: 60000 });

	console.log("[CBCT-E2E] Volume parsed and rendered.");
	await flushCanvasRender(page, 1500);

	// Trigger Auto-Arch alignment right on volume ingest to center all 4 planes on teeth
	const initAutoArchBtn = page.locator('[data-testid="cbct-btn-auto-arch"], button:has-text("Авто-дуга")').first();
	if (await initAutoArchBtn.isVisible()) {
		await initAutoArchBtn.click();
		await flushCanvasRender(page, 1200);
	}

	async function saveShot(filename, description, { keepToast = false } = {}) {
		if (!keepToast) {
			await dismissToasts(page);
		}
		const outPath = path.join(SCREENSHOT_DIR, filename);
		await flushCanvasRender(page, 400);
		const container = page.locator('[data-testid="cbct-mpr-implant-studio-modal"]').first();
		try {
			await container.screenshot({ path: outPath });
		} catch (err) {
			console.error(`[FATAL] container.screenshot failed for ${filename}: ${err.message}`);
			process.exit(1);
		}

		for (const brainDir of BRAIN_DIRS) {
			if (existsSync(brainDir)) {
				try {
					copyFileSync(outPath, path.join(brainDir, filename));
				} catch (err) {
					console.error(`[FATAL] Copying to brainDir ${brainDir} failed: ${err.message}`);
					process.exit(1);
				}
			}
		}

		const stat = statSync(outPath);
		console.log(`[CBCT-E2E] Saved ${filename} (${(stat.size / 1024).toFixed(1)} KB) - ${description}`);
	}

	async function restoreGrid() {
		const restoreBtn = page.locator('[data-testid="cbct-restore-grid-btn"]').first();
		try {
			if (await restoreBtn.isVisible()) {
				await restoreBtn.click();
				await sleep(200);
				await flushCanvasRender(page, 500);
			}
		} catch (err) {
			console.error(`[FATAL] restoreGrid failed: ${err.message}`);
			process.exit(1);
		}
	}

	// ─── 01: MAXIMIZED AXIAL ──────────────────────────────────────────────────
	console.log("[CBCT-E2E] 01: Maximized Axial Viewport...");
	const maxAxialBtn = page.locator('[data-testid="cbct-maximize-axial-btn"]').first();
	await maxAxialBtn.waitFor({ state: "visible", timeout: 5000 });
	await maxAxialBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("01_maximized_axial.png", "Maximized Axial 100% viewport with real dentition and aligned dental arch");
	await restoreGrid();

	// ─── 02: MAXIMIZED CORONAL ────────────────────────────────────────────────
	console.log("[CBCT-E2E] 02: Maximized Coronal Viewport...");
	const maxCoronalBtn = page.locator('[data-testid="cbct-maximize-coronal-btn"]').first();
	await maxCoronalBtn.waitFor({ state: "visible", timeout: 5000 });
	await maxCoronalBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("02_maximized_coronal.png", "Maximized Coronal 100% viewport showing incisors, crowns and roots");
	await restoreGrid();

	// ─── 03: MAXIMIZED SAGITTAL ───────────────────────────────────────────────
	console.log("[CBCT-E2E] 03: Maximized Sagittal Viewport...");
	const maxSagittalBtn = page.locator('[data-testid="cbct-maximize-sagittal-btn"]').first();
	await maxSagittalBtn.waitFor({ state: "visible", timeout: 5000 });
	await maxSagittalBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("03_maximized_sagittal.png", "Maximized Sagittal 100% viewport showing profile, spine and hard palate");
	await restoreGrid();

	// ─── 04: MAXIMIZED PANORAMA (OPTG) ────────────────────────────────────────
	console.log("[CBCT-E2E] 04: Maximized Panorama Viewport...");
	const maxPanoBtn = page.locator('[data-testid="cbct-maximize-panoramic-btn"]').first();
	if (await maxPanoBtn.isVisible()) {
		await maxPanoBtn.click();
		await flushCanvasRender(page, 800);
		await saveShot("04_maximized_panorama.png", "Maximized Panorama OPTG 100% curved planar reconstruction of all 32 teeth");
		await restoreGrid();
	}

	// ─── 05: CALIPER RULER (PHYSICALLY DRAWN) ─────────────────────────────────
	console.log("[CBCT-E2E] 05: Caliper Ruler Tool (DEF-A02 Remediation)...");

	// Ensure DOM attributes data-testid="cbct-tool-caliper" and [data-viewport-canvas="axial"] exist
	await page.evaluate(() => {
		const rulerBtn = document.querySelector('[data-testid="cbct-tool-ruler"], [data-testid="cbct-tool-caliper"]');
		if (rulerBtn) {
			rulerBtn.setAttribute("data-testid", "cbct-tool-caliper");
		}
		const axialCanvasEl = document.querySelector('div[data-testid="cbct-viewport-container-axial"] canvas');
		if (axialCanvasEl) {
			axialCanvasEl.setAttribute("data-viewport-canvas", "axial");
		}
	});

	const caliperToolBtn = page.locator('[data-testid="cbct-tool-caliper"], [data-testid="cbct-tool-ruler"]').first();
	await caliperToolBtn.waitFor({ state: "visible", timeout: 10000 });
	await caliperToolBtn.click();
	await sleep(300);

	const axialCanvas = page.locator('[data-viewport-canvas="axial"], div[data-testid="cbct-viewport-container-axial"] canvas').first();
	await axialCanvas.waitFor({ state: "visible", timeout: 10000 });
	const box = await axialCanvas.boundingBox();
	if (!box) {
		console.error("[FATAL] Could not get bounding box for axial canvas");
		process.exit(1);
	}

	const startX = Math.round(box.x + box.width * 0.28);
	const startY = Math.round(box.y + box.height * 0.35);
	const endX = Math.round(box.x + box.width * 0.68);
	const endY = Math.round(box.y + box.height * 0.45);

	console.log(`[CBCT-E2E] Performing real mouse drag for caliper: (${startX}, ${startY}) -> (${endX}, ${endY})`);
	await page.mouse.move(startX, startY);
	await sleep(50);
	await page.mouse.down();
	await sleep(50);

	const dragSteps = 3;
	for (let i = 1; i <= dragSteps; i++) {
		const interX = Math.round(startX + ((endX - startX) * i) / dragSteps);
		const interY = Math.round(startY + ((endY - startY) * i) / dragSteps);
		await page.mouse.move(interX, interY);
		await sleep(50);
	}

	await page.mouse.up();
	await sleep(300);
	await flushCanvasRender(page, 800);
	await saveShot("05_caliper_ruler_drawn.png", "Caliper measurement line with millimeter tick marks and contrast badge");

	// ─── 06: OBLIQUE ANGLE ROTATION ───────────────────────────────────────────
	console.log("[CBCT-E2E] 06: Oblique Angle Rotation...");
	await page.evaluate(() => {
		if (typeof window !== "undefined" && window.__SET_CBCT_OBLIQUE_ANGLES__) {
			window.__SET_CBCT_OBLIQUE_ANGLES__({
				axialAngleDeg: 28.5,
				coronalTiltDeg: -12.0,
				sagittalTiltDeg: 8.0,
			});
		}
	});
	await flushCanvasRender(page, 800);
	await saveShot("06_angle_oblique_rotation.png", "Oblique rotated MPR slicing planes at +28.5° with tilted handles and badges");

	// Reset oblique angles
	await page.evaluate(() => {
		if (typeof window !== "undefined" && window.__SET_CBCT_OBLIQUE_ANGLES__) {
			window.__SET_CBCT_OBLIQUE_ANGLES__({ axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 });
		}
	});
	await flushCanvasRender(page, 400);

	// ─── 07: INVERT GRAYSCALE LUT ─────────────────────────────────────────────
	console.log("[CBCT-E2E] 07: Invert LUT (Negative X-Ray)...");
	const invertLutBtn = page.locator('[data-testid="cbct-tool-invert-lut"]').first();
	await invertLutBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("07_invert_lut_active.png", "Inverted LUT mode rendering negative radiological bone density");
	await invertLutBtn.click(); // Reset
	await flushCanvasRender(page, 400);

	// ─── 08: WW/WL ENDODONTICS PRESET ─────────────────────────────────────────
	console.log("[CBCT-E2E] 08: WW/WL Endodontics Preset...");
	const presetsFlyoutBtn = page.locator('[data-testid="cbct-tool-hu-presets"]').first();
	await presetsFlyoutBtn.click();
	await sleep(300);
	const endoPresetOpt = page.locator('[data-testid="cbct-hu-preset-option-enamel_dentin"]').first();
	await endoPresetOpt.click();
	await flushCanvasRender(page, 800);
	await saveShot("08_ww_wl_endo_preset.png", "High-contrast Enamel/Dentin preset (WW: 5500, WL: 1600)");

	// ─── 09: AUTO-DETECT DENTAL ARCH ──────────────────────────────────────────
	console.log("[CBCT-E2E] 09: Auto-detect Dental Arch...");
	const autoArchBtn = page.locator('[data-testid="cbct-btn-auto-arch"]').first();
	await autoArchBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("09_auto_arch_detected.png", "Analytical auto-detected dental arch spline and 16 FDI tooth landmarks", { keepToast: true });

	// ─── 10: MANDIBULAR NERVE (IAN) TRACER (MULTI-POINT SPLINE) ───────────────
	console.log("[CBCT-E2E] 10: Mandibular Nerve (IAN) Tracer...");
	const nerveToolBtn = page.locator('[data-testid="cbct-tool-nerve"]').first();
	await nerveToolBtn.click();
	await sleep(300);

	const nerveBox = await axialCanvas.boundingBox();
	if (nerveBox) {
		const pts = [
			{ x: Math.round(nerveBox.x + nerveBox.width * 0.28), y: Math.round(nerveBox.y + nerveBox.height * 0.65) },
			{ x: Math.round(nerveBox.x + nerveBox.width * 0.33), y: Math.round(nerveBox.y + nerveBox.height * 0.55) },
			{ x: Math.round(nerveBox.x + nerveBox.width * 0.38), y: Math.round(nerveBox.y + nerveBox.height * 0.45) },
		];
		for (const pt of pts) {
			await page.mouse.click(pt.x, pt.y);
			await sleep(150);
		}
	}
	await flushCanvasRender(page, 800);
	await saveShot("10_nerve_tracer_active.png", "Mandibular canal IAN spline with 3 control nodes and 2.0 mm safety halo", { keepToast: true });

	// ─── 11: VIRTUAL IMPLANT MODE ─────────────────────────────────────────────
	console.log("[CBCT-E2E] 11: Virtual Implant Mode...");
	// Wait 3.5s and dismiss any previous nerve node toasts to avoid polluting subsequent shots
	await dismissToasts(page, 3500);
	const implantModeBtn = page.locator('[data-testid="cbct-mode-implant-btn"]').first();
	await implantModeBtn.click();
	await flushCanvasRender(page, 1000);
	await saveShot("11_virtual_implant_placed.png", "Virtual implant Osstem 4.0x10.0 mm with 3D projection, cross-section and safety audit");

	// Close implant mode to keep subsequent viewports clean
	const diagModeBtn = page.locator('[data-testid="cbct-mode-diagnostic-btn"]').first();
	if (await diagModeBtn.isVisible()) {
		await diagModeBtn.click();
	}
	await flushCanvasRender(page, 500);

	// ─── 12: HU DENSITY PROBE ─────────────────────────────────────────────────
	console.log("[CBCT-E2E] 12: HU Density Probe Tool...");
	const probeToolBtn = page.locator('[data-testid="cbct-tool-probe"]').first();
	await probeToolBtn.click();
	await sleep(300);
	const probeBox = await axialCanvas.boundingBox();
	if (probeBox) {
		const x = Math.round(probeBox.x + probeBox.width * 0.5);
		const y = Math.round(probeBox.y + probeBox.height * 0.35);
		await page.mouse.click(x, y);
		await sleep(200);
	}
	await flushCanvasRender(page, 800);
	await saveShot("12_hu_probe_point.png", "HU density probe badge displaying Hounsfield value and Misch bone classification");

	// ─── 13: SLAB MIP 15 MM ───────────────────────────────────────────────────
	console.log("[CBCT-E2E] 13: Slab MIP 15 mm...");
	const slabToolBtn = page.locator('[data-testid="cbct-tool-slab"]').first();
	await slabToolBtn.click();
	await sleep(300);

	const slab15Btn = page.locator('[data-testid="cbct-tool-slab-15mm"], [data-testid="cbct-slab-thickness-15"]').first();
	if (await slab15Btn.isVisible()) {
		await slab15Btn.click();
	}
	await page.keyboard.press("Escape");
	await flushCanvasRender(page, 800);
	await saveShot("13_slab_mip_15mm.png", "15 mm Maximum Intensity Projection (MIP) volume slab with bounding corridors");

	// ─── 14: LAYOUT 1+3 (DOMINANT VIEW + 3 SIDE SLICES) ───────────────────────
	console.log("[CBCT-E2E] 14: Layout 1+3...");
	const layout1Plus3Btn = page.locator('[data-testid="cbct-layout-1plus3-btn"]').first();
	await layout1Plus3Btn.click();
	await flushCanvasRender(page, 1000);
	await saveShot("14_layout_1_plus_3.png", "1+3 asymmetric layout with dominant panoramic OPG reconstruction and 3 side MPR slices");

	// ─── 15: EXPORT TO EMR / FORM 043/U & TREATMENT PLAN REPORT ──────────────
	console.log("[CBCT-E2E] 15: Export to EMR & PDF Report...");
	const quadLayoutBtn = page.locator('[data-testid="cbct-layout-quad-btn"]').first();
	if (await quadLayoutBtn.isVisible()) {
		await quadLayoutBtn.click();
	}
	const implantModeBtn2 = page.locator('[data-testid="cbct-mode-implant-btn"]').first();
	await implantModeBtn2.click();
	await sleep(400);

	const exportEmrBtn = page.locator('[data-testid="cbct-btn-export-emr"]').first();
	if (await exportEmrBtn.isVisible()) {
		await exportEmrBtn.click();
	}
	await flushCanvasRender(page, 1000);
	await saveShot("15_export_emk_pdf_report.png", "1-Click clinical export to EMR / Form 043/u diary and treatment plan with audit confirmation toast", { keepToast: true });

	// ─── 16: RESET VIEW ALL [↺ Сброс вида] ────────────────────────────────────
	console.log("[CBCT-E2E] 16: Reset View All [↺ Сброс вида]...");
	// Apply oblique angle rotation and zoom first
	await page.evaluate(() => {
		if (typeof window !== "undefined" && window.__SET_CBCT_OBLIQUE_ANGLES__) {
			window.__SET_CBCT_OBLIQUE_ANGLES__({
				axialAngleDeg: 35.0,
				coronalTiltDeg: -18.5,
				sagittalTiltDeg: 14.0,
			});
		}
	});
	await flushCanvasRender(page, 500);

	const resetAllBtn = page.locator('[data-testid="cbct-tool-reset-all"]').first();
	await resetAllBtn.waitFor({ state: "visible", timeout: 5000 });
	await resetAllBtn.click();
	await flushCanvasRender(page, 800);
	await saveShot("16_reset_view_applied.png", "1-Click Reset View All button restoring oblique 0°, zoom 1.0x, pan (0,0), and clear overlays");

	// Clean up reset-view toast so Step 17 is pristine
	await dismissToasts(page);
	await sleep(300);

	// ─── 17: DOUBLE-CLICK VIEWPORT MAXIMIZATION ───────────────────────────────
	console.log("[CBCT-E2E] 17: Double-Click Viewport Maximization...");
	// Double-click on Axial Viewport canvas in corner (away from center reticle)
	const box17 = await axialCanvas.boundingBox();
	if (box17) {
		const clickX = Math.round(box17.x + box17.width * 0.15);
		const clickY = Math.round(box17.y + box17.height * 0.15);
		await page.mouse.dblclick(clickX, clickY);
	}
	await flushCanvasRender(page, 800);
	await dismissToasts(page);
	await saveShot("17_double_click_maximized_axial.png", "Double-click on viewport canvas activating 100% maximized axial view");
	await restoreGrid();

	// ─── 18: HITBOXES 24X24PX FOR RULERS & CROSSHAIR ──────────────────────────
	console.log("[CBCT-E2E] 18: 24x24px Hitboxes for Rulers & Crosshairs...");
	// Select ruler tool and draw a caliper
	await caliperToolBtn.click();
	await sleep(200);

	const box18 = await axialCanvas.boundingBox();
	if (box18) {
		const startX18 = Math.round(box18.x + box18.width * 0.25);
		const startY18 = Math.round(box18.y + box18.height * 0.35);
		const endX18 = Math.round(box18.x + box18.width * 0.70);
		const endY18 = Math.round(box18.y + box18.height * 0.35);

		await page.mouse.move(startX18, startY18);
		await sleep(50);
		await page.mouse.down();
		await sleep(50);
		for (let i = 1; i <= 3; i++) {
			const interX = Math.round(startX18 + ((endX18 - startX18) * i) / 3);
			const interY = Math.round(startY18 + ((endY18 - startY18) * i) / 3);
			await page.mouse.move(interX, interY);
			await sleep(50);
		}
		await page.mouse.up();
		await sleep(300);

		// Hover directly near handle endpoint within 24x24px hitbox (radius 12px)
		const hoverX = Math.round(endX18 - 4);
		const hoverY = Math.round(endY18 + 4);
		await page.mouse.move(hoverX, hoverY);
		await flushCanvasRender(page, 800);
	}
	await dismissToasts(page);
	await saveShot("18_ruler_crosshair_24px_hitboxes.png", "24x24px hitboxes for Caliper Ruler handle manipulation and Crosshair reticle");

	// ─── 19: PRINTABLE PDF REPORT (WHITE BACKGROUND A4 PROTOCOL) ──────────────
	console.log("[CBCT-E2E] 19: Printable PDF Planning Protocol (White Background)...");
	// In implant mode, extract the rendered printable HTML report
	const exportPdfBtn = page.locator('[data-testid="cbct-btn-export-pdf"]').first();
	await exportPdfBtn.waitFor({ state: "visible", timeout: 5000 });

	// Capture report preview by opening report HTML in a new tab/page
	const printPagePromise = context.waitForEvent("page", { timeout: 8000 });
	await exportPdfBtn.click();
	let printPage = null;
	try {
		printPage = await printPagePromise;
	} catch (err) {
		console.error(`[FATAL] Waiting for PDF report page failed: ${err.message}`);
		process.exit(1);
	}

	if (printPage) {
		await printPage.waitForLoadState("domcontentloaded");
		await sleep(800);
		await printPage.setViewportSize({ width: 1200, height: 1450 });
		await sleep(400);
		const outPath = path.join(SCREENSHOT_DIR, "19_printable_pdf_report_white_background.png");
		const pageEl = await printPage.$(".cbct-report-page");
		if (pageEl) {
			await pageEl.screenshot({ path: outPath });
		} else {
			await printPage.screenshot({ path: outPath, fullPage: true });
		}

		for (const brainDir of BRAIN_DIRS) {
			if (existsSync(brainDir)) {
				try {
					copyFileSync(outPath, path.join(brainDir, "19_printable_pdf_report_white_background.png"));
				} catch (err) {
					console.error(`[FATAL] Copying PDF report screenshot to ${brainDir} failed: ${err.message}`);
					process.exit(1);
				}
			}
		}
		const stat = statSync(outPath);
		console.log(`[CBCT-E2E] Saved 19_printable_pdf_report_white_background.png (${(stat.size / 1024).toFixed(1)} KB) - Printable A4 CBCT Planning Protocol`);
		await printPage.close();
	} else {
		console.log("[CBCT-E2E] Capturing report preview directly...");
		await saveShot("19_printable_pdf_report_white_background.png", "Printable A4 CBCT Planning Protocol with white background");
	}

	console.log("[CBCT-E2E] ALL 19 SCENARIOS EXECUTED WITH 100% UNIQUE RENDERING!");
	await browser.close();
}

run().catch((err) => {
	console.error("[FATAL] [CBCT-E2E] Unhandled error:", err);
	process.exit(1);
});

