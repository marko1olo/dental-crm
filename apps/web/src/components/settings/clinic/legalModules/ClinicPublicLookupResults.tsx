import React from "react";
import type { ClinicPublicLookupResponse, ClinicPublicLookupSuggestion } from "@dental/shared";
import type { ClinicLegalProfile } from "./clinicLegalTypes";

interface ClinicPublicLookupResultsProps {
	clinicPublicLookup: ClinicPublicLookupResponse | null | undefined;
	typedSuggestions: ClinicPublicLookupSuggestion[];
	humanizeMigrationText: (txt: string) => string;
	clinicLookupSuggestionFieldEntries: (fields: unknown) => [string, unknown][];
	clinicPublicLookupFieldLabels: Record<string, string>;
	applyClinicLookupSuggestion: (fields: Record<string, unknown> | Partial<ClinicLegalProfile>) => void;
}

export const ClinicPublicLookupResults: React.FC<ClinicPublicLookupResultsProps> = ({
	clinicPublicLookup,
	typedSuggestions,
	humanizeMigrationText,
	clinicLookupSuggestionFieldEntries,
	clinicPublicLookupFieldLabels,
	applyClinicLookupSuggestion,
}) => {
	if (!clinicPublicLookup) return null;

	return (
		<section
			className="clinic-public-lookup-result"
			data-testid="clinic-public-lookup-result"
			aria-label="Публичный поиск реквизитов клиники"
		>
			<div className="dicom-discovery-head">
				<strong>Публичный поиск: {humanizeMigrationText(clinicPublicLookup?.providerStatus ?? "")}</strong>
			</div>
			{typedSuggestions.length > 0 && (
				<div className="clinic-public-suggestions">
					{typedSuggestions.slice(0, 4).map((suggestion: ClinicPublicLookupSuggestion, index: number) => (
						<article key={`${suggestion.source}-${index}`}>
							<strong>{suggestion.source} · {Math.round((suggestion.confidence || 1) * 100)}%</strong>
							<p>
								{clinicLookupSuggestionFieldEntries(suggestion.fields)
									.map(([k, v]) => `${clinicPublicLookupFieldLabels[k] ?? k}: ${String(v).trim()}`)
									.join(" · ")}
							</p>
							<button
								className="secondary-button button-sm text-xs h-7 px-2.5 rounded-lg"
								type="button"
								onClick={() => applyClinicLookupSuggestion(suggestion.fields)}
							>
								Подставить в профиль
							</button>
						</article>
					))}
				</div>
			)}
		</section>
	);
};
