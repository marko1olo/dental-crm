import { useClinicProfileDraftLogic } from "./logic/useClinicProfileDraftLogic";
import { useDicomViewerLogic } from "./logic/useDicomViewerLogic";
import { useMigrationAutopilotLogic } from "./logic/useMigrationAutopilotLogic";
import { useDataImportIntakeLogic } from "./logic/useDataImportIntakeLogic";

export interface UseSettingsImportsLogicParams {
	smartImportText?: string;
	imagingImportText?: string;
	importText?: string;
	browserMigrationDiscovery?: any;
	smartImportPreview?: any;
	imagingSourceChoices?: any;
	imagingImportPreview?: any;
	importSourceKinds?: any;
	documentIngestionTargets?: any;
	documentIngestion?: any;
	importIntake?: any;
	importPreview?: any;
	clinicProfileDraft?: any;
	clinicProfileSaveState?: string;
	updateClinicProfileDraft?: (key: string, value: string) => void;
	migrationAutopilot?: any;
	migrationSourceDiscovery?: any;
	migrationSourceWorkup?: any;
	migrationSourceProbe?: any;
	clinicPublicLookup?: any;
	dicomFirstFramePreview?: any;
	dicomFirstFrameViewerState?: any;
	defaultDicomFirstFrameViewerState?: any;
	setDicomFirstFrameViewerState?: any;
	dicomSeriesPreview?: any;
	dicomLocalFolderDiscovery?: any;
	localImagingOrganizer?: any;
	imagingFolderScan?: any;
	dicomFolderSeriesScan?: any;
	dicomFolderWorkupPlan?: any;
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
