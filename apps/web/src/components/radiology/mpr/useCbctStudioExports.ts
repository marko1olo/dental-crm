/**
 * DENTE CRM — CBCT Implant Studio Export Handlers Hook
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 */

import { useState, useCallback } from "react";
import type { CrossSectionSliceData } from "../dentalCurveEngine";
import { measureAlveolarRidgeCrossSection } from "../dentalCurveEngine";
import type {
	VirtualImplantSpec,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
} from "../implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";
import type { HUZoneSampling, MischClassificationResult } from "../boneDensityMischMath";
import type { RadiologyStudy } from "../types";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { showToast } from "../../GlobalToast";
import { exportCleanViewportSnapshot } from "../cbctSnapshotExportMath";
import {
	exportImplantToTreatmentPlan,
	exportImplantToDiary043,
	exportImplantToScheduleDraft,
	exportPdfImplantReport,
	addCbctToFinanceAndPlan,
} from "../ctImplantIntegrationBridge";

export interface UseCbctStudioExportsProps {
	readonly patientId?: string | undefined;
	readonly patientDisplayName: string;
	readonly study?: RadiologyStudy | null | undefined;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
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
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly onApplyToDiary043?: ((summary: any) => void) | undefined;
}

export function useCbctStudioExports({
	patientId,
	patientDisplayName,
	study,
	activeCrossSection,
	activeCaliper,
	ridgeHeightMm,
	ridgeWidthMm,
	currentImplantSpec,
	currentImplantPose,
	currentCanal,
	implantAngulationDeg,
	displayBoneClass,
	displayMeanHU,
	displayNerveClearanceMm,
	displayTorque,
	displayDrillingProtocol,
	nerveAuditResult,
	huSamplingResult,
	mischClassification,
	onApplyToPlan,
	onApplyToDiary043,
}: UseCbctStudioExportsProps) {
	const crossSectionMeasurement = activeCrossSection
		? measureAlveolarRidgeCrossSection(activeCrossSection)
		: null;

	const effectiveRidgeHeightMm =
		activeCaliper?.heightMm ??
		ridgeHeightMm ??
		crossSectionMeasurement?.heightMm ??
		activeCrossSection?.corticalCrestHeightMm ??
		null;

	const effectiveRidgeWidthMm =
		activeCaliper?.crestWidthMm ??
		ridgeWidthMm ??
		crossSectionMeasurement?.crestWidthMm ??
		activeCrossSection?.alveolarRidgeWidthMm ??
		null;

	const handleExportToPlan = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const item = exportImplantToTreatmentPlan({
			patientId,
			patientName: patientDisplayName,
			doctorId: study?.doctorId,
			doctorName: study?.doctorName,
			toothFdi: targetTooth,
			implantSpec: currentImplantSpec,
			angulationDeg: implantAngulationDeg,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
			mischClass: displayBoneClass,
			meanHU: displayMeanHU,
			nerveClearanceMm: displayNerveClearanceMm,
			recommendedTorqueNcm: displayTorque,
			drillingProtocol: displayDrillingProtocol,
			isNerveWarning: nerveAuditResult.isWarning,
			isNerveDanger: nerveAuditResult.isDangerous,
		});
		if (onApplyToPlan) {
			onApplyToPlan(item);
		}
	}, [
		patientId, patientDisplayName, study, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol, nerveAuditResult, onApplyToPlan,
	]);

	const handleExportToSchedule = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportImplantToScheduleDraft({
			patientId,
			patientName: patientDisplayName,
			toothFdi: targetTooth,
			implantSpec: currentImplantSpec,
			angulationDeg: implantAngulationDeg,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
			mischClass: displayBoneClass,
			meanHU: displayMeanHU,
			nerveClearanceMm: displayNerveClearanceMm,
			recommendedTorqueNcm: displayTorque,
			drillingProtocol: displayDrillingProtocol,
		});
	}, [
		patientId, patientDisplayName, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol,
	]);

	const handleExportToEmr = useCallback(async () => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportImplantToDiary043(
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
				mischClass: displayBoneClass,
				meanHU: displayMeanHU,
				nerveClearanceMm: displayNerveClearanceMm,
				recommendedTorqueNcm: displayTorque,
				drillingProtocol: displayDrillingProtocol,
				isNerveWarning: nerveAuditResult.isWarning,
				isNerveDanger: nerveAuditResult.isDangerous,
			},
			onApplyToDiary043,
		);
	}, [
		patientId, patientDisplayName, study, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol, nerveAuditResult, onApplyToDiary043,
	]);

	const handleExportCbctToFinance = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		addCbctToFinanceAndPlan({
			patientId,
			toothFdi: targetTooth,
			doctorName: study?.doctorName,
		});
	}, [activeCrossSection, patientId, study]);

	const [isAnonymized, setIsAnonymized] = useState(false);

	const handleToggleAnonymize = useCallback(() => {
		setIsAnonymized((prev) => {
			const next = !prev;
			showToast(
				next
					? "Анонимизация включена (152-ФЗ): персональные данные скрыты"
					: "Анонимизация отключена: отображаются полные данные пациента",
				"info",
				3000,
			);
			return next;
		});
	}, []);

	const handleExportPdfReport = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportPdfImplantReport({
			targetTooth,
			currentImplantPose,
			currentCanal,
			huSamplingResult,
			patientDisplayName: isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ / КОНСИЛИУМ)" : patientDisplayName,
			study,
			mischClassification,
			nerveAuditResult,
			activeCaliper,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
		});
	}, [
		activeCrossSection, currentImplantPose, currentCanal, huSamplingResult,
		patientDisplayName, isAnonymized, study, mischClassification, nerveAuditResult,
		activeCaliper, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
	]);

	const handleExport300DpiSnapshot = useCallback(async (canvas?: HTMLCanvasElement | null, title = "КЛКТ Срез (300 DPI)") => {
		if (!canvas) {
			showToast("Холст среза не найден для экспорта", "error");
			return;
		}
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const spacing = 0.4;
		const dataUrl = await exportCleanViewportSnapshot(canvas, title, spacing, {
			patientName: isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ)" : patientDisplayName,
			studyDate: isAnonymized ? "[СКРЫТО]" : study?.studyDate || new Date().toLocaleDateString("ru-RU"),
			targetToothFdi: targetTooth,
			isAnonymized,
			targetDpi: 300,
			fov: "8×8 см",
			cleanForReport: true,
		});
		if (typeof window !== "undefined" && typeof document !== "undefined") {
			const link = document.createElement("a");
			link.href = dataUrl;
			link.download = `CBCT_Snapshot_300DPI_${isAnonymized ? "ANONYMIZED" : patientDisplayName.replace(/\s+/g, "_")}_FDI${targetTooth}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
		showToast("Снимок высокого разрешения (300 DPI) успешно сохранен", "success");
	}, [activeCrossSection, isAnonymized, patientDisplayName, study]);

	return {
		isAnonymized,
		handleToggleAnonymize,
		handleExportToPlan,
		handleExportToSchedule,
		handleExportToEmr,
		handleExportCbctToFinance,
		handleExportPdfReport,
		handleExport300DpiSnapshot,
	};
}
