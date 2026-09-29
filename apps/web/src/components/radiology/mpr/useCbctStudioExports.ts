/**
 * DENTE CRM — CBCT Implant Studio Export Handlers Hook
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 */

import { useCallback } from "react";
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

	const handleExportPdfReport = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportPdfImplantReport({
			targetTooth,
			currentImplantPose,
			currentCanal,
			huSamplingResult,
			patientDisplayName,
			study,
			mischClassification,
			nerveAuditResult,
			activeCaliper,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
		});
	}, [
		activeCrossSection, currentImplantPose, currentCanal, huSamplingResult,
		patientDisplayName, study, mischClassification, nerveAuditResult,
		activeCaliper, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
	]);

	return {
		handleExportToPlan,
		handleExportToSchedule,
		handleExportToEmr,
		handleExportCbctToFinance,
		handleExportPdfReport,
	};
}
