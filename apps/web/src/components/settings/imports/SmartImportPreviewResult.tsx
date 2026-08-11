import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image , ExternalLink } from "lucide-react";
import { MigrationEntityStats } from "../MigrationEntityStats";

export function SmartImportPreviewResult(props: any) {
    const { smartImportCommit,
        smartImportMigrationPlanStatusLabels,
        migrationSourceKindLabel,
        migrationAutomationLevelLabels,
        humanizeMigrationList,
        clinicPublicLookupFieldLabels,
        clinicPublicLookupWarningText,
        smartImportLineKindLabels,
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
        <div className="import-preview">
					<MigrationEntityStats
						totalLines={typedSmartImportPreview.totalLines}
						patientRows={typedSmartImportPreview.patientPreview.totalRows}
						imagingRows={typedSmartImportPreview.imagingPreview.totalRows}
						clinicFields={
							typedSmartImportPreview.clinicSuggestion
								? Object.keys(
										typedSmartImportPreview.clinicSuggestion?.fields ?? {},
									).length
								: 0
						}
					/>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitSmartImport}
							disabled={
								isSmartImportCommitting ||
								!smartImportInputReady ||
								((typedSmartImportPreview?.patientPreview?.readyRows ?? 0) ===
									0 &&
									(typedSmartImportPreview?.imagingPreview?.readyRows ?? 0) ===
										0)
							}
							aria-busy={isSmartImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isSmartImportCommitting ? "Записываю" : "Записать готовые"}
						</button>
						{smartImportCommit ? (
							<span>
								Пациенты: {smartImportCommit.patientCommit?.importedCount ?? 0}.
								Снимки: {smartImportCommit.imagingCommit?.importedCount ?? 0}.
							</span>
						) : (
							<span>
								Применение сначала создаст новых пациентов, затем заново
								привяжет готовые снимки. Реквизиты клиники только
								подсказываются.
							</span>
						)}
					</div>
					{typedSmartImportPreview?.migrationPlan ? (
						<div className="import-rows">
							{(typedSmartImportPreview.migrationPlan?.steps ?? []).map(
								(step) => (
									<article
										className={`import-row import-${step?.status === "blocked" ? "blocked" : step?.status === "ready" ? "ready" : "warning"}`}
										key={step?.id ?? Math.random()}
									>
										<strong>{step?.title}</strong>
										<span>
											{smartImportMigrationPlanStatusLabels[step?.status] ??
												humanizeMigrationText(step?.status)}
										</span>
										<span>{step?.detail}</span>
										<p>{humanizeMigrationText(step?.nextAction)}</p>
									</article>
								),
							)}
						</div>
					) : null}
					{(typedSmartImportPreview?.legacySources ?? []).length ? (
						<div className="import-rows">
							{(typedSmartImportPreview.legacySources ?? []).map(
								(source, index) => (
									<article
										className={`import-row import-${source?.automationLevel === "ready_for_preview" ? "ready" : source?.automationLevel === "manual_review" ? "blocked" : "warning"}`}
										key={`source-${source?.kind}-${source?.sourceRef ?? index}`}
									>
										<strong>
											{source?.title} ·{" "}
											{Math.round((source?.confidence ?? 0) * 100)}%
										</strong>
										<span>
											{migrationSourceKindLabel(source?.kind ?? "")} ·{" "}
											{migrationAutomationLevelLabels[
												source?.automationLevel ?? ""
											] ?? humanizeMigrationText(source?.automationLevel)}
										</span>
										{source?.safeSourceAlias ? (
											<span>{source.safeSourceAlias}</span>
										) : null}
										<p>{humanizeMigrationText(source?.recommendedRoute)}</p>
										<p>
											Нужно: {humanizeMigrationList(source?.requiredArtifacts)}
										</p>
										{renderMigrationTechnicalNotes(
											"Технические границы источника",
											[source?.privacy ?? ""],
											"smart-import-legacy-source-privacy-notes",
										)}
									</article>
								),
							)}
						</div>
					) : null}
					{typedSmartImportPreview?.clinicSuggestion ? (
						<div className="import-rows">
							<article className="import-row import-warning">
								<strong>
									Профиль клиники ·{" "}
									{Math.round(
										(typedSmartImportPreview.clinicSuggestion?.confidence ??
											0) * 100,
									)}
									%
								</strong>
								<span>
									Строки:{" "}
									{(
										typedSmartImportPreview.clinicSuggestion
											?.sourceLineNumbers ?? []
									).join(", ")}
								</span>
								<p>
									{clinicLookupSuggestionFieldEntries(
										typedSmartImportPreview.clinicSuggestion?.fields ?? {},
									)
										.map(
											([key, value]) =>
												`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value ?? "").trim()}`,
										)
										.join(" · ")}
								</p>
								<small className="clinic-public-apply-summary">
									{clinicLookupSuggestionApplySummary(
										typedSmartImportPreview.clinicSuggestion?.fields ?? {},
									)}
								</small>
								{(typedSmartImportPreview.clinicSuggestion?.warnings ?? [])
									.slice(0, 2)
									.map((warning: string) => (
										<small key={warning}>
											{clinicPublicLookupWarningText(warning)}
										</small>
									))}
								<button
									className="text-button"
									type="button"
									data-testid="apply-smart-import-clinic-profile"
									disabled={
										!clinicLookupSuggestionFieldEntries(
											typedSmartImportPreview.clinicSuggestion?.fields ?? {},
										).length
									}
									onClick={() =>
										applyClinicLookupSuggestion(
											typedSmartImportPreview.clinicSuggestion?.fields ?? {},
										)
									}
								>
									Подставить в профиль
								</button>
								<div className="clinic-public-save-row">
									<button
										className="secondary-button"
										type="button"
										data-testid="save-smart-import-clinic-profile"
										disabled={clinicProfileSaveState === "saving"}
										aria-busy={clinicProfileSaveState === "saving" || undefined}
										onClick={() => void saveClinicProfileFromDraft()}
									>
										<ShieldCheck aria-hidden="true" />{" "}
										{clinicProfileSaveButtonText}
									</button>
									<small>
										Подстановка меняет черновик. Для документов и оплат
										сохраните профиль клиники.
									</small>
								</div>
							</article>
							{(typedSmartImportPreview?.publicLookupTargets ?? []).map(
								(target) => (
									<article
										className="import-row import-warning"
										key={`${target?.kind}:${target?.url}`}
									>
										<strong>{target?.title}</strong>
										<span>{target?.privacy}</span>
										<p>{humanizeMigrationText(target?.nextAction)}</p>
										<a
											className="text-button"
											href={target?.url}
											target="_blank"
											rel="noreferrer noopener"
											aria-label={`Открыть публичный источник в новой вкладке: ${target?.title}`}
											title={`Открыть публичный источник в новой вкладке: ${target?.title}`}
										>
											<ExternalLink aria-hidden="true" /> Открыть
										</a>
									</article>
								),
							)}
						</div>
					) : null}
					<div className="import-rows">
						{(typedSmartImportPreview?.lineClassifications ?? []).map((row) => (
							<article
								className={`import-row import-${row?.kind === "ignored" ? "warning" : "ready"}`}
								key={row?.lineNumber ?? Math.random()}
							>
								<strong>
									{smartImportLineKindLabels[row?.kind] ?? row?.kind} ·{" "}
									{Math.round((row?.confidence ?? 0) * 100)}%
								</strong>
								<span>Строка {row?.lineNumber}</span>
								<span>{row?.reason}</span>
								<p>{row?.text}</p>
							</article>
						))}
					</div>
				</div>
    );
}
