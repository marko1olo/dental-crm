import React from "react";
import type {
	ClinicPublicLookupResponse,
	MigrationLocalSourceProbeResponse,
	SmartImportPreviewResponse,
} from "@dental/shared";
import {
	CheckCircle2,
	ExternalLink,
	ShieldCheck,
} from "lucide-react";
import {
	clinicPublicLookupBoundaryText,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupProviderStatusLabels,
	clinicPublicLookupSuggestionSourceLabels,
	migrationAdapterStatusLabels,
	migrationAutomationLevelLabels,
	migrationBridgeKitKindLabels,
	migrationBridgeKitStatusLabels,
	migrationOwnerLabels,
	migrationReadinessLevelLabels,
	smartImportLineKindLabels,
	smartImportMigrationPlanStatusLabels,
} from "./constants";
import {
	clinicPublicLookupWarningText,
	humanizeMigrationColumns,
	humanizeMigrationList,
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "./helpers";

export interface MigrationProbeSectionProps {
	typedMigrationSourceProbe:
		| MigrationLocalSourceProbeResponse
		| null
		| undefined;
	typedMigrationProbeReadinessIssues: any[];
	clinicPublicLookup: ClinicPublicLookupResponse | null | undefined;
	typedClinicPublicLookupSuggestions: any[];
	typedClinicPublicLookupTargets: any[];
	typedSmartImportPreview: SmartImportPreviewResponse | null | undefined;
	smartImportCommit: any;
	smartImportInputReady: boolean;
	isSmartImportCommitting: boolean;
	clinicProfileSaveState: string;
	clinicProfileSaveButtonText: string;
	formatByteSize: (bytes: number) => string;
	applyClinicLookupSuggestion: (fields: Record<string, unknown>) => void;
	clinicLookupSuggestionFieldEntries: (
		fields: Record<string, unknown>,
	) => [string, unknown][];
	clinicLookupSuggestionApplySummary: (
		fields: Record<string, unknown>,
	) => string;
	saveClinicProfileFromDraft: () => void;
	commitSmartImport: () => void;
}

export function MigrationProbeSection({
	typedMigrationSourceProbe,
	typedMigrationProbeReadinessIssues,
	clinicPublicLookup,
	typedClinicPublicLookupSuggestions,
	typedClinicPublicLookupTargets,
	typedSmartImportPreview,
	smartImportCommit,
	smartImportInputReady,
	isSmartImportCommitting,
	clinicProfileSaveState,
	clinicProfileSaveButtonText,
	formatByteSize,
	applyClinicLookupSuggestion,
	clinicLookupSuggestionFieldEntries,
	clinicLookupSuggestionApplySummary,
	saveClinicProfileFromDraft,
	commitSmartImport,
}: MigrationProbeSectionProps) {
	const renderMigrationTechnicalNotes = (
		title: string,
		items: string[],
		testId?: string,
	) => {
		const visibleItems = items.filter(Boolean).slice(0, 8);
		if (!visibleItems.length) return null;

		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>
					{visibleItems.map((item) => (
						<small key={item}>{humanizeMigrationText(item)}</small>
					))}
				</div>
			</details>
		);
	};

	return (
		<>
			{typedMigrationSourceProbe ? (
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
								·{" "}
								{Math.round(
									typedMigrationSourceProbe.readiness.score * 100,
								)}
								%
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
			) : null}

			{clinicPublicLookup ? (
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
								humanizeMigrationText(
									clinicPublicLookup.providerStatus,
								)}{" "}
							· {clinicPublicLookup.safeQuery || "без запроса"}
						</strong>
						<span>
							{humanizeMigrationText(clinicPublicLookup.nextAction)}
						</span>
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
			) : null}

			{typedSmartImportPreview ? (
				<div className="import-preview">
					<div className="import-stats">
						<span>{typedSmartImportPreview.totalLines} строк</span>
						<span>
							{typedSmartImportPreview.patientPreview.totalRows} пациентов
						</span>
						<span>
							{typedSmartImportPreview.imagingPreview.totalRows} снимков
						</span>
						<span>
							{typedSmartImportPreview.clinicSuggestion
								? Object.keys(
										typedSmartImportPreview.clinicSuggestion?.fields ?? {},
									).length
								: 0}{" "}
							реквизитов
						</span>
						<span>
							{(typedSmartImportPreview?.legacySources ?? []).length} источников
						</span>
						<span>
							{
								(typedSmartImportPreview?.lineClassifications ?? []).filter(
									(row) => row?.kind === "ignored",
								).length
							}{" "}
							пропущено
						</span>
					</div>
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
								(step, idx) => (
									<article
										className={`import-row import-${step?.status === "blocked" ? "blocked" : step?.status === "ready" ? "ready" : "warning"}`}
										key={step?.id ?? `plan-step-${idx}`}
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
						{(typedSmartImportPreview?.lineClassifications ?? []).map(
							(row, idx) => (
								<article
									className={`import-row import-${row?.kind === "ignored" ? "warning" : "ready"}`}
									key={row?.lineNumber ?? `class-line-${idx}`}
								>
									<strong>
										{smartImportLineKindLabels[row?.kind] ?? row?.kind} ·{" "}
										{Math.round((row?.confidence ?? 0) * 100)}%
									</strong>
									<span>Строка {row?.lineNumber}</span>
									<span>{row?.reason}</span>
									<p>{row?.text}</p>
								</article>
							),
						)}
					</div>
				</div>
			) : null}
		</>
	);
}
