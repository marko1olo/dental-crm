/**
 * DENTE CRM — CBCT Treatment Plan & Visit Diary Export Handlers
 * Standards: Mandate 8b (Sweet Spot 180-240 lines), Mandate 8e (Doctor Autonomy), Mandate 8x/8ap (Pure clinical terms).
 */

import type React from "react";
import { showToast } from "../../../GlobalToast";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import {
	buildImplantProstheticSuite,
	type VirtualImplantSpec,
	type NerveSafetyAuditResult,
} from "../../implantSafetyEngine";
import type { HUZoneSampling, MischClassificationResult } from "../../boneDensityMischMath";
import type { CrossSectionSliceData } from "../../dentalCurveEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../../cbctCaliperNerveMath";
import type { RadiologyStudy } from "../../types";
import {
	addCbctServiceToTreatmentPlan,
	addCbctSurgicalToVisitFinance,
	exportImplantToScheduleDraft,
	exportImplantToVisitDiary,
	savePersistedCustomPlanItem,
	updateOdontogramToothToPlannedImplant,
} from "../../ctImplantIntegrationBridge";
import { captureSliceFromDOMOrRef } from "./cbctCanvasCapture";

export interface CbctTreatmentPlanExportParams {
	readonly patientId?: string | undefined;
	readonly patientDisplayName: string;
	readonly study?: RadiologyStudy | null | undefined;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly effectiveRidgeHeightMm: number | null;
	readonly effectiveRidgeWidthMm: number | null;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly implantAngulationDeg: number;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayNerveClearanceMm: number | null;
	readonly displayTorque: string;
	readonly displayDrillingProtocol: string;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly huSamplingResult: HUZoneSampling;
	readonly mischClassification: MischClassificationResult;
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly onApplyToDiary?: ((summary: any) => void) | undefined;
	readonly crossSectionCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
}

/**
 * Exports complete 3-position implant suite (fixture + healing abutment + custom crown) to patient's treatment plan.
 */
export function executeExportToPlan(params: CbctTreatmentPlanExportParams): void {
	const {
		patientId,
		activeCrossSection,
		currentImplantSpec,
		effectiveRidgeHeightMm,
		effectiveRidgeWidthMm,
		displayBoneClass,
		displayMeanHU,
		displayNerveClearanceMm,
		displayTorque,
		displayDrillingProtocol,
		huSamplingResult,
		mischClassification,
		onApplyToPlan,
		crossSectionCanvasRef,
	} = params;

	const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	const isMaxilla = targetTooth < 30;
	const anatomyLabel = isMaxilla ? "пазухи" : "канала IAN";
	const nerveStatus =
		displayNerveClearanceMm !== null
			? `дистанция до ${anatomyLabel}: ${displayNerveClearanceMm.toFixed(1)} мм`
			: "дистанция не определена";
	const ridgeHStr =
		typeof effectiveRidgeHeightMm === "number"
			? `H=${effectiveRidgeHeightMm.toFixed(1)} мм`
			: "H: —";
	const ridgeWStr =
		typeof effectiveRidgeWidthMm === "number"
			? `W=${effectiveRidgeWidthMm.toFixed(1)} мм`
			: "W: —";

	const clinicalRationale =
		`КЛКТ-планирование (зуб #${targetTooth}): гребень ${ridgeHStr}, ${ridgeWStr}. ` +
		`Плотность кости: Misch ${displayBoneClass} (гребень ${Math.round(huSamplingResult.coronalCrestalHU)} HU, тело ${Math.round(huSamplingResult.trabecularCoreHU)} HU, апекс ${Math.round(huSamplingResult.apicalBaseHU)} HU, среднее ${Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU)} HU). ` +
		`${nerveStatus}. Протокол: ${mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol}. Ожидаемый торк: ${displayTorque}.`;

	const sliceDataUrl = captureSliceFromDOMOrRef(crossSectionCanvasRef);
	const suite = buildImplantProstheticSuite(currentImplantSpec, targetTooth, clinicalRationale);

	const planItems: TreatmentPlanItem[] = suite.suiteItems.map((item, idx) => ({
		id: `plan-implant-suite-${targetTooth}-${idx}-${Date.now()}`,
		toothNumber: targetTooth,
		serviceCode: item.code804n || `IMPLANT-${targetTooth}-${idx}`,
		code804n: item.code804n,
		name: item.name,
		category: item.category as any,
		priceRub: item.priceRub,
		unitPriceRub: item.priceRub,
		discountRub: 0,
		quantity: 1,
		phase: item.phase,
		stageKind: item.stageKind as any,
		isAuto: false,
		materials: item.materials,
		clinicalRationale: item.clinicalRationale,
	}));

	if (patientId && typeof window !== "undefined") {
		for (const pItem of planItems) {
			savePersistedCustomPlanItem(patientId, pItem);
		}

		if (sliceDataUrl) {
			try {
				const planAttachment = {
					id: `plan-cbct-slice-${targetTooth}-${Date.now()}`,
					patientId,
					toothNumber: targetTooth,
					title: `КЛКТ срез для хирургического этапа (зуб #${targetTooth})`,
					sliceUrl: sliceDataUrl,
					capturedAt: new Date().toISOString(),
					implantInfo: `${currentImplantSpec.brandName} Ø${currentImplantSpec.diameterMm}x${currentImplantSpec.lengthMm}`,
				};
				const attachKey = `dente_patient_treatment_plan_attachments_${patientId}`;
				const existingAttachRaw = window.localStorage.getItem(attachKey);
				const existingAttaches = existingAttachRaw ? JSON.parse(existingAttachRaw) : [];
				existingAttaches.push(planAttachment);
				window.localStorage.setItem(attachKey, JSON.stringify(existingAttaches));
				window.dispatchEvent(
					new CustomEvent("dente-treatment-plan-attachment-added", { detail: planAttachment }),
				);
			} catch {
				// Ignore localStorage write failures
			}
		}
	}

	updateOdontogramToothToPlannedImplant(targetTooth);

	if (typeof window !== "undefined") {
		for (const pItem of planItems) {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-add-treatment-plan-item", {
						detail: {
							item: pItem,
							toothNumber: targetTooth,
							patientId,
							sliceDataUrl,
						},
					}),
				);
			} catch {
				// Ignore custom event dispatch errors
			}
		}
	}

	if (onApplyToPlan && planItems[0]) {
		onApplyToPlan(planItems[0]);
	}

	const totalRub = suite.totalPriceRub.toLocaleString("ru-RU");
	showToast(
		`Хирургический этап #${targetTooth} со срезом КЛКТ: имплантат (${(suite.implantPriceKopecks / 100).toLocaleString("ru-RU")} ₽) + формирователь + абатмент = ${totalRub} ₽ добавлен в план лечения!`,
		"success",
		5000,
	);
}

/**
 * Exports implant parameters as a drafted slot into appointment scheduling.
 */
export function executeExportToSchedule(params: CbctTreatmentPlanExportParams): void {
	const targetTooth = Number.parseInt(params.activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	exportImplantToScheduleDraft({
		patientId: params.patientId,
		patientName: params.patientDisplayName,
		toothFdi: targetTooth,
		implantSpec: params.currentImplantSpec,
		angulationDeg: params.implantAngulationDeg,
		ridgeHeightMm: params.effectiveRidgeHeightMm,
		ridgeWidthMm: params.effectiveRidgeWidthMm,
		mischClass: params.displayBoneClass,
		meanHU: params.displayMeanHU,
		nerveClearanceMm: params.displayNerveClearanceMm,
		recommendedTorqueNcm: params.displayTorque,
		drillingProtocol: params.displayDrillingProtocol,
	});
}

/**
 * Exports clinical protocol and diagnostic slice to patient's Electronic Medical Record & Visit Diary.
 */
export function executeExportToEmr(params: CbctTreatmentPlanExportParams): void {
	const {
		patientId,
		patientDisplayName,
		study,
		activeCrossSection,
		currentImplantSpec,
		implantAngulationDeg,
		effectiveRidgeHeightMm,
		effectiveRidgeWidthMm,
		activeCaliper,
		displayBoneClass,
		displayMeanHU,
		displayNerveClearanceMm,
		displayTorque,
		displayDrillingProtocol,
		nerveAuditResult,
		huSamplingResult,
		mischClassification,
		crossSectionCanvasRef,
		onApplyToDiary,
	} = params;

	const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	const effectivePatientId = patientId || "cbct-patient";
	const sliceDataUrl = captureSliceFromDOMOrRef(crossSectionCanvasRef);

	if (sliceDataUrl && typeof window !== "undefined") {
		try {
			const emrAttachment = {
				id: `emr-cbct-slice-${targetTooth}-${Date.now()}`,
				patientId: effectivePatientId,
				patientName: patientDisplayName,
				title: `КЛКТ срез (300 DPI) — планирование имплантата #${targetTooth} (${currentImplantSpec.brandName} Ø${currentImplantSpec.diameterMm}x${currentImplantSpec.lengthMm})`,
				kind: "cbct",
				toothCode: String(targetTooth),
				teethFdi: [String(targetTooth)],
				previewUrl: sliceDataUrl,
				viewerUrl: sliceDataUrl,
				capturedAt: new Date().toISOString(),
				effectiveDoseMicrosv: 15,
				status: "available",
				notes: `Плотность Misch ${displayBoneClass} (${Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU)} HU), зазор до канала: ${displayNerveClearanceMm ?? "—"} мм`,
			};

			const storageKey = `dente_patient_emr_attachments_${effectivePatientId}`;
			const existingRaw = window.localStorage.getItem(storageKey);
			const existing = existingRaw ? JSON.parse(existingRaw) : [];
			existing.push(emrAttachment);
			window.localStorage.setItem(storageKey, JSON.stringify(existing));

			const studiesRaw = window.localStorage.getItem("dente_imaging_studies");
			const existingStudies = studiesRaw ? JSON.parse(studiesRaw) : [];
			existingStudies.push(emrAttachment);
			window.localStorage.setItem("dente_imaging_studies", JSON.stringify(existingStudies));

			window.dispatchEvent(new CustomEvent("dente-add-imaging-study", { detail: emrAttachment }));
			window.dispatchEvent(new CustomEvent("dente-emr-attachment", { detail: emrAttachment }));
		} catch {
			// Ignore localStorage write failures
		}
	}

	const isMaxillaZone = targetTooth < 30;
	const isSinusZone = isMaxillaZone && targetTooth >= 14 && targetTooth <= 27;
	let sinusRecommendation: string | null = null;
	if (isSinusZone && typeof effectiveRidgeHeightMm === "number") {
		if (effectiveRidgeHeightMm < 5.0) {
			sinusRecommendation = `Выраженная вертикальная атрофия (H=${effectiveRidgeHeightMm.toFixed(1)} мм < 5 мм). Показан открытый (латеральный) синус-лифтинг с остеопластикой.`;
		} else if (effectiveRidgeHeightMm < 10.0) {
			sinusRecommendation = `Умеренный дефицит высоты кости (H=${effectiveRidgeHeightMm.toFixed(1)} мм). Показан закрытый (транскрестальный) синус-лифтинг.`;
		} else {
			sinusRecommendation = `Высота кости достаточна (H=${effectiveRidgeHeightMm.toFixed(1)} мм >= 10 мм). Синус-лифтинг не требуется.`;
		}
	}

	exportImplantToVisitDiary(
		{
			patientId,
			patientName: patientDisplayName,
			doctorId: study?.doctorId,
			doctorName: study?.doctorName,
			toothFdi: targetTooth,
			implantSpec: currentImplantSpec,
			angulationDeg: implantAngulationDeg,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
			ridgeW2Mm: (activeCaliper as any)?.crestWidthMm ?? effectiveRidgeWidthMm,
			ridgeW6Mm: (activeCaliper as any)?.midWidthMm ?? null,
			sinusLiftRecommendation: sinusRecommendation,
			mischClass: displayBoneClass,
			meanHU: Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU),
			nerveClearanceMm: displayNerveClearanceMm,
			recommendedTorqueNcm: displayTorque,
			drillingProtocol: mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol,
			isNerveWarning: nerveAuditResult.isWarning,
			isNerveDanger: nerveAuditResult.isDangerous,
		},
		onApplyToDiary,
	);

	showToast(
		`Клинический протокол и срез КЛКТ высокого разрешения успешно сохранены в медицинскую карту пациента ${patientDisplayName}!`,
		"success",
		4500,
	);
}

/**
 * Direct export of surgical service and CBCT to visit invoice.
 */
export function executeExportCbctToFinance(params: {
	readonly patientId?: string | undefined;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly effectiveRidgeHeightMm: number | null;
	readonly effectiveRidgeWidthMm: number | null;
	readonly doctorName?: string | undefined;
}): void {
	const targetTooth = Number.parseInt(params.activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
	addCbctSurgicalToVisitFinance({
		patientId: params.patientId,
		toothFdi: targetTooth,
		implantSpec: params.currentImplantSpec,
		ridgeHeightMm: params.effectiveRidgeHeightMm,
		ridgeWidthMm: params.effectiveRidgeWidthMm,
		doctorName: params.doctorName,
	});
	addCbctServiceToTreatmentPlan({
		patientId: params.patientId,
		toothFdi: targetTooth,
		doctorName: params.doctorName,
	});
}
