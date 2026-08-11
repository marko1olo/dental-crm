import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image } from "lucide-react";

export function MigrationSourceWorkupResult(props: any) {
    const { migrationSourceDisplayName,
        typedMigrationSourceWorkup,
        migrationSourceKindLabel,
        migrationAutomationLevelLabels,
        migrationReadinessLevelLabels,
        typedMigrationWorkupReadinessIssues,
        migrationOwnerLabels,
        migrationBridgeKitKindLabels,
        migrationBridgeKitStatusLabels,
        humanizeMigrationList,
        humanizeMigrationColumns,
        migrationEntityLabels,
        migrationHandoffRouteLabel,
        migrationWorkupStepStatusLabels,
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
					className="dicom-discovery-result migration-source-workup-result"
					data-testid="migration-source-workup-result"
					aria-label="План миграции найденного источника"
				>
					<div className="dicom-discovery-head">
						<strong>
							План переноса:{" "}
							{migrationSourceDisplayName(typedMigrationSourceWorkup)} ·{" "}
							{migrationSourceKindLabel(typedMigrationSourceWorkup.sourceKind)}
						</strong>
						<span>
							{humanizeMigrationText(typedMigrationSourceWorkup.sourceLabel)} ·{" "}
							{typedMigrationSourceWorkup.sourceExists
								? "источник доступен"
								: "источник сейчас не доступен"}{" "}
							·{" "}
							{migrationAutomationLevelLabels[
								typedMigrationSourceWorkup.automationLevel
							] ??
								humanizeMigrationText(
									typedMigrationSourceWorkup.automationLevel,
								)}
						</span>
						<span>
							{humanizeMigrationText(typedMigrationSourceWorkup.nextAction)}
						</span>
						<span>
							{humanizeMigrationText(
								typedMigrationSourceWorkup.recommendedRoute,
							)}
						</span>
					</div>
					<section
						className="migration-source-workup-lanes"
						aria-label="Готовность источника к миграции"
					>
						<article>
							<strong>
								Готовность:{" "}
								{migrationReadinessLevelLabels[
									typedMigrationSourceWorkup.readiness.level
								] ??
									humanizeMigrationText(
										typedMigrationSourceWorkup.readiness.level,
									)}{" "}
								· {Math.round(typedMigrationSourceWorkup.readiness.score * 100)}
								%
							</strong>
							<p>
								{humanizeMigrationText(
									typedMigrationSourceWorkup.readiness.nextAction,
								)}
							</p>
							<small>
								Блокеры {typedMigrationSourceWorkup.readiness.blockers.length} ·
								предупреждения{" "}
								{typedMigrationSourceWorkup.readiness.warnings.length} · готово{" "}
								{typedMigrationSourceWorkup.readiness.ready.length}
							</small>
						</article>
						<article>
							<strong>Что мешает</strong>
							{typedMigrationWorkupReadinessIssues.slice(0, 3).map((item) => (
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
						aria-label="План подключения источника миграции"
					>
						<article>
							<strong>
								Маршрут:{" "}
								{migrationBridgeKitKindLabels[
									typedMigrationSourceWorkup.bridgeKit.kind
								] ??
									humanizeMigrationText(
										typedMigrationSourceWorkup.bridgeKit.kind,
									)}{" "}
								·{" "}
								{migrationBridgeKitStatusLabels[
									typedMigrationSourceWorkup.bridgeKit.status
								] ??
									humanizeMigrationText(
										typedMigrationSourceWorkup.bridgeKit.status,
									)}
							</strong>
							<p>
								{humanizeMigrationText(
									typedMigrationSourceWorkup.bridgeKit.nextAction,
								)}
							</p>
							<small>
								{humanizeMigrationList(
									typedMigrationSourceWorkup.bridgeKit.requiredTools,
									4,
								)}
							</small>
						</article>
						<article>
							<strong>Файл для проверки</strong>
							<span>
								{humanizeMigrationText(
									typedMigrationSourceWorkup.bridgeKit.outputManifest.format,
								)}
							</span>
							<small>
								{humanizeMigrationColumns(
									typedMigrationSourceWorkup.bridgeKit.outputManifest
										.requiredColumns,
									5,
								)}
							</small>
						</article>
					</section>
					<div className="migration-source-workup-lanes">
						<article>
							<strong>Что можно вытянуть</strong>
							<p>
								{typedMigrationSourceWorkup.extractableEntities
									.map(
										(entity) =>
											migrationEntityLabels[entity] ??
											humanizeMigrationText(entity),
									)
									.join(" · ")}
							</p>
							<small>
								{humanizeMigrationList(
									typedMigrationSourceWorkup.requiredArtifacts,
								)}
							</small>
						</article>
						<article>
							<strong>Передача в CRM</strong>
							{typedMigrationSourceWorkup.handoffs
								.slice(0, 3)
								.map((handoff) => (
									<span key={`${handoff.method}:${handoff.endpoint}`}>
										{humanizeMigrationText(handoff.title)} ·{" "}
										{migrationHandoffRouteLabel(handoff)}
									</span>
								))}
						</article>
					</div>
					<div className="dicom-discovery-grid">
						{typedMigrationSourceWorkup.steps.map((step) => (
							<article key={step.id}>
								<strong>{step.title}</strong>
								<span>
									{migrationWorkupStepStatusLabels[step.status] ??
										humanizeMigrationText(step.status)}{" "}
									· {humanizeMigrationText(step.actionLabel)}
								</span>
								<small>{humanizeMigrationText(step.detail)}</small>
							</article>
						))}
					</div>
					{typedMigrationSourceWorkup.warnings.slice(0, 4).map((warning) => (
						<small key={warning}>{humanizeMigrationText(warning)}</small>
					))}
					{renderMigrationTechnicalNotes(
						"Технические границы плана",
						typedMigrationSourceWorkup.privacyWarnings,
						"migration-source-workup-privacy-notes",
					)}
				</section>
    );
}
