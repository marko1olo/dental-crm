import React from "react";
import type {
	ClinicPublicLookupResponse,
	ClinicPublicLookupSuggestion,
	SmartImportPublicLookupTarget,
} from "@dental/shared";
import { ExternalLink, ShieldCheck } from "lucide-react";
import {
	clinicPublicLookupBoundaryText,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupProviderStatusLabels,
	clinicPublicLookupSuggestionSourceLabels,
} from "../constants";
import {
	clinicPublicLookupWarningText,
	humanizeMigrationText,
} from "../helpers";

export interface MigrationProbeClinicLookupProps {
	clinicPublicLookup: ClinicPublicLookupResponse;
	suggestions: ClinicPublicLookupSuggestion[];
	targets: SmartImportPublicLookupTarget[];
	clinicProfileSaveState: string;
	clinicProfileSaveButtonText: string;
	applyClinicLookupSuggestion: (fields: Record<string, unknown>) => void;
	clinicLookupSuggestionFieldEntries: (
		fields: Record<string, unknown>,
	) => [string, unknown][];
	clinicLookupSuggestionApplySummary: (
		fields: Record<string, unknown>,
	) => string;
	saveClinicProfileFromDraft: () => void;
}

export function MigrationProbeClinicLookup({
	clinicPublicLookup,
	suggestions,
	targets,
	clinicProfileSaveState,
	clinicProfileSaveButtonText,
	applyClinicLookupSuggestion,
	clinicLookupSuggestionFieldEntries,
	clinicLookupSuggestionApplySummary,
	saveClinicProfileFromDraft,
}: MigrationProbeClinicLookupProps) {
	return (
		<section
			className="clinic-public-lookup-result smart-clinic-public-lookup"
			aria-label="Публичные источники для профиля клиники"
		>
			<div className="dicom-discovery-head">
				<strong>
					Реквизиты клиники:{" "}
					{clinicPublicLookupProviderStatusLabels[clinicPublicLookup.providerStatus] ??
						humanizeMigrationText(clinicPublicLookup.providerStatus)}{" "}
					· {clinicPublicLookup.safeQuery || "без запроса"}
				</strong>
				<span>{humanizeMigrationText(clinicPublicLookup.nextAction)}</span>
			</div>
			<small className="clinic-public-boundary">{clinicPublicLookupBoundaryText}</small>
			{clinicPublicLookup.suggestions.length ? (
				<div className="clinic-public-suggestions">
					{suggestions.slice(0, 3).map((suggestion, index) => {
						const suggestionId = `suggestion-${suggestion.source}-${suggestion.confidence}-${index}`;
						const fieldEntries = clinicLookupSuggestionFieldEntries(suggestion.fields);
						return (
							<article key={suggestionId}>
								<strong>
									{clinicPublicLookupSuggestionSourceLabels[suggestion.source] ??
										humanizeMigrationText(suggestion.source)}{" "}
									· {Math.round(suggestion.confidence * 100)}%
								</strong>
								<p>
									{fieldEntries
										.map(([key, value]) => `${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`)
										.join(" · ")}
								</p>
								<small className="clinic-public-apply-summary">
									{clinicLookupSuggestionApplySummary(suggestion.fields)}
								</small>
								<button
									className="text-button"
									type="button"
									disabled={!fieldEntries.length}
									onClick={() => applyClinicLookupSuggestion(suggestion.fields)}
								>
									Подставить в профиль
								</button>
							</article>
						);
					})}
				</div>
			) : null}
			<div className="clinic-public-targets">
				{targets.map((target) => (
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
				<small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
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
					После подстановки сохраните профиль, иначе реквизиты не попадут в документы и платежные формы.
				</small>
			</div>
		</section>
	);
}
