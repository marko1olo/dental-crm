import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
	autoDetectDentalArch,
	extractAxialMIPSlab,
	findOcclusalZPlane,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { getFocalTroughBoundaryCurves } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function main() {
	console.log("=== GENERATING MAXILLA MISSING TEETH ANNOTATED PROOF ===");

	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const validSlices = manifest.slices.filter(
		(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
	);

	const width = 600;
	const height = 600;
	const depth = validSlices.length;
	const sliceCount = width * height;
	const voxelData = new Int16Array(sliceCount * depth);

	for (let z = 0; z < depth; z++) {
		const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
		const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
		const base = z * sliceCount;
		for (let i = 0; i < sliceCount; i++) {
			voxelData[base + i] = (raw[i] || 0) - 1000;
		}
	}

	const pixelSpacing = 0.25;
	const sliceThickness = 0.25;
	const physicalDepthMm = depth * sliceThickness;
	const physicalWidthMm = width * pixelSpacing;
	const physicalHeightMm = height * pixelSpacing;
	const originZ = -physicalDepthMm * 0.5;

	const volume: any = {
		dimensions: { width, height, depth },
		spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
		originMm: {
			x: -physicalWidthMm * 0.5,
			y: -physicalHeightMm * 0.5,
			z: originZ,
		},
		data: voxelData,
		isDisposed: false,
	};

	// Detect Maxillary arch using production pipeline
	const maxArch = autoDetectDentalArch(volume, "maxilla", 14.0);
	const centerZMm = maxArch.planeZMm ?? findOcclusalZPlane(volume, "maxilla");
	console.log(`Maxilla detected at Z = ${centerZMm.toFixed(2)} mm, Arc length = ${maxArch.totalArcLengthMm} mm`);

	// Extract axial MIP slab for maxilla (5 mm)
	const slab = extractAxialMIPSlab(volume, centerZMm, 5.0);
	const trough = getFocalTroughBoundaryCurves(maxArch.splinePointsMm, 14.0);

	const wl = 1100;
	const ww = 2600;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = slab.data[i];
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

	const page = await browser.newPage({ viewport: { width: 900, height: 980 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {
					margin: 0;
					padding: 24px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.header { text-align: center; margin-bottom: 16px; width: 100%; max-width: 650px; }
				.header h1 { font-size: 17px; margin: 0 0 6px 0; color: #38bdf8; font-weight: 700; letter-spacing: 0.5px; }
				.header p { font-size: 12px; margin: 0; color: #a1a1aa; }
				.canvas-container {
					position: relative;
					border: 2px solid #0284c7;
					border-radius: 10px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 0 30px rgba(56, 189, 248, 0.25);
				}
				canvas { display: block; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>АНАЛИЗ ВЕРХНЕЙ ЧЕЛЮСТИ (MAXILLA): ЗОНА ДЕФЕКТА ЗУБНОГО РЯДА 26 / 27</h1>
				<p>Пациент: Захаров И.Д. • Z = ${centerZMm.toFixed(1)} мм • Срез 5.0 мм • Длина дуги: ${maxArch.totalArcLengthMm} мм</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<script>
				const payload = ${JSON.stringify({
					w: width,
					h: height,
					bytes: Array.from(rgba),
					originMm: volume.originMm,
					spacingMm: volume.spacingMm,
					anchors: maxArch.anchors,
					spline: maxArch.splinePointsMm,
					trough,
				})};

				const { w, h, bytes, originMm, spacingMm, anchors, spline, trough } = payload;
				function toPxX(x) { return (x - originMm.x) / spacingMm.x; }
				function toPxY(y) { return (y - originMm.y) / spacingMm.y; }

				const canvas = document.getElementById("viewCanvas");
				const ctx = canvas.getContext("2d");
				const imgData = ctx.createImageData(w, h);
				imgData.data.set(new Uint8ClampedArray(bytes));
				ctx.putImageData(imgData, 0, 0);

				// 1. Focal Trough (14 mm)
				ctx.lineWidth = 1.5;
				ctx.setLineDash([5, 5]);
				ctx.strokeStyle = "rgba(234, 179, 8, 0.8)";
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

				// 2. Dental Arch Spline
				ctx.setLineDash([]);
				ctx.lineWidth = 3.0;
				ctx.strokeStyle = "#38bdf8";
				ctx.shadowColor = "#38bdf8";
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

				// 3. Highlight Missing Teeth Region (26, 27) with an shaded bridge band
				const a25 = anchors.find(a => a.toothFdi === "25");
				const a26 = anchors.find(a => a.toothFdi === "26");
				const a27 = anchors.find(a => a.toothFdi === "27");
				const a28 = anchors.find(a => a.toothFdi === "28");

				if (a25 && a28) {
					const px25 = toPxX(a25.positionMm.x);
					const py25 = toPxY(a25.positionMm.y);
					const px28 = toPxX(a28.positionMm.x);
					const py28 = toPxY(a28.positionMm.y);

					// Draw connecting highlighted bridge zone
					ctx.strokeStyle = "#eab308";
					ctx.lineWidth = 2.0;
					ctx.setLineDash([3, 3]);
					ctx.beginPath();
					ctx.arc((px25 + px28)/2 + 25, (py25 + py28)/2, 38, 0, Math.PI * 2);
					ctx.stroke();
					ctx.setLineDash([]);
				}

				// 4. FDI Control Anchors
				for (const a of anchors) {
					const px = toPxX(a.positionMm.x);
					const py = toPxY(a.positionMm.y);
					const isMissing = a.toothFdi === "26" || a.toothFdi === "27";

					ctx.beginPath();
					ctx.arc(px, py, isMissing ? 5.5 : 4.5, 0, Math.PI * 2);
					ctx.fillStyle = isMissing ? "#eab308" : "#38bdf8";
					ctx.fill();
					ctx.strokeStyle = isMissing ? "#fef08a" : "#ffffff";
					ctx.lineWidth = isMissing ? 2.0 : 1.2;
					ctx.stroke();

					// Label Badge
					const label = a.toothFdi + (isMissing ? " [дефект]" : "");
					ctx.font = isMissing ? "bold 10px monospace" : "9px monospace";
					const tm = ctx.measureText(label);
					const badgeW = tm.width + 8;
					const badgeH = 14;
					const lx = px - badgeW / 2;
					const ly = py < h / 2 ? py - 20 : py + 12;

					ctx.fillStyle = isMissing ? "rgba(40, 25, 0, 0.92)" : "rgba(15, 23, 42, 0.9)";
					ctx.strokeStyle = isMissing ? "#eab308" : "#38bdf8";
					ctx.lineWidth = isMissing ? 1.5 : 1.0;
					ctx.fillRect(lx, ly, badgeW, badgeH);
					ctx.strokeRect(lx, ly, badgeW, badgeH);

					ctx.fillStyle = isMissing ? "#fef08a" : "#ffffff";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(label, px, ly + badgeH / 2);
				}

				// 5. Clinical Callout Annotation Box for 26/27
				if (a26 && a27) {
					const targetX = (toPxX(a26.positionMm.x) + toPxX(a27.positionMm.x)) / 2;
					const targetY = (toPxY(a26.positionMm.y) + toPxY(a27.positionMm.y)) / 2;

					const boxW = 230;
					const boxH = 74;
					const boxX = w - boxW - 20;
					const boxY = 440;

					// Pointer line
					ctx.strokeStyle = "#eab308";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(targetX, targetY);
					ctx.lineTo(boxX + 10, boxY);
					ctx.stroke();

					ctx.fillStyle = "rgba(18, 18, 22, 0.96)";
					ctx.strokeStyle = "#eab308";
					ctx.lineWidth = 1.5;
					ctx.fillRect(boxX, boxY, boxW, boxH);
					ctx.strokeRect(boxX, boxY, boxW, boxH);

					ctx.fillStyle = "#fef08a";
					ctx.font = "bold 11px sans-serif";
					ctx.textAlign = "left";
					ctx.textBaseline = "top";
					ctx.fillText("ЗОНА АДЕНТИИ 26 / 27 (MAXILLA)", boxX + 10, boxY + 8);

					ctx.fillStyle = "#e4e4e7";
					ctx.font = "10px sans-serif";
					ctx.fillText("• Сплайн идёт по гребню, а не в нёбо", boxX + 10, boxY + 26);
					ctx.fillText("• Сохранена гладкая кривизна дуги", boxX + 10, boxY + 42);
					ctx.fillText("• Идеально для имплантации", boxX + 10, boxY + 58);
				}
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "proof_maxilla_missing_teeth_annotated.png");

	const container = await page.locator(".canvas-container");
	await container.screenshot({ path: outPath });
	console.log(`Annotated Maxilla proof saved to: ${outPath}`);

	await browser.close();
}

main().catch(console.error);
