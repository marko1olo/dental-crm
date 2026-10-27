import React from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import {
	clinicPublicLookupBoundaryText,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupProviderStatusLabels,
	clinicPublicLookupSuggestionSourceLabels,
} from "../constants";
import { clinicPublicLookupWarningText, humanizeMigrationText } from "../helpers";

export interface MigrationClinicLookupViewProps {
	clinicLookup: any;
	clinicProfileSaveState: string;
	clinicProfileSaveButtonText: string;
	saveClinicProfileFromDraft: () => void;
	applyClinicLookupSuggestion: (fields: Record<string, unknown>) => void;
	clinicLookupSuggestionFieldEntries: (fields: Record<string, unknown>) => [string, unknown][];
	clinicLookupSuggestionApplySummary: (fields: Record<string, unknown>) => string;
}

export function MigrationClinicLookupView({
	clinicLookup,
	clinicProfileSaveState,
	clinicProfileSaveButtonText,
	saveClinicProfileFromDraft,
	applyClinicLookupSuggestion,
	clinicLookupSuggestionFieldEntries,
	clinicLookupSuggestionApplySummary,
}: MigrationClinicLookupViewProps) {
	if (!clinicLookup) return null;

	return (
		<div className="migration-autopilot-clinic" data-testid="migration-autopilot-clinic">
			<strong>
				Реквизиты клиники: {clinicPublicLookupProviderStatusLabels[clinicLookup.providerStatus] ?? humanizeMigrationText(clinicLookup.providerStatus)} · {clinicLookup.safeQuery || "без запроса"}
			</strong>
			<span>{humanizeMigrationText(clinicLookup.nextAction)}</span>
			<small className="clinic-public-boundary">{clinicPublicLookupBoundaryText}</small>
			<div className="clinic-public-targets">
				{(clinicLookup.publicLookupTargets ?? []).slice(0, 4).map((target: any) => (
					<a className="secondary-button" href={target.url} key={`${target.kind}:${target.title}`} target="_blank" rel="noreferrer noopener" title={target.title}>
						<ExternalLink aria-hidden="true" /> {target.title}
					</a>
				))}
			</div>
			{clinicLookup.suggestions?.length > 0 && (
				<div className="clinic-public-suggestions" data-testid="migration-autopilot-clinic-suggestions">
					{clinicLookup.suggestions.slice(0, 3).map((suggestion: any) => {
						const entries = clinicLookupSuggestionFieldEntries(suggestion.fields);
						return (
							<article key={`${suggestion.source}:${suggestion.confidence}:${suggestion.fields.inn ?? "c"}`}>
								<strong>{suggestion.fields.legalName ?? suggestion.fields.clinicName ?? "Подсказка реквизитов"}</strong>
								<span>{clinicPublicLookupSuggestionSourceLabels[suggestion.source] ?? humanizeMigrationText(suggestion.source)} · {Math.round(suggestion.confidence * 100)}%</span>
								<small>{entries.map(([k, v]) => `${clinicPublicLookupFieldLabels[k] ?? k}: ${String(v).trim()}`).slice(0, 5).join(" · ") || "Нет полей"}</small>
								<small className="clinic-public-apply-summary">{clinicLookupSuggestionApplySummary(suggestion.fields)}</small>
								<button className="text-button" type="button" disabled={!entries.length} onClick={() => applyClinicLookupSuggestion(suggestion.fields)} data-testid="apply-migration-autopilot-clinic-profile">
									Подставить в профиль
								</button>
							</article>
						);
					})}
				</div>
			)}
			{(clinicLookup.warnings ?? []).slice(0, 3).map((w: string) => (
				<small key={w}>{clinicPublicLookupWarningText(w)}</small>
			))}
			<div className="clinic-public-save-row">
				<span>Подстановка меняет черновик. Для документов и оплат сохраните профиль клиники.</span>
				<button className="secondary-button" type="button" onClick={() => void saveClinicProfileFromDraft()} disabled={clinicProfileSaveState === "saving"} data-testid="save-migration-autopilot-clinic-profile">
					<ShieldCheck aria-hidden="true" /> {clinicProfileSaveButtonText}
				</button>
			</div>
		</div>
	);
}
