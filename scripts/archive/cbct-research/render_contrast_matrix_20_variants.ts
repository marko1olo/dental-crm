import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import {
	findOcclusalZPlane,
	extractAxialMIPSlab,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import {
	detectHonestDentalArch,
} from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";
import { reconstructPanoramicView } from "../apps/web/src/components/radiology/cbctPanoramicReconstructionMath.js";
import {
	DENTE_CONTRAST_PRESETS,
	generate16BitLut,
	type DenteContrastPreset,
} from "../apps/web/src/components/radiology/cbctLutMath.js";

interface MatrixRowConfig {
	readonly rowId: string;
	readonly rowLabelRu: string;
	readonly thicknessMm: number;
	readonly projectionMode: string;
	readonly descriptionRu: string;
}

const MATRIX_ROWS: readonly MatrixRowConfig[] = [
	{
		rowId: "row_1_slice_1mm",
		rowLabelRu: "Ряд A: Тонкий срез 1.0 мм (Single Slice)",
		thicknessMm: 1.0,
		projectionMode: "slice",
		descriptionRu: "Чистый анатомический срез без наложения вокселей. Нулевая каша, четкие контуры каналов.",
	},
	{
		rowId: "row_2_raysum_3mm",
		rowLabelRu: "Ряд B: Тонкий слой 3.0 мм (Ray-Sum 25/75)",
		thicknessMm: 3.0,
		projectionMode: "ray_sum",
		descriptionRu: "Деликатный объемный слой: 25% MIP + 75% среднее. Каналы темные, верхушки корней читаемы.",
	},
	{
		rowId: "row_3_raysum_6mm",
		rowLabelRu: "Ряд C: Дентальный слой 6.0 мм (Ray-Sum 35/65)",
		thicknessMm: 6.0,
		projectionMode: "ray_sum",
		descriptionRu: "Сбалансированная дентальная панорама: 35% MIP + 65% среднее. Оптимальный объем и резкость.",
	},
	{
		rowId: "row_4_average_10mm",
		rowLabelRu: "Ряд D: Интегральный слой 10.0 мм (X-Ray Average)",
		thicknessMm: 10.0,
		projectionMode: "average",
		descriptionRu: "Честный физический интеграл ослабления ОПТГ. Полные полутона, нет выгорания в белый блин.",
	},
];

async function main() {
	console.log("Loading Zakharov DICOM series for 20-Variants Matrix...");
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);

	const mandZ = findOcclusalZPlane(vol, "mandible");
	const mandSlab = extractAxialMIPSlab(vol, mandZ, 6.0);
	const mandArch = detectHonestDentalArch(mandSlab, "mandible");

	console.log("Generating 20 distinct panoramic variants (4 layer types × 5 contrast presets)...");

	interface VariantCell {
		readonly index: number;
		readonly row: MatrixRowConfig;
		readonly preset: DenteContrastPreset;
		readonly panoW: number;
		readonly panoH: number;
		readonly panoBytes: number[];
		readonly toothMarkers: ReadonlyArray<{ toothFdi: string; xPx: number }>;
	}

	const variants: VariantCell[] = [];
	let variantIndex = 1;

	for (const row of MATRIX_ROWS) {
		for (const preset of DENTE_CONTRAST_PRESETS) {
			console.log(`  Rendering Variant #${variantIndex}: ${row.rowLabelRu} × ${preset.nameRu}...`);
			const panoRes = reconstructPanoramicView(vol, mandArch.curve, {
				windowWidth: preset.windowWidth,
				windowLevel: preset.windowLevel,
				projectionMode: row.projectionMode,
				focalTroughThicknessMm: row.thicknessMm,
				heightMm: 68.0,
				softKnee: { peakEnamel: preset.peakEnamel, airCutoffHU: preset.airCutoffHU },
			});

			variants.push({
				index: variantIndex,
				row,
				preset,
				panoW: panoRes.widthPx,
				panoH: panoRes.heightPx,
				panoBytes: Array.from(panoRes.pixelData),
				toothMarkers: panoRes.toothMarkersOnPano.map((m) => ({ toothFdi: m.toothFdi, xPx: m.xPx })),
			});
			variantIndex++;
		}
	}

	const renderPayload = {
		patientName: "Захаров И.Д.",
		dims: `${vol.dimensions.width} × ${vol.dimensions.height} × ${vol.dimensions.depth}`,
		spacing: `${vol.spacingMm.x.toFixed(2)} × ${vol.spacingMm.y.toFixed(2)} × ${vol.spacingMm.z.toFixed(2)} мм`,
		mandZ: mandZ.toFixed(1),
		variants,
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
		}
		.matrix-header {
			width: 100%;
			max-width: 1880px;
			background: #18181b;
			border: 1px solid #27272a;
			border-radius: 8px;
			padding: 14px 20px;
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.title-box h1 {
			margin: 0 0 4px 0;
			font-size: 18px;
			color: #38bdf8;
			font-weight: 700;
		}
		.title-box p {
			margin: 0;
			font-size: 12px;
			color: #a1a1aa;
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
			padding: 4px 12px;
			font-size: 12px;
			color: #e4e4e7;
		}
		.chip span { color: #a1a1aa; margin-right: 4px; }
		.matrix-grid {
			width: 100%;
			max-width: 1880px;
			display: grid;
			grid-template-columns: repeat(5, 1fr);
			gap: 12px;
		}
		.cell-card {
			background: #121215;
			border: 1px solid #27272a;
			border-radius: 6px;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		.cell-header {
			padding: 8px 10px;
			background: #18181b;
			border-bottom: 1px solid #27272a;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.cell-title-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.var-badge {
			font-size: 11px;
			font-weight: 800;
			background: #38bdf8;
			color: #09090b;
			padding: 2px 6px;
			border-radius: 4px;
		}
		.layer-badge {
			font-size: 10px;
			font-weight: 600;
			color: #34d399;
			background: #064e3b;
			padding: 2px 6px;
			border-radius: 4px;
		}
		.preset-name {
			font-size: 11px;
			font-weight: 700;
			color: #fbbf24;
		}
		.params-row {
			display: flex;
			gap: 6px;
			font-size: 10px;
			color: #a1a1aa;
			font-family: monospace;
		}
		.canvas-container {
			background: #000;
			padding: 4px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		canvas {
			width: 100%;
			height: auto;
			display: block;
			border-radius: 2px;
		}
		.cell-footer {
			padding: 6px 10px;
			background: #18181b;
			border-top: 1px solid #27272a;
			font-size: 9px;
			color: #9ca3af;
			display: flex;
			justify-content: space-between;
		}
	</style>
</head>
<body>
	<div class="matrix-header">
		<div class="title-box">
			<h1>СВОДНАЯ МАТРИЦА 20 ВАРИАНТОВ ПАНОРАМЫ (КЛКТ ЗАХАРОВ И.Д.)</h1>
			<p>4 типа слоя (1мм срез, 3мм Ray-Sum, 6мм Ray-Sum, 10мм Average) × 5 клинических пресетов W/L • Без выжигания в белый блин</p>
		</div>
		<div class="stats-chips">
			<div class="chip"><span>Пациент:</span>${renderPayload.patientName}</div>
			<div class="chip"><span>Воксели:</span>${renderPayload.dims}</div>
			<div class="chip"><span>Шаг:</span>${renderPayload.spacing}</div>
		</div>
	</div>

	<div class="matrix-grid" id="matrixGrid"></div>

	<script>
		const payload = ${JSON.stringify(renderPayload)};
		const grid = document.getElementById("matrixGrid");

		payload.variants.forEach((v) => {
			const cell = document.createElement("div");
			cell.className = "cell-card";

			cell.innerHTML = \`
				<div class="cell-header">
					<div class="cell-title-row">
						<span class="var-badge">#\${v.index}</span>
						<span class="layer-badge">\${v.row.thicknessMm.toFixed(1)} мм • \${v.row.projectionMode}</span>
					</div>
					<div class="preset-name">\${v.preset.nameRu.replace(/^Preset \\d — /, '')}</div>
					<div class="params-row">
						<span>W: \${v.preset.windowWidth}</span>
						<span>L: \${v.preset.windowLevel}</span>
						<span>Пик: \${v.preset.peakEnamel}</span>
					</div>
				</div>
				<div class="canvas-container">
					<canvas id="cvs_\${v.index}" width="\${v.panoW}" height="\${v.panoH}"></canvas>
				</div>
				<div class="cell-footer">
					<span>Воздух: 0 / 255</span>
					<span>\${v.row.thicknessMm === 1 ? 'Чистый срез' : v.row.projectionMode === 'average' ? 'Честный рентген' : '35% MIP + 65% Avg'}</span>
				</div>
			\`;
			grid.appendChild(cell);
		});

		// Draw all 20 canvases
		payload.variants.forEach((v) => {
			const cvs = document.getElementById("cvs_" + v.index);
			if (!cvs) return;
			const ctx = cvs.getContext("2d");
			const imgData = ctx.createImageData(v.panoW, v.panoH);
			imgData.data.set(new Uint8ClampedArray(v.panoBytes));
			ctx.putImageData(imgData, 0, 0);

			// Lower markers
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			for (const tm of v.toothMarkers) {
				const bw = 18;
				const bh = 11;
				const bx = tm.xPx - bw / 2;
				const by = v.panoH - 14;

				ctx.fillStyle = "rgba(9, 9, 11, 0.85)";
				ctx.strokeStyle = "#10b981";
				ctx.lineWidth = 0.8;
				ctx.fillRect(bx, by, bw, bh);
				ctx.strokeRect(bx, by, bw, bh);
				ctx.fillStyle = "#34d399";
				ctx.fillText(tm.toothFdi, tm.xPx, by + bh / 2);
			}
		});
	</script>
</body>
</html>
	`;

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1920, height: 1800 } });
	await page.setContent(html);
	await page.waitForTimeout(1000);

	const outDir = "docs/screenshots/cbct_live";
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "proof_contrast_matrix_20_variants.png");
	await page.screenshot({ path: outPath, fullPage: true });
	await browser.close();

	console.log(`Saved 20-variants matrix screenshot to ${outPath}`);

	const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\29d238ff-2db8-4ca7-803c-5ba5d97d388b";
	if (existsSync(brainDir)) {
		const brainPath = path.join(brainDir, "proof_contrast_matrix_20_variants.png");
		copyFileSync(outPath, brainPath);
		console.log(`Copied matrix screenshot to brain: ${brainPath}`);
	}
}

main().catch(console.error);
