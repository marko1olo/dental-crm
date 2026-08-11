import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image , ScanSearch } from "lucide-react";

export function MigrationKickstartPanel(props: any) {
    const { migrationAutopilot,
        migrationProgressItems,
        migrationSourceDiscovery,
        discoverMigrationSources,
        isMigrationSourceDiscovering,
        isMigrationAutopilotLoading,
        typedBrowserMigrationDiscovery,
        browserDirectoryPickerAvailable,
        pickBrowserMigrationSource,
        isBrowserMigrationScanning,
        cancelBrowserMigrationScan,
        CircleStop,
        runMigrationAutopilot,
        activeMigrationDiscoveryForSettingsAutopilot,
        Sparkles,
        previewSmartImport,
        isSmartImportLoading,
        lookupClinicPublicProfile,
        isClinicPublicLookupLoading,
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
				className="migration-kickstart-panel"
				data-testid="migration-kickstart-panel"
				aria-label="Быстрый перенос старой базы"
			>
				<div>
					<strong>Быстрый перенос без ручного поиска</strong>
					<span>
						{migrationAutopilot
							? `План готов: источников ${(migrationAutopilot?.sources ?? []).length}, следующий шаг уже показан ниже.`
							: "Выберите самый простой вход: поиск на ПК, папка старой программы, вставленная выгрузка или реквизиты клиники."}
					</span>
				</div>
				<section
					className="migration-progress-strip"
					data-testid="migration-progress-strip"
					aria-label="Готовность переноса"
				>
					{(migrationProgressItems ?? []).map((item) => (
						<article
							className={`migration-progress-step status-${item?.status}`}
							key={item?.id ?? Math.random()}
						>
							<strong>{item?.title}</strong>
							<span>{item?.detail}</span>
						</article>
					))}
				</section>
				<div className="migration-kickstart-grid">
					<article>
						<strong>Старая программа на этом ПК</strong>
						<span>
							{migrationSourceDiscovery
								? `Найдено ${(migrationSourceDiscovery?.candidates ?? []).length}, папок проверено ${migrationSourceDiscovery?.scannedFolders ?? 0}.`
								: "CRM сам ищет старые базы, выгрузки, снимки и следы стоматологических программ."}
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={() => void discoverMigrationSources()}
							disabled={
								isMigrationSourceDiscovering || isMigrationAutopilotLoading
							}
							data-testid="discover-migration-sources"
						>
							<ScanSearch aria-hidden="true" />{" "}
							{isMigrationSourceDiscovering
								? "Ищу источники"
								: isMigrationAutopilotLoading
									? "Строю план"
									: "Найти на ПК + план"}
						</button>
					</article>
					<article>
						<strong>Папка, диск или архив</strong>
						<span>
							{typedBrowserMigrationDiscovery
								? `Выбрано ${(typedBrowserMigrationDiscovery?.candidates ?? []).length} источников, файлов ${(typedBrowserMigrationDiscovery?.candidates ?? []).reduce((sum, candidate) => sum + (candidate?.matchedFiles ?? 0), 0)}.`
								: browserDirectoryPickerAvailable
									? "Админ выбирает папку старой МИС, диск выгрузки, КТ/снимки или архив снимков."
									: "Если браузер не дает выбрать папку, можно выбрать файлы старой МИС и снимков."}
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={() => void pickBrowserMigrationSource()}
							disabled={
								isBrowserMigrationScanning || isMigrationAutopilotLoading
							}
							data-testid="pick-browser-migration-source"
						>
							<Database aria-hidden="true" />{" "}
							{isBrowserMigrationScanning
								? "Сканирую папку"
								: isMigrationAutopilotLoading
									? "Строю план"
									: "Папка/диск + план"}
						</button>
						{isBrowserMigrationScanning && browserMigrationScanProgress ? (
							<button
								className="secondary-button browser-scan-stop-button"
								type="button"
								data-testid="browser-cancel-migration-source-scan"
								onClick={cancelBrowserMigrationScan}
							>
								<CircleStop aria-hidden="true" /> Остановить
							</button>
						) : null}
					</article>
					<article>
						<strong>Текст, Excel, OCR, диктовка</strong>
						<span>
							{smartImportInputReady
								? "Можно построить план по вставленной выгрузке или сразу открыть предпросмотр строк."
								: "Сначала вставьте экспорт, таблицу, OCR или текст из старой программы в поле ниже."}
						</span>
						<div className="migration-source-card-actions">
							<button
								className="primary-button"
								type="button"
								onClick={() =>
									void runMigrationAutopilot(
										activeMigrationDiscoveryForSettingsAutopilot,
										{ includeSmartImportText: smartImportInputReady },
									)
								}
								disabled={isMigrationAutopilotLoading}
								data-testid="run-migration-autopilot"
							>
								<Sparkles aria-hidden="true" />{" "}
								{isMigrationAutopilotLoading ? "Строю автоплан" : "Автоплан"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={previewSmartImport}
								disabled={isSmartImportLoading || !smartImportInputReady}
								aria-busy={isSmartImportLoading || undefined}
							>
								<UploadCloud aria-hidden="true" />{" "}
								{isSmartImportLoading ? "Разбираю" : "Разобрать"}
							</button>
						</div>
					</article>
					<article>
						<strong>Реквизиты клиники</strong>
						<span>
							Поиск по ИНН, названию, адресу и лицензии помогает заполнить
							профиль клиники без ручного копания.
						</span>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void lookupClinicPublicProfile()}
							disabled={isClinicPublicLookupLoading}
							data-testid="lookup-clinic-public-profile"
						>
							<Search aria-hidden="true" />{" "}
							{isClinicPublicLookupLoading
								? "Ищу реквизиты"
								: "Найти реквизиты"}
						</button>
					</article>
				</div>
			</section>
    );
}
