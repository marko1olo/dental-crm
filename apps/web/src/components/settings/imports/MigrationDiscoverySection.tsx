import React, { useState, useMemo } from "react";
import type {
	MigrationAutopilotResponse,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
} from "@dental/shared";
import {
	ClipboardCheck,
	Database,
	FileCheck2,
	FileText,
	ScanSearch,
	Search,
	UploadCloud,
	X,
} from "lucide-react";
import {
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "./helpers";

export interface MigrationDiscoverySectionProps {
	typedMigrationSourceDiscovery:
		| MigrationLocalSourceDiscoveryResponse
		| null
		| undefined;
	typedMigrationDiscoveryCandidates: MigrationLocalSourceDiscoveryCandidate[];
	migrationAutopilot: MigrationAutopilotResponse | null | undefined;
	isMigrationSourceWorkupLoading: boolean;
	isMigrationSourceProbeLoading: boolean;
	isSmartImportLoading: boolean;
	isBrowserMigrationScanning: boolean;
	isMigrationAutopilotLoading: boolean;
	isClinicPublicLookupLoading: boolean;
	formatDateTime: (date: string | null | undefined) => string;
	migrationCandidatePreviewReady: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => boolean;
	migrationCandidatePreviewHint: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => string;
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
	pickBrowserMigrationSource: () => void;
	focusSmartImportWorkbench: () => void;
	lookupClinicPublicProfile: () => void;
}

export function MigrationDiscoverySection({
	typedMigrationSourceDiscovery,
	typedMigrationDiscoveryCandidates,
	migrationAutopilot,
	isMigrationSourceWorkupLoading,
	isMigrationSourceProbeLoading,
	isSmartImportLoading,
	isBrowserMigrationScanning,
	isMigrationAutopilotLoading,
	isClinicPublicLookupLoading,
	formatDateTime,
	migrationCandidatePreviewReady,
	migrationCandidatePreviewHint,
	planMigrationDiscoveryCandidate,
	probeMigrationDiscoveryCandidate,
	addMigrationDiscoveryCandidateToSmartImport,
	previewMigrationDiscoveryCandidate,
	pickBrowserMigrationSource,
	focusSmartImportWorkbench,
	lookupClinicPublicProfile,
}: MigrationDiscoverySectionProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceKindFilter, setSourceKindFilter] = useState<string>("all");

	if (!typedMigrationSourceDiscovery) return null;

	const filteredCandidates = typedMigrationDiscoveryCandidates.filter((candidate) => {
		const q = searchQuery.trim().toLowerCase();
		const matchesQuery =
			!q ||
			candidate.sourceLabel?.toLowerCase().includes(q) ||
			candidate.sourceKind?.toLowerCase().includes(q) ||
			candidate.sourceFingerprint?.toLowerCase().includes(q) ||
			candidate.reasons?.some((r) => r.toLowerCase().includes(q));

		const matchesKind =
			sourceKindFilter === "all" ||
			candidate.sourceKind === sourceKindFilter;

		return matchesQuery && matchesKind;
	});

	return (
		<section
			className="dicom-discovery-result migration-source-discovery-result"
			data-testid="migration-source-discovery-result"
			aria-label="Автопоиск старых баз, выгрузок и снимков"
		>
			<div className="dicom-discovery-head">
				<strong>
					Найдено источников: {typedMigrationDiscoveryCandidates.length} ·
					просканировано папок: {typedMigrationSourceDiscovery.scannedFolders}
				</strong>
				<span>
					{migrationAutopilot
						? "Автоплан уже построен выше. Начните с блока «Сейчас» или откройте карточку источника."
						: humanizeMigrationText(typedMigrationSourceDiscovery.nextAction)}
				</span>
				<span>
					Карточки ниже уже готовы к плану переноса, проверке источника,
					предпросмотру или разбору.
				</span>
			</div>

			{/* Поиск файлов импорта и фильтр по типам источников */}
			{typedMigrationDiscoveryCandidates.length > 0 && (
				<div className="flex items-center justify-between gap-3 flex-wrap my-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="dente-search-wrap flex-1 min-w-[240px]">
						<Search className="dente-search-icon" size={14} aria-hidden="true" />
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск файлов импорта, баз данных или снимков..."
							className="dente-search-input"
							data-testid="input-search-migration-sources"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>
					<div className="dente-filter-chips" role="group" aria-label="Фильтр источников импорта">
						{[
							{ key: "all", label: "Все источники" },
							{ key: "database", label: "Базы данных" },
							{ key: "dicom", label: "КТ / Снимки" },
							{ key: "tabular", label: "Таблицы / Excel" },
						].map((filter) => {
							const count = filter.key === "all"
								? typedMigrationDiscoveryCandidates.length
								: typedMigrationDiscoveryCandidates.filter((c) => c.sourceKind === filter.key).length;
							return (
								<button
									key={filter.key}
									type="button"
									onClick={() => setSourceKindFilter(filter.key)}
									className={`dente-filter-chip ${sourceKindFilter === filter.key ? "active" : ""}`}
									data-active={sourceKindFilter === filter.key}
								>
									<span>{filter.label}</span>
									{count > 0 && <span className="opacity-70 text-[10px] ml-1 font-mono">({count})</span>}
								</button>
							);
						})}
					</div>
				</div>
			)}

			<div className="dicom-discovery-grid">
				{filteredCandidates
					.slice(0, 9)
					.map((candidate, index) => {
						const candidateDisplayName = migrationSourceDisplayName(
							candidate,
							index,
						);
						return (
							<article key={candidate.sourceFingerprint}>
								<strong>{candidateDisplayName}</strong>
								<span>
									{humanizeMigrationText(candidate.sourceLabel)} ·{" "}
									{migrationSourceKindLabel(candidate.sourceKind)} · источник{" "}
									{index + 1}
								</span>
								<small>
									{Math.round(candidate.confidence * 100)}% · файлов{" "}
									{candidate.matchedFiles} · базы {candidate.databaseFiles} ·
									КТ/серии {candidate.dicomLikeFiles} · изображений{" "}
									{candidate.imageFiles}
								</small>
								{candidate.latestModifiedAt ? (
									<small>
										Последнее изменение:{" "}
										{formatDateTime(candidate.latestModifiedAt)}
									</small>
								) : null}
								{candidate.reasons.slice(0, 3).map((reason: string) => (
									<span key={reason}>{humanizeMigrationText(reason)}</span>
								))}
								{candidate.warnings
									.slice(0, 2)
									.map((warning: string) => (
										<small key={warning}>
											{humanizeMigrationText(warning)}
										</small>
									))}
								<div className="migration-source-card-actions">
									<div className="dente-segmented-bar w-full" role="group" aria-label={`Действия для ${candidateDisplayName}`}>
										<button
											className="dente-segmented-item"
											type="button"
											onClick={() => planMigrationDiscoveryCandidate(candidate)}
											disabled={isMigrationSourceWorkupLoading}
											aria-label={`Открыть план переноса: ${candidateDisplayName}`}
										>
											<ClipboardCheck size={13} aria-hidden="true" />
											<span>План</span>
										</button>
										<button
											className="dente-segmented-item"
											type="button"
											onClick={() => probeMigrationDiscoveryCandidate(candidate)}
											disabled={isMigrationSourceProbeLoading}
											aria-label={`Проверить источник: ${candidateDisplayName}`}
										>
											<ScanSearch size={13} aria-hidden="true" />
											<span>Проверить</span>
										</button>
										<button
											className="dente-segmented-item"
											type="button"
											onClick={() =>
												addMigrationDiscoveryCandidateToSmartImport(candidate)
											}
											aria-label={`Отправить источник в разбор: ${candidateDisplayName}`}
										>
											<UploadCloud size={13} aria-hidden="true" />
											<span>В разбор</span>
										</button>
										<button
											className="dente-segmented-item active"
											type="button"
											onClick={() =>
												void previewMigrationDiscoveryCandidate(candidate)
											}
											disabled={
												isSmartImportLoading ||
												!migrationCandidatePreviewReady(candidate)
											}
											title={migrationCandidatePreviewHint(candidate)}
											aria-label={`Построить предпросмотр: ${candidateDisplayName}`}
										>
											<FileCheck2 size={13} aria-hidden="true" />
											<span>Предпросмотр</span>
										</button>
									</div>
									{!migrationCandidatePreviewReady(candidate) ? (
										<small className="migration-action-hint">
											{migrationCandidatePreviewHint(candidate)}
										</small>
									) : null}
								</div>
							</article>
						);
					})}
			</div>
			{!typedMigrationDiscoveryCandidates.length ? (
				<div
					className="migration-empty-recovery"
					data-testid="pc-migration-empty-recovery"
					role="status"
					aria-live="polite"
				>
					<strong>Автопоиск не нашел старую МИС в пределах лимитов</strong>
					<span>
						Дальше не нужен айтишник: выберите папку/диск вручную, вставьте пару
						строк выгрузки или заполните реквизиты клиники для документов.
					</span>
					<div className="migration-source-card-actions">
						<div className="dente-segmented-bar" role="toolbar" aria-label="Варианты восстановления">
							<button
								className="dente-segmented-item"
								type="button"
								onClick={() => void pickBrowserMigrationSource()}
								disabled={
									isBrowserMigrationScanning || isMigrationAutopilotLoading
								}
							>
								<Database size={13} aria-hidden="true" />
								<span>Папка/диск</span>
							</button>
							<button
								className="dente-segmented-item"
								type="button"
								onClick={focusSmartImportWorkbench}
							>
								<FileText size={13} aria-hidden="true" />
								<span>Вставить текст</span>
							</button>
							<button
								className="dente-segmented-item"
								type="button"
								onClick={() => void lookupClinicPublicProfile()}
								disabled={isClinicPublicLookupLoading}
							>
								<Search size={13} aria-hidden="true" />
								<span>Реквизиты</span>
							</button>
						</div>
					</div>
				</div>
			) : null}
			{typedMigrationSourceDiscovery.warnings
				.slice(0, 4)
				.map((warning: string) => (
					<small key={warning}>{humanizeMigrationText(warning)}</small>
				))}
		</section>
	);
}
