import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image } from "lucide-react";

export function MigrationSourceProbeResult(props: any) {
    const { migrationSourceDisplayName,
        typedMigrationSourceProbe,
        migrationSourceKindLabel,
        migrationReadinessLevelLabels,
        typedMigrationProbeReadinessIssues,
        migrationOwnerLabels,
        migrationBridgeKitKindLabels,
        migrationBridgeKitStatusLabels,
        humanizeMigrationList,
        humanizeMigrationColumns,
        migrationAdapterStatusLabels,
        formatByteSize,
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
					className="dicom-discovery-result migration-source-probe-result"
					data-testid="migration-source-probe-result"
					aria-label="Проверка найденного источника миграции без записи"
				>
					<div className="dicom-discovery-head">
						<strong>
							Проверка источника:{" "}
							{migrationSourceDisplayName(typedMigrationSourceProbe)} ·{" "}
							{migrationSourceKindLabel(typedMigrationSourceProbe.sourceKind)}
						</strong>
						<span>
							{humanizeMigrationText(typedMigrationSourceProbe.sourceLabel)} ·
							папок {typedMigrationSourceProbe.scannedFolders} · файлов{" "}
							{typedMigrationSourceProbe.scannedFiles}
						</span>
						<span>
							{humanizeMigrationText(typedMigrationSourceProbe.nextAction)}
						</span>
						<span>
							{humanizeMigrationText(
								typedMigrationSourceProbe.recommendedRoute,
							)}
						</span>
					</div>
					<section
						className="migration-source-workup-lanes"
						aria-label="Готовность пробы источника к миграции"
					>
						<article>
							<strong>
								Готовность:{" "}
								{migrationReadinessLevelLabels[
									typedMigrationSourceProbe.readiness.level
								] ??
									humanizeMigrationText(
										typedMigrationSourceProbe.readiness.level,
									)}{" "}
								· {Math.round(typedMigrationSourceProbe.readiness.score * 100)}%
							</strong>
							<p>
								{humanizeMigrationText(
									typedMigrationSourceProbe.readiness.nextAction,
								)}
							</p>
							<small>
								Блокеры {typedMigrationSourceProbe.readiness.blockers.length} ·
								предупреждения{" "}
								{typedMigrationSourceProbe.readiness.warnings.length} · готово{" "}
								{typedMigrationSourceProbe.readiness.ready.length}
							</small>
						</article>
						<article>
							<strong>Что мешает</strong>
							{typedMigrationProbeReadinessIssues.slice(0, 3).map((item) => (
								<span key={item.id}>
									{migrationOwnerLabels[item.owner] ??
										humanizeMigrationText(item.owner)}
									: {humanizeMigrationText(item.title)}
								</span>
							))}
						</article>
					</section>
					<section
						className="migration-source-workup-lanes"
						aria-label="План проверки источника миграции"
					>
						<article>
							<strong>
								Маршрут:{" "}
								{migrationBridgeKitKindLabels[
									typedMigrationSourceProbe.bridgeKit.kind
								] ??
									humanizeMigrationText(
										typedMigrationSourceProbe.bridgeKit.kind,
									)}{" "}
								·{" "}
								{migrationBridgeKitStatusLabels[
									typedMigrationSourceProbe.bridgeKit.status
								] ??
									humanizeMigrationText(
										typedMigrationSourceProbe.bridgeKit.status,
									)}
							</strong>
							<p>
								{humanizeMigrationText(
									typedMigrationSourceProbe.bridgeKit.nextAction,
								)}
							</p>
							<small>
								{humanizeMigrationList(
									typedMigrationSourceProbe.bridgeKit.requiredTools,
									4,
								)}
							</small>
						</article>
						<article>
							<strong>Запрещено наружу</strong>
							<span>
								{humanizeMigrationColumns(
									typedMigrationSourceProbe.bridgeKit.outputManifest
										.forbiddenFields,
									4,
								)}
							</span>
							<small>
								{humanizeMigrationText(
									typedMigrationSourceProbe.bridgeKit.privacyBoundary,
								)}
							</small>
						</article>
					</section>
					<div className="migration-source-workup-lanes">
						<article>
							<strong>Инвентарь</strong>
							<p>
								базы {typedMigrationSourceProbe.counts.databases} · резервные
								копии {typedMigrationSourceProbe.counts.dumps} · таблицы{" "}
								{typedMigrationSourceProbe.counts.tables} · архивы{" "}
								{typedMigrationSourceProbe.counts.archives} · КТ/серии{" "}
								{typedMigrationSourceProbe.counts.dicom} · снимки{" "}
								{typedMigrationSourceProbe.counts.images} · 3D{" "}
								{typedMigrationSourceProbe.counts.models}
							</p>
							<small>
								{typedMigrationSourceProbe.detectedVendors.length
									? humanizeMigrationList(
											typedMigrationSourceProbe.detectedVendors,
										)
									: "Программа не распознана"}
							</small>
						</article>
						<article>
							<strong>Сигнатуры</strong>
							<p>
								{humanizeMigrationList(
									typedMigrationSourceProbe.formatSignals,
									8,
								) || "Только имя/расширение, без читаемой сигнатуры"}
							</p>
							<small>
								Пути и похожие на ФИО имена файлов скрыты во внутренние номера.
							</small>
						</article>
					</div>
					<div className="dicom-discovery-grid">
						{typedMigrationSourceProbe.adapters.slice(0, 4).map((adapter) => (
							<article key={adapter.id}>
								<strong>{humanizeMigrationText(adapter.title)}</strong>
								<span>
									{migrationAdapterStatusLabels[adapter.status] ??
										humanizeMigrationText(adapter.status)}{" "}
									· {Math.round(adapter.confidence * 100)}%
								</span>
								<small>{humanizeMigrationText(adapter.input)}</small>
								<small>{humanizeMigrationText(adapter.output)}</small>
								<span>{humanizeMigrationText(adapter.nextAction)}</span>
							</article>
						))}
					</div>
					{typedMigrationSourceProbe.artifactSamples.length ? (
						<section
							className="migration-source-artifact-list"
							aria-label="Безопасные примеры найденных артефактов"
						>
							{typedMigrationSourceProbe.artifactSamples
								.slice(0, 8)
								.map((artifact) => (
									<span key={artifact.id}>
										{artifact.safeName} · {humanizeMigrationText(artifact.kind)}
										{artifact.byteSize !== null
											? ` · ${formatByteSize(artifact.byteSize)}`
											: ""}
									</span>
								))}
						</section>
					) : null}
					{typedMigrationSourceProbe.warnings.slice(0, 4).map((warning) => (
						<small key={warning}>{humanizeMigrationText(warning)}</small>
					))}
					{renderMigrationTechnicalNotes(
						"Технические границы пробы",
						typedMigrationSourceProbe.privacyWarnings,
						"migration-source-probe-privacy-notes",
					)}
				</section>
    );
}
