/**
 * DENTE CRM — CBCT Implant Studio Export Handlers Hook Facade
 * Standards: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8x/8ap (Pure clinical terms).
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
import type { DentalLabOrderData } from "../../lab/labMath";
import {
	executeExportToPlan,
	executeExportToSchedule,
	executeExportToEmr,
	executeExportCbctToFinance,
} from "./exports/cbctTreatmentPlanExport";
import {
	executeExportToLab,
	executeExportPdfReport,
	executeExport300DpiSnapshot,
} from "./exports/cbctReportGenerator";

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
	readonly onApplyToVisitDiary?: ((summary: any) => void) | undefined;
	readonly onApplyToDiary043?: ((summary: any) => void) | undefined;
	readonly onOpenLabOrder?: ((draft: DentalLabOrderData) => void) | undefined;
	readonly crossSectionCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
}

export function useCbctStudioExports(props: UseCbctStudioExportsProps) {
	const [isAnonymized, setIsAnonymized] = useState(false);

	const crossSectionMeasurement = props.activeCrossSection
		? measureAlveolarRidgeCrossSection(props.activeCrossSection)
		: null;

	const effectiveRidgeHeightMm =
		props.activeCaliper?.heightMm ??
		props.ridgeHeightMm ??
		crossSectionMeasurement?.heightMm ??
		props.activeCrossSection?.corticalCrestHeightMm ??
		null;

	const effectiveRidgeWidthMm =
		props.activeCaliper?.crestWidthMm ??
		props.ridgeWidthMm ??
		crossSectionMeasurement?.crestWidthMm ??
		props.activeCrossSection?.alveolarRidgeWidthMm ??
		null;

	const sharedParams = {
		...props,
		isAnonymized,
		effectiveRidgeHeightMm,
		effectiveRidgeWidthMm,
		onApplyToDiary: props.onApplyToVisitDiary ?? props.onApplyToDiary043,
	};

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

	const handleExportToPlan = useCallback(() => {
		executeExportToPlan(sharedParams);
	}, [sharedParams]);

	const handleExportToSchedule = useCallback(() => {
		executeExportToSchedule(sharedParams);
	}, [sharedParams]);

	const handleExportToEmr = useCallback(() => {
		executeExportToEmr(sharedParams);
	}, [sharedParams]);

	const handleExportCbctToFinance = useCallback(() => {
		executeExportCbctToFinance({
			patientId: props.patientId,
			activeCrossSection: props.activeCrossSection,
			currentImplantSpec: props.currentImplantSpec,
			effectiveRidgeHeightMm,
			effectiveRidgeWidthMm,
			doctorName: props.study?.doctorName,
		});
	}, [props.patientId, props.activeCrossSection, props.currentImplantSpec, effectiveRidgeHeightMm, effectiveRidgeWidthMm, props.study?.doctorName]);

	const handleExportToLab = useCallback(() => {
		return executeExportToLab(sharedParams);
	}, [sharedParams]);

	const handleExportPdfReport = useCallback(() => {
		executeExportPdfReport(sharedParams);
	}, [sharedParams]);

	const handleExport300DpiSnapshot = useCallback(
		(canvas?: HTMLCanvasElement | null, title?: string) => {
			return executeExport300DpiSnapshot(sharedParams, canvas, title);
		},
		[sharedParams],
	);

	return {
		isAnonymized,
		handleToggleAnonymize,
		handleExportToPlan,
		handleExportToSchedule,
		handleExportToEmr,
		handleExportCbctToFinance,
		handleExportToLab,
		handleExportPdfReport,
		handleExport300DpiSnapshot,
	};
}
