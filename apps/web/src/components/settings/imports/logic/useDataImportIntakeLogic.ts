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
	browserMigrationDiscovery?: MigrationLocalSourceDiscoveryResponse | null;
	smartImportPreview?: SmartImportPreviewResponse | null;
	imagingSourceChoices?: ImagingSourceKind[] | null;
	imagingImportPreview?: ImagingImportPreviewResponse | null;
	importSourceKinds?: ImportSourceKind[] | null;
	documentIngestionTargets?: DocumentIngestionTarget[] | null;
	documentIngestion?: DocumentIngestionResponse | null;
	importIntake?: ImportIntakeResponse | null;
	importPreview?: ImportPreviewResponse | null;
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

	const typedBrowserMigrationDiscovery = browserMigrationDiscovery ?? null;
	const typedSmartImportPreview = smartImportPreview ?? null;
	const typedImagingSourceChoices = imagingSourceChoices ?? [];
	const typedImagingImportPreview = imagingImportPreview ?? null;
	const typedImportSourceKinds = importSourceKinds ?? [];
	const typedDocumentIngestionTargets = documentIngestionTargets ?? [];
	const typedDocumentIngestion = documentIngestion ?? null;
	const typedImportIntake = importIntake ?? null;
	const typedImportPreview = importPreview ?? null;

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
