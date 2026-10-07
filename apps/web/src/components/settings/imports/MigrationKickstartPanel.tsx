import React, { type ChangeEvent, type RefObject } from "react";
import type {
	MigrationAutopilotResponse,
	MigrationLocalSourceDiscoveryResponse,
} from "@dental/shared";
import {
	Database,
	FileText,
	Layers3,
	RefreshCw,
	ScanSearch,
	Search,
	Sparkles,
} from "lucide-react";
import {
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "./helpers";
import { MigrationStreamProgress } from "./MigrationStreamProgress";

export interface MigrationKickstartProgressItem {
	id?: string;
	title: string;
	detail: string;
	status: string;
}

export interface MigrationKickstartPanelProps {
	migrationAutopilot: MigrationAutopilotResponse | null | undefined;
	migrationProgressItems: MigrationKickstartProgressItem[];
	migrationSourceDiscovery: MigrationLocalSourceDiscoveryResponse | null | undefined;
	typedBrowserMigrationDiscovery: MigrationLocalSourceDiscoveryResponse | null | undefined;
	browserDirectoryPickerAvailable: boolean;
	browserMigrationScanProgress: {
		scannedFolders: number;
		matchedFiles: number;
		lastFolder: string;
	} | null | undefined;
	browserMigrationInputRef: RefObject<HTMLInputElement>;
	isMigrationSourceDiscovering: boolean;
	isMigrationAutopilotLoading: boolean;
	isBrowserMigrationScanning: boolean;
	isClinicPublicLookupLoading: boolean;
	isSmartSafeReportLoading: boolean;
	isSmartReportLoading: boolean;
	migrationHandoffReportReady: boolean;
	discoverMigrationSources: () => void;
	pickBrowserMigrationSource: () => void;
	cancelBrowserMigrationScan: () => void;
	runMigrationAutopilot: () => void;
	lookupClinicPublicProfile: () => void;
	handleBrowserMigrationInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
	downloadSmartImportSafeHandoffReport: () => void;
	downloadMigrationHandoffReport: () => void;
	focusSmartImportWorkbench: () => void;
}

export function MigrationKickstartPanel({
	migrationAutopilot,
	migrationProgressItems,
	migrationSourceDiscovery,
	typedBrowserMigrationDiscovery,
	browserDirectoryPickerAvailable,
	browserMigrationScanProgress,
	browserMigrationInputRef,
	isMigrationSourceDiscovering,
	isMigrationAutopilotLoading,
	isBrowserMigrationScanning,
	isClinicPublicLookupLoading,
	isSmartSafeReportLoading,
	isSmartReportLoading,
	migrationHandoffReportReady,
	discoverMigrationSources,
	pickBrowserMigrationSource,
	cancelBrowserMigrationScan,
	runMigrationAutopilot,
	lookupClinicPublicProfile,
	handleBrowserMigrationInputChange,
	downloadSmartImportSafeHandoffReport,
	downloadMigrationHandoffReport,
	focusSmartImportWorkbench,
}: MigrationKickstartPanelProps) {
	return (
		<>
			<MigrationStreamProgress />

			<section
				className="settings-section migration-kickstart-panel"
				data-testid="migration-kickstart-panel"
				aria-label="Быстрый перенос старой базы"
			>
				<div>
					<strong>Быстрый перенос без ручного поиска</strong>
					<span>
						{migrationAutopilot
							? `План готов: источников ${(migrationAutopilot?.sources ?? []).length}, следующий шаг уже показан ниже.`
							: "Выберите самый простой вход: поиск на ПК, папка старой программы, вставленная выгрузка или реквизиты клиники."}
					</span>
				</div>
				<section
					className="migration-progress-strip"
					data-testid="migration-progress-strip"
					aria-label="Готовность переноса"
				>
					{(migrationProgressItems ?? []).map((item, idx) => (
						<article
							className={`migration-progress-step status-${item?.status} ${item?.status === "active" ? "active" : ""}`}
							key={item?.id ?? `prog-item-${idx}`}
						>
							<div className="flex items-center gap-1.5 mb-0.5">
								<span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--line-subtle)] text-[var(--muted)] font-mono">
									Шаг {idx + 1}
								</span>
								<strong className="text-xs font-semibold text-[var(--ink)] truncate">{item?.title}</strong>
							</div>
							<span className="text-[11px] text-[var(--muted)] truncate">{item?.detail}</span>
						</article>
					))}
				</section>
				<div className="migration-kickstart-grid">
					<article>
						<strong>Старая программа на этом ПК</strong>
						<span>
							{migrationSourceDiscovery
								? `Найдено ${(migrationSourceDiscovery?.candidates ?? []).length}, папок проверено ${migrationSourceDiscovery?.scannedFolders ?? 0}.`
								: "CRM сам ищет старые базы, выгрузки, снимки и следы стоматологических программ."}
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={() => void discoverMigrationSources()}
							disabled={
								isMigrationSourceDiscovering || isMigrationAutopilotLoading
							}
							data-testid="discover-migration-sources"
						>
							<ScanSearch aria-hidden="true" />{" "}
							{isMigrationSourceDiscovering
								? "Ищу источники"
								: isMigrationAutopilotLoading
									? "Строю план"
									: "Найти на ПК + план"}
						</button>
					</article>
					<article>
						<strong>Папка, диск или архив</strong>
						<span>
							{typedBrowserMigrationDiscovery
								? `Выбрано ${(typedBrowserMigrationDiscovery?.candidates ?? []).length} источников, файлов ${(typedBrowserMigrationDiscovery?.candidates ?? []).reduce((sum, candidate) => sum + (candidate?.matchedFiles ?? 0), 0)}.`
								: browserDirectoryPickerAvailable
									? "Админ выбирает папку старой МИС, диск выгрузки, КТ/снимки или архив снимков."
									: "Если браузер не дает выбрать папку, можно выбрать файлы старой МИС и снимков."}
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={() => void pickBrowserMigrationSource()}
							disabled={
								isBrowserMigrationScanning || isMigrationAutopilotLoading
							}
							data-testid="pick-browser-migration-source"
						>
							<Database aria-hidden="true" />{" "}
							{isBrowserMigrationScanning
								? "Сканирую папку"
								: isMigrationAutopilotLoading
									? "Строю план"
									: "Папка/диск + план"}
						</button>
						{isBrowserMigrationScanning && browserMigrationScanProgress ? (
							<button
								className="secondary-button browser-scan-stop-button"
								type="button"
								data-testid="browser-cancel-migration-source-scan"
								onClick={cancelBrowserMigrationScan}
							>
								Остановить сканирование
							</button>
						) : null}
					</article>
					<article>
						<strong>Вставить текст или таблицу</strong>
						<span>
							Вставьте пациентов, приемы, оплаты, услуги или строки старой базы
							— CRM сам определит колонки и покажет предпросмотр.
						</span>
						<button
							className="secondary-button"
							type="button"
							onClick={focusSmartImportWorkbench}
						>
							<FileText aria-hidden="true" /> Вставить в окно ниже
						</button>
					</article>
					<article>
						<strong>Собрать план по всем источникам</strong>
						<span>
							CRM объединит найденные базы, выгрузки, снимки и подскажет
							следующий безопасный шаг без перезаписи данных.
						</span>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void runMigrationAutopilot()}
							disabled={
								isMigrationAutopilotLoading ||
								isMigrationSourceDiscovering ||
								isBrowserMigrationScanning
							}
							data-testid="run-migration-autopilot"
						>
							<Sparkles aria-hidden="true" />{" "}
							{isMigrationAutopilotLoading
								? "Строю автоплан..."
								: "Собрать автоплан"}
						</button>
					</article>
					<article>
						<strong>Реквизиты клиники онлайн</strong>
						<span>
							Подставить юрлицо, адрес, КПП, ОГРН и лицензию по ИНН клиники без
							ручного заполнения карточек.
						</span>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void lookupClinicPublicProfile()}
							disabled={isClinicPublicLookupLoading}
							data-testid="lookup-clinic-public-profile"
						>
							<Search aria-hidden="true" />{" "}
							{isClinicPublicLookupLoading
								? "Ищу реквизиты..."
								: "Найти по ИНН/ОГРН"}
						</button>
					</article>
				</div>
				<input
					ref={browserMigrationInputRef}
					type="file"
					multiple
					className="hidden-file-input"
					tabIndex={-1}
					aria-hidden="true"
					data-testid="browser-migration-folder-input"
					onChange={handleBrowserMigrationInputChange}
				/>
				<div className="migration-kickstart-footer">
					<div className="migration-kickstart-hint">
						<Layers3 aria-hidden="true" />
						<span>
							Безопасный перенос: CRM сначала показывает предпросмотр, сверяет
							дубли и только потом запрашивает подтверждение записи.
						</span>
					</div>
					<div className="migration-handoff-report-actions">
						<div className="dente-segmented-bar" role="toolbar" aria-label="Скачать акты и чек-листы">
							<button
								className="dente-segmented-item"
								type="button"
								onClick={() => void downloadSmartImportSafeHandoffReport()}
								disabled={isSmartSafeReportLoading}
								data-testid="download-smart-safe-handoff-report"
							>
								{isSmartSafeReportLoading ? (
									<RefreshCw className="spinning" size={13} aria-hidden="true" />
								) : null}
								<span>Акт переноса (CSV)</span>
							</button>
							<button
								className="dente-segmented-item"
								type="button"
								onClick={() => void downloadMigrationHandoffReport()}
								disabled={
									!migrationHandoffReportReady || isSmartReportLoading
								}
								data-testid="download-migration-handoff-report"
							>
								{isSmartReportLoading ? (
									<RefreshCw className="spinning" size={13} aria-hidden="true" />
								) : null}
								<span>Чек-лист переноса</span>
							</button>
						</div>
					</div>
				</div>
			</section>

			{isBrowserMigrationScanning && browserMigrationScanProgress ? (
				<section
					className="browser-scan-progress-strip"
					data-testid="browser-migration-scan-progress"
					role="status"
					aria-live="polite"
				>
					<div className="browser-scan-progress-main">
						<RefreshCw className="spinning" aria-hidden="true" />
						<div className="browser-scan-progress-labels">
							<strong>Сканирую выбранную папку или файлы</strong>
							<span>
								Проверено папок {browserMigrationScanProgress.scannedFolders},
								найдено подходящих файлов {browserMigrationScanProgress.matchedFiles}.
							</span>
							<small>
								Текущая папка: {browserMigrationScanProgress.lastFolder || "поиск файлов"}
							</small>
						</div>
					</div>
					<button
						className="secondary-button browser-scan-stop-button"
						type="button"
						data-testid="browser-cancel-migration-source-scan-inline"
						onClick={cancelBrowserMigrationScan}
					>
						Остановить
					</button>
				</section>
			) : null}

			{typedBrowserMigrationDiscovery ? (
				<section
					className="dicom-discovery-result migration-browser-manifest-result"
					data-testid="browser-migration-manifest-result"
					aria-label="Результат проверки выбранной папки или диска"
				>
					<div className="dicom-discovery-head">
						<strong>
							Выбранная папка/диск: источников{" "}
							{(typedBrowserMigrationDiscovery?.candidates ?? []).length} ·
							файлов{" "}
							{(typedBrowserMigrationDiscovery?.candidates ?? []).reduce(
								(sum, candidate) => sum + (candidate?.matchedFiles ?? 0),
								0,
							)}
						</strong>
						<span>
							CRM строит локальный список файлов прямо в браузере без отправки
							тяжелых баз и снимков в сеть.
						</span>
					</div>
					<div className="migration-browser-manifest-note">
						<span>
							Безопасный браузерный список: CRM прочитал только имена и
							структуру папок.
						</span>
						<span>
							Сканирование выполнено после явного выбора папки/файлов. Полный
							путь и содержимое файлов не сохраняются в CRM.
						</span>
					</div>
					<div className="migration-source-artifact-list">
						{(typedBrowserMigrationDiscovery?.candidates ?? [])
							.slice(0, 6)
							.map((candidate, index) => (
								<span key={candidate?.sourceFingerprint ?? index}>
									{migrationSourceDisplayName(candidate, index)} ·{" "}
									{migrationSourceKindLabel(candidate?.sourceKind ?? "")} ·{" "}
									{Math.round((candidate?.confidence ?? 0) * 100)}%
								</span>
							))}
					</div>
					{!(typedBrowserMigrationDiscovery?.candidates ?? []).length ? (
						<div
							className="migration-empty-recovery"
							data-testid="browser-migration-empty-recovery"
							role="status"
							aria-live="polite"
						>
							<strong>
								В выбранной папке не видно старой базы или снимков
							</strong>
							<span>
								Обычно помогает выбрать корень выше: весь диск, папку старой
								программы, папку снимков, архив выгрузки или сетевой экспорт.
							</span>
							<div className="migration-source-card-actions">
								<div className="dente-segmented-bar" role="toolbar" aria-label="Варианты выбора папки">
									<button
										className="dente-segmented-item"
										type="button"
										onClick={() => void pickBrowserMigrationSource()}
										disabled={
											isBrowserMigrationScanning || isMigrationAutopilotLoading
										}
									>
										<Database size={13} aria-hidden="true" />
										<span>Выбрать другую папку</span>
									</button>
									<button
										className="dente-segmented-item"
										type="button"
										onClick={() => void discoverMigrationSources()}
										disabled={
											isMigrationSourceDiscovering ||
											isMigrationAutopilotLoading
										}
									>
										<ScanSearch size={13} aria-hidden="true" />
										<span>Найти на ПК</span>
									</button>
									<button
										className="dente-segmented-item"
										type="button"
										onClick={focusSmartImportWorkbench}
									>
										<FileText size={13} aria-hidden="true" />
										<span>Вставить выгрузку</span>
									</button>
								</div>
							</div>
						</div>
					) : null}
					{(typedBrowserMigrationDiscovery?.warnings ?? [])
						.slice(0, 4)
						.map((warning) => (
							<small key={warning}>{humanizeMigrationText(warning)}</small>
						))}
				</section>
			) : null}
		</>
	);
}
