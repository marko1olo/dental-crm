import type React from "react";
import type {
	ClinicPublicLookupResponse,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomSeriesPreviewGroup,
	DicomSeriesPreviewResponse,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImagingFolderScanResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	LocalImagingOrganizerResponse,
	MigrationAutopilotResponse,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	SmartImportPreviewResponse,
} from "@dental/shared";
import type { DicomFirstFrameViewerState } from "./types";
import { useClinicProfileDraftLogic } from "./logic/useClinicProfileDraftLogic";
import { useDicomViewerLogic } from "./logic/useDicomViewerLogic";
import { useMigrationAutopilotLogic } from "./logic/useMigrationAutopilotLogic";
import { useDataImportIntakeLogic } from "./logic/useDataImportIntakeLogic";

export interface UseSettingsImportsLogicParams {
	smartImportText?: string;
	imagingImportText?: string;
	importText?: string;
	browserMigrationDiscovery?: MigrationLocalSourceDiscoveryResponse | null;
	smartImportPreview?: SmartImportPreviewResponse | null;
	imagingSourceChoices?: ImagingSourceKind[] | null;
	imagingImportPreview?: ImagingImportPreviewResponse | null;
	importSourceKinds?: ImportSourceKind[] | null;
	documentIngestionTargets?: DocumentIngestionTarget[] | null;
	documentIngestion?: DocumentIngestionResponse | null;
	importIntake?: ImportIntakeResponse | null;
	importPreview?: ImportPreviewResponse | null;
	clinicProfileDraft?: Record<string, unknown> | null;
	clinicProfileSaveState?: string;
	updateClinicProfileDraft?: (key: string, value: string) => void;
	migrationAutopilot?: MigrationAutopilotResponse | null;
	migrationSourceDiscovery?: MigrationLocalSourceDiscoveryResponse | null;
	migrationSourceWorkup?: MigrationLocalSourceWorkupResponse | null;
	migrationSourceProbe?: MigrationLocalSourceProbeResponse | null;
	clinicPublicLookup?: ClinicPublicLookupResponse | null;
	dicomFirstFramePreview?: DicomFirstFramePreviewResponse | null;
	dicomFirstFrameViewerState?: DicomFirstFrameViewerState | null;
	defaultDicomFirstFrameViewerState?: DicomFirstFrameViewerState | null;
	setDicomFirstFrameViewerState?:
		| React.Dispatch<React.SetStateAction<DicomFirstFrameViewerState>>
		| ((updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState) => void);
	dicomSeriesPreview?: DicomSeriesPreviewResponse | { series?: DicomSeriesPreviewGroup[] } | null;
	dicomLocalFolderDiscovery?: DicomLocalFolderDiscoveryResponse | null;
	localImagingOrganizer?: LocalImagingOrganizerResponse | null;
	imagingFolderScan?: ImagingFolderScanResponse | null;
	dicomFolderSeriesScan?: DicomFolderSeriesPreviewResponse | null;
	dicomFolderWorkupPlan?: DicomFolderWorkupPlanResponse | null;
	isMigrationSourceDiscovering?: boolean;
	isBrowserMigrationScanning?: boolean;
	isMigrationAutopilotLoading?: boolean;
	isMigrationSourceWorkupLoading?: boolean;
	isSmartImportLoading?: boolean;
	isClinicPublicLookupLoading?: boolean;
	isDicomFirstFramePreviewing?: boolean;
	setSmartImportMode?: (mode: string) => void;
}

export function useSettingsImportsLogic(params: UseSettingsImportsLogicParams) {
	const intakeLogic = useDataImportIntakeLogic(params);
	const clinicLogic = useClinicProfileDraftLogic(params);
	const dicomLogic = useDicomViewerLogic(params);
	const autopilotLogic = useMigrationAutopilotLogic({
		...params,
		smartImportInputReady: intakeLogic.smartImportInputReady,
		migrationClinicFieldsFound: clinicLogic.migrationClinicFieldsFound,
	});

	return {
		...intakeLogic,
		...clinicLogic,
		...dicomLogic,
		...autopilotLogic,
	};
}
