import React from "react";
import type {
	MigrationAutopilotHandoffChecklistItem,
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
} from "@dental/shared";
import {
	ClipboardCheck,
	ExternalLink,
	FileCheck2,
	ScanSearch,
	ShieldCheck,
	UploadCloud,
} from "lucide-react";
import {
	clinicPublicLookupBoundaryText,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupProviderStatusLabels,
	clinicPublicLookupSuggestionSourceLabels,
	migrationAdapterStatusLabels,
	migrationBridgeKitKindLabels,
	migrationBridgeKitStatusLabels,
	migrationHandoffPhaseLabels,
	migrationOperatorPacketStatusLabels,
	migrationOwnerLabels,
	migrationPriorityLabels,
	migrationReadinessLevelLabels,
} from "./constants";
import {
	clinicPublicLookupWarningText,
	humanizeMigrationColumns,
	humanizeMigrationList,
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "./helpers";
import { MigrationOperatorStepActions } from "./MigrationOperatorStepActions";

export interface MigrationAutopilotSectionProps {
	migrationAutopilot: MigrationAutopilotResponse | null | undefined;
	typedMigrationAutopilotSources: MigrationAutopilotSource[];
	typedMigrationAutopilotClinicLookup: any;
	typedMigrationAutopilotSteps: MigrationAutopilotStep[];
	typedMigrationOperatorLanes: MigrationAutopilotPacketLane[];
	typedMigrationHandoffChecklist: MigrationAutopilotHandoffChecklistItem[];
	migrationDryRunSummary: any;
	migrationTriageItems: any[];
	migrationOperatorScriptSteps: MigrationAutopilotOperatorScriptStep[];
	migrationPrimaryOperatorStep: MigrationAutopilotOperatorScriptStep | null | undefined;
	migrationPrimaryOperatorCandidate:
		| MigrationLocalSourceDiscoveryCandidate
		| null
		| undefined;
	migrationCandidatePreviewReady: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => boolean;
	migrationCandidatePreviewHint: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => string;
	smartImportInputReady: boolean;
	isMigrationAutopilotLoading: boolean;
	isMigrationSourceDiscovering: boolean;
	isBrowserMigrationScanning: boolean;
	isMigrationSourceWorkupLoading: boolean;
	isMigrationSourceProbeLoading: boolean;
	isClinicPublicLookupLoading: boolean;
	isSmartImportLoading: boolean;
	clinicProfileSaveState: string;
	clinicProfileSaveButtonText: string;
	runMigrationAutopilot: (
		candidate?: any,
		options?: { includeSmartImportText?: boolean },
	) => void;
	discoverMigrationSources: () => void;
	pickBrowserMigrationSource: () => void;
	lookupClinicPublicProfile: () => void;
	planMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	probeMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	addMigrationDiscoveryCandidateToSmartImport: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	previewMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	previewMigrationAutopilotSources: (fingerprint?: string) => void;
	saveClinicProfileFromDraft: () => void;
	applyClinicLookupSuggestion: (fields: Record<string, unknown>) => void;
	clinicLookupSuggestionFieldEntries: (
		fields: Record<string, unknown>,
	) => [string, unknown][];
	clinicLookupSuggestionApplySummary: (
		fields: Record<string, unknown>,
	) => string;
}

export function MigrationAutopilotSection({
	migrationAutopilot,
	typedMigrationAutopilotSources,
	typedMigrationAutopilotClinicLookup,
	typedMigrationAutopilotSteps,
	typedMigrationOperatorLanes,
	typedMigrationHandoffChecklist,
	migrationDryRunSummary,
	migrationTriageItems,
	migrationOperatorScriptSteps,
	migrationPrimaryOperatorStep,
	migrationPrimaryOperatorCandidate,
	migrationCandidatePreviewReady,
	migrationCandidatePreviewHint,
	smartImportInputReady,
	isMigrationAutopilotLoading,
	isMigrationSourceDiscovering,
	isBrowserMigrationScanning,
	isMigrationSourceWorkupLoading,
	isMigrationSourceProbeLoading,
	isClinicPublicLookupLoading,
	isSmartImportLoading,
	clinicProfileSaveState,
	clinicProfileSaveButtonText,
	runMigrationAutopilot,
	discoverMigrationSources,
	pickBrowserMigrationSource,
	lookupClinicPublicProfile,
	planMigrationDiscoveryCandidate,
	probeMigrationDiscoveryCandidate,
	addMigrationDiscoveryCandidateToSmartImport,
	previewMigrationDiscoveryCandidate,
	previewMigrationAutopilotSources,
	saveClinicProfileFromDraft,
	applyClinicLookupSuggestion,
	clinicLookupSuggestionFieldEntries,
	clinicLookupSuggestionApplySummary,
}: MigrationAutopilotSectionProps) {
	if (!migrationAutopilot) return null;

	const operatorActionsCommonProps = {
		typedMigrationAutopilotSources,
		migrationCandidatePreviewReady,
		smartImportInputReady,
		isMigrationAutopilotLoading,
		isMigrationSourceDiscovering,
		isBrowserMigrationScanning,
		isMigrationSourceWorkupLoading,
		isMigrationSourceProbeLoading,
		isClinicPublicLookupLoading,
		isSmartImportLoading,
		runMigrationAutopilot,
		discoverMigrationSources,
		pickBrowserMigrationSource,
		lookupClinicPublicProfile,
		planMigrationDiscoveryCandidate,
		probeMigrationDiscoveryCandidate,
		addMigrationDiscoveryCandidateToSmartImport,
		previewMigrationAutopilotSources,
	};

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
		<section
			className="dicom-discovery-result migration-autopilot-result"
			data-testid="migration-autopilot-result"
			aria-label="Автоплан миграции старых баз, снимков и реквизитов клиники"
		>
			<div className="dicom-discovery-head">
				<strong>
					Автоплан миграции: источников{" "}
					{migrationAutopilot.discovery.candidateCount} · проб{" "}
					{migrationAutopilot.discovery.probedCount} · папок{" "}
					{migrationAutopilot.discovery.scannedFolders}
				</strong>
				<span>{humanizeMigrationText(migrationAutopilot.nextAction)}</span>
				<span>
					Дальше работайте сверху вниз: блок «Сейчас», карточки источников,
					затем предпросмотр.
				</span>
			</div>
			{migrationAutopilot.operatorPacket ? (
				<div
					className="migration-autopilot-operator-packet"
					data-testid="migration-autopilot-operator-packet"
				>
					<div className="migration-operator-score">
						<strong>
							Пакет миграции:{" "}
							{migrationOperatorPacketStatusLabels[
								migrationAutopilot.operatorPacket.overallStatus
							] ?? migrationAutopilot.operatorPacket.overallStatus}{" "}
							· {Math.round(migrationAutopilot.operatorPacket.score * 100)}%
						</strong>
						<span>
							базы {migrationAutopilot.operatorPacket.totals.databaseSources} ·
							снимки {migrationAutopilot.operatorPacket.totals.mediaSources} ·
							таблицы {migrationAutopilot.operatorPacket.totals.tableSources} ·
							из текста{" "}
							{
								migrationAutopilot.operatorPacket.totals
									.smartPreviewSources
							}{" "}
							· системные следы{" "}
							{migrationAutopilot.operatorPacket.totals.workstationHints} ·
							публичные ссылки{" "}
							{migrationAutopilot.operatorPacket.totals.publicLookupTargets}
						</span>
					</div>
					{migrationDryRunSummary ? (
						<section
							className="migration-dry-run-summary"
							data-testid="migration-dry-run-summary"
							aria-label="Быстрый прогон миграции"
						>
							<div>
								<strong>Быстрый прогон</strong>
								<span>
									предпросмотр {migrationDryRunSummary.previewableSources} ·
									администратор {migrationDryRunSummary.adminBlockedSources} ·
									врач {migrationDryRunSummary.doctorReviewRequiredSources}
								</span>
							</div>
							<small>
								Оператор ~{migrationDryRunSummary.estimatedOperatorMinutes} мин
								· простой клиники ~
								{migrationDryRunSummary.estimatedClinicDowntimeMinutes} мин
							</small>
							<p>
								{humanizeMigrationText(migrationDryRunSummary.fastestRoute)}
							</p>
							<p>
								{humanizeMigrationText(migrationDryRunSummary.nextBestAction)}
							</p>
						</section>
					) : null}
					{migrationPrimaryOperatorStep ? (
						<section
							className="migration-primary-action"
							data-testid="migration-autopilot-primary-action"
							aria-label="Главное действие миграции сейчас"
						>
							<div>
								<strong>Сейчас: {migrationPrimaryOperatorStep.title}</strong>
								<span>
									{migrationOwnerLabels[migrationPrimaryOperatorStep.owner] ??
										humanizeMigrationText(
											migrationPrimaryOperatorStep.owner,
										)}{" "}
									· {migrationPrimaryOperatorStep.estimatedMinutes} мин ·{" "}
									{migrationPrimaryOperatorStep.blocking
										? "сначала это"
										: "можно параллельно"}
								</span>
								<small>
									{humanizeMigrationText(migrationPrimaryOperatorStep.detail)}
								</small>
							</div>
							<MigrationOperatorStepActions
								step={migrationPrimaryOperatorStep}
								scriptCandidate={migrationPrimaryOperatorCandidate}
								testScope="primary"
								{...operatorActionsCommonProps}
							/>
						</section>
					) : null}
					{migrationTriageItems.length ? (
						<section
							className="migration-triage-queue"
							data-testid="migration-triage-queue"
							aria-label="Короткая очередь миграции для администратора"
						>
							<div className="migration-triage-head">
								<strong>Очередь действий</strong>
								<span>
									Сначала стопоры, затем задачи, которые можно подготовить
									параллельно.
								</span>
							</div>
							<div className="migration-triage-grid">
								{(migrationTriageItems ?? []).map((item, idx) => (
									<div
										className={`migration-triage-item status-${item?.status}`}
										key={item?.id ?? `triage-item-${idx}`}
									>
										<strong>{item?.title}</strong>
										<span>
											{migrationOwnerLabels[item?.owner] ??
												humanizeMigrationText(item?.owner)}{" "}
											·{" "}
											{migrationHandoffPhaseLabels[item?.phase] ??
												humanizeMigrationText(item?.phase)}{" "}
											·{" "}
											{migrationOperatorPacketStatusLabels[item?.status] ??
												humanizeMigrationText(item?.status)}{" "}
											· {item?.blocking ? "сначала это" : "параллельно"}
										</span>
										<small>{humanizeMigrationText(item?.detail)}</small>
										<small>
											Что нужно: {humanizeMigrationText(item?.requiredArtifact)}
										</small>
										<small>
											Готово, когда: {humanizeMigrationText(item?.doneWhen)}
										</small>
									</div>
								))}
							</div>
						</section>
					) : null}
					{migrationAutopilot?.operatorPacket?.operatorScript ? (
						<section
							className="migration-autopilot-script"
							data-testid="migration-autopilot-operator-script"
							aria-label="Что делать сейчас для миграции"
						>
							<div className="dicom-discovery-head">
								<strong>
									{migrationAutopilot.operatorPacket.operatorScript.title} · ~
									{
										migrationAutopilot.operatorPacket.operatorScript
											.totalEstimatedMinutes
									}{" "}
									мин
								</strong>
								<span>
									{migrationAutopilot.operatorPacket.operatorScript.headline}
								</span>
							</div>
							<div className="migration-autopilot-summary">
								{(migrationOperatorScriptSteps ?? [])
									.slice(0, 7)
									.map((step, idx) => {
										const scriptCandidate = step?.sourceFingerprint
											? (typedMigrationAutopilotSources ?? []).find(
													(source) =>
														source?.candidate?.sourceFingerprint ===
														step.sourceFingerprint,
												)?.candidate
											: null;
										return (
											<article key={step?.id ?? `script-step-${idx}`}>
												<strong>{step?.title}</strong>
												<span>
													{migrationOwnerLabels[step?.owner] ??
														humanizeMigrationText(step?.owner)}{" "}
													· {step?.estimatedMinutes} мин ·{" "}
													{step?.blocking ? "обязательно" : "параллельно"}
												</span>
												<small>{humanizeMigrationText(step?.detail)}</small>
												<MigrationOperatorStepActions
													step={step}
													scriptCandidate={scriptCandidate}
													testScope="script"
													{...operatorActionsCommonProps}
												/>
											</article>
										);
									})}
							</div>
						</section>
					) : null}
					<div className="migration-autopilot-summary">
						{(typedMigrationOperatorLanes ?? [])
							.slice(0, 5)
							.map((lane, idx) => (
								<article key={lane?.id ?? `lane-${idx}`}>
									<strong>{lane?.title}</strong>
									<span>
										{migrationOwnerLabels[lane?.owner] ??
											humanizeMigrationText(lane?.owner)}{" "}
										·{" "}
										{migrationOperatorPacketStatusLabels[lane?.status] ??
											humanizeMigrationText(lane?.status)}{" "}
										· {Math.round((lane?.score ?? 0) * 100)}%
									</span>
									<small>{humanizeMigrationText(lane?.detail)}</small>
									<small>{humanizeMigrationText(lane?.nextAction)}</small>
								</article>
							))}
					</div>
					<section
						className="migration-source-artifact-list"
						aria-label="Первые действия миграции"
					>
						{(migrationAutopilot?.operatorPacket?.firstActions ?? [])
							.slice(0, 6)
							.map((action: string) => (
								<span key={action}>{humanizeMigrationText(action)}</span>
							))}
					</section>
					<section
						className="migration-autopilot-summary"
						data-testid="migration-autopilot-handoff-checklist"
						aria-label="Чеклист передачи миграции"
					>
						{(typedMigrationHandoffChecklist ?? [])
							.slice(0, 6)
							.map((item, idx) => (
								<article key={item?.id ?? `handoff-${idx}`}>
									<strong>{item?.title}</strong>
									<span>
										{migrationOwnerLabels[item?.owner] ??
											humanizeMigrationText(item?.owner)}{" "}
										·{" "}
										{migrationHandoffPhaseLabels[item?.phase] ??
											humanizeMigrationText(item?.phase)}{" "}
										·{" "}
										{migrationOperatorPacketStatusLabels[item?.status] ??
											humanizeMigrationText(item?.status)}
									</span>
									<small>{humanizeMigrationText(item?.detail)}</small>
									<small>
										Нужно: {humanizeMigrationText(item?.requiredArtifact)}
									</small>
									<small>{humanizeMigrationText(item?.doneWhen)}</small>
								</article>
							))}
					</section>
					{renderMigrationTechnicalNotes(
						"Границы онлайн-поиска",
						[
							`Онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot?.operatorPacket?.onlineLookupPolicy?.allowed) || "нет доступных публичных полей"}`,
							`Не отправлять в онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot?.operatorPacket?.onlineLookupPolicy?.forbidden, 6)}`,
						],
						"migration-autopilot-technical-boundary",
					)}
				</div>
			) : null}
			<div className="migration-autopilot-summary">
				{(typedMigrationAutopilotSteps ?? []).slice(0, 6).map((step) => (
					<article key={`${step?.order}:${step?.title}`}>
						<strong>
							{step?.order}. {step?.title}
						</strong>
						<span>
							{migrationOwnerLabels[step?.owner] ??
								humanizeMigrationText(step?.owner)}{" "}
							· {step?.blocking ? "обязательно" : "можно параллельно"}
						</span>
						<small>{humanizeMigrationText(step?.detail)}</small>
					</article>
				))}
			</div>
			{(typedMigrationAutopilotSources ?? []).length ? (
				<div className="dicom-discovery-grid">
					{typedMigrationAutopilotSources.slice(0, 6).map((source, index) => {
						const sourceDisplayName = migrationSourceDisplayName(
							source.candidate,
							index,
						);
						return (
							<article key={source.candidate.sourceFingerprint}>
								<strong>{sourceDisplayName}</strong>
								<span>
									{migrationPriorityLabels[source.priority] ??
										humanizeMigrationText(source.priority)}{" "}
									·{" "}
									{migrationOwnerLabels[source.owner] ??
										humanizeMigrationText(source.owner)}{" "}
									· {Math.round(source.score * 100)}%
								</span>
								{source.readiness ? (
									<small>
										Готовность:{" "}
										{migrationReadinessLevelLabels[source.readiness.level] ??
											humanizeMigrationText(source.readiness.level)}{" "}
										· {Math.round(source.readiness.score * 100)}% · блокеров{" "}
										{source.readiness.blockers.length}
									</small>
								) : null}
								{source.bridgeKit ? (
									<small>
										Маршрут:{" "}
										{migrationBridgeKitKindLabels[source.bridgeKit.kind] ??
											humanizeMigrationText(source.bridgeKit.kind)}{" "}
										·{" "}
										{migrationBridgeKitStatusLabels[source.bridgeKit.status] ??
											humanizeMigrationText(source.bridgeKit.status)}{" "}
										· {humanizeMigrationList(source.bridgeKit.requiredTools, 2)}
									</small>
								) : null}
								<small>
									{migrationSourceKindLabel(source.candidate.sourceKind)} ·
									источник {index + 1} · файлов {source.candidate.matchedFiles}
								</small>
								{source.probe ? (
									<small>
										Проверено: базы {source.probe.counts.databases} · КТ/серий{" "}
										{source.probe.counts.dicom} · снимков{" "}
										{source.probe.counts.images} · таблиц{" "}
										{source.probe.counts.tables}
									</small>
								) : (
									<small>Источник еще не проверяли детально.</small>
								)}
								<span>{humanizeMigrationText(source.recommendedAction)}</span>
								{source.riskFlags.slice(0, 4).map((flag: string) => (
									<small key={flag}>{humanizeMigrationText(flag)}</small>
								))}
								{source.readiness?.blockers.slice(0, 2).map((item) => (
									<small key={item.id}>
										{migrationOwnerLabels[item.owner] ??
											humanizeMigrationText(item.owner)}
										: {humanizeMigrationText(item.title)} ·{" "}
										{humanizeMigrationText(item.nextAction)}
									</small>
								))}
								{source.probe?.adapters.slice(0, 2).map((adapter) => (
									<small key={adapter.id}>
										{humanizeMigrationText(adapter.title)}:{" "}
										{migrationAdapterStatusLabels[adapter.status] ??
											humanizeMigrationText(adapter.status)}{" "}
										· {Math.round(adapter.confidence * 100)}%
									</small>
								))}
								<div className="migration-source-card-actions">
									<button
										className="text-button"
										type="button"
										onClick={() =>
											planMigrationDiscoveryCandidate(source.candidate)
										}
										disabled={isMigrationSourceWorkupLoading}
										aria-label={`Открыть план переноса: ${sourceDisplayName}`}
									>
										<ClipboardCheck aria-hidden="true" /> План переноса
									</button>
									<button
										className="text-button"
										type="button"
										onClick={() =>
											probeMigrationDiscoveryCandidate(source.candidate)
										}
										disabled={isMigrationSourceProbeLoading}
										aria-label={`Проверить источник: ${sourceDisplayName}`}
									>
										<ScanSearch aria-hidden="true" /> Проверить источник
									</button>
									<button
										className="text-button"
										type="button"
										onClick={() =>
											addMigrationDiscoveryCandidateToSmartImport(
												source.candidate,
											)
										}
										aria-label={`Отправить источник в разбор: ${sourceDisplayName}`}
									>
										<UploadCloud aria-hidden="true" /> Отправить в разбор
									</button>
									<button
										className="text-button"
										type="button"
										onClick={() =>
											void previewMigrationDiscoveryCandidate(source.candidate)
										}
										disabled={
											isSmartImportLoading ||
											!migrationCandidatePreviewReady(source.candidate)
										}
										title={migrationCandidatePreviewHint(source.candidate)}
										aria-label={`Построить предпросмотр: ${sourceDisplayName}`}
									>
										<FileCheck2 aria-hidden="true" /> Предпросмотр
									</button>
									{!migrationCandidatePreviewReady(source.candidate) ? (
										<small className="migration-action-hint">
											{migrationCandidatePreviewHint(source.candidate)}
										</small>
									) : null}
								</div>
							</article>
						);
					})}
				</div>
			) : null}
			{typedMigrationAutopilotClinicLookup ? (
				<div className="migration-autopilot-clinic">
					<strong>
						Реквизиты клиники:{" "}
						{clinicPublicLookupProviderStatusLabels[
							typedMigrationAutopilotClinicLookup.providerStatus
						] ??
							humanizeMigrationText(
								typedMigrationAutopilotClinicLookup.providerStatus,
							)}{" "}
						· {typedMigrationAutopilotClinicLookup.safeQuery || "без запроса"}
					</strong>
					<span>
						{humanizeMigrationText(
							typedMigrationAutopilotClinicLookup.nextAction,
						)}
					</span>
					<small className="clinic-public-boundary">
						{clinicPublicLookupBoundaryText}
					</small>
					<div className="clinic-public-targets">
						{typedMigrationAutopilotClinicLookup.publicLookupTargets
							.slice(0, 4)
							.map((target: any) => (
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
					{typedMigrationAutopilotClinicLookup.suggestions.length ? (
						<div
							className="clinic-public-suggestions"
							data-testid="migration-autopilot-clinic-suggestions"
						>
							{typedMigrationAutopilotClinicLookup.suggestions
								.slice(0, 3)
								.map((suggestion: any) => (
									<article
										key={`${suggestion.source}:${suggestion.confidence}:${suggestion.fields.inn ?? suggestion.fields.clinicName ?? "clinic"}`}
									>
										<strong>
											{suggestion.fields.legalName ??
												suggestion.fields.clinicName ??
												"Подсказка реквизитов"}
										</strong>
										<span>
											{clinicPublicLookupSuggestionSourceLabels[
												suggestion.source
											] ?? humanizeMigrationText(suggestion.source)}{" "}
											· {Math.round(suggestion.confidence * 100)}%
										</span>
										<small>
											{clinicLookupSuggestionFieldEntries(suggestion.fields)
												.map(
													([key, value]) =>
														`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
												)
												.slice(0, 5)
												.join(" · ") || "Нет применимых полей"}
										</small>
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
											data-testid="apply-migration-autopilot-clinic-profile"
										>
											Подставить в профиль
										</button>
									</article>
								))}
						</div>
					) : null}
					{typedMigrationAutopilotClinicLookup.warnings
						.slice(0, 3)
						.map((warning: string) => (
							<small key={warning}>
								{clinicPublicLookupWarningText(warning)}
							</small>
						))}
					<div className="clinic-public-save-row">
						<span>
							Подстановка меняет черновик. Для документов и оплат сохраните
							профиль клиники.
						</span>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void saveClinicProfileFromDraft()}
							disabled={clinicProfileSaveState === "saving"}
							data-testid="save-migration-autopilot-clinic-profile"
						>
							<ShieldCheck aria-hidden="true" /> {clinicProfileSaveButtonText}
						</button>
					</div>
				</div>
			) : null}
			{migrationAutopilot.warnings
				.slice(0, 4)
				.map((warning: string) => (
					<small key={warning}>{humanizeMigrationText(warning)}</small>
				))}
			{renderMigrationTechnicalNotes(
				"Технические границы автоплана",
				migrationAutopilot.privacyWarnings,
				"migration-autopilot-privacy-notes",
			)}
		</section>
	);
}
