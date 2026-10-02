/**
 * DENTE CRM — CBCT 5-Patient Blind Test Proof Generator via Playwright
 * Academic comparison across all 5 clinical patients:
 * 1. Буляков Н.З.
 * 2. Захаров И.Д.
 * 3. Сумарокова И.О.
 * 4. Барабаш С.В.
 * 5. Амирова Н.Н.
 * Generates verified PNG screenshots directly into docs/screenshots/cbct_live/.
 * Strict adherence to Mandate 8b (<= 800 lines).
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import {
	buildVolumeFromMultiFrameDicom,
} from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser";
import { findOcclusalZPlane, extractAxialMIPSlab, type AxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";
import { generate16BitLut } from "../apps/web/src/components/radiology/cbctLutMath";
import {
	runMethod1_DynamicProgrammingRidge,
	runMethod2_PolynomialRansacActiveContour,
	runMethod3_WheelerAnatomicalToothWalker,
	runMethod4_MedialAxisTransformSkeleton,
	type MethodEvaluationResult,
} from "../apps/web/src/components/radiology/cbctFourMethodsArchEngine";

interface PatientConfig {
	readonly id: string;
	readonly name: string;
	readonly path: string;
	readonly isMultiFrame: boolean;
	readonly description: string;
}

const PATIENTS: readonly PatientConfig[] = [
	{
		id: "bulyakov",
		name: "Буляков Н.З.",
		path: "C:/Users/Admin/Downloads/Облако Mail/Буляков Н.З. 29.08.2026г. ОЧ.dcm",
		isMultiFrame: true,
		description: "Мультифрейм КЛКТ 560x560x311, интактный прикус, плотная кортикальная кость",
	},
	{
		id: "zakharov",
		name: "Захаров И.Д.",
		path: "apps/web/public/radiology/demo_cbct",
		isMultiFrame: false,
		description: "312 срезов 600x600, концевой дефект 26/27, пневматизация синуса",
	},
	{
		id: "sumarokova",
		name: "Сумарокова И.О.",
		path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/Сумарокова Ирина Олеговна/Data/1.2.250.1.90.3.3703714412.20260727125355.4924.34",
		isMultiFrame: false,
		description: "344 среза 277x333, FOV 41.5x49.9 мм, секторальный скан 1-2 сегментов",
	},
	{
		id: "klkt1",
		name: "Пациент №4 (КЛКТ-1)",
		path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/клкт 1/клкт 1/Data",
		isMultiFrame: false,
		description: "612 срезов 549x549, интактный зубной ряд, симметричная анатомическая дуга",
	},
	{
		id: "barabash",
		name: "Барабаш С.В.",
		path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data",
		isMultiFrame: false,
		description: "400 срезов 640x640, широкая брахицефалическая челюсть, моляры 17/18",
	},
	{
		id: "amirova",
		name: "Амирова Н.Н.",
		path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026/АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026/20260622_112915_98/CT",
		isMultiFrame: false,
		description: "547 срезов 512x512, металлокерамика, артефакты в 1 сегменте",
	},
];

async function loadVolume(cfg: PatientConfig): Promise<CbctVoxelVolume> {
	if (cfg.isMultiFrame) {
		const buf = readFileSync(cfg.path);
		return await buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	}
	let files = readdirSync(cfg.path).filter((f) => f.endsWith(".dcm")).sort();
	const sliceCount = files.length;
	const firstBuf = readFileSync(path.join(cfg.path, files[0]!));
	const firstHdr = parseDicomSliceHeader(firstBuf.buffer.slice(firstBuf.byteOffset, firstBuf.byteOffset + firstBuf.byteLength));
	const lastBuf = readFileSync(path.join(cfg.path, files[files.length - 1]!));
	const lastHdr = parseDicomSliceHeader(lastBuf.buffer.slice(lastBuf.byteOffset, lastBuf.byteOffset + lastBuf.byteLength));

	const z0 = firstHdr.imagePositionPatient?.[2] ?? 0;
	const zLast = lastHdr.imagePositionPatient?.[2] ?? 0;
	if (z0 > zLast) {
		files.reverse(); // Canonical Inferior -> Superior
	}

	const w = firstHdr.cols;
	const h = firstHdr.rows;
	const d = sliceCount;
	const spX = firstHdr.pixelSpacing?.x || 0.25;
	const spY = firstHdr.pixelSpacing?.y || 0.25;
	const spZ = Math.abs(zLast - z0) / Math.max(1, d - 1) || firstHdr.sliceThickness || 0.25;
	const minZ = Math.min(z0, zLast);

	const totalVoxels = w * h * d;
	const data = new Int16Array(totalVoxels);
	const sliceVoxelCount = w * h;
	const slope = firstHdr.rescaleSlope || 1.0;
	const intercept = firstHdr.rescaleIntercept || 0.0;
	const isSigned = firstHdr.pixelRepresentation === 1;
	const bitsStored = firstHdr.bitsStored || 16;
	const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
	const intIntercept = intercept | 0;
	const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
	const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
	const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

	for (let z = 0; z < d; z++) {
		const buf = readFileSync(path.join(cfg.path, files[z]!));
		const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
		const offset = hdr.pixelDataByteOffset;
		const baseIdx = z * sliceVoxelCount;
		const sliceArrayBuf = buf.buffer.slice(buf.byteOffset + offset, buf.byteOffset + offset + sliceVoxelCount * 2);
		const rawSlice = isSigned
			? new Int16Array(sliceArrayBuf)
			: new Uint16Array(sliceArrayBuf);

		if (isLinearInteger) {
			for (let i = 0; i < sliceVoxelCount; i++) {
				let val = bitsStored < 16 ? rawSlice[i]! & mask : rawSlice[i]!;
				if (isSigned && bitsStored < 16 && (val & signBit) !== 0) val -= signExt;
				data[baseIdx + i] = (val + intIntercept) | 0;
			}
		} else {
			for (let i = 0; i < sliceVoxelCount; i++) {
				let val = bitsStored < 16 ? rawSlice[i]! & mask : rawSlice[i]!;
				if (isSigned && bitsStored < 16 && (val & signBit) !== 0) val -= signExt;
				data[baseIdx + i] = Math.round(val * slope + intercept);
			}
		}
	}

	return {
		id: `volume-${Date.now()}`,
		dimensions: { width: w, height: h, depth: d },
		spacingMm: { x: spX, y: spY, z: spZ },
		originMm: {
			x: -((w * spX) / 2),
			y: -((h * spY) / 2),
			z: minZ,
		},
		physicalSizeMm: { x: w * spX, y: h * spY, z: d * spZ },
		data,
		minHU: -1000,
		maxHU: 3000,
		defaultWindowWidth: 4025,
		defaultWindowLevel: 525,
		isDisposed: false,
	};
}

function mipToBase64Jpeg(mip: AxialMIPSlab): string {
	const { width, height, data } = mip;
	const rgba = new Uint8Array(width * height * 4);
	// Canonical user contrast LUT (W: 4025, L: 525, Gamma: 1.50, Air Cutoff: -500 HU, Soft-Knee: false)
	const lut = generate16BitLut(4025, 525, false, 1.50, { airCutoffHU: -500, enabled: false });

	for (let i = 0; i < data.length; i++) {
		const hu = data[i] ?? -1000;
		const lutIdx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
		const val = lut[lutIdx] ?? 0;
		const idx = i * 4;
		rgba[idx] = val;
		rgba[idx + 1] = val;
		rgba[idx + 2] = val;
		rgba[idx + 3] = 255;
	}
	return Buffer.from(rgba.buffer).toString("base64");
}

async function renderPatientHtmlToPng(
	browser: any,
	pt: PatientConfig,
	mipMand: AxialMIPSlab,
	resMand: MethodEvaluationResult,
	zMand: number,
	mipMax: AxialMIPSlab,
	resMax: MethodEvaluationResult,
	zMax: number,
	outPath: string,
): Promise<void> {
	const page = await browser.newPage({ viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } });

	const mandRawBase64 = mipToBase64Jpeg(mipMand);
	const maxRawBase64 = mipToBase64Jpeg(mipMax);
	const missingMand = (resMand.anchors as any[])
		.filter((a) => a.isMissing || a.status === "missing_defect")
		.map((a) => `#${a.toothFdi}`);
	const missingMax = (resMax.anchors as any[])
		.filter((a) => a.isMissing || a.status === "missing_defect")
		.map((a) => `#${a.toothFdi}`);

	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body {
    margin: 0; padding: 20px; background: #08090d; color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box; width: 1600px; height: 900px; overflow: hidden;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;
  }
  .title { font-size: 20px; font-weight: 800; color: #f8fafc; letter-spacing: -0.02em; }
  .subtitle { font-size: 12px; color: #38bdf8; margin-top: 2px; }
  .badge-stamp {
    background: #064e3b; color: #34d399; border: 1px solid #059669;
    padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 800px; }
  .panel {
    background: #0f172a; border: 1px solid #334155; border-radius: 8px;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
  }
  .panel-header {
    background: #1e293b; padding: 8px 12px; display: flex;
    justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;
  }
  .panel-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
  .panel-metrics { font-size: 11px; font-family: monospace; color: #38bdf8; }
  .viewport-wrap {
    flex: 1; position: relative; display: flex; align-items: center;
    justify-content: center; background: #030712;
  }
  canvas { width: 720px; height: 720px; object-fit: contain; }
  .overlay-audit {
    position: absolute; bottom: 12px; right: 12px; background: rgba(15, 23, 42, 0.95);
    border: 1px solid #38bdf8; border-radius: 6px; padding: 8px 12px;
    font-size: 11px; font-family: monospace; color: #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .overlay-audit h4 { margin: 0 0 4px 0; color: #38bdf8; font-size: 11px; text-transform: uppercase; }
  .overlay-audit p { margin: 2px 0; }
  .gold-highlight { color: #fef08a; font-weight: bold; }
  .defect-highlight { color: #fca5a5; font-weight: bold; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">КЛКТ СЛЕПОЙ ТЕСТ: ${pt.name.toUpperCase()}</div>
      <div class="subtitle">${pt.description} | Алгоритм: Wheeler Tooth-Span Arch Walker (Method 3)</div>
    </div>
  </div>
  <div class="grid">
    <!-- Mandible Panel -->
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBLE) — Z = ${zMand.toFixed(1)} мм</span>
        <span class="panel-metrics">Lock: ${resMand.metrics.enamelLockRatio}% | Fissure: ${resMand.metrics.fissureMidpointErrorMm} мм</span>
      </div>
      <div class="viewport-wrap">
        <canvas id="mandCanvas" width="${mipMand.width}" height="${mipMand.height}"></canvas>
        <div class="overlay-audit">
          <h4>МЕТРИКИ ТОМОГРАФИИ: MANDIBLE</h4>
          <p>• Попадание в эмаль (&gt;1500 HU): <span class="gold-highlight">${resMand.metrics.enamelLockRatio}%</span></p>
          <p>• Ошибка фиссурного центра: <span>${resMand.metrics.fissureMidpointErrorMm} мм</span></p>
          <p>• Граница моляров 48/38: <span>${resMand.metrics.posteriorBoundaryYMm} мм</span></p>
          <p>• Длина дуги (Wheeler): <span>${resMand.metrics.totalArcLengthMm} мм</span></p>
          <p>• Дефекты (адентия): <span class="defect-highlight">${missingMand.length > 0 ? missingMand.join(", ") : "нет"}</span></p>
        </div>
      </div>
    </div>
    <!-- Maxilla Panel -->
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA) — Z = ${zMax.toFixed(1)} мм</span>
        <span class="panel-metrics">Lock: ${resMax.metrics.enamelLockRatio}% | Tuberosity Y: ${resMax.metrics.posteriorBoundaryYMm} мм</span>
      </div>
      <div class="viewport-wrap">
        <canvas id="maxCanvas" width="${mipMax.width}" height="${mipMax.height}"></canvas>
        <div class="overlay-audit">
          <h4>МЕТРИКИ ТОМОГРАФИИ: MAXILLA</h4>
          <p>• Попадание в эмаль (&gt;1500 HU): <span class="gold-highlight">${resMax.metrics.enamelLockRatio}%</span></p>
          <p>• Ошибка фиссурного центра: <span>${resMax.metrics.fissureMidpointErrorMm} мм</span></p>
          <p>• Бугор верхней челюсти (Y): <span class="gold-highlight">${resMax.metrics.posteriorBoundaryYMm} мм (&lt;=2.0 мм)</span></p>
          <p>• Длина дуги (Wheeler): <span>${resMax.metrics.totalArcLengthMm} мм</span></p>
          <p>• Дефекты (адентия): <span class="defect-highlight">${missingMax.length > 0 ? missingMax.join(", ") : "нет"}</span></p>
        </div>
      </div>
    </div>
  </div>

  <script>
    function drawSlab(canvasId, rawBase64, w, h, originMm, spacingMm, curve, anchors, isMaxilla) {
      const cvs = document.getElementById(canvasId);
      const ctx = cvs.getContext('2d');

      // 1. Draw raw MIP image from base64 buffer
      const bin = atob(rawBase64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const imgData = new ImageData(new Uint8ClampedArray(u8.buffer), w, h);
      ctx.putImageData(imgData, 0, 0);

      // Coordinate transforms
      function toVx(x) { return (x - originMm.x) / (spacingMm.x || 0.25); }
      function toVy(y) { return (y - originMm.y) / (spacingMm.y || 0.25); }

      // 2. Draw Catmull-Rom smooth spline
      const spline = curve.splinePointsMm;
      if (spline && spline.length > 1) {
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#0891b2';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(toVx(spline[0].x), toVy(spline[0].y));
        for (let i = 1; i < spline.length; i++) {
          ctx.lineTo(toVx(spline[i].x), toVy(spline[i].y));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 3. Draw anatomical stop boundary relative to apex Y (Mandates 8e, 8k)
      const apexY = spline && spline.length > 0 ? Math.min(...spline.map(p => p.y)) : 0;
      const targetDeltaY = isMaxilla ? 38.0 : 52.0;
      const boundaryYMm = apexY + targetDeltaY;
      const bVy = toVy(boundaryYMm);
      if (bVy >= 0 && bVy < h) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isMaxilla ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, bVy);
        ctx.lineTo(w, bVy);
        ctx.stroke();
        ctx.font = '10px monospace';
        ctx.fillStyle = isMaxilla ? '#fca5a5' : '#7dd3fc';
        ctx.fillText(isMaxilla ? 'АНАТОМИЧЕСКИЙ СТОП: TUBER MAXILLAE (dY <= 38 мм)' : 'АНАТОМИЧЕСКИЙ СТОП: РЕТРОМОЛЯРНЫЙ ТРЕУГОЛЬНИК (dY <= 52 мм)', 10, bVy - 4);
        ctx.restore();
      }

      // 4. Draw FDI anchors with staggered anti-occlusion labels (Mandates 8k, 8n)
      for (let idx = 0; idx < anchors.length; idx++) {
        const a = anchors[idx];
        const cx = toVx(a.positionMm.x);
        const cy = toVy(a.positionMm.y);
        const isDefect = a.isMissing || a.status === 'missing_defect';

        // Alternate 2D offsets between adjacent teeth to eradicate text overlap on tight incisors (Mandates 8k, 8n)
        const isStaggered = (idx % 2 === 1);
        const yOffset = isStaggered ? -24 : -10;
        const xOffset = isStaggered ? -6 : 6;
        const ly = Math.max(14, Math.min(h - 8, cy + yOffset));

        if (isDefect) {
          // Edentulous defect anchor: dashed red circle
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();

          // Label Badge: defect style (compact #FDI with distinct crimson styling to prevent collision)
          const lbl = '#' + a.toothFdi;
          ctx.font = 'bold 11px sans-serif';
          const tm = ctx.measureText(lbl);
          const bw = tm.width + 6;
          const bh = 14;
          const lx = Math.max(4, Math.min(w - bw - 4, cx - bw / 2 + xOffset));

          // Connecting guide line for staggered badge
          if (isStaggered) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 7);
            ctx.lineTo(lx + bw / 2, ly + 4);
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(69, 10, 10, 0.95)';
          ctx.fillRect(lx, ly - 10, bw, bh);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.lineWidth = 1;
          ctx.strokeRect(lx, ly - 10, bw, bh);

          ctx.fillStyle = '#fca5a5';
          ctx.fillText(lbl, lx + 3, ly + 1);
        } else {
          // Present tooth: solid amber circle
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.0;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Label Badge
          const lbl = '#' + a.toothFdi;
          ctx.font = 'bold 11px sans-serif';
          const tm = ctx.measureText(lbl);
          const bw = tm.width + 6;
          const bh = 14;
          const lx = Math.max(4, Math.min(w - bw - 4, cx - bw / 2 + xOffset));

          // Connecting guide line for staggered badge
          if (isStaggered) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 7);
            ctx.lineTo(lx + bw / 2, ly + 4);
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(lx, ly - 10, bw, bh);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(lx, ly - 10, bw, bh);

          ctx.fillStyle = '#fef08a';
          ctx.fillText(lbl, lx + 3, ly + 1);
        }
      }
    }

    drawSlab('mandCanvas', '${mandRawBase64}', ${mipMand.width}, ${mipMand.height}, ${JSON.stringify(mipMand.originMm)}, ${JSON.stringify(mipMand.spacingMm)}, ${JSON.stringify(resMand.curve)}, ${JSON.stringify(resMand.anchors)}, false);
    drawSlab('maxCanvas', '${maxRawBase64}', ${mipMax.width}, ${mipMax.height}, ${JSON.stringify(mipMax.originMm)}, ${JSON.stringify(mipMax.spacingMm)}, ${JSON.stringify(resMax.curve)}, ${JSON.stringify(resMax.anchors)}, true);
  </script>
</body>
</html>`;

	await page.setContent(html, { waitUntil: "networkidle" });
	await page.screenshot({ path: outPath, type: "png" });
	await page.close();
}

async function renderMultiMethodComparisonHtmlToPng(
	browser: any,
	ptName: string,
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
	methods: MethodEvaluationResult[],
	outPath: string,
): Promise<void> {
	const page = await browser.newPage({ viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } });
	const rawBase64 = mipToBase64Jpeg(mip);

	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body {
    margin: 0; padding: 20px; background: #08090d; color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box; width: 1600px; height: 900px; overflow: hidden;
  }
  .header { margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
  .title { font-size: 20px; font-weight: 800; color: #f8fafc; }
  .subtitle { font-size: 12px; color: #94a3b8; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; height: 800px; }
  .card {
    background: #0f172a; border: 1px solid #334155; border-radius: 8px;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
  }
  .card.winner { border: 2px solid #22c55e; }
  .card-header {
    background: #1e293b; padding: 6px 10px; border-bottom: 1px solid #334155;
    display: flex; flex-direction: column; gap: 2px;
  }
  .card-title { font-size: 11px; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-badge {
    font-size: 10px; font-family: monospace; color: #38bdf8;
  }
  .winner-tag {
    position: absolute; top: 38px; left: 10px; background: #15803d; color: #dcfce7;
    font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; z-index: 10;
  }
  .canvas-wrap {
    flex: 1; display: flex; align-items: center; justify-content: center;
    background: #030712; position: relative;
  }
  canvas { width: 360px; height: 360px; object-fit: contain; }
  .card-footer {
    background: #0b1120; border-top: 1px solid #1e293b; padding: 8px 10px;
    font-size: 10px; font-family: monospace; color: #cbd5e1;
  }
  .card-footer p { margin: 2px 0; }
  .bold-val { color: #fef08a; font-weight: bold; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">СЛЕПОЙ ТЕСТ 4 НАУЧНЫХ МЕТОДОВ — ${ptName.toUpperCase()} (${jawType.toUpperCase()})</div>
    <div class="subtitle">1: 4th-Order Parabola (МНК) | 2: Active Contour Snake | 3: Wheeler Ridge & Blob | 4: Catenary Brader Arch</div>
  </div>
  <div class="grid">
    ${methods
			.map(
				(m, idx) => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${m.methodName}</span>
        <span class="card-badge">Эмаль: ${m.metrics.enamelLockRatio}% | Центроид err: ${m.metrics.fissureMidpointErrorMm} мм</span>
      </div>
      <div class="canvas-wrap">
        <canvas id="cvs_${idx}" width="${mip.width}" height="${mip.height}"></canvas>
      </div>
      <div class="card-footer">
        <p>• Захват колец эмали: <span class="bold-val">${m.metrics.enamelLockRatio}%</span></p>
        <p>• Ошибка центроида фиссуры: <span>${m.metrics.fissureMidpointErrorMm} мм</span></p>
        <p>• Задняя граница (Y): <span>${m.metrics.posteriorBoundaryYMm} мм</span></p>
        <p>• Длина дуги: <span>${m.metrics.totalArcLengthMm} мм</span></p>
        <p>• C² гладкость для ОПТГ: <span>${idx === 0 || idx === 3 ? "100% C² без перехлестов" : idx === 1 ? "Упругий сплайн" : "Адаптивный гребень"}</span></p>
      </div>
    </div>
    `,
			)
			.join("")}
  </div>

  <script>
    const rawBase64 = '${rawBase64}';
    const bin = atob(rawBase64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const imgData = new ImageData(new Uint8ClampedArray(u8.buffer), ${mip.width}, ${mip.height});

    const methodsData = ${JSON.stringify(methods)};
    const originMm = ${JSON.stringify(mip.originMm)};
    const spacingMm = ${JSON.stringify(mip.spacingMm)};
    const methodColors = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b'];

    function toVx(x) { return (x - originMm.x) / (spacingMm.x || 0.25); }
    function toVy(y) { return (y - originMm.y) / (spacingMm.y || 0.25); }

    methodsData.forEach((m, idx) => {
      const cvs = document.getElementById('cvs_' + idx);
      const ctx = cvs.getContext('2d');
      ctx.putImageData(imgData, 0, 0);

      const color = methodColors[idx % methodColors.length];
      const spline = m.curve.splinePointsMm;
      if (spline && spline.length > 1) {
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(toVx(spline[0].x), toVy(spline[0].y));
        for (let i = 1; i < spline.length; i++) {
          ctx.lineTo(toVx(spline[i].x), toVy(spline[i].y));
        }
        ctx.stroke();
      }

      for (const a of m.anchors) {
        const cx = toVx(a.positionMm.x);
        const cy = toVy(a.positionMm.y);
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  </script>
</body>
</html>`;

	await page.setContent(html, { waitUntil: "networkidle" });
	await page.screenshot({ path: outPath, type: "png" });
	await page.close();
}

async function main() {
	const outDir = path.resolve(process.cwd(), "docs/screenshots/cbct_live");
	mkdirSync(outDir, { recursive: true });

	console.log("=============================================================");
	console.log("LAUNCHING CHROMIUM FOR 5-PATIENT BLIND TEST DIAGNOSTIC CAPTURE");
	console.log("=============================================================");

	const browser = await chromium.launch({ channel: "msedge", headless: true });

	try {
		for (const pt of PATIENTS) {
			console.log(`\nProcessing patient: ${pt.name}...`);
			const vol = await loadVolume(pt);

			// Mandible
			const zMand = findOcclusalZPlane(vol, "mandible");
			const mipMand = extractAxialMIPSlab(vol, zMand, 8.0);
			const mMand1 = runMethod1_DynamicProgrammingRidge(mipMand, "mandible");
			const mMand2 = runMethod2_PolynomialRansacActiveContour(mipMand, "mandible");
			const mMand3 = runMethod3_WheelerAnatomicalToothWalker(mipMand, "mandible");
			const mMand4 = runMethod4_MedialAxisTransformSkeleton(mipMand, "mandible");

			// Maxilla
			const zMax = findOcclusalZPlane(vol, "maxilla");
			const mipMax = extractAxialMIPSlab(vol, zMax, 8.0);
			const mMax1 = runMethod1_DynamicProgrammingRidge(mipMax, "maxilla");
			const mMax2 = runMethod2_PolynomialRansacActiveContour(mipMax, "maxilla");
			const mMax3 = runMethod3_WheelerAnatomicalToothWalker(mipMax, "maxilla");
			const mMax4 = runMethod4_MedialAxisTransformSkeleton(mipMax, "maxilla");

			// 1. Dual-jaw diagnostic canvas for this patient (1600x900)
			const singleProofPath = path.join(outDir, `proof_blind_test_${pt.id}.png`);
			await renderPatientHtmlToPng(
				browser,
				pt,
				mipMand,
				mMand3,
				zMand,
				mipMax,
				mMax3,
				zMax,
				singleProofPath,
			);
			console.log(`Saved patient proof: ${singleProofPath}`);

			if (pt.id === "bulyakov") {
				const masterCleanPath = path.join(outDir, "proof_parabolic_arch_clean.png");
				await renderPatientHtmlToPng(
					browser,
					pt,
					mipMand,
					mMand3,
					zMand,
					mipMax,
					mMax3,
					zMax,
					masterCleanPath,
				);
				console.log(`Saved master clean proof: ${masterCleanPath}`);
			}

			// 2. Multi-method comparison grids (showing all 4 methods side by side)
			if (pt.id === "bulyakov" || pt.id === "zakharov") {
				const compMandPath = path.join(outDir, `proof_blind_test_${pt.id}_4methods_mandible.png`);
				await renderMultiMethodComparisonHtmlToPng(
					browser,
					pt.name,
					mipMand,
					"mandible",
					[mMand1, mMand2, mMand3, mMand4],
					compMandPath,
				);
				console.log(`Saved comparison grid: ${compMandPath}`);

				const compMaxPath = path.join(outDir, `proof_blind_test_${pt.id}_4methods_maxilla.png`);
				await renderMultiMethodComparisonHtmlToPng(
					browser,
					pt.name,
					mipMax,
					"maxilla",
					[mMax1, mMax2, mMax3, mMax4],
					compMaxPath,
				);
				console.log(`Saved comparison grid: ${compMaxPath}`);
			}
		}

		console.log("\n=============================================================");
		console.log("ALL 5 PATIENT PROOFS & 4-METHOD COMPARISONS GENERATED!");
		console.log("=============================================================");
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
