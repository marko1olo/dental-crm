import React, { type RefObject } from "react";
import type {
	DicomLocalFolderDiscoveryResponse,
	ImagingSourceKind,
} from "@dental/shared";
import {
	CircleStop,
	Database,
	FolderSearch,
	FolderSync,
	Image as ImageIcon,
	RefreshCw,
	ScanSearch,
} from "lucide-react";
import {
	formatBrowserImagingScanElapsed,
	humanizeMigrationText,
} from "./helpers";
import type { InputChangeEvent, TextInputChangeEvent } from "./types";

export interface MigrationImagingDiscoverySectionProps {
	settingsTab: string;
	typedImagingSourceChoices: ImagingSourceKind[];
	imagingImportSourceKind: ImagingSourceKind;
	imagingSourceLabels: Record<string, string>;
	imagingSourceDetails: Record<string, string>;
	imagingFolderPath: string;
	localImagingFolderDraft: any;
	browserDirectoryPickerAvailable: boolean;
	browserImagingFileInputAccept: string;
	browserImagingScanProgress: any;
	isBrowserImagingFolderPicking: boolean;
	isLocalDicomOperationActive: boolean;
	isDicomLocalDiscovering: boolean;
	isLocalImagingOrganizing: boolean;
	isDicomFirstFramePreviewing: boolean;
	isDicomFolderWorkupPlanning: boolean;
	isDicomWorkbenchBuilding: boolean;
	browserPickedImagingFolder: any;
	typedDicomLocalFolderDiscovery: DicomLocalFolderDiscoveryResponse | null | undefined;
	browserDirectoryInputRef: RefObject<HTMLInputElement>;
	browserImagingFilesInputRef: RefObject<HTMLInputElement>;
	setImagingImportSourceKind: (k: ImagingSourceKind) => void;
	setImagingImportPreview: (p: any) => void;
	setImagingImportCommit: (c: any) => void;
	setImagingFolderPath: (p: string) => void;
	stageLocalImagingFolderRecovery: (p: string, o: any) => void;
	rememberLocalImagingFolder: (p: string, o?: any) => void;
	clearLocalImagingFolderRecovery: () => void;
	setImagingFolderScan: (s: any) => void;
	setDicomFolderSeriesScan: (s: any) => void;
	setDicomFolderWorkupPlan: (p: any) => void;
	setDicomFirstFramePreview: (p: any) => void;
	setDicomLocalFolderDiscovery: (d: any) => void;
	setLocalImagingOrganizer: (o: any) => void;
	handleBrowserDirectoryInputChange: (f: FileList | null) => void;
	pickBrowserImagingFolder: () => void;
	pickBrowserImagingFiles: () => void;
	cancelBrowserImagingFolderScan: () => void;
	cancelLocalDicomOperation: () => void;
	discoverDicomFolders: () => void;
	organizeLocalImagingSources: () => void;
	previewDicomFirstFrame: (p?: string, o?: any) => void;
	prepareDicomWorkbenchFromFolder: (p: string, t: string, o?: any) => void;
	clearBrowserPickedImagingFolderPreview: () => void;
}

export function MigrationImagingDiscoverySection({
	settingsTab,
	typedImagingSourceChoices,
	imagingImportSourceKind,
	imagingSourceLabels,
	imagingSourceDetails,
	imagingFolderPath,
	localImagingFolderDraft,
	browserDirectoryPickerAvailable,
	browserImagingFileInputAccept,
	browserImagingScanProgress,
	isBrowserImagingFolderPicking,
	isLocalDicomOperationActive,
	isDicomLocalDiscovering,
	isLocalImagingOrganizing,
	isDicomFirstFramePreviewing,
	isDicomFolderWorkupPlanning,
	isDicomWorkbenchBuilding,
	browserPickedImagingFolder,
	typedDicomLocalFolderDiscovery,
	browserDirectoryInputRef,
	browserImagingFilesInputRef,
	setImagingImportSourceKind,
	setImagingImportPreview,
	setImagingImportCommit,
	setImagingFolderPath,
	stageLocalImagingFolderRecovery,
	rememberLocalImagingFolder,
	clearLocalImagingFolderRecovery,
	setImagingFolderScan,
	setDicomFolderSeriesScan,
	setDicomFolderWorkupPlan,
	setDicomFirstFramePreview,
	setDicomLocalFolderDiscovery,
	setLocalImagingOrganizer,
	handleBrowserDirectoryInputChange,
	pickBrowserImagingFolder,
	pickBrowserImagingFiles,
	cancelBrowserImagingFolderScan,
	cancelLocalDicomOperation,
	discoverDicomFolders,
	organizeLocalImagingSources,
	previewDicomFirstFrame,
	prepareDicomWorkbenchFromFolder,
	clearBrowserPickedImagingFolderPreview,
}: MigrationImagingDiscoverySectionProps) {
	if (!["imports", "sources"].includes(settingsTab)) return null;

	return (
		<section
			className="import-studio imaging-import-studio"
			aria-label="Импорт снимков из внешних систем"
		>
			<div className="import-copy">
				<ImageIcon aria-hidden="true" />
				<div>
					<p className="eyebrow">Снимки и КТ</p>
					<h2>Снимки сначала проходят предпросмотр</h2>
					<p>
						Для RVG, ОПТГ, ТРГ, КТ, архивов снимков и папок обмена: вставь
						экспорт, таблицу, список файлов или текст из старой программы.
						Система сопоставит пациента, тип снимка, зуб, дату и путь к файлу
						до записи в карту.
					</p>
				</div>
			</div>

			<div
				role="toolbar"
				className="import-source-grid imaging-source-grid"
				aria-label="Источник снимков"
			>
				{typedImagingSourceChoices.map((kind) => (
					<button
						className={`source-card ${imagingImportSourceKind === kind ? "active" : ""}`}
						type="button"
						key={kind}
						aria-pressed={imagingImportSourceKind === kind}
						onClick={() => {
							setImagingImportSourceKind(kind);
							setImagingImportPreview(null);
							setImagingImportCommit(null);
						}}
					>
						<strong>{imagingSourceLabels[kind]}</strong>
						<span>{imagingSourceDetails[kind]}</span>
					</button>
				))}
			</div>

			<div className="import-workbench">
				<div className="folder-scan-row">
					<label>
						Папка обмена на сервере
						<input
							data-testid="imaging-folder-path-input"
							value={imagingFolderPath}
							onChange={(event: TextInputChangeEvent) => {
								const nextFolderPath = event.target.value;
								setImagingFolderPath(nextFolderPath);
								if (
									nextFolderPath.trim() !== localImagingFolderDraft?.folderPath
								) {
									stageLocalImagingFolderRecovery(nextFolderPath, {
										origin: "manual",
									});
								}
								setImagingFolderScan(null);
								setDicomFolderSeriesScan(null);
								setDicomFolderWorkupPlan(null);
								setDicomFirstFramePreview(null);
								setDicomLocalFolderDiscovery(null);
								setLocalImagingOrganizer(null);
							}}
							onBlur={(event: TextInputChangeEvent) => {
								rememberLocalImagingFolder(event.target.value, {
									origin: "manual",
								});
							}}
							placeholder="C:\Images или D:\OPG"
						/>
					</label>
					<input
						ref={browserDirectoryInputRef}
						data-testid="browser-local-imaging-folder-input"
						type="file"
						multiple
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						onChange={(event: InputChangeEvent) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<input
						ref={browserImagingFilesInputRef}
						data-testid="browser-local-imaging-files-input"
						type="file"
						multiple
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						accept={browserImagingFileInputAccept}
						onChange={(event: InputChangeEvent) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<div className="folder-scan-actions">
						<button
							className="secondary-button browser-pick-button"
							type="button"
							data-testid="browser-pick-local-imaging-folder"
							disabled={isBrowserImagingFolderPicking}
							onClick={() => void pickBrowserImagingFolder()}
						>
							<Database aria-hidden="true" />{" "}
							{isBrowserImagingFolderPicking
								? "Выбираю папку"
								: browserDirectoryPickerAvailable
									? "Выбрать папку на ПК"
									: "Выбрать папку браузером"}
						</button>
						<button
							className="secondary-button"
							type="button"
							data-testid="browser-pick-local-imaging-files"
							disabled={isBrowserImagingFolderPicking}
							onClick={() => void pickBrowserImagingFiles()}
						>
							<ImageIcon aria-hidden="true" /> Выбрать файлы
						</button>
						{isBrowserImagingFolderPicking ? (
							<button
								className="secondary-button browser-scan-stop-button"
								type="button"
								data-testid="browser-cancel-local-imaging-folder-scan"
								onClick={cancelBrowserImagingFolderScan}
							>
								Остановить сканирование
							</button>
						) : null}
						{isLocalDicomOperationActive ? (
							<button
								className="secondary-button dicom-cancel-button"
								type="button"
								data-testid="cancel-local-dicom-operation"
								onClick={cancelLocalDicomOperation}
							>
								<CircleStop aria-hidden="true" /> Отмена
							</button>
						) : null}
						<button
							className="secondary-button"
							type="button"
							data-testid="find-local-dicom-folders"
							disabled={
								isDicomLocalDiscovering ||
								isLocalImagingOrganizing ||
								!imagingFolderPath.trim()
							}
							onClick={() => void discoverDicomFolders()}
						>
							<FolderSearch aria-hidden="true" />{" "}
							{isDicomLocalDiscovering ? "Ищу КТ-папки" : "Найти КТ-папки на диске"}
						</button>
						<button
							className="secondary-button"
							type="button"
							data-testid="organize-local-imaging-sources"
							disabled={
								isLocalImagingOrganizing ||
								isDicomLocalDiscovering ||
								!imagingFolderPath.trim()
							}
							onClick={() => void organizeLocalImagingSources()}
						>
							<FolderSync aria-hidden="true" />{" "}
							{isLocalImagingOrganizing
								? "Разбираю снимки"
								: "Навести порядок в папке"}
						</button>
						<button
							className="primary-button"
							type="button"
							data-testid="preview-dicom-first-frame"
							disabled={isDicomFirstFramePreviewing || !imagingFolderPath.trim()}
							onClick={() => void previewDicomFirstFrame()}
						>
							<ScanSearch aria-hidden="true" />{" "}
							{isDicomFirstFramePreviewing ? "Смотрю срез" : "Первый срез"}
						</button>
					</div>
				</div>

				{isBrowserImagingFolderPicking && browserImagingScanProgress ? (
					<section
						className="browser-scan-progress-strip"
						data-testid="browser-imaging-scan-progress"
						role="status"
						aria-live="polite"
					>
						<div className="browser-scan-progress-main">
							<RefreshCw className="spinning" aria-hidden="true" />
							<div className="browser-scan-progress-labels">
								<strong>Сканирую локальную папку снимков</strong>
								<span>
									Проверено папок {browserImagingScanProgress.scannedFolders},
									найдено файлов {browserImagingScanProgress.matchedFiles}.
								</span>
								<small>
									Текущая папка: {browserImagingScanProgress.lastFolder || "поиск файлов"}
									{browserImagingScanProgress.elapsedMs !== null &&
									browserImagingScanProgress.elapsedMs !== undefined
										? ` · прошло ${formatBrowserImagingScanElapsed(browserImagingScanProgress.elapsedMs)}`
										: ""}
								</small>
							</div>
						</div>
						<button
							className="secondary-button browser-scan-stop-button"
							type="button"
							data-testid="browser-cancel-local-imaging-folder-scan-inline"
							onClick={cancelBrowserImagingFolderScan}
						>
							Остановить
						</button>
					</section>
				) : null}

				{localImagingFolderDraft && !browserPickedImagingFolder ? (
					<section
						className="local-folder-recovery-strip"
						data-testid="local-imaging-folder-recovery"
						aria-label="Восстановление папки снимков"
					>
						<div className="local-folder-recovery-labels">
							<strong>
								Запомнена папка снимков: {localImagingFolderDraft.folderPath}
							</strong>
							<span>
								Источник:{" "}
								{localImagingFolderDraft.origin === "browser"
									? "выбор в браузере"
									: localImagingFolderDraft.origin === "discovery"
										? "автопоиск КТ"
										: localImagingFolderDraft.origin === "organizer"
											? "органайзер снимков"
											: "ручной ввод"}
								{localImagingFolderDraft.safeDisplayName
									? ` · ${localImagingFolderDraft.safeDisplayName}`
									: ""}
								{localImagingFolderDraft.fileCount !== null &&
								localImagingFolderDraft.fileCount !== undefined
									? ` · файлов ${localImagingFolderDraft.fileCount}`
									: ""}
							</span>
						</div>
						<div className="local-folder-recovery-actions">
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setImagingFolderPath(localImagingFolderDraft.folderPath);
									rememberLocalImagingFolder(localImagingFolderDraft.folderPath, {
										origin: localImagingFolderDraft.origin,
										fileCount: localImagingFolderDraft.fileCount,
										safeDisplayName: localImagingFolderDraft.safeDisplayName,
									});
								}}
							>
								Подставить в поле
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void previewDicomFirstFrame(localImagingFolderDraft.folderPath)}
							>
								Первый срез
							</button>
							<button
								className="text-button"
								type="button"
								onClick={clearLocalImagingFolderRecovery}
							>
								Скрыть подсказку
							</button>
						</div>
					</section>
				) : null}

				{browserPickedImagingFolder ? (
					<section
						className="browser-picked-folder-preview"
						data-testid="browser-picked-imaging-folder-result"
						aria-label="Результат выбора папки снимков в браузере"
					>
						<div className="browser-picked-folder-head">
							<div>
								<strong>{browserPickedImagingFolder.folderLabel}</strong>
								<span>
									Выбрано {browserPickedImagingFolder.fileCount} файлов ·{" "}
									{browserPickedImagingFolder.sourceKind === "browser_folder"
										? "папка снимков"
										: "набор файлов"}
								</span>
							</div>
							<div className="browser-picked-folder-actions">
								<button
									className="secondary-button"
									type="button"
									onClick={() =>
										void previewDicomFirstFrame(
											browserPickedImagingFolder.folderPath,
											{
												files: browserPickedImagingFolder.files,
												folderLabel: browserPickedImagingFolder.folderLabel,
												sourceKind: browserPickedImagingFolder.sourceKind,
											},
										)
									}
								>
									Показать первый срез
								</button>
								<button
									className="text-button"
									type="button"
									onClick={clearBrowserPickedImagingFolderPreview}
								>
									Очистить выбор
								</button>
							</div>
						</div>
						<div className="browser-picked-folder-meta">
							<span>
								Быстрый импорт снимков без ручной перепечатки путей. Файлы
								подставляются напрямую из браузера.
							</span>
							<small>
								Поддерживаются DICOM/DCM (.dcm, без расширения), КТ-серии и
								стандартные снимки (JPG, PNG, TIFF, BMP).
							</small>
						</div>
					</section>
				) : null}

				{typedDicomLocalFolderDiscovery ? (
					<section
						className="dicom-discovery-result"
						data-testid="local-dicom-discovery-result"
						aria-label="Результаты поиска папок КТ на сервере"
					>
						<div className="dicom-discovery-head">
							<strong>
								Найдено КТ-папок:{" "}
								{typedDicomLocalFolderDiscovery.candidates.length} / проверено:{" "}
								{typedDicomLocalFolderDiscovery.scannedFolders}
							</strong>
							<span>
								{humanizeMigrationText(typedDicomLocalFolderDiscovery.nextAction)}
							</span>
						</div>
						<div className="dicom-discovery-grid">
							{typedDicomLocalFolderDiscovery.candidates
								.slice(0, 6)
								.map((candidate) => (
									<article key={candidate.folderPath}>
										<strong>{candidate.safeDisplayName}</strong>
										<span>
											{humanizeMigrationText(candidate.sourceLabel)} · метка{" "}
											{candidate.folderFingerprint.toUpperCase()}
										</span>
										<span>
											Путь к папке и имена скрыты до выбора для защиты данных
										</span>
										<small>
											Снимков в серии: {candidate.dicomLikeFiles} · уверенность{" "}
											{Math.round(candidate.confidence * 100)}%
										</small>
										<button
											className="text-button"
											type="button"
											onClick={() => {
												setImagingFolderPath(candidate.folderPath);
												rememberLocalImagingFolder(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
												setDicomFolderSeriesScan(null);
												setDicomFolderWorkupPlan(null);
												setDicomFirstFramePreview(null);
												setImagingFolderScan(null);
												setLocalImagingOrganizer(null);
											}}
										>
											Выбрать папку
										</button>
										<button
											className="text-button"
											type="button"
											data-testid="prepare-dicom-discovery-workbench"
											disabled={
												isDicomFolderWorkupPlanning ||
												isDicomWorkbenchBuilding
											}
											onClick={() =>
												void prepareDicomWorkbenchFromFolder(
													candidate.folderPath,
													"dicom_discovery_quick_workbench",
													{
														safeDisplayName: candidate.safeDisplayName,
														sourceLabel: candidate.sourceLabel,
														sourceKind: candidate.sourceKind,
														folderFingerprint: candidate.folderFingerprint,
														origin: "discovery",
													},
												)
											}
										>
											Подготовить КТ
										</button>
										<button
											className="text-button"
											type="button"
											data-testid="preview-dicom-discovery-first-frame"
											disabled={isDicomFirstFramePreviewing}
											onClick={() => {
												rememberLocalImagingFolder(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
												void previewDicomFirstFrame(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
											}}
										>
											Первый срез
										</button>
									</article>
								))}
						</div>
						{typedDicomLocalFolderDiscovery.warnings
							.slice(0, 4)
							.map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
					</section>
				) : null}
			</div>
		</section>
	);
}
