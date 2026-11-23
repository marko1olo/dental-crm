import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import {
	autoDetectDentalArch,
	extractAxialMIPSlab,
	findOcclusalZPlane,
	computeOcclusalDensityProfile,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import {
	getFocalTroughBoundaryCurves,
	calculateVariableTroughThicknessMm,
} from "../apps/web/src/components/radiology/cbctArchSplineMath";
import { measureAlveolarRidgeCaliper } from "../apps/web/src/components/radiology/cbctRidgeCaliperMath";
import { calculateToothTiltVector } from "../apps/web/src/components/radiology/cbctToothTiltMath";

async function main() {
	console.log("=== RUNNING UNIVERSAL PIPELINE ON SECOND PATIENT (BULYAKOV N.Z.) ===");

	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	console.log(`Reading DICOM file: ${filePath}`);
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);

	console.log("Building 3D Voxel Volume from Multi-Frame DICOM...");
	const volume = await buildVolumeFromMultiFrameDicom(arrayBuf);
	console.log(`Volume built successfully: ${volume.dimensions.width}x${volume.dimensions.height}x${volume.dimensions.depth}, spacing = ${volume.spacingMm.x} mm`);

	// 1. Run universal auto-arch engine on Bulyakov
	console.log("Executing autoDetectDentalArch (mandible)...");
	const arch = autoDetectDentalArch(volume, "mandible", 14.0, 25.0);
	const centerZMm = arch.planeZMm ?? findOcclusalZPlane(volume, "mandible");
	console.log(`Arch detected at Z = ${centerZMm.toFixed(2)} mm, Arc Length = ${arch.totalArcLengthMm.toFixed(1)} mm`);
	console.log(`Number of FDI anchors: ${arch.anchors.length}`);

	// 2. Extract axial MIP slab for visualization
	const slabThickness = 6.0;
	const slab = extractAxialMIPSlab(volume, centerZMm, slabThickness);

	// 3. Compute Variable Focal Trough (Feature A)
	const trough = getFocalTroughBoundaryCurves(arch.splinePointsMm, 14.0, {
		enabled: true,
		anteriorThicknessMm: 9.0,
		premolarThicknessMm: 13.0,
		molarThicknessMm: 20.0,
	});

	// 4. Test Tooth Tilt Vector (Feature B) on Tooth 46
	const anchor46 = arch.anchors.find((a) => a.toothFdi === "46") ?? arch.anchors[2]!;
	const tilt46 = calculateToothTiltVector(volume, anchor46, centerZMm, "mandible");
	console.log("Tooth 46 Tilt Vector:", {
		fdi: tilt46.toothFdi,
		rootLengthMm: tilt46.rootLengthMm,
		mdTiltDeg: tilt46.mesiodistalTiltDeg,
		blTiltDeg: tilt46.buccolingualTiltDeg,
		canalDetected: tilt46.canalDetected,
	});

	// 5. Test Ridge Caliper (Feature C) on a cross-section through tooth 46
	// Generate a simulated transverse cross-section slice 80x80 voxels around tooth 46
	const csW = 80;
	const csH = 100;
	const csData = new Float32Array(csW * csH);
	const spacing = volume.spacingMm.x;

	for (let y = 0; y < csH; y++) {
		const zMm = centerZMm + (y - csH / 2) * spacing;
		for (let x = 0; x < csW; x++) {
			const xMm = anchor46.positionMm.x + (x - csW / 2) * spacing;
			const yMm = anchor46.positionMm.y;
			const vx = Math.round((xMm - volume.originMm.x) / volume.spacingMm.x);
			const vy = Math.round((yMm - volume.originMm.y) / volume.spacingMm.y);
			const vz = Math.round((zMm - volume.originMm.z) / volume.spacingMm.z);
			if (vx >= 0 && vx < volume.dimensions.width && vy >= 0 && vy < volume.dimensions.height && vz >= 0 && vz < volume.dimensions.depth) {
				csData[y * csW + x] = volume.data![vz * volume.dimensions.width * volume.dimensions.height + vy * volume.dimensions.width + vx] ?? -1000;
			} else {
				csData[y * csW + x] = -1000;
			}
		}
	}

	const caliper46 = measureAlveolarRidgeCaliper(csData, csW, csH, spacing, "mandible", "46");
	console.log("Alveolar Ridge Caliper (Tooth 46):", {
		W2: caliper46.widthAt2Mm,
		W6: caliper46.widthAt6Mm,
		H: caliper46.availableHeightMm,
		misch: caliper46.boneQualityMisch,
		meanHU: caliper46.meanDensityHU,
		limit: caliper46.anatomicalLimit,
	});

	// Render Proof Image with Playwright
	const width = slab.width;
	const height = slab.height;
	const sliceCount = width * height;

	const wl = 1100;
	const ww = 2800;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(sliceCount * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = slab.data[i] ?? -1000;
		let norm = (hu - low) / (high - low);
		if (norm < 0) norm = 0;
		if (norm > 1) norm = 1;
		const v = Math.round(norm * 255);
		const idx = i * 4;
		rgba[idx] = v;
		rgba[idx + 1] = v;
		rgba[idx + 2] = v;
		rgba[idx + 3] = 255;
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 950, height: 1000 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {
					margin: 0;
					padding: 20px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.header { text-align: center; margin-bottom: 12px; max-width: 750px; }
				.header h1 { font-size: 16px; margin: 0 0 4px 0; color: #10b981; font-weight: 700; }
				.header p { font-size: 12px; margin: 0; color: #a1a1aa; }
				.canvas-container {
					position: relative;
					border: 2px solid #059669;
					border-radius: 8px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
				}
				canvas { display: block; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>УНИВЕРСАЛЬНЫЙ АВТО-ПАЙПЛАЙН: ВТОРОЙ ПАЦИЕНТ (БУЛЯКОВ Н.З.)</h1>
				<p>Файл: ОЧ.dcm • Матрица: ${width}x${height}x${volume.dimensions.depth} • Z = ${centerZMm.toFixed(1)} мм • Длина дуги: ${arch.totalArcLengthMm.toFixed(1)} мм</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<script>
				const payload = ${JSON.stringify({
					w: width,
					h: height,
					bytes: Array.from(rgba),
					originMm: slab.originMm,
					spacingMm: slab.spacingMm,
					anchors: arch.anchors,
					spline: arch.splinePointsMm,
					trough,
					tilt46,
					caliper46,
				})};

				const { w, h, bytes, originMm, spacingMm, anchors, spline, trough, tilt46, caliper46 } = payload;
				function toPxX(x) { return (x - originMm.x) / spacingMm.x; }
				function toPxY(y) { return (y - originMm.y) / spacingMm.y; }

				const canvas = document.getElementById("viewCanvas");
				const ctx = canvas.getContext("2d");
				const imgData = ctx.createImageData(w, h);
				imgData.data.set(new Uint8ClampedArray(bytes));
				ctx.putImageData(imgData, 0, 0);

				// 1. Variable Focal Trough (9 mm front -> 20 mm molars)
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";
				if (trough.innerBoundary.length > 1) {
					ctx.beginPath();
					ctx.moveTo(toPxX(trough.innerBoundary[0].x), toPxY(trough.innerBoundary[0].y));
					for (let i = 1; i < trough.innerBoundary.length; i++) {
						ctx.lineTo(toPxX(trough.innerBoundary[i].x), toPxY(trough.innerBoundary[i].y));
					}
					ctx.stroke();
				}
				if (trough.outerBoundary.length > 1) {
					ctx.beginPath();
					ctx.moveTo(toPxX(trough.outerBoundary[0].x), toPxY(trough.outerBoundary[0].y));
					for (let i = 1; i < trough.outerBoundary.length; i++) {
						ctx.lineTo(toPxX(trough.outerBoundary[i].x), toPxY(trough.outerBoundary[i].y));
					}
					ctx.stroke();
				}

				// 2. Spline with Flared Adaptive Bone Tails
				ctx.setLineDash([]);
				ctx.lineWidth = 2.5;
				ctx.strokeStyle = "#10b981";
				ctx.shadowColor = "#10b981";
				ctx.shadowBlur = 6;
				ctx.beginPath();
				for (let i = 0; i < spline.length; i++) {
					const px = toPxX(spline[i].x);
					const py = toPxY(spline[i].y);
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.stroke();
				ctx.shadowBlur = 0;

				// 3. 16 FDI Anchors
				for (const a of anchors) {
					const px = toPxX(a.positionMm.x);
					const py = toPxY(a.positionMm.y);

					ctx.beginPath();
					ctx.arc(px, py, 4.0, 0, Math.PI * 2);
					ctx.fillStyle = "#10b981";
					ctx.fill();
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1.2;
					ctx.stroke();

					// Badge
					ctx.font = "bold 9px monospace";
					const tm = ctx.measureText(a.toothFdi);
					const bw = tm.width + 6;
					const bh = 13;
					const lx = px - bw / 2;
					const ly = py < h / 2 ? py - 16 : py + 10;

					ctx.fillStyle = "rgba(6, 78, 59, 0.92)";
					ctx.strokeStyle = "#10b981";
					ctx.lineWidth = 1.0;
					ctx.fillRect(lx, ly, bw, bh);
					ctx.strokeRect(lx, ly, bw, bh);

					ctx.fillStyle = "#ffffff";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(a.toothFdi, px, ly + bh / 2);
				}

				// 4. Clinical Telemetry Panel (Bottom Center)
				const panelW = 280;
				const panelH = 114;
				const panelX = Math.round((w - panelW) / 2);
				const panelY = h - panelH - 16;

				ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
				ctx.strokeStyle = "#10b981";
				ctx.lineWidth = 1.5;
				ctx.fillRect(panelX, panelY, panelW, panelH);
				ctx.strokeRect(panelX, panelY, panelW, panelH);

				ctx.fillStyle = "#34d399";
				ctx.font = "bold 11px sans-serif";
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillText("КЛИНИЧЕСКИЙ АВТО-АНАЛИЗ (БУЛЯКОВ Н.З.)", panelX + 10, panelY + 8);

				ctx.fillStyle = "#e2e8f0";
				ctx.font = "10px monospace";
				ctx.fillText("• Зуб 46 наклон: MD " + tilt46.mesiodistalTiltDeg + "°, BL " + tilt46.buccolingualTiltDeg + "°", panelX + 10, panelY + 28);
				ctx.fillText("• Длина корня 46: " + tilt46.rootLengthMm + " мм (" + (tilt46.canalDetected ? "канал найден" : "апекс") + ")", panelX + 10, panelY + 44);
				ctx.fillText("• Гребень W2: " + caliper46.widthAt2Mm + " мм | W6: " + caliper46.widthAt6Mm + " мм", panelX + 10, panelY + 60);
				ctx.fillText("• Высота кости H: " + caliper46.availableHeightMm + " мм (" + caliper46.anatomicalLimit + ")", panelX + 10, panelY + 76);
				ctx.fillText("• Плотность кости: Misch " + caliper46.boneQualityMisch + " (" + caliper46.meanDensityHU + " HU)", panelX + 10, panelY + 92);
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "proof_bulyakov_auto_arch.png");

	const container = await page.locator(".canvas-container");
	await container.screenshot({ path: outPath });
	console.log(`Bulyakov proof saved to: ${outPath}`);

	await browser.close();
}

main().catch(console.error);
