/**
 * DENTE CRM — CBCT Laboratory Order, PDF Report & 300 DPI Export Engine
 * Generates CAD/CAM surgical guide lab drafts, Misch bone density PDF summaries, and print-ready HD snapshots.
 * Standards: Mandate 8b (Sweet Spot 140-180 lines), Mandate 8e (Doctor Autonomy).
 */

import type React from "react";
import { showToast } from "../../../GlobalToast";
import type { DentalLabOrderData } from "../../../lab/labMath";
import type { VirtualImplantSpec, CrossSectionImplantPose, MandibularCanalCrossSection, NerveSafetyAuditResult } from "../../implantSafetyEngine";
import type { HUZoneSampling, MischClassificationResult } from "../../boneDensityMischMath";
import type { CrossSectionSliceData } from "../../dentalCurveEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../../cbctCaliperNerveMath";
import type { RadiologyStudy } from "../../types";
import { exportPdfImplantReport } from "../../ctImplantIntegrationBridge";
import { exportCleanViewportSnapshot } from "../../cbctSnapshotExportMath";
import { captureSliceFromDOMOrRef } from "./cbctCanvasCapture";

export interface CbctReportGeneratorParams {
	readonly patientId?: string | undefined;
	readonly patientDisplayName: string;
	readonly isAnonymized: boolean;
	readonly study?: RadiologyStudy | null | undefined;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly effectiveRidgeHeightMm: number | null;
	readonly effectiveRidgeWidthMm: number | null;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly currentImplantPose: CrossSectionImplantPose;
	readonly currentCanal: MandibularCanalCrossSection;
	readonly implantAngulationDeg: number;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayNerveClearanceMm: number | null;
	readonly displayTorque: string;
	readonly displayDrillingProtocol: string;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly huSamplingResult: HUZoneSampling;
	readonly mischClassification: MischClassificationResult;
	readonly onOpenLabOrder?: ((draft: DentalLabOrderData) => void) | undefined;
	readonly crossSectionCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
}

/**
 * Creates a CAD/CAM surgical guide order draft for dental laboratory with attached CBCT slice.
 */
export function executeExportToLab(params: CbctReportGeneratorParams): DentalLabOrderData {
	const {
		patientId,
		patientDisplayName,
		study,
		activeCrossSection,
		currentImplantSpec,
		implantAngulationDeg,
		effectiveRidgeHeightMm,
		effectiveRidgeWidthMm,
		displayBoneClass,
		displayMeanHU,
		displayNerveClearanceMm,
		displayTorque,
		displayDrillingProtocol,
		huSamplingResult,
		mischClassification,
		crossSectionCanvasRef,
		onOpenLabOrder,
	} = params;

	const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	const isMaxilla = targetTooth < 30;
	const effectivePatientId = patientId || "cbct-patient";
	const sliceDataUrl = captureSliceFromDOMOrRef(crossSectionCanvasRef);

	const hStr = typeof effectiveRidgeHeightMm === "number" ? `H=${effectiveRidgeHeightMm.toFixed(1)} мм` : "H: —";
	const wStr = typeof effectiveRidgeWidthMm === "number" ? `W=${effectiveRidgeWidthMm.toFixed(1)} мм` : "W: —";
	const nerveStr = displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "не определена";
	const meanHU = Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU);

	const clinicalNotes =
		`3D КЛКТ-планирование навигационного хирургического шаблона (зуб #${targetTooth}):\n` +
		`• Имплантационная система: ${currentImplantSpec.brandName} (Ø${currentImplantSpec.diameterMm} × ${currentImplantSpec.lengthMm} мм, угол наклона: ${implantAngulationDeg.toFixed(1)}°)\n` +
		`• Костный гребень: ${hStr}, ${wStr}\n` +
		`• Плотность костной ткани: Misch ${displayBoneClass} (${meanHU} HU)\n` +
		`• Безопасный зазор до IAN / синуса: ${nerveStr}\n` +
		`• Хирургический протокол: ${mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol}\n` +
		`• Ожидаемый торк: ${displayTorque}`;

	const labDraft: DentalLabOrderData = {
		id: `lab-cbct-guide-${targetTooth}-${Date.now()}`,
		patientId: effectivePatientId,
		patientName: patientDisplayName,
		doctorId: study?.doctorId ?? null,
		doctorName: study?.doctorName ?? null,
		toothFdi: String(targetTooth),
		selectedTeeth: [targetTooth],
		jawScope: isMaxilla ? "upper" : "lower",
		constructionType: "surgical_guide",
		material: "Биосовместимый фотополимер (Surgical Guide 3D Resin)",
		impressionType: "cbct_dicom",
		clinicalNotes,
		attachedImageUrl: sliceDataUrl,
		status: "draft",
		priceRub: 7500,
		createdAt: new Date().toISOString(),
	};

	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem("dente_pending_lab_order_draft", JSON.stringify(labDraft));
			window.dispatchEvent(new CustomEvent("dente-open-lab-order", { detail: labDraft }));
		} catch {
			// Ignore localStorage write error
		}
	}

	if (onOpenLabOrder) {
		onOpenLabOrder(labDraft);
	}

	showToast(
		`Наряд ЗТЛ на хирургический навигационный шаблон (зуб #${targetTooth}) сформирован с КЛКТ-данными и срезом!`,
		"success",
		4500,
	);

	return labDraft;
}

/**
 * Generates printable PDF implant report with Misch bone density and alveolar caliper measurements.
 */
export function executeExportPdfReport(params: CbctReportGeneratorParams): void {
	const targetTooth = Number.parseInt(params.activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	exportPdfImplantReport({
		targetTooth,
		currentImplantPose: params.currentImplantPose,
		currentCanal: params.currentCanal,
		huSamplingResult: params.huSamplingResult,
		patientDisplayName: params.isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ / КОНСИЛИУМ)" : params.patientDisplayName,
		study: params.study,
		mischClassification: params.mischClassification,
		nerveAuditResult: params.nerveAuditResult,
		activeCaliper: params.activeCaliper,
		ridgeHeightMm: params.effectiveRidgeHeightMm,
		ridgeWidthMm: params.effectiveRidgeWidthMm,
	});
}

/**
 * Exports clean diagnostic viewport snapshot at 300 DPI resolution.
 */
export async function executeExport300DpiSnapshot(
	params: CbctReportGeneratorParams,
	canvas?: HTMLCanvasElement | null,
	title = "КЛКТ Срез (300 DPI)",
): Promise<void> {
	if (!canvas) {
		showToast("Холст среза не найден для экспорта", "error");
		return;
	}

	const targetTooth = Number.parseInt(params.activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	const spacing = 0.4;
	const dataUrl = await exportCleanViewportSnapshot(canvas, title, spacing, {
		patientName: params.isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ)" : params.patientDisplayName,
		studyDate: params.isAnonymized ? "[СКРЫТО]" : params.study?.studyDate || new Date().toLocaleDateString("ru-RU"),
		targetToothFdi: targetTooth,
		isAnonymized: params.isAnonymized,
		targetDpi: 300,
		fov: "8×8 см",
		cleanForReport: true,
	});

	if (typeof window !== "undefined" && typeof document !== "undefined") {
		const link = document.createElement("a");
		link.href = dataUrl;
		link.download = `CBCT_Snapshot_300DPI_${params.isAnonymized ? "ANONYMIZED" : params.patientDisplayName.replace(/\s+/g, "_")}_FDI${targetTooth}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	showToast("Снимок высокого разрешения (300 DPI) успешно сохранен", "success");
}
