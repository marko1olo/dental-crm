import type {
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	MigrationLocalSourceDiscoveryResponse,
	SmartImportPreviewResponse,
} from "@dental/shared";

export interface UseDataImportIntakeLogicParams {
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
	setSmartImportMode?: (mode: string) => void;
}

export function useDataImportIntakeLogic(params: UseDataImportIntakeLogicParams) {
	const {
		smartImportText,
		imagingImportText,
		importText,
		browserMigrationDiscovery,
		smartImportPreview,
		imagingSourceChoices,
		imagingImportPreview,
		importSourceKinds,
		documentIngestionTargets,
		documentIngestion,
		importIntake,
		importPreview,
		setSmartImportMode,
	} = params;

	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;

	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const typedImagingSourceChoices =
		(imagingSourceChoices ?? []) as ImagingSourceKind[];
	const typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const typedImportSourceKinds =
		(importSourceKinds ?? []) as ImportSourceKind[];
	const typedDocumentIngestionTargets =
		(documentIngestionTargets ?? []) as DocumentIngestionTarget[];
	const typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const typedImportIntake = importIntake as ImportIntakeResponse | null;
	const typedImportPreview = importPreview as ImportPreviewResponse | null;

	const focusSmartImportWorkbench = () => {
		if (setSmartImportMode) {
			setSmartImportMode("auto");
		}
		if (typeof window === "undefined") return;
		window.setTimeout(() => {
			const textarea = document.querySelector<HTMLTextAreaElement>(
				'textarea[aria-label="Смешанная выгрузка для умного разбора"]',
			);
			if (textarea) {
				textarea.focus();
				textarea.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}, 100);
	};

	return {
		smartImportInputReady,
		imagingImportInputReady,
		patientImportInputReady,
		typedBrowserMigrationDiscovery,
		typedSmartImportPreview,
		typedImagingSourceChoices,
		typedImagingImportPreview,
		typedImportSourceKinds,
		typedDocumentIngestionTargets,
		typedDocumentIngestion,
		typedImportIntake,
		typedImportPreview,
		focusSmartImportWorkbench,
	};
}
