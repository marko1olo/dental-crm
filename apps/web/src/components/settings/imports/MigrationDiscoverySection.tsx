import React from "react";
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
	if (!typedMigrationSourceDiscovery) return null;

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
			<div className="dicom-discovery-grid">
				{typedMigrationDiscoveryCandidates
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
									<button
										className="text-button"
										type="button"
										onClick={() => planMigrationDiscoveryCandidate(candidate)}
										disabled={isMigrationSourceWorkupLoading}
										aria-label={`Открыть план переноса: ${candidateDisplayName}`}
									>
										<ClipboardCheck aria-hidden="true" /> План переноса
									</button>
									<button
										className="text-button"
										type="button"
										onClick={() => probeMigrationDiscoveryCandidate(candidate)}
										disabled={isMigrationSourceProbeLoading}
										aria-label={`Проверить источник: ${candidateDisplayName}`}
									>
										<ScanSearch aria-hidden="true" /> Проверить источник
									</button>
									<button
										className="text-button"
										type="button"
										onClick={() =>
											addMigrationDiscoveryCandidateToSmartImport(candidate)
										}
										aria-label={`Отправить источник в разбор: ${candidateDisplayName}`}
									>
										<UploadCloud aria-hidden="true" /> Отправить в разбор
									</button>
									<button
										className="text-button"
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
										<FileCheck2 aria-hidden="true" /> Предпросмотр
									</button>
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
						<button
							className="secondary-button"
							type="button"
							onClick={() => void pickBrowserMigrationSource()}
							disabled={
								isBrowserMigrationScanning || isMigrationAutopilotLoading
							}
						>
							<Database aria-hidden="true" /> Папка/диск
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={focusSmartImportWorkbench}
						>
							<FileText aria-hidden="true" /> Вставить текст
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void lookupClinicPublicProfile()}
							disabled={isClinicPublicLookupLoading}
						>
							<Search aria-hidden="true" /> Реквизиты
						</button>
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
