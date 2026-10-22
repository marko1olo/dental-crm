/**
 * implantPdfReportBuilder.ts — генератор печатного протокола КЛКТ-планирования и отчёта PDF.
 * Mandate 8b: Модульность, строго < 120 строк.
 * Mandate 8e: Doctor Autonomy (печать в любой момент, экономия тонера).
 */

import { showToast } from "../../GlobalToast";
import {
	type AlveolarRidgeEnvelope,
	auditAlveolarBoneContainment,
	generateForm043CbctDiary,
} from "../implantSafetyEngine";
import { buildCbctReportData, openCbctReportPrintWindow } from "../cbctExportEngine";
import type { ExportPdfReportParams } from "./implantBridgeTypes";

/**
 * Экспорт протокола КЛКТ-планирования в печатный вид / PDF (A4)
 */
export function exportPdfImplantReport(params: ExportPdfReportParams): void {
	let derivedEnvelope: AlveolarRidgeEnvelope | undefined = params.envelope ?? undefined;
	let effectiveRidgeHeightMm: number | null =
		typeof params.ridgeHeightMm === "number" ? params.ridgeHeightMm : null;
	let effectiveRidgeWidthMm: number | null =
		typeof params.ridgeWidthMm === "number" ? params.ridgeWidthMm : null;

	if (params.activeCaliper) {
		const cal = params.activeCaliper;
		effectiveRidgeHeightMm = cal.heightMm;
		effectiveRidgeWidthMm = cal.crestWidthMm;
		derivedEnvelope = {
			crestPoint: cal.crestPoint,
			basePoint: cal.basePoint,
			buccalCrestPoint: cal.crestWidthLeft ?? { x: cal.crestPoint.x - cal.crestWidthMm / 2, y: cal.crestPoint.y },
			lingualCrestPoint: cal.crestWidthRight ?? { x: cal.crestPoint.x + cal.crestWidthMm / 2, y: cal.crestPoint.y },
			ridgeWidthMm: cal.crestWidthMm,
			ridgeHeightMm: cal.heightMm,
		};
	} else if (!derivedEnvelope && effectiveRidgeHeightMm !== null && effectiveRidgeWidthMm !== null) {
		derivedEnvelope = {
			crestPoint: { x: 0, y: 0 },
			basePoint: { x: 0, y: effectiveRidgeHeightMm },
			buccalCrestPoint: { x: -effectiveRidgeWidthMm / 2, y: 0 },
			lingualCrestPoint: { x: effectiveRidgeWidthMm / 2, y: 0 },
			ridgeWidthMm: effectiveRidgeWidthMm,
			ridgeHeightMm: effectiveRidgeHeightMm,
		};
	}

	const containment = derivedEnvelope
		? auditAlveolarBoneContainment(params.currentImplantPose, derivedEnvelope)
		: undefined;

	const diaryText = generateForm043CbctDiary({
		toothFdi: params.targetTooth,
		implantPose: params.currentImplantPose,
		canal: params.currentCanal,
		envelope: derivedEnvelope ?? null,
		huSampling: params.huSamplingResult,
		patientName: params.patientDisplayName,
		clinicName: "Стоматологический центр DENTE",
	});

	const reportData = buildCbctReportData({
		patientName: params.patientDisplayName,
		clinicName: "Стоматологический центр DENTE",
		doctorName: params.study?.doctorName ? `Врач: ${params.study.doctorName}` : "Лечащий врач-стоматолог",
		studyDate: params.study?.studyDate || new Date().toLocaleDateString("ru-RU"),
		targetToothFdi: params.targetTooth,
		implantPose: params.currentImplantPose,
		mischResult: params.mischClassification,
		huSampling: params.huSamplingResult,
		ridgeHeightMm: effectiveRidgeHeightMm,
		ridgeWidthMm: effectiveRidgeWidthMm,
		containment,
		nerveSafety: params.nerveAuditResult,
		diary043Text: diaryText,
		tonerSaving: true,
	});

	openCbctReportPrintWindow(reportData, { tonerSaving: true });
	showToast(
		`Протокол КЛКТ-планирования для зуба FDI #${params.targetTooth} сформирован для печати / PDF (A4)`,
		"success",
	);
}
