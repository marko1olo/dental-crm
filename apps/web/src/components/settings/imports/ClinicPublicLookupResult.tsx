import { formatDateTime } from "../../../AppHelpers";
import { Database, ShieldCheck, History, Search, HardDrive, Cpu, CheckCircle2, AlertTriangle, Fingerprint, UploadCloud, FileJson, Calendar, Globe, Activity, Stethoscope, Briefcase, Camera, Image , ExternalLink } from "lucide-react";

export function ClinicPublicLookupResult(props: any) {
    const { clinicPublicLookupProviderStatusLabels,
        clinicPublicLookup,
        clinicPublicLookupBoundaryText,
        typedClinicPublicLookupSuggestions,
        clinicPublicLookupSuggestionSourceLabels,
        clinicPublicLookupFieldLabels,
        typedClinicPublicLookupTargets,
        clinicPublicLookupWarningText,
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
					className="clinic-public-lookup-result smart-clinic-public-lookup"
					aria-label="Публичные источники для профиля клиники"
				>
					<div className="dicom-discovery-head">
						<strong>
							Реквизиты клиники:{" "}
							{clinicPublicLookupProviderStatusLabels[
								clinicPublicLookup.providerStatus
							] ??
								humanizeMigrationText(clinicPublicLookup.providerStatus)}{" "}
							· {clinicPublicLookup.safeQuery || "без запроса"}
						</strong>
						<span>{humanizeMigrationText(clinicPublicLookup.nextAction)}</span>
					</div>
					<small className="clinic-public-boundary">
						{clinicPublicLookupBoundaryText}
					</small>
					{clinicPublicLookup.suggestions.length ? (
						<div className="clinic-public-suggestions">
							{typedClinicPublicLookupSuggestions
								.slice(0, 3)
								.map((suggestion, index) => ({
									suggestion,
									suggestionId: `suggestion-${suggestion.source}-${suggestion.confidence}-${index}`,
								}))
								.map(({ suggestion, suggestionId }) => (
									<article key={suggestionId}>
										<strong>
											{clinicPublicLookupSuggestionSourceLabels[
												suggestion.source
											] ?? humanizeMigrationText(suggestion.source)}{" "}
											· {Math.round(suggestion.confidence * 100)}%
										</strong>
										<p>
											{clinicLookupSuggestionFieldEntries(suggestion.fields)
												.map(
													([key, value]) =>
														`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
												)
												.join(" · ")}
										</p>
										<small className="clinic-public-apply-summary">
											{clinicLookupSuggestionApplySummary(suggestion.fields)}
										</small>
										<button
											className="text-button"
											type="button"
											disabled={
												!clinicLookupSuggestionFieldEntries(suggestion.fields)
													.length
											}
											onClick={() =>
												applyClinicLookupSuggestion(suggestion.fields)
											}
										>
											Подставить в профиль
										</button>
									</article>
								))}
						</div>
					) : null}
					<div className="clinic-public-targets">
						{typedClinicPublicLookupTargets.map((target) => (
							<a
								className="secondary-button"
								href={target.url}
								key={`${target.kind}:${target.title}`}
								target="_blank"
								rel="noreferrer noopener"
								aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
								title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
							>
								<ExternalLink aria-hidden="true" /> {target.title}
							</a>
						))}
					</div>
					{clinicPublicLookup.warnings.slice(0, 3).map((warning: string) => (
						<small key={warning}>
							{clinicPublicLookupWarningText(warning)}
						</small>
					))}
					<div className="clinic-public-save-row">
						<button
							className="secondary-button"
							type="button"
							data-testid="save-imports-clinic-profile"
							disabled={clinicProfileSaveState === "saving"}
							aria-busy={clinicProfileSaveState === "saving" || undefined}
							onClick={() => void saveClinicProfileFromDraft()}
						>
							<ShieldCheck aria-hidden="true" /> {clinicProfileSaveButtonText}
						</button>
						<small>
							После подстановки сохраните профиль, иначе реквизиты не попадут в
							документы и платежные формы.
						</small>
					</div>
				</section>
    );
}
