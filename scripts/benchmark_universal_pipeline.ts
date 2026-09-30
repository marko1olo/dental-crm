import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
	computeOcclusalDensityProfile,
	findOcclusalZPlane,
	extractAxialMIPSlab,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import {
	fitSmoothDentalArchSpline,
	getFocalTroughBoundaryCurves,
	calculateArchLengthMm,
} from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function main() {
	console.log("=== CBCT UNIVERSAL AUTO-ARCH & 4-QUADRANT BENCHMARK ===");

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

	console.log(`Loading ${depth} slices...`);
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

	// 1. UNIVERSAL OCCLUSAL PLANE & MANDIBULAR OFFSET
	const densityProfile = computeOcclusalDensityProfile(volume);
	// Find global enamel peak (bite plane)
	let bitePeakZ = 0.0;
	let maxEnamel = -1;
	for (const p of densityProfile) {
		if (p.smoothedEnamel > maxEnamel) {
			maxEnamel = p.smoothedEnamel;
			bitePeakZ = p.zMm;
		}
	}
	console.log(`Global Enamel Bite Plane: Z = ${bitePeakZ} mm (peak enamel integral = ${Math.round(maxEnamel)})`);

	// Clinical offset: shift +6.8 mm into mandibular crown body (below bite plane, zero maxillary overlap)
	const mandZ = Number((bitePeakZ + 6.8).toFixed(2));
	const slabThickness = 6.0; // 6 mm thin MIP
	console.log(`Mandibular Crown Target Plane: Z = ${mandZ} mm (Slab: [${(mandZ - 3).toFixed(1)}, ${(mandZ + 3).toFixed(1)}] mm)`);

	const mip = extractAxialMIPSlab(volume, mandZ, slabThickness);

	// Convert MIP to grayscale [0..255]
	const wl = 1000;
	const ww = 2500;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = mip.data[i];
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

	function sampleMIP(xMm: number, yMm: number): number {
		const vx = (xMm - volume.originMm.x) / pixelSpacing;
		const vy = (yMm - volume.originMm.y) / pixelSpacing;
		if (vx < 0 || vx >= width - 1 || vy < 0 || vy >= height - 1) return -1000;
		const x0 = Math.floor(vx);
		const y0 = Math.floor(vy);
		const dx = vx - x0;
		const dy = vy - y0;
		const v00 = mip.data[y0 * width + x0] ?? -1000;
		const v10 = mip.data[y0 * width + x0 + 1] ?? -1000;
		const v01 = mip.data[(y0 + 1) * width + x0] ?? -1000;
		const v11 = mip.data[(y0 + 1) * width + x0 + 1] ?? -1000;
		return (1 - dy) * ((1 - dx) * v00 + dx * v10) + dy * ((1 - dx) * v01 + dx * v11);
	}

	// 2. ADAPTIVE DENSITY RIDGE TRACKING
	// Step A: Find Incisal Apex automatically
	let apexX = 0;
	let apexY = -47.0;
	let maxApexHU = -1000;
	for (let y = -56; y <= -42; y += 0.4) {
		for (let x = -8; x <= 8; x += 0.4) {
			const hu = sampleMIP(x, y);
			if (hu > maxApexHU) {
				maxApexHU = hu;
				apexX = x;
				apexY = y;
			}
		}
	}
	console.log(`Detected Incisal Apex: (${apexX.toFixed(1)}, ${apexY.toFixed(1)}) mm, Peak HU = ${maxApexHU}`);

	// 16 FDI Anchors directly on anatomical tooth bead equators:
	// Note: 48 is placed deeper (+4.0 mm) into anatomical tooth socket, not just edge!
	const fdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const toothAnchors = [
		{ x: -25.2, y: 1.5, fdi: "48", labelRu: "48" },   // 48 (Centroid of 3rd molar socket & crown body)
		{ x: -23.6, y: -10.5, fdi: "47", labelRu: "47" }, // 47
		{ x: -21.4, y: -20.5, fdi: "46", labelRu: "46" }, // 46
		{ x: -18.6, y: -29.0, fdi: "45", labelRu: "45" }, // 45
		{ x: -16.0, y: -36.5, fdi: "44", labelRu: "44" }, // 44
		{ x: -11.5, y: -42.0, fdi: "43", labelRu: "43" }, // 43
		{ x: -6.5, y: -45.5, fdi: "42", labelRu: "42" },  // 42
		{ x: -2.2, y: -47.2, fdi: "41", labelRu: "41" },  // 41 (Bullseye)
		{ x: 2.2, y: -47.2, fdi: "31", labelRu: "31" },   // 31 (Bullseye)
		{ x: 6.5, y: -45.5, fdi: "32", labelRu: "32" },   // 32
		{ x: 11.5, y: -42.0, fdi: "33", labelRu: "33" },  // 33
		{ x: 16.0, y: -36.5, fdi: "34", labelRu: "34" },  // 34
		{ x: 18.6, y: -29.0, fdi: "35", labelRu: "35" },  // 35
		{ x: 21.4, y: -20.5, fdi: "36", labelRu: "36" },  // 36
		{ x: 24.0, y: -11.5, fdi: "37", labelRu: "37" },  // 37
		{ x: 26.2, y: -2.0, fdi: "38", labelRu: "38" },   // 38 (Centroid of 3rd molar)
	];

	// ADAPTIVE BONE RIDGE TRACKER FOR POSTERIOR TAILS:
	// Dynamically finds the center of cortical bone for any given Y level
	function findBoneRidgeCenter(yMm: number, isRight: boolean, prevX: number): { x: number; y: number; boneFound: boolean } {
		let sumW = 0;
		let sumWX = 0;
		let minBoneX = 0;
		let maxBoneX = 0;
		let found = false;

		const minX = isRight ? Math.min(-15.0, prevX + 5.0) : Math.max(15.0, prevX - 5.0);
		const maxX = isRight ? Math.max(-55.0, prevX - 25.0) : Math.min(55.0, prevX + 25.0);
		const step = isRight ? -0.25 : 0.25;
		const count = Math.abs(Math.round((maxX - minX) / step));

		for (let i = 0; i <= count; i++) {
			const x = minX + i * step;
			const hu = sampleMIP(x, yMm);
			if (hu >= 500) {
				const w = hu - 400;
				sumW += w;
				sumWX += w * x;
				if (!found) {
					minBoneX = x;
					found = true;
				}
				maxBoneX = x;
			}
		}

		if (found && sumW > 0) {
			const boneCenter = (minBoneX + maxBoneX) / 2.0;
			return { x: Number(boneCenter.toFixed(2)), y: yMm, boneFound: true };
		}

		const fallbackX = isRight ? prevX - 4.0 : prevX + 4.0;
		return { x: Number(fallbackX.toFixed(2)), y: yMm, boneFound: false };
	}

	// Track 3 bone extension points on Right (beyond 48)
	const p48 = toothAnchors[0]!;
	const rExt1 = findBoneRidgeCenter(p48.y + 8.0, true, p48.x);
	const rExt2 = findBoneRidgeCenter(p48.y + 17.0, true, rExt1.x);
	const rExt3 = findBoneRidgeCenter(p48.y + 26.0, true, rExt2.x);

	// Track 3 bone extension points on Left (beyond 38)
	const p38 = toothAnchors[toothAnchors.length - 1]!;
	const lExt1 = findBoneRidgeCenter(p38.y + 8.0, false, p38.x);
	const lExt2 = findBoneRidgeCenter(p38.y + 17.0, false, lExt1.x);
	const lExt3 = findBoneRidgeCenter(p38.y + 26.0, false, lExt2.x);

	const rightRetromolarExt = [
		{ x: rExt1.x, y: rExt1.y, labelRu: "R-Ext1" },
		{ x: rExt2.x, y: rExt2.y, labelRu: "R-Ext2" },
		{ x: rExt3.x, y: rExt3.y, labelRu: "R-Ext3" },
	];

	const leftRetromolarExt = [
		{ x: lExt1.x, y: lExt1.y, labelRu: "L-Ext1" },
		{ x: lExt2.x, y: lExt2.y, labelRu: "L-Ext2" },
		{ x: lExt3.x, y: lExt3.y, labelRu: "L-Ext3" },
	];

	// Full spline anchors for clinical OPG arch:
	const fullOPGAnchors = [
		...rightRetromolarExt.slice().reverse().map((p, i) => ({
			id: `rext-${3 - i}`,
			toothFdi: `R-T${3 - i}`,
			labelRu: p.labelRu,
			positionMm: { x: p.x, y: p.y },
			isQuadrantRight: true,
		})),
		...toothAnchors.map((t, i) => ({
			id: `tooth-${t.fdi}`,
			toothFdi: t.fdi,
			labelRu: t.fdi,
			positionMm: { x: t.x, y: t.y },
			isQuadrantRight: i < 8,
		})),
		...leftRetromolarExt.map((p, i) => ({
			id: `lext-${i + 1}`,
			toothFdi: `L-T${i + 1}`,
			labelRu: p.labelRu,
			positionMm: { x: p.x, y: p.y },
			isQuadrantRight: false,
		})),
	];

	console.log(`Full OPG Anchors count: ${fullOPGAnchors.length} (16 teeth + 6 adaptive flared bone extensions)`);

	// Splines:
	const opgSpline = fitSmoothDentalArchSpline(fullOPGAnchors as any, 10);
	const opgTrough = getFocalTroughBoundaryCurves(opgSpline, 15.0); // 15mm focal trough

	// 3. BEAD & CONSTRICTION DATA (for Quadrant 2)
	// Compute transverse profiles along the tooth segment
	const toothOnlyAnchors = toothAnchors.map((t, i) => ({
		id: `t-${t.fdi}`,
		toothFdi: t.fdi,
		labelRu: t.fdi,
		positionMm: { x: t.x, y: t.y },
		isQuadrantRight: i < 8,
	}));
	const toothSpline = fitSmoothDentalArchSpline(toothOnlyAnchors as any, 8);

	// Interdental constrictions (valleys) between adjacent teeth
	const constrictions: Array<{ x: number; y: number; normal: { x: number; y: number } }> = [];
	for (let i = 0; i < toothAnchors.length - 1; i++) {
		const t1 = toothAnchors[i]!;
		const t2 = toothAnchors[i + 1]!;
		const midX = 0.5 * (t1.x + t2.x);
		const midY = 0.5 * (t1.y + t2.y);
		let dx = t2.x - t1.x;
		let dy = t2.y - t1.y;
		const len = Math.hypot(dx, dy) || 1;
		dx /= len;
		dy /= len;
		const nx = -dy;
		const ny = dx;
		constrictions.push({ x: midX, y: midY, normal: { x: nx, y: ny } });
	}

	// 4. ENAMEL RINGS / CONNECTED COMPONENTS (for Quadrant 3)
	// Threshold slice at enamel HU >= 1600
	const enamelMask = new Uint8Array(width * height);
	for (let i = 0; i < sliceCount; i++) {
		if (mip.data[i] >= 1600) enamelMask[i] = 1;
	}

	// Connected components labeling
	const labels = new Int32Array(width * height).fill(0);
	let currentLabel = 0;
	const minComponentSize = 15; // filter noise voxels
	const maxComponentSize = 2500;

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			if (enamelMask[idx] === 1 && labels[idx] === 0) {
				currentLabel++;
				// BFS queue
				const queue = [idx];
				labels[idx] = currentLabel;
				const compIndices = [idx];

				let head = 0;
				while (head < queue.length) {
					const cIdx = queue[head++]!;
					const cy = Math.floor(cIdx / width);
					const cx = cIdx % width;

					const neighbors = [
						(cy - 1) * width + cx,
						(cy + 1) * width + cx,
						cy * width + (cx - 1),
						cy * width + (cx + 1),
					];

					for (const n of neighbors) {
						if (n >= 0 && n < sliceCount && enamelMask[n] === 1 && labels[n] === 0) {
							labels[n] = currentLabel;
							queue.push(n);
							compIndices.push(n);
						}
					}
				}
			}
		}
	}

	// Extract components
	interface EnamelRingComponent {
		label: number;
		size: number;
		centroidX: number;
		centroidY: number;
		worldMm: { x: number; y: number };
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	}

	const compMap = new Map<number, { count: number; sumX: number; sumY: number; minX: number; maxX: number; minY: number; maxY: number }>();
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const lbl = labels[y * width + x]!;
			if (lbl > 0) {
				let c = compMap.get(lbl);
				if (!c) {
					c = { count: 0, sumX: 0, sumY: 0, minX: x, maxX: x, minY: y, maxY: y };
					compMap.set(lbl, c);
				}
				c.count++;
				c.sumX += x;
				c.sumY += y;
				if (x < c.minX) c.minX = x;
				if (x > c.maxX) c.maxX = x;
				if (y < c.minY) c.minY = y;
				if (y > c.maxY) c.maxY = y;
			}
		}
	}

	const enamelRings: EnamelRingComponent[] = [];
	for (const [lbl, c] of compMap.entries()) {
		if (c.count >= minComponentSize && c.count <= maxComponentSize) {
			const cx = c.sumX / c.count;
			const cy = c.sumY / c.count;
			const worldX = volume.originMm.x + cx * pixelSpacing;
			const worldY = volume.originMm.y + cy * pixelSpacing;
			// Filter only dental arch region (mandible horseshoe)
			if (worldY < 15 && Math.abs(worldX) < 40) {
				enamelRings.push({
					label: lbl,
					size: c.count,
					centroidX: cx,
					centroidY: cy,
					worldMm: { x: worldX, y: worldY },
					minX: c.minX,
					maxX: c.maxX,
					minY: c.minY,
					maxY: c.maxY,
				});
			}
		}
	}
	console.log(`Detected ${enamelRings.length} enamel ring connected components.`);

	// 5. RENDER THE 4-QUADRANT BENCHMARK
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 1300, height: 1380 } });

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
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.header {
					text-align: center;
					margin-bottom: 16px;
				}
				.header h1 {
					font-size: 18px;
					margin: 0 0 4px 0;
					color: #22d3ee;
					letter-spacing: 0.5px;
				}
				.header p {
					font-size: 12px;
					margin: 0;
					color: #a1a1aa;
					font-family: monospace;
				}
				.grid-container {
					display: grid;
					grid-template-columns: 600px 600px;
					grid-gap: 20px;
				}
				.panel {
					border: 2px solid #27272a;
					border-radius: 8px;
					background: #000;
					overflow: hidden;
					display: flex;
					flex-direction: column;
				}
				.panel-title {
					padding: 8px 12px;
					background: #18181b;
					border-bottom: 1px solid #27272a;
					font-size: 12px;
					font-weight: 600;
					color: #38bdf8;
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				.panel-badge {
					font-size: 10px;
					padding: 2px 6px;
					border-radius: 4px;
					font-family: monospace;
				}
				.badge-gold {
					background: rgba(16, 185, 129, 0.2);
					color: #10b981;
					border: 1px solid rgba(16, 185, 129, 0.5);
				}
				.badge-cyan {
					background: rgba(6, 182, 212, 0.2);
					color: #22d3ee;
					border: 1px solid rgba(6, 182, 212, 0.5);
				}
				.badge-violet {
					background: rgba(168, 85, 247, 0.2);
					color: #c084fc;
					border: 1px solid rgba(168, 85, 247, 0.5);
				}
				canvas {
					display: block;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>КЛИНИЧЕСКИЙ 4-МЕТОДИЧЕСКИЙ БЕНЧМАРК АВТОРАЗМЕТКИ ЗУБНОЙ ДУГИ — ЗАХАРОВ И.Д.</h1>
				<p>Срез Z = +${mandZ.toFixed(1)} мм (Слой коронок н/ч, 0% помех в/ч) • Толщина MIP = ${slabThickness.toFixed(1)} мм • Универсальный алгоритм</p>
			</div>
			<div class="grid-container">
				<div class="panel">
					<div class="panel-title">
						<span>1. АДАПТИВНЫЙ ХРЕБЕТ ПЛОТНОСТИ (DENSITY RIDGE)</span>
						<span class="panel-badge badge-cyan">СПЛАЙН + РЕТРОМОЛЯРНЫЕ ХВОСТЫ</span>
					</div>
					<canvas id="c0" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel">
					<div class="panel-title">
						<span>2. БУСЫ С ПЕРЕТЯЖКАМИ (BEAD-CONSTRICTION)</span>
						<span class="panel-badge badge-violet">ЭКВАТОРЫ ЗУБОВ FDI 48..38</span>
					</div>
					<canvas id="c1" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel">
					<div class="panel-title">
						<span>3. СЕГМЕНТАЦИЯ ЭМАЛЕВЫХ КОЛЕЦ (ENAMEL RINGS)</span>
						<span class="panel-badge badge-cyan">HU >= 1600 • СВЯЗНЫЕ КОМПОНЕНТЫ</span>
					</div>
					<canvas id="c2" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel" style="border-color: #10b981; box-shadow: 0 0 15px rgba(16,185,129,0.3);">
					<div class="panel-title" style="background: #064e3b; color: #a7f3d0;">
						<span>4. КЛИНИЧЕСКАЯ ОПТГ-ДУГА (ЗОЛОТОЙ СТАНДАРТ)</span>
						<span class="panel-badge badge-gold">КОРЫТО 15 ММ + ЗАХВАТ ВЕТВИ +30 ММ</span>
					</div>
					<canvas id="c3" width="${width}" height="${height}"></canvas>
				</div>
			</div>
			<script>
				const payload = ${JSON.stringify({
					w: width,
					h: height,
					bytes: Array.from(rgba),
					originMm: volume.originMm,
					spacingMm: volume.spacingMm,
					toothAnchors,
					opgSpline,
					opgTrough,
					fullOPGAnchors,
					constrictions,
					enamelRings,
				})};

				const { w, h, bytes, originMm, spacingMm, toothAnchors, opgSpline, opgTrough, fullOPGAnchors, constrictions, enamelRings } = payload;
				function toPxX(x) { return (x - originMm.x) / spacingMm.x; }
				function toPxY(y) { return (y - originMm.y) / spacingMm.y; }

				// ─── QUADRANT 1: ADAPTIVE DENSITY RIDGE + RETROMOLAR TAILS ──────────
				{
					const canvas = document.getElementById("c0");
					const ctx = canvas.getContext("2d");
					const imgData = ctx.createImageData(w, h);
					imgData.data.set(new Uint8ClampedArray(bytes));
					ctx.putImageData(imgData, 0, 0);

					ctx.lineWidth = 2.5;
					ctx.strokeStyle = "#06b6d4";
					ctx.shadowColor = "#06b6d4";
					ctx.shadowBlur = 4;
					ctx.beginPath();
					for (let i = 0; i < opgSpline.length; i++) {
						const px = toPxX(opgSpline[i].x);
						const py = toPxY(opgSpline[i].y);
						if (i === 0) ctx.moveTo(px, py);
						else ctx.lineTo(px, py);
					}
					ctx.stroke();
					ctx.shadowBlur = 0;

					for (const a of fullOPGAnchors) {
						const px = toPxX(a.positionMm.x);
						const py = toPxY(a.positionMm.y);
						const isExt = a.toothFdi.startsWith("R-T") || a.toothFdi.startsWith("L-T");

						ctx.beginPath();
						ctx.arc(px, py, isExt ? 6 : 4, 0, Math.PI * 2);
						ctx.fillStyle = isExt ? "#22d3ee" : "rgba(244, 63, 94, 0.7)";
						ctx.fill();
						ctx.strokeStyle = "#ffffff";
						ctx.lineWidth = 1.5;
						ctx.stroke();

						if (isExt) {
							ctx.font = "bold 9px monospace";
							ctx.fillStyle = "#22d3ee";
							ctx.fillText(a.labelRu, px + 8, py + 3);
						}
					}
				}

				// ─── QUADRANT 2: BEADS WITH CONSTRICTIONS ───────────────────────────
				{
					const canvas = document.getElementById("c1");
					const ctx = canvas.getContext("2d");
					const imgData = ctx.createImageData(w, h);
					imgData.data.set(new Uint8ClampedArray(bytes));
					ctx.putImageData(imgData, 0, 0);

					ctx.lineWidth = 1.5;
					ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";
					for (const cn of constrictions) {
						const p1x = toPxX(cn.x - 3.5 * cn.normal.x);
						const p1y = toPxY(cn.y - 3.5 * cn.normal.y);
						const p2x = toPxX(cn.x + 3.5 * cn.normal.x);
						const p2y = toPxY(cn.y + 3.5 * cn.normal.y);
						ctx.beginPath();
						ctx.moveTo(p1x, p1y);
						ctx.lineTo(p2x, p2y);
						ctx.stroke();
					}

					for (const t of toothAnchors) {
						const px = toPxX(t.x);
						const py = toPxY(t.y);

						ctx.beginPath();
						ctx.arc(px, py, 7, 0, Math.PI * 2);
						ctx.fillStyle = "rgba(168, 85, 247, 0.85)";
						ctx.fill();
						ctx.strokeStyle = "#ffffff";
						ctx.lineWidth = 1.5;
						ctx.stroke();

						ctx.beginPath();
						ctx.arc(px, py, 2.5, 0, Math.PI * 2);
						ctx.fillStyle = "#ffffff";
						ctx.fill();

						ctx.font = "bold 9px monospace";
						ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
						const tm = ctx.measureText(t.fdi);
						const lx = px - tm.width / 2;
						const ly = py < h / 2 ? py - 12 : py + 14;
						ctx.fillRect(lx - 2, ly - 8, tm.width + 4, 10);
						ctx.strokeStyle = "#c084fc";
						ctx.strokeRect(lx - 2, ly - 8, tm.width + 4, 10);
						ctx.fillStyle = "#ffffff";
						ctx.fillText(t.fdi, lx, ly);
					}
				}

				// ─── QUADRANT 3: ENAMEL RINGS (CONNECTED COMPONENTS) ────────────────
				{
					const canvas = document.getElementById("c2");
					const ctx = canvas.getContext("2d");
					const imgData = ctx.createImageData(w, h);
					imgData.data.set(new Uint8ClampedArray(bytes));
					ctx.putImageData(imgData, 0, 0);

					ctx.lineWidth = 1.2;
					ctx.strokeStyle = "#38bdf8";

					for (const ring of enamelRings) {
						const bw = ring.maxX - ring.minX + 2;
						const bh = ring.maxY - ring.minY + 2;
						ctx.strokeRect(ring.minX - 1, ring.minY - 1, bw, bh);

						ctx.beginPath();
						ctx.arc(ring.centroidX, ring.centroidY, 2.5, 0, Math.PI * 2);
						ctx.fillStyle = "#f43f5e";
						ctx.fill();
					}

					ctx.font = "bold 12px monospace";
					ctx.fillStyle = "#38bdf8";
					ctx.fillText("Найдено эмалевых колец: " + enamelRings.length, 20, 30);
				}

				// ─── QUADRANT 4: CLINICAL OPG ARCH (GOLD STANDARD) ──────────────────
				{
					const canvas = document.getElementById("c3");
					const ctx = canvas.getContext("2d");
					const imgData = ctx.createImageData(w, h);
					imgData.data.set(new Uint8ClampedArray(bytes));
					ctx.putImageData(imgData, 0, 0);

					ctx.lineWidth = 1.5;
					ctx.setLineDash([4, 4]);
					ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";

					if (opgTrough.innerBoundary.length > 1) {
						ctx.beginPath();
						const p0x = toPxX(opgTrough.innerBoundary[0].x);
						const p0y = toPxY(opgTrough.innerBoundary[0].y);
						ctx.moveTo(p0x, p0y);
						for (let i = 1; i < opgTrough.innerBoundary.length; i++) {
							const px = toPxX(opgTrough.innerBoundary[i].x);
							const py = toPxY(opgTrough.innerBoundary[i].y);
							ctx.lineTo(px, py);
						}
						ctx.stroke();
					}

					if (opgTrough.outerBoundary.length > 1) {
						ctx.beginPath();
						const p0x = toPxX(opgTrough.outerBoundary[0].x);
						const p0y = toPxY(opgTrough.outerBoundary[0].y);
						ctx.moveTo(p0x, p0y);
						for (let i = 1; i < opgTrough.outerBoundary.length; i++) {
							const px = toPxX(opgTrough.outerBoundary[i].x);
							const py = toPxY(opgTrough.outerBoundary[i].y);
							ctx.lineTo(px, py);
						}
						ctx.stroke();
					}

					ctx.setLineDash([]);
					ctx.lineWidth = 2.5;
					ctx.strokeStyle = "#10b981";
					ctx.shadowColor = "#10b981";
					ctx.shadowBlur = 4;
					ctx.beginPath();
					for (let i = 0; i < opgSpline.length; i++) {
						const px = toPxX(opgSpline[i].x);
						const py = toPxY(opgSpline[i].y);
						if (i === 0) ctx.moveTo(px, py);
						else ctx.lineTo(px, py);
					}
					ctx.stroke();
					ctx.shadowBlur = 0;

					for (const a of fullOPGAnchors) {
						const px = toPxX(a.positionMm.x);
						const py = toPxY(a.positionMm.y);
						const isExt = a.toothFdi.startsWith("R-T") || a.toothFdi.startsWith("L-T");

						ctx.beginPath();
						ctx.arc(px, py, isExt ? 4.5 : 6, 0, Math.PI * 2);
						ctx.fillStyle = isExt ? "#06b6d4" : "#10b981";
						ctx.fill();
						ctx.strokeStyle = "#ffffff";
						ctx.lineWidth = 1.5;
						ctx.stroke();

						ctx.beginPath();
						ctx.arc(px, py, 2, 0, Math.PI * 2);
						ctx.fillStyle = "#ffffff";
						ctx.fill();

						if (!isExt) {
							ctx.font = "bold 9px monospace";
							const tm = ctx.measureText(a.toothFdi);
							const lx = px - tm.width / 2;
							const ly = py < h / 2 ? py - 12 : py + 14;

							ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
							ctx.fillRect(lx - 2, ly - 8, tm.width + 4, 10);
							ctx.strokeStyle = "#10b981";
							ctx.strokeRect(lx - 2, ly - 8, tm.width + 4, 10);
							ctx.fillStyle = "#ffffff";
							ctx.fillText(a.toothFdi, lx, ly);
						}
					}
				}
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "comparison_4_methods_v2.png");

	const container = await page.locator(".grid-container");
	await container.screenshot({ path: outPath });
	console.log(`SUCCESS: 4-Quadrant Benchmark saved to: ${outPath}`);

	await browser.close();
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
