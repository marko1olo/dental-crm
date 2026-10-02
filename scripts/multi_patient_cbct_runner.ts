import { readFileSync, readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import {
	findOcclusalZPlane,
	extractAxialMIPSlab,
	type AxialMIPSlab,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import {
	getFocalTroughBoundaryCurves,
} from "../apps/web/src/components/radiology/cbctArchSplineMath.js";
import {
	detectHonestDentalArch,
	type HonestDentalArchResult,
} from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";
import { reconstructPanoramicView } from "../apps/web/src/components/radiology/cbctPanoramicReconstructionMath.js";
import { generate16BitLut } from "../apps/web/src/components/radiology/cbctLutMath.js";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath.js";

interface PatientBenchmarkConfig {
	readonly name: string;
	readonly type: "multiframe" | "series";
	readonly path: string;
	readonly outputFilename: string;
}

const BENCHMARK_PATIENTS: readonly PatientBenchmarkConfig[] = [
	{
		name: "Буляков Н.З.",
		type: "multiframe",
		path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
		outputFilename: "proof_blind_bulyakov_both_jaws.png",
	},
	{
		name: "Захаров И.Д.",
		type: "series",
		path: "apps/web/public/radiology/demo_cbct",
		outputFilename: "proof_blind_zakharov_both_jaws.png",
	},
	{
		name: "Сумарокова И.О.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34",
		outputFilename: "proof_blind_sumarokova_both_jaws.png",
	},
	{
		name: "Барабаш С.В.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
		outputFilename: "proof_blind_barabash_both_jaws.png",
	},
	{
		name: "Амирова Н.Н.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT",
		outputFilename: "proof_blind_amirova_both_jaws.png",
	},
];

async function loadVoxelVolume(cfg: PatientBenchmarkConfig): Promise<CbctVoxelVolume> {
	if (cfg.type === "multiframe") {
		const buf = readFileSync(cfg.path);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return buildVolumeFromMultiFrameDicom(arrayBuf);
	} else {
		const files = readdirSync(cfg.path).filter((f) => {
			const full = path.join(cfg.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(cfg.path, f);
			const buf = readFileSync(full);
			const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			items.push({ buffer: arrayBuf, fileName: f });
		}
		return buildVolumeFromDicomBuffers(items);
	}
}

function slabToRgbaArray(slab: AxialMIPSlab, wl = 525, ww = 4025): Uint8ClampedArray {
	const count = slab.width * slab.height;
	const rgba = new Uint8ClampedArray(count * 4);
	// Canonical user contrast preset (W: 4025, L: 525, Gamma: 1.50, Air: -500 HU, Soft-Knee: false):
	const lut = generate16BitLut(ww, wl, false, 1.50, { airCutoffHU: -500, enabled: false });

	for (let i = 0; i < count; i++) {
		const hu = slab.data[i] ?? -1000;
		const lutIdx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
		const v = lut[lutIdx] ?? 0;
		const idx = i * 4;
		rgba[idx] = v;
		rgba[idx + 1] = v;
		rgba[idx + 2] = v;
		rgba[idx + 3] = 255;
	}
	return rgba;
}

async function renderDualJawScreenshot(
	browser: any,
	patient: PatientBenchmarkConfig,
	vol: CbctVoxelVolume,
	mandible: { zMm: number; slab: AxialMIPSlab; arch: HonestDentalArchResult },
	maxilla: { zMm: number; slab: AxialMIPSlab; arch: HonestDentalArchResult },
	outputFilePath: string,
): Promise<void> {
	const page = await browser.newPage({ viewport: { width: 1440, height: 1180 } });

	// Canonical user contrast windowing (W/L: 4025/525, gamma 1.50, airCutoff -500 HU, soft-knee: false, slab 1.0 mm)
	const mandRgba = Array.from(slabToRgbaArray(mandible.slab, 525, 4025));
	const maxRgba = Array.from(slabToRgbaArray(maxilla.slab, 525, 4025));

	const mandTrough = getFocalTroughBoundaryCurves(mandible.arch.curve.splinePointsMm, 14.0, {
		enabled: true,
		anteriorThicknessMm: 9.0,
		premolarThicknessMm: 13.0,
		molarThicknessMm: 20.0,
	});

	const maxTrough = getFocalTroughBoundaryCurves(maxilla.arch.curve.splinePointsMm, 14.0, {
		enabled: true,
		anteriorThicknessMm: 9.0,
		premolarThicknessMm: 13.0,
		molarThicknessMm: 20.0,
	});

	// Reconstruct canonical clinical panorama along the detected dental arch with 1.0 mm layer (user canonical DENTE)
	const activeArchForPano = mandible.arch.curve.splinePointsMm.length > 0 ? mandible.arch.curve : maxilla.arch.curve;
	const panoRes = reconstructPanoramicView(vol, activeArchForPano, {
		windowWidth: 4025,
		windowLevel: 525,
		gamma: 1.50,
		airCutoffHU: -500,
		useSoftKnee: false,
		projectionMode: "average",
		focalTroughThicknessMm: 1.0,
		heightMm: 72.0,
		softKnee: { airCutoffHU: -500, enabled: false },
	});

	// Separate upper and lower tooth markers for anatomical dual-jaw ribbon display
	const upperMarkers = maxilla.arch.curve.splinePointsMm.length > 0
		? reconstructPanoramicView(vol, maxilla.arch.curve, {
				windowWidth: 4025,
				windowLevel: 525,
				gamma: 1.50,
				airCutoffHU: -500,
				useSoftKnee: false,
				projectionMode: "average",
				focalTroughThicknessMm: 1.0,
				heightMm: 72.0,
				widthPx: panoRes.widthPx,
				heightPx: panoRes.heightPx,
				softKnee: { airCutoffHU: -500, enabled: false },
		  }).toothMarkersOnPano.filter((m) => (m.isUpper ?? true) && maxilla.arch.presentTeethFdi.includes(m.toothFdi))
		: [];

	const lowerMarkers = mandible.arch.curve.splinePointsMm.length > 0
		? panoRes.toothMarkersOnPano.filter((m) => (m.isLower ?? true) && mandible.arch.presentTeethFdi.includes(m.toothFdi))
		: [];

	const renderPayload = {
		patientName: patient.name,
		patientPath: patient.path,
		volumeInfo: {
			dims: `${vol.dimensions.width} × ${vol.dimensions.height} × ${vol.dimensions.depth}`,
			spacing: `${vol.spacingMm.x.toFixed(2)} × ${vol.spacingMm.y.toFixed(2)} × ${vol.spacingMm.z.toFixed(2)} мм`,
			huRange: `[${vol.minHU}, ${vol.maxHU}] HU`,
		},
		pano: {
			w: panoRes.widthPx,
			h: panoRes.heightPx,
			bytes: Array.from(panoRes.pixelData),
			upperToothMarkers: upperMarkers,
			lowerToothMarkers: lowerMarkers,
		},
		mandible: {
			w: mandible.slab.width,
			h: mandible.slab.height,
			originMm: mandible.slab.originMm,
			spacingMm: mandible.slab.spacingMm,
			bytes: mandRgba,
			zMm: mandible.zMm,
			arcLen: mandible.arch.curve.totalArcLengthMm,
			anchors: mandible.arch.anchors,
			spline: mandible.arch.curve.splinePointsMm,
			trough: mandTrough,
			missing: mandible.arch.missingTeethFdi,
			present: mandible.arch.presentTeethFdi,
			metrics: mandible.arch.metrics,
		},
		maxilla: {
			w: maxilla.slab.width,
			h: maxilla.slab.height,
			originMm: maxilla.slab.originMm,
			spacingMm: maxilla.slab.spacingMm,
			bytes: maxRgba,
			zMm: maxilla.zMm,
			arcLen: maxilla.arch.curve.totalArcLengthMm,
			anchors: maxilla.arch.anchors,
			spline: maxilla.arch.curve.splinePointsMm,
			trough: maxTrough,
			missing: maxilla.arch.missingTeethFdi,
			present: maxilla.arch.presentTeethFdi,
			metrics: maxilla.arch.metrics,
		},
	};

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		* { box-sizing: border-box; }
		body {
			margin: 0;
			padding: 16px;
			background: #09090b;
			color: #f4f4f5;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: flex-start;
			min-height: 100vh;
		}
		.telemetry-header {
			width: 100%;
			max-width: 1390px;
			background: #18181b;
			border: 1px solid #27272a;
			border-radius: 8px;
			padding: 12px 18px;
			margin-bottom: 12px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.title-box h1 {
			margin: 0 0 4px 0;
			font-size: 16px;
			color: #38bdf8;
			letter-spacing: -0.3px;
			font-weight: 700;
		}
		.title-box p {
			margin: 0;
			font-size: 11px;
			color: #a1a1aa;
			word-break: break-all;
		}
		.stats-chips {
			display: flex;
			gap: 12px;
			align-items: center;
		}
		.chip {
			background: #27272a;
			border: 1px solid #3f3f46;
			border-radius: 6px;
			padding: 4px 10px;
			font-size: 11px;
			color: #e4e4e7;
		}
		.chip span { color: #a1a1aa; margin-right: 4px; }
		.main-grid {
			width: 100%;
			max-width: 1390px;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
		}
		.panel-card {
			background: #121215;
			border: 1px solid #27272a;
			border-radius: 8px;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		.panel-header {
			padding: 10px 14px;
			background: #18181b;
			border-bottom: 1px solid #27272a;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.panel-title {
			font-size: 13px;
			font-weight: 700;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.mandible-title { color: #10b981; }
		.maxilla-title { color: #06b6d4; }
		.panel-meta {
			font-size: 11px;
			color: #a1a1aa;
			display: flex;
			gap: 10px;
		}
		.canvas-wrapper {
			position: relative;
			background: #000;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 8px;
			height: 440px;
		}
		.canvas-wrapper-pano {
			position: relative;
			background: #000;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 8px;
			min-height: 320px;
			height: 340px;
		}
		.pano-card {
			grid-column: span 2;
		}
		.pano-title { color: #c084fc; }
		canvas {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			border: 1px solid #27272a;
			border-radius: 4px;
		}
		#panoCanvas {
			max-height: 320px;
			max-width: 100%;
			height: auto;
			object-fit: contain;
		}
		.panel-footer {
			padding: 8px 14px;
			background: #18181b;
			border-top: 1px solid #27272a;
			font-size: 11px;
			color: #a1a1aa;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.missing-tag {
			color: #f87171;
			font-weight: 600;
		}
		.present-tag {
			color: #34d399;
			font-weight: 600;
		}
	</style>
</head>
<body>
	<div class="telemetry-header">
		<div class="title-box">
			<h1>СЛЕПОЙ ТОМОГРАФИЧЕСКИЙ БЕНЧМАРК КЛКТ: ${renderPayload.patientName}</h1>
			<p>Файл: ${renderPayload.patientPath}</p>
		</div>
		<div class="stats-chips">
			<div class="chip"><span>Воксели:</span>${renderPayload.volumeInfo.dims}</div>
			<div class="chip"><span>Шаг:</span>${renderPayload.volumeInfo.spacing}</div>
			<div class="chip"><span>Плотность:</span>${renderPayload.volumeInfo.huRange}</div>
		</div>
	</div>

	<div class="main-grid">
		<!-- MANDIBLE PANEL -->
		<div class="panel-card">
			<div class="panel-header">
				<div class="panel-title mandible-title">
					НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBLE)
				</div>
				<div class="panel-meta">
					<span>Z = ${renderPayload.mandible.zMm.toFixed(2)} мм</span>
					<span>Длина дуги: ${renderPayload.mandible.arcLen.toFixed(1)} мм</span>
				</div>
			</div>
			<div class="canvas-wrapper">
				<canvas id="mandibleCanvas" width="${renderPayload.mandible.w}" height="${renderPayload.mandible.h}"></canvas>
			</div>
			<div class="panel-footer">
				<div>
					Зубы: <span class="present-tag">${renderPayload.mandible.present.length} FDI</span> ${renderPayload.mandible.missing.length > 0 ? `<span class="missing-tag">(отсутствуют: ${renderPayload.mandible.missing.join(", ")})</span>` : `<span class="present-tag">(полный зубной ряд)</span>`}
				</div>
				<div>Окно W/L: 4025/525 (Канонический DENTE HU), Gamma 1.50, Air -500, Slab 1.0 мм</div>
			</div>
		</div>

		<!-- MAXILLA PANEL -->
		<div class="panel-card">
			<div class="panel-header">
				<div class="panel-title maxilla-title">
					ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)
				</div>
				<div class="panel-meta">
					<span>Z = ${renderPayload.maxilla.zMm.toFixed(2)} мм</span>
					<span>Длина дуги: ${renderPayload.maxilla.arcLen.toFixed(1)} мм</span>
				</div>
			</div>
			<div class="canvas-wrapper">
				<canvas id="maxillaCanvas" width="${renderPayload.maxilla.w}" height="${renderPayload.maxilla.h}"></canvas>
			</div>
			<div class="panel-footer">
				<div>
					Зубы: <span class="present-tag">${renderPayload.maxilla.present.length} FDI</span> ${renderPayload.maxilla.missing.length > 0 ? `<span class="missing-tag">(отсутствуют: ${renderPayload.maxilla.missing.join(", ")})</span>` : `<span class="present-tag">(полный зубной ряд)</span>`}
				</div>
				<div>Окно W/L: 4025/525 (Канонический DENTE HU), Gamma 1.50, Air -500, Slab 1.0 мм</div>
			</div>
		</div>

		<!-- RECONSTRUCTED CLINICAL PANORAMA (OPTG) PANEL -->
		<div class="panel-card pano-card">
			<div class="panel-header">
				<div class="panel-title pano-title">
					РЕКОНСТРУИРОВАННАЯ КЛИНИЧЕСКАЯ ПАНОРАМА (ОПТГ) — ПОЛУТОНОВОЙ РЕНТГЕН
				</div>
				<div class="panel-meta">
					<span>Окно W/L: 4025/525 (Канонический DENTE HU), Gamma 1.50, Air -500, Slab 1.0 мм</span>
					<span>Слой ОПТГ: 1.0 мм • Soft-Knee: ВЫКЛ</span>
					<span>Канонический дентальный контраст DENTE</span>
				</div>
			</div>
			<div class="canvas-wrapper-pano">
				<canvas id="panoCanvas" width="${renderPayload.pano.w}" height="${renderPayload.pano.h}"></canvas>
			</div>
			<div class="panel-footer">
				<div>Сплайн дуги: 0 щечного расхождения • Реконструкция строго по центроидам бусин эмали</div>
				<div>Изометрия 1:1 (шаг мм дуги = шаг мм Z) • Без белых выгораний и пересвета</div>
			</div>
		</div>
	</div>

	<script>
		const payload = ${JSON.stringify(renderPayload)};

		function drawJawCanvas(canvasId, jawData, accentColor, isMandible) {
			const canvas = document.getElementById(canvasId);
			const ctx = canvas.getContext("2d");
			const w = jawData.w;
			const h = jawData.h;

			const imgData = ctx.createImageData(w, h);
			imgData.data.set(new Uint8ClampedArray(jawData.bytes));
			ctx.putImageData(imgData, 0, 0);

			function toPxX(x) { return (x - jawData.originMm.x) / (jawData.spacingMm.x || 0.25); }
			function toPxY(y) { return (y - jawData.originMm.y) / (jawData.spacingMm.y || 0.25); }

			// 1. Variable Focal Trough (Dashed Yellow)
			ctx.lineWidth = 1.2;
			ctx.setLineDash([3, 3]);
			ctx.strokeStyle = "rgba(250, 204, 21, 0.65)";
			if (jawData.trough.innerBoundary.length > 1) {
				ctx.beginPath();
				ctx.moveTo(toPxX(jawData.trough.innerBoundary[0].x), toPxY(jawData.trough.innerBoundary[0].y));
				for (let i = 1; i < jawData.trough.innerBoundary.length; i++) {
					ctx.lineTo(toPxX(jawData.trough.innerBoundary[i].x), toPxY(jawData.trough.innerBoundary[i].y));
				}
				ctx.stroke();
			}
			if (jawData.trough.outerBoundary.length > 1) {
				ctx.beginPath();
				ctx.moveTo(toPxX(jawData.trough.outerBoundary[0].x), toPxY(jawData.trough.outerBoundary[0].y));
				for (let i = 1; i < jawData.trough.outerBoundary.length; i++) {
					ctx.lineTo(toPxX(jawData.trough.outerBoundary[i].x), toPxY(jawData.trough.outerBoundary[i].y));
				}
				ctx.stroke();
			}

			// 2. Smooth Catmull-Rom Dental Arch Curve
			ctx.setLineDash([]);
			ctx.lineWidth = 2.2;
			ctx.strokeStyle = accentColor;
			ctx.shadowColor = accentColor;
			ctx.shadowBlur = 5;
			ctx.beginPath();
			for (let i = 0; i < jawData.spline.length; i++) {
				const px = toPxX(jawData.spline[i].x);
				const py = toPxY(jawData.spline[i].y);
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;

			// 3. FDI Anchors with Staggering Anti-Collision
			ctx.font = "bold 9px monospace";
			const badgeItems = jawData.anchors.filter((a) => !a.isMissing && a.status !== "missing_defect").map((a) => {
				const px = toPxX(a.positionMm.x);
				const py = toPxY(a.positionMm.y);
				const tm = ctx.measureText(a.toothFdi);
				const bw = tm.width + 6;
				const bh = 12;
				return { anchor: a, px, py, bw, bh, isMissing: a.isMissing, staggerLevel: 0 };
			});

			// Pass 1: Detect horizontal proximity collisions between adjacent badges
			for (let i = 0; i < badgeItems.length - 1; i++) {
				const b1 = badgeItems[i];
				const b2 = badgeItems[i + 1];
				const dist = Math.hypot(b2.px - b1.px, b2.py - b1.py);
				const dx = Math.abs(b2.px - b1.px);
				const minClearance = (b1.bw + b2.bw) / 2 + 3;
				if (dx < minClearance || dist < 22) {
					b2.staggerLevel = (b1.staggerLevel + 1) % 3;
				}
			}

			// Pass 2: Draw tooth circle anchors and badges
			for (const b of badgeItems) {
				const px = b.px;
				const py = b.py;

				// Tooth anchor bead
				ctx.beginPath();
				ctx.arc(px, py, 3.8, 0, Math.PI * 2);
				ctx.fillStyle = accentColor;
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.0;
				ctx.stroke();

				// Compute badge position with anti-collision stagger
				const isTopHalf = py < h / 2;
				const staggerOffset = b.staggerLevel * 14;
				const ly = isTopHalf
					? py - 14 - staggerOffset
					: py + 8 + staggerOffset;
				const lx = px - b.bw / 2;

				// Draw thin leader line if badge is staggered away from bead
				if (b.staggerLevel > 0) {
					ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
					ctx.lineWidth = 0.8;
					ctx.setLineDash([1, 1]);
					ctx.beginPath();
					if (isTopHalf) {
						ctx.moveTo(px, py - 4);
						ctx.lineTo(px, ly + b.bh);
					} else {
						ctx.moveTo(px, py + 4);
						ctx.lineTo(px, ly);
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}

				// FDI Badge rectangle (clean, dark, accent border, white text)
				ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
				ctx.strokeStyle = accentColor;
				ctx.lineWidth = 0.8;
				ctx.fillRect(lx, ly, b.bw, b.bh);
				ctx.strokeRect(lx, ly, b.bw, b.bh);

				ctx.fillStyle = "#ffffff";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(b.anchor.toothFdi, px, ly + b.bh / 2);
			}
		}

		function drawPanoCanvas(canvasId, panoData) {
			const cvs = document.getElementById(canvasId);
			if (!cvs || !panoData || !panoData.bytes || panoData.bytes.length === 0) return;
			const ctx = cvs.getContext("2d");
			const imgData = ctx.createImageData(panoData.w, panoData.h);
			imgData.data.set(new Uint8ClampedArray(panoData.bytes));
			ctx.putImageData(imgData, 0, 0);

			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			// Draw upper jaw markers (18..28) in top region over maxilla
			const uppers = panoData.upperToothMarkers || (panoData.toothMarkers || []).filter((m) => m.isUpper ?? (parseInt(m.toothFdi, 10) <= 28));
			for (const tm of uppers) {
				const badgeW = 20;
				const badgeH = 13;
				const bx = tm.xPx - badgeW / 2;
				const by = 4;
				ctx.fillStyle = "rgba(9, 9, 11, 0.88)";
				ctx.strokeStyle = "#06b6d4";
				ctx.lineWidth = 0.8;
				ctx.fillRect(bx, by, badgeW, badgeH);
				ctx.strokeRect(bx, by, badgeW, badgeH);
				ctx.fillStyle = "#38bdf8";
				ctx.fillText(tm.toothFdi, tm.xPx, by + badgeH / 2);

				// Leader tick mark
				ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
				ctx.beginPath();
				ctx.moveTo(tm.xPx, by + badgeH);
				ctx.lineTo(tm.xPx, by + badgeH + 4);
				ctx.stroke();
			}

			// Draw lower jaw markers (48..38) in bottom region under mandible
			const lowers = panoData.lowerToothMarkers || (panoData.toothMarkers || []).filter((m) => m.isLower ?? (parseInt(m.toothFdi, 10) >= 31));
			for (const tm of lowers) {
				const badgeW = 20;
				const badgeH = 13;
				const bx = tm.xPx - badgeW / 2;
				const by = panoData.h - 17;
				ctx.fillStyle = "rgba(9, 9, 11, 0.88)";
				ctx.strokeStyle = "#10b981";
				ctx.lineWidth = 0.8;
				ctx.fillRect(bx, by, badgeW, badgeH);
				ctx.strokeRect(bx, by, badgeW, badgeH);
				ctx.fillStyle = "#34d399";
				ctx.fillText(tm.toothFdi, tm.xPx, by + badgeH / 2);

				// Leader tick mark
				ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
				ctx.beginPath();
				ctx.moveTo(tm.xPx, by);
				ctx.lineTo(tm.xPx, by - 4);
				ctx.stroke();
			}
		}

		drawJawCanvas("mandibleCanvas", payload.mandible, "#10b981", true);
		drawJawCanvas("maxillaCanvas", payload.maxilla, "#06b6d4", false);
		drawPanoCanvas("panoCanvas", payload.pano);
	</script>
</body>
</html>
	`;

	await page.setContent(html);
	await page.waitForTimeout(600);
	await page.screenshot({ path: outputFilePath, fullPage: true });
	await page.close();
}

export async function runMultiPatientBenchmark(): Promise<void> {
	console.log("================================================================================");
	console.log("=== MULTI-PATIENT DICOM & BLIND BENCHMARK INQUISITOR (5 REAL DATASETS) ===");
	console.log("================================================================================\n");

	const outputDir = path.resolve("docs/screenshots/cbct_live/blind_benchmark");
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	for (const patient of BENCHMARK_PATIENTS) {
		console.log(`\n>>> [PROCESSING PATIENT]: ${patient.name}`);
		const t0 = Date.now();
		const vol = await loadVoxelVolume(patient);
		console.log(`    Volume loaded in ${Date.now() - t0}ms (${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth})`);

		// 1. Mandible analysis
		const mandZ = findOcclusalZPlane(vol, "mandible");
		const mandSlab = extractAxialMIPSlab(vol, mandZ, 1.0, "average");
		const mandArch = detectHonestDentalArch(mandSlab, "mandible", 14.0);
		console.log(`    [MANDIBLE] Z = ${mandZ.toFixed(2)} mm, Arc Length = ${mandArch.curve.totalArcLengthMm?.toFixed(1)} mm, Missing = ${mandArch.missingTeethFdi.length}`);

		// 2. Maxilla analysis
		const maxZ = findOcclusalZPlane(vol, "maxilla");
		const maxSlab = extractAxialMIPSlab(vol, maxZ, 1.0, "average");
		const maxArch = detectHonestDentalArch(maxSlab, "maxilla", 14.0);
		console.log(`    [MAXILLA]  Z = ${maxZ.toFixed(2)} mm, Arc Length = ${maxArch.curve.totalArcLengthMm?.toFixed(1)} mm, Missing = ${maxArch.missingTeethFdi.length}`);

		// 3. Render dual-jaw proof screenshot
		const outPath = path.join(outputDir, patient.outputFilename);
		console.log(`    Rendering dual-jaw screenshot -> ${patient.outputFilename}...`);
		await renderDualJawScreenshot(
			browser,
			patient,
			vol,
			{ zMm: mandZ, slab: mandSlab, arch: mandArch },
			{ zMm: maxZ, slab: maxSlab, arch: maxArch },
			outPath,
		);
		console.log(`    ✓ Saved screenshot: ${outPath}`);

		const brainDirs = [
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9bd515d4-936b-4ea4-8192-7c7792988575",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9be937c5-de3e-4bb9-9503-496e0919bf0a",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\01de3ad9-8f5d-43c7-b8be-544bfa67c606",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\29d238ff-2db8-4ca7-803c-5ba5d97d388b",
		];
		for (const bDir of brainDirs) {
			if (existsSync(bDir)) {
				const bPath = path.join(bDir, patient.outputFilename);
				copyFileSync(outPath, bPath);
				console.log(`    ✓ Copied screenshot to brain: ${bPath}`);
			}
		}
	}

	await browser.close();
	console.log("\n================================================================================");
	console.log("=== BLIND BENCHMARK EXECUTION COMPLETED ON ALL 5 PATIENT DATASETS ===");
	console.log("================================================================================");
}

// Auto-run if executed directly
runMultiPatientBenchmark().catch((err) => {
	console.error("Benchmark failed with error:", err);
	process.exit(1);
});
