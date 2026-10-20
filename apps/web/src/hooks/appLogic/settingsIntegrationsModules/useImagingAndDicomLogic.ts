/**
 * apps/web/src/hooks/appLogic/settingsIntegrationsModules/useImagingAndDicomLogic.ts
 *
 * Sub-hook for DICOM / CBCT imaging studies filtering, MPR projections,
 * and DICOM workbench integration.
 */

import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { buildMprAxisGuidance, mprProjectionCompassLabels } from "../../../mprControlMath";
import { useImagingStore } from "../../../store/imagingStore";
import type { AppView } from "../../../utils/routeUtils";
import { useDicomWorkbenchModule } from "../../domains/useDicomWorkbenchModule";

export interface UseImagingAndDicomLogicProps {
	auth: any;
	currentView: AppView;
	dashboard: Dashboard | null;
	documentPatient: any;
	selectedPatientId: string;
}

export function useImagingAndDicomLogic({
	auth,
	currentView,
	dashboard,
	documentPatient,
	selectedPatientId,
}: UseImagingAndDicomLogicProps) {
	const {
		imagingKindFilter,
		imagingToothFilter,
		setImagingToothFilter,
		imagingViewerState,
		setImagingViewerState,
		mprProjection,
		mprAxisDeg,
		mprSlabMm,
	} = useImagingStore();

	const activeImagingStudies = useMemo(() => {
		if (!dashboard?.imagingStudies?.length) return [];
		const patientId = documentPatient?.id ?? selectedPatientId;
		if (!patientId) return dashboard.imagingStudies;
		return (
			dashboard.imagingStudies.filter(
				(study) => study.patientId === patientId,
			) ?? []
		);
	}, [dashboard?.imagingStudies, documentPatient?.id, selectedPatientId]);

	const visibleImagingStudies = useMemo(() => {
		let list = activeImagingStudies;
		if (imagingKindFilter !== "all") {
			list = list.filter((study) => study.kind === imagingKindFilter);
		}
		if (imagingToothFilter && imagingToothFilter !== "all") {
			list = list.filter(
				(study) =>
					String(study.toothCode ?? "").trim() ===
					String(imagingToothFilter).trim(),
			);
		}
		return list;
	}, [activeImagingStudies, imagingKindFilter, imagingToothFilter]);

	const mprProjectionCompass = useMemo(() => {
		return mprProjectionCompassLabels(mprProjection);
	}, [mprProjection]);

	const dicomWorkbenchModule = useDicomWorkbenchModule({
		auth,
		currentView,
		visibleImagingStudies,
	});

	const { selectedImagingStudy } = dicomWorkbenchModule;

	const mprAxisGuidance = useMemo(() => {
		return buildMprAxisGuidance({
			canOpenMpr: Boolean(selectedImagingStudy?.kind === "cbct"),
			axisDeg: mprAxisDeg ?? 0,
			slabMm: mprSlabMm ?? 1,
			sliceFraction: 0.5,
		});
	}, [selectedImagingStudy?.kind, mprAxisDeg, mprSlabMm]);

	return {
		visibleImagingStudies,
		imagingToothFilter,
		setImagingToothFilter,
		imagingViewerState,
		setImagingViewerState,
		mprProjectionCompass,
		mprAxisGuidance,
		dicomWorkbenchModule,
	};
}
