/**
 * DENTE CRM — Alveolar Ridge Cross-Section Canvas Overlay Engine
 * Standards: Planmeca Romexis 3D / Vatech Ez3D-i / Carl Misch (2008), Mandate 8b (<= 120 lines).
 */

import type { CrossSectionSliceData } from "../../../../dentalCurveEngine";
import type { ClinicalImplantSpec, ClinicalImplantPose } from "../implantCatalog";
import { calculateImplantCrossSectionGeometry } from "../implantCatalog";
import type { RidgeMorphometryResult } from "../../../../cbctRidgeCaliperMath";
import { get16BitLut } from "../../../../cbctLutMath";

export interface CrossSectionRenderOptions {
	slice: CrossSectionSliceData;
	morphometry: RidgeMorphometryResult | null;
	showMorphometry: boolean;
	showGrid: boolean;
	selectedImplant?: ClinicalImplantSpec;
	implantPose?: ClinicalImplantPose;
	isActive: boolean;
	windowWidth?: number;
	windowLevel?: number;
	gamma?: number;
	airCutoffHU?: number;
	softKnee?: boolean;
}

export function renderCrossSectionToCanvas(canvas: HTMLCanvasElement, opts: CrossSectionRenderOptions) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const { slice, morphometry, showMorphometry, showGrid, selectedImplant, implantPose, isActive } = opts;
	const width = slice.widthPx, height = slice.heightPx;
	canvas.width = width; canvas.height = height;

	const lut = get16BitLut(opts.windowWidth ?? 4025, opts.windowLevel ?? 525, false, opts.gamma ?? 1.5, {
		airCutoffHU: opts.airCutoffHU ?? -500, enabled: opts.softKnee ?? false,
	});

	const imgData = ctx.createImageData(width, height);
	if (slice.rawHuData && slice.rawHuData.length === width * height) {
		for (let i = 0; i < slice.rawHuData.length; i++) {
			const g = lut[(slice.rawHuData[i]! + 32768) & 0xffff]!;
			const idx = i * 4;
			imgData.data[idx] = g; imgData.data[idx + 1] = g; imgData.data[idx + 2] = g; imgData.data[idx + 3] = 255;
		}
	} else if (slice.pixelData) {
		const src = slice.pixelData;
		for (let i = 0; i < src.length; i += 4) {
			const g = src[i]!;
			imgData.data[i] = g; imgData.data[i + 1] = g; imgData.data[i + 2] = g; imgData.data[i + 3] = 255;
		}
	}
	ctx.putImageData(imgData, 0, 0);

	const pxPerMm = 1.0 / (slice.pixelSpacingMm || 0.25);
	if (showGrid) {
		ctx.save();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
		ctx.lineWidth = 0.5;
		const step = 5.0 * pxPerMm;
		for (let x = step; x < width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
		for (let y = step; y < height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
		ctx.restore();
	}

	if (showMorphometry && morphometry?.isDetected) {
		ctx.save();
		const toX = (mm: number) => mm * pxPerMm, toY = (mm: number) => mm * pxPerMm;
		if (morphometry.w2Valid && morphometry.widthW2Mm >= 3.0 && morphometry.widthW2Mm <= 11.5) {
			ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 1.4; ctx.beginPath();
			ctx.moveTo(toX(morphometry.lineW2.buccal.x), toY(morphometry.lineW2.buccal.y));
			ctx.lineTo(toX(morphometry.lineW2.lingual.x), toY(morphometry.lineW2.lingual.y));
			ctx.stroke();
		}
		if (morphometry.w4Valid && morphometry.widthW4Mm >= 3.0 && morphometry.widthW4Mm <= 12.0) {
			ctx.strokeStyle = "#10b981"; ctx.lineWidth = 1.4; ctx.beginPath();
			ctx.moveTo(toX(morphometry.lineW4.buccal.x), toY(morphometry.lineW4.buccal.y));
			ctx.lineTo(toX(morphometry.lineW4.lingual.x), toY(morphometry.lineW4.lingual.y));
			ctx.stroke();
		}
		if (morphometry.w6Valid && morphometry.widthW6Mm >= 3.0 && morphometry.widthW6Mm <= 13.0) {
			ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.4; ctx.beginPath();
			ctx.moveTo(toX(morphometry.lineW6.buccal.x), toY(morphometry.lineW6.buccal.y));
			ctx.lineTo(toX(morphometry.lineW6.lingual.x), toY(morphometry.lineW6.lingual.y));
			ctx.stroke();
		}
		ctx.fillStyle = "#f59e0b"; ctx.beginPath();
		ctx.arc(toX(morphometry.crestApexMm.x), toY(morphometry.crestApexMm.y), 2.0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	if (selectedImplant && implantPose) {
		ctx.save();
		const crest = morphometry?.crestApexMm ?? { x: width * (slice.pixelSpacingMm || 0.25) * 0.5, y: height * (slice.pixelSpacingMm || 0.25) * 0.3 };
		const geom = calculateImplantCrossSectionGeometry(selectedImplant, implantPose, crest);
		const toCx = (mm: number) => mm * pxPerMm, toCy = (mm: number) => mm * pxPerMm;

		ctx.strokeStyle = isActive ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.4)";
		ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.beginPath();
		geom.safetyZonePolygonMm.forEach((pt, i) => { const x = toCx(pt.x), y = toCy(pt.y); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
		ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);

		ctx.fillStyle = isActive ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.25)";
		ctx.strokeStyle = selectedImplant.platformColorHex || "#10b981"; ctx.lineWidth = 1.6; ctx.beginPath();
		geom.implantPolygonMm.forEach((pt, i) => { const x = toCx(pt.x), y = toCy(pt.y); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
		ctx.closePath(); ctx.fill(); ctx.stroke();
		ctx.restore();
	}
}
