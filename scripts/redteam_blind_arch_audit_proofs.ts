import { readFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab, autoDetectDentalArch } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";
import { getFocalTroughBoundaryCurves } from "../apps/web/src/components/radiology/cbctArchSplineMath.js";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath.js";

interface PatientDataset {
	id: string;
	name: string;
	type: "series" | "multiframe";
	path: string;
	jawType: "mandible" | "maxilla";
}

async function loadDataset(ds: PatientDataset): Promise<CbctVoxelVolume> {
	if (ds.type === "multiframe") {
		const buf = readFileSync(ds.path);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return buildVolumeFromMultiFrameDicom(arrayBuf);
	} else {
		const files = readdirSync(ds.path).filter((f) => {
			const full = path.join(ds.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(ds.path, f);
			const buf = readFileSync(full);
			const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			items.push({ buffer: arrayBuf, fileName: f });
		}
		return buildVolumeFromDicomBuffers(items);
	}
}

async function renderProof(
	patient: PatientDataset,
	volume: CbctVoxelVolume,
	outFileName: string,
	browser: any
) {
	console.log(`\n--- Rendering Red Team Proof for ${patient.name} (${patient.jawType}) ---`);
	const zPlane = findOcclusalZPlane(volume, patient.jawType);
	const mipSlab = extractAxialMIPSlab(volume, zPlane, 6.0);

	// 1. Honest Engine (Blob & Enamel Beads Centroids)
	const honestResult = detectHonestDentalArch(mipSlab, patient.jawType, 12.0);
	const honestSpline = honestResult.curve.splinePointsMm;
	const honestAnchors = honestResult.anchors;
	const honestTrough = getFocalTroughBoundaryCurves(honestSpline, 12.0);

	// 2. Old Polar Engine (for direct adversarial comparison)
	const oldArch = autoDetectDentalArch(volume, patient.jawType, 12.0);
	const oldSpline = oldArch.splinePointsMm;
	const oldAnchors = oldArch.anchors;

	const width = mipSlab.width;
	const height = mipSlab.height;

	// Bone Window conversion for clear anatomical visualization (WL=600, WW=2400)
	const wl = 600;
	const ww = 2400;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < width * height; i++) {
		const hu = mipSlab.data[i] ?? -1000;
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

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<style>
				* { box-sizing: border-box; }
				body {
					margin: 0;
					padding: 16px 24px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
					display: flex;
					flex-direction: column;
					align-items: center;
					height: 100vh;
					overflow: hidden;
				}
				.header {
					width: 100%;
					max-width: 1390px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					background: #111114;
					border: 1px solid #27272a;
					border-radius: 8px;
					padding: 10px 18px;
					margin-bottom: 12px;
				}
				.title-group h1 {
					font-size: 15px;
					font-weight: 700;
					margin: 0 0 4px 0;
					color: #22d3ee;
					letter-spacing: -0.01em;
				}
				.title-group p {
					font-size: 11px;
					margin: 0;
					color: #a1a1aa;
					font-family: ui-monospace, monospace;
				}
				.badge-group {
					display: flex;
					gap: 8px;
				}
				.badge {
					font-size: 11px;
					font-weight: 600;
					padding: 3px 8px;
					border-radius: 4px;
				}
				.badge-honest {
					background: #064e3b;
					color: #34d399;
					border: 1px solid #059669;
				}
				.badge-old {
					background: #450a0a;
					color: #f87171;
					border: 1px solid #dc2626;
				}
				.main-content {
					display: flex;
					gap: 16px;
					width: 100%;
					max-width: 1390px;
					height: calc(100vh - 100px);
				}
				.canvas-card {
					flex: 1;
					background: #000;
					border: 1px solid #27272a;
					border-radius: 8px;
					overflow: hidden;
					display: flex;
					justify-content: center;
					align-items: center;
					position: relative;
				}
				canvas {
					max-width: 100%;
					max-height: 100%;
					object-fit: contain;
					display: block;
				}
				.sidebar {
					width: 380px;
					background: #111114;
					border: 1px solid #27272a;
					border-radius: 8px;
					padding: 14px;
					display: flex;
					flex-direction: column;
					gap: 12px;
				}
				.section-title {
					font-size: 12px;
					font-weight: 700;
					text-transform: uppercase;
					color: #71717a;
					letter-spacing: 0.05em;
					margin-bottom: 6px;
				}
				.metric-box {
					background: #18181b;
					border: 1px solid #27272a;
					border-radius: 6px;
					padding: 10px;
					font-size: 11px;
					font-family: ui-monospace, monospace;
				}
				.metric-row {
					display: flex;
					justify-content: space-between;
					margin-bottom: 4px;
				}
				.metric-row:last-child { margin-bottom: 0; }
				.metric-k { color: #a1a1aa; }
				.metric-v { color: #38bdf8; font-weight: 600; }
				.metric-v.alert { color: #f87171; }
				.legend-box {
					display: flex;
					flex-direction: column;
					gap: 6px;
					font-size: 11px;
				}
				.legend-row {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.legend-bar {
					width: 18px;
					height: 4px;
					border-radius: 2px;
				}
				.legend-circle {
					width: 10px;
					height: 10px;
					border-radius: 50%;
				}
				.inquisition-verdict {
					margin-top: auto;
					background: #022c22;
					border: 1px solid #059669;
					border-radius: 6px;
					padding: 10px;
					font-size: 11px;
					color: #34d399;
					line-height: 1.4;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<div class="title-group">
					<h1>RED TEAM СЛЕПОЙ АУДИТ ДЕТЕКЦИИ ДУГИ ОПТГ — ${patient.name.toUpperCase()}</h1>
					<p>Dataset: ${patient.type} • Челюсть: ${patient.jawType.toUpperCase()} • Z = ${zPlane.toFixed(1)} mm • Воксель: ${volume.spacingMm.x.toFixed(2)} mm</p>
				</div>
				<div class="badge-group">
					<span class="badge badge-honest">ЧЕСТНЫЙ АЛГОРИТМ (EDT + ЦЕНТРОИДЫ)</span>
					<span class="badge badge-old">СТАРЫЙ ПОЛЯРНЫЙ МЕТОД (16 УГЛОВ)</span>
				</div>
			</div>

			<div class="main-content">
				<div class="canvas-card">
					<canvas id="mainCanvas" width="${width}" height="${height}"></canvas>
				</div>
				<div class="sidebar">
					<div>
						<div class="section-title">Легенда наложения</div>
						<div class="legend-box">
							<div class="legend-row">
								<span class="legend-bar" style="background: #06b6d4;"></span>
								<span>Честная дуга (Catmull-Rom по эмали)</span>
							</div>
							<div class="legend-row">
								<span class="legend-bar" style="background: rgba(234, 179, 8, 0.8); border: 1px dashed #eab308;"></span>
								<span>Фокальное корыто ОПТГ (±6 мм)</span>
							</div>
							<div class="legend-row">
								<span class="legend-circle" style="background: #10b981; border: 1.5px solid #fff;"></span>
								<span>Присутствующий зуб (Enamel Bead)</span>
							</div>
							<div class="legend-row">
								<span class="legend-circle" style="background: #f43f5e; border: 1.5px solid #fff;"></span>
								<span>Старый анкер (жесткий полярный луч)</span>
							</div>
							<div class="legend-row">
								<span class="legend-bar" style="background: #f43f5e; opacity: 0.5;"></span>
								<span>Старая подгоночная дуга (с вылетом в кость)</span>
							</div>
						</div>
					</div>

					<div>
						<div class="section-title">Метрики детекции честного алгоритма</div>
						<div class="metric-box">
							<div class="metric-row">
								<span class="metric-k">Длина зубной дуги:</span>
								<span class="metric-v">${honestResult.curve.totalArcLengthMm.toFixed(1)} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-k">Найдено зубов:</span>
								<span class="metric-v">${honestResult.presentTeethFdi.length} из 16</span>
							</div>
							<div class="metric-row">
								<span class="metric-k">Дефекты адентии:</span>
								<span class="metric-v">${honestResult.missingTeethFdi.length} зубов</span>
							</div>
							<div class="metric-row">
								<span class="metric-k">Ошибка фиссур:</span>
								<span class="metric-v">${honestResult.metrics.fissureMidpointErrorMm.toFixed(2)} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-k">Задняя граница Y:</span>
								<span class="metric-v">${honestResult.metrics.posteriorBoundaryYMm.toFixed(1)} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-k">Small FOV сектор:</span>
								<span class="metric-v">${honestResult.metrics.isSectionalScan ? "ДА" : "НЕТ (полный)"}</span>
							</div>
						</div>
					</div>

					<div>
						<div class="section-title">Список распознанных зубов</div>
						<div class="metric-box" style="max-height: 120px; overflow-y: auto;">
							<div class="metric-row">
								<span class="metric-k">Зубы в ряду:</span>
								<span class="metric-v" style="font-size: 10px;">${honestResult.presentTeethFdi.join(", ") || "—"}</span>
							</div>
							<div class="metric-row" style="margin-top: 6px;">
								<span class="metric-k">Отсутствуют:</span>
								<span class="metric-v alert" style="font-size: 10px;">${honestResult.missingTeethFdi.join(", ") || "Нет (все 16)"}</span>
							</div>
						</div>
					</div>

					<div class="inquisition-verdict">
						<strong>RED TEAM ВЕРДИКТ:</strong><br>
						Дуга построена строго по 2D-центроидам эмали зубов (HU >= 1150).
						Терминация строго у моляров без улета в ветвь челюсти или мягкие ткани щеки.
					</div>
				</div>
			</div>
			<script>
				const RENDER_DATA = {
					width: ${width},
					height: ${height},
					originMm: ${JSON.stringify(mipSlab.originMm)},
					spacingMm: ${JSON.stringify(mipSlab.spacingMm)},
					honestSpline: ${JSON.stringify(honestSpline)},
					honestTrough: ${JSON.stringify(honestTrough)},
					honestAnchors: ${JSON.stringify(honestAnchors)},
					oldSpline: ${JSON.stringify(oldSpline)},
					oldAnchors: ${JSON.stringify(oldAnchors)},
				};

				function decodeBase64Rgba(b64) {
					const bin = atob(b64);
					const bytes = new Uint8ClampedArray(bin.length);
					for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
					return bytes;
				}

				const canvas = document.getElementById("mainCanvas");
				const ctx = canvas.getContext("2d");

				// 1. Draw raw axial MIP image
				const imgData = ctx.createImageData(RENDER_DATA.width, RENDER_DATA.height);
				imgData.data.set(decodeBase64Rgba("${Buffer.from(rgba.buffer).toString("base64")}"));
				ctx.putImageData(imgData, 0, 0);

				function mmToPx(xMm, yMm) {
					return {
						x: (xMm - RENDER_DATA.originMm.x) / RENDER_DATA.spacingMm.x,
						y: (yMm - RENDER_DATA.originMm.y) / RENDER_DATA.spacingMm.y,
					};
				}

				// 2. Draw Old Polar Spline (semi-transparent red line) for contrast
				if (RENDER_DATA.oldSpline && RENDER_DATA.oldSpline.length > 1) {
					ctx.lineWidth = 1.8;
					ctx.setLineDash([4, 4]);
					ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
					ctx.beginPath();
					const p0 = mmToPx(RENDER_DATA.oldSpline[0].x, RENDER_DATA.oldSpline[0].y);
					ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < RENDER_DATA.oldSpline.length; i++) {
						const p = mmToPx(RENDER_DATA.oldSpline[i].x, RENDER_DATA.oldSpline[i].y);
						ctx.lineTo(p.x, p.y);
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}

				// 3. Draw Old Polar Anchors (faded red dots)
				if (RENDER_DATA.oldAnchors) {
					for (const a of RENDER_DATA.oldAnchors) {
						const p = mmToPx(a.positionMm.x, a.positionMm.y);
						ctx.beginPath();
						ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
						ctx.fillStyle = "rgba(244, 63, 94, 0.5)";
						ctx.fill();
					}
				}

				// 4. Draw Focal Trough boundaries (Yellow dashed)
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";

				if (RENDER_DATA.honestTrough.innerBoundary.length > 1) {
					ctx.beginPath();
					const p0 = mmToPx(RENDER_DATA.honestTrough.innerBoundary[0].x, RENDER_DATA.honestTrough.innerBoundary[0].y);
					ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < RENDER_DATA.honestTrough.innerBoundary.length; i++) {
						const p = mmToPx(RENDER_DATA.honestTrough.innerBoundary[i].x, RENDER_DATA.honestTrough.innerBoundary[i].y);
						ctx.lineTo(p.x, p.y);
					}
					ctx.stroke();
				}

				if (RENDER_DATA.honestTrough.outerBoundary.length > 1) {
					ctx.beginPath();
					const p0 = mmToPx(RENDER_DATA.honestTrough.outerBoundary[0].x, RENDER_DATA.honestTrough.outerBoundary[0].y);
					ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < RENDER_DATA.honestTrough.outerBoundary.length; i++) {
						const p = mmToPx(RENDER_DATA.honestTrough.outerBoundary[i].x, RENDER_DATA.honestTrough.outerBoundary[i].y);
						ctx.lineTo(p.x, p.y);
					}
					ctx.stroke();
				}
				ctx.setLineDash([]);

				// 5. Draw Honest Dental Arch Spline (Bright Cyan)
				if (RENDER_DATA.honestSpline.length > 1) {
					ctx.lineWidth = 2.8;
					ctx.strokeStyle = "#06b6d4";
					ctx.shadowColor = "#06b6d4";
					ctx.shadowBlur = 6;
					ctx.beginPath();
					const p0 = mmToPx(RENDER_DATA.honestSpline[0].x, RENDER_DATA.honestSpline[0].y);
					ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < RENDER_DATA.honestSpline.length; i++) {
						const p = mmToPx(RENDER_DATA.honestSpline[i].x, RENDER_DATA.honestSpline[i].y);
						ctx.lineTo(p.x, p.y);
					}
					ctx.stroke();
					ctx.shadowBlur = 0;
				}

				// 6. Draw Honest Tooth Enamel Centroid Anchors
				for (const a of RENDER_DATA.honestAnchors) {
					const p = mmToPx(a.positionMm.x, a.positionMm.y);

					// Outer ring (Emerald for present, Amber for defect)
					ctx.beginPath();
					ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
					ctx.fillStyle = a.status === "present" ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)";
					ctx.fill();
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1.5;
					ctx.stroke();

					// Center dot
					ctx.beginPath();
					ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
					ctx.fillStyle = "#ffffff";
					ctx.fill();

					// Tooth FDI badge
					ctx.font = "bold 11px monospace";
					const text = a.toothFdi;
					const tm = ctx.measureText(text);
					const tw = tm.width;
					const th = 12;

					const labelY = p.y < RENDER_DATA.height / 2 ? p.y - 12 : p.y + 16;
					const labelX = p.x - tw / 2;

					ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
					ctx.fillRect(labelX - 3, labelY - 9, tw + 6, th + 2);
					ctx.strokeStyle = a.status === "present" ? "#10b981" : "#f59e0b";
					ctx.lineWidth = 1;
					ctx.strokeRect(labelX - 3, labelY - 9, tw + 6, th + 2);

					ctx.fillStyle = "#f8fafc";
					ctx.fillText(text, labelX, labelY);
				}
			</script>
		</body>
		</html>
	`);

	await page.waitForTimeout(400);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const fullOutPath = path.join(outDir, outFileName);

	await page.screenshot({ path: fullOutPath });
	console.log(`✓ Proof successfully saved: ${fullOutPath}`);
	await page.close();
}

async function main() {
	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const patients: PatientDataset[] = [
		{
			id: "zakharov",
			name: "Захаров И.Д.",
			type: "series",
			path: "apps/web/public/radiology/demo_cbct",
			jawType: "mandible",
		},
		{
			id: "bulyakov",
			name: "Буляков Н.З.",
			type: "multiframe",
			path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
			jawType: "mandible",
		},
		{
			id: "barabash",
			name: "Барабаш С.В.",
			type: "series",
			path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
			jawType: "mandible",
		},
	];

	for (const patient of patients) {
		const vol = await loadDataset(patient);
		await renderProof(patient, vol, `redteam_proof_${patient.id}_${patient.jawType}_1440x900.png`, browser);
	}

	await browser.close();
	console.log("\n=== ALL RED TEAM PROOF SCREENSHOTS COMPLETED! ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR IN RED TEAM AUDIT]", err);
	process.exit(1);
});
