import React from "react";
import type { SmartImportPreviewResponse } from "@dental/shared";
import { ExternalLink, ShieldCheck } from "lucide-react";
import {
	clinicPublicLookupFieldLabels,
	migrationAutomationLevelLabels,
	smartImportLineKindLabels,
} from "../constants";
import {
	clinicPublicLookupWarningText,
	humanizeMigrationList,
	humanizeMigrationText,
	migrationSourceKindLabel,
} from "../helpers";
import { MigrationTechnicalNotes } from "./MigrationTechnicalNotes";

export interface MigrationProbeSmartImportDetailsProps {
	preview: SmartImportPreviewResponse;
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

export function MigrationProbeSmartImportDetails({
	preview,
	clinicProfileSaveState,
	clinicProfileSaveButtonText,
	applyClinicLookupSuggestion,
	clinicLookupSuggestionFieldEntries,
	clinicLookupSuggestionApplySummary,
	saveClinicProfileFromDraft,
}: MigrationProbeSmartImportDetailsProps) {
	return (
		<>
			{(preview.legacySources ?? []).length ? (
				<div className="import-rows">
					{(preview.legacySources ?? []).map((source, index) => (
						<article
							className={`import-row import-${source?.automationLevel === "ready_for_preview" ? "ready" : source?.automationLevel === "manual_review" ? "blocked" : "warning"}`}
							key={`source-${source?.kind}-${source?.sourceRef ?? index}`}
						>
							<strong>
								{source?.title} · {Math.round((source?.confidence ?? 0) * 100)}%
							</strong>
							<span>
								{migrationSourceKindLabel(source?.kind ?? "")} ·{" "}
								{migrationAutomationLevelLabels[source?.automationLevel ?? ""] ?? humanizeMigrationText(source?.automationLevel)}
							</span>
							{source?.safeSourceAlias ? <span>{source.safeSourceAlias}</span> : null}
							<p>{humanizeMigrationText(source?.recommendedRoute)}</p>
							<p>Нужно: {humanizeMigrationList(source?.requiredArtifacts)}</p>
							<MigrationTechnicalNotes
								title="Технические границы источника"
								items={[source?.privacy ?? ""]}
								testId="smart-import-legacy-source-privacy-notes"
							/>
						</article>
					))}
				</div>
			) : null}
			{preview.clinicSuggestion ? (
				<div className="import-rows">
					<article className="import-row import-warning">
						<strong>Профиль клиники · {Math.round((preview.clinicSuggestion?.confidence ?? 0) * 100)}%</strong>
						<span>Строки: {(preview.clinicSuggestion?.sourceLineNumbers ?? []).join(", ")}</span>
						<p>
							{clinicLookupSuggestionFieldEntries(preview.clinicSuggestion?.fields ?? {})
								.map(([key, value]) => `${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value ?? "").trim()}`)
								.join(" · ")}
						</p>
						<small className="clinic-public-apply-summary">
							{clinicLookupSuggestionApplySummary(preview.clinicSuggestion?.fields ?? {})}
						</small>
						{(preview.clinicSuggestion?.warnings ?? []).slice(0, 2).map((warning: string) => (
							<small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
						))}
						<button
							className="text-button"
							type="button"
							data-testid="apply-smart-import-clinic-profile"
							disabled={!clinicLookupSuggestionFieldEntries(preview.clinicSuggestion?.fields ?? {}).length}
							onClick={() => applyClinicLookupSuggestion(preview.clinicSuggestion?.fields ?? {})}
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
								<ShieldCheck aria-hidden="true" /> {clinicProfileSaveButtonText}
							</button>
							<small>Подстановка меняет черновик. Для документов и оплат сохраните профиль клиники.</small>
						</div>
					</article>
					{(preview.publicLookupTargets ?? []).map((target) => (
						<article className="import-row import-warning" key={`${target?.kind}:${target?.url}`}>
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
					))}
				</div>
			) : null}
			<div className="import-rows">
				{(preview.lineClassifications ?? []).map((row, idx) => (
					<article
						className={`import-row import-${row?.kind === "ignored" ? "warning" : "ready"}`}
						key={row?.lineNumber ?? `class-line-${idx}`}
					>
						<strong>
							{smartImportLineKindLabels[row?.kind] ?? row?.kind} · {Math.round((row?.confidence ?? 0) * 100)}%
						</strong>
						<span>Строка {row?.lineNumber}</span>
						<span>{row?.reason}</span>
						<p>{row?.text}</p>
					</article>
				))}
			</div>
		</>
	);
}
