import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image , ScanSearch } from "lucide-react";

export function BrowserMigrationManifestResult(props: any) {
    const { typedBrowserMigrationDiscovery,
        migrationAutopilot,
        migrationSourceDisplayName,
        migrationSourceKindLabel,
        pickBrowserMigrationSource,
        isBrowserMigrationScanning,
        isMigrationAutopilotLoading,
        discoverMigrationSources,
        isMigrationSourceDiscovering,
        focusSmartImportWorkbench,
        FileText,
    } = props;
    // We spread props dynamically to avoid massive destructuring upfront
    const {
        typedSmartImportPreview,
        migrationCandidatePreviewReady,
        migrationCandidatePreviewHint,
        commitSmartImport,
        isSmartImportCommitting,
        smartImportInputReady,
        typedMigrationAutopilotDiscovery,
        typedMigrationAutopilotProbe,
        typedMigrationAutopilotWorkup,
        typedBrowserMigrationManifest,
        browserMigrationScanProgress,
        clinicPublicLookupState,
        clinicPublicLookupResult,
        clinicProfileSaveState,
        clinicProfileSaveButtonText,
        saveClinicProfileFromDraft,
        applyClinicLookupSuggestion,
        clinicLookupSuggestionFieldEntries,
        clinicLookupSuggestionApplySummary,
        runMigrationProbe,
        runMigrationWorkup,
        humanizeMigrationText,
        _renderMigrationOperatorStepActions,
        _renderMigrationTechnicalNotes,
        cancelLocalDicomOperation,
    } = props;
    
    // Fallback logic for inline closures if they exist
    const renderMigrationOperatorStepActions = _renderMigrationOperatorStepActions || ((step: any) => null);
    const renderMigrationTechnicalNotes = _renderMigrationTechnicalNotes || ((step: any) => null);

    return (
        <section
					className="dicom-discovery-result browser-migration-manifest-result"
					data-testid="browser-migration-manifest-result"
					aria-label="Выбранная папка старых баз, выгрузок и снимков"
				>
					<div className="dicom-discovery-head">
						<strong>
							Выбранная папка: источников{" "}
							{typedBrowserMigrationDiscovery.candidates.length} · файлов{" "}
							{typedBrowserMigrationDiscovery.candidates.reduce(
								(sum, candidate) => sum + candidate.matchedFiles,
								0,
							)}{" "}
							· папок {typedBrowserMigrationDiscovery.scannedFolders}
						</strong>
						<span>
							{migrationAutopilot
								? "Автоплан по выбранной папке уже построен ниже."
								: humanizeMigrationText(
										typedBrowserMigrationDiscovery.nextAction,
									)}
						</span>
						<span>
							Сканирование выполнено после явного выбора папки/файлов. Полный
							путь и содержимое файлов не сохраняются в CRM.
						</span>
					</div>
					<div className="migration-source-artifact-list">
						{(typedBrowserMigrationDiscovery?.candidates ?? [])
							.slice(0, 6)
							.map((candidate, index) => (
								<span key={candidate?.sourceFingerprint ?? index}>
									{migrationSourceDisplayName(candidate, index)} ·{" "}
									{migrationSourceKindLabel(candidate?.sourceKind ?? "")} ·{" "}
									{Math.round((candidate?.confidence ?? 0) * 100)}%
								</span>
							))}
					</div>
					{!(typedBrowserMigrationDiscovery?.candidates ?? []).length ? (
						<div
							className="migration-empty-recovery"
							data-testid="browser-migration-empty-recovery"
							role="status"
							aria-live="polite"
						>
							<strong>
								В выбранной папке не видно старой базы или снимков
							</strong>
							<span>
								Обычно помогает выбрать корень выше: весь диск, папку старой
								программы, папку снимков, архив выгрузки или сетевой экспорт.
							</span>
							<div className="migration-source-card-actions">
								<button
									className="secondary-button"
									type="button"
									onClick={() => void pickBrowserMigrationSource()}
									disabled={
										isBrowserMigrationScanning || isMigrationAutopilotLoading
									}
								>
									<Database aria-hidden="true" /> Выбрать другую папку
								</button>
								<button
									className="secondary-button"
									type="button"
									onClick={() => void discoverMigrationSources()}
									disabled={
										isMigrationSourceDiscovering || isMigrationAutopilotLoading
									}
								>
									<ScanSearch aria-hidden="true" /> Найти на ПК
								</button>
								<button
									className="secondary-button"
									type="button"
									onClick={focusSmartImportWorkbench}
								>
									<FileText aria-hidden="true" /> Вставить выгрузку
								</button>
							</div>
						</div>
					) : null}
					{(typedBrowserMigrationDiscovery?.warnings ?? [])
						.slice(0, 4)
						.map((warning) => (
							<small key={warning}>{humanizeMigrationText(warning)}</small>
						))}
				</section>
    );
}
