import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertCircle,
	CheckCircle2,
	ChevronRight,
	ExternalLink,
	FileArchive,
	Folder,
	FolderDown,
	FolderSearch,
	HardDrive,
	Layers,
	Monitor,
	MonitorUp,
	RefreshCw,
	Scan,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import * as fflate from "fflate";

async function getDicomImageLoader() {
	if (typeof window === "undefined") return null;
	try {
		const mod = await import("@cornerstonejs/dicom-image-loader");
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import
		return (mod as any).default || mod;
	} catch (err) {
		logger.warn("[CtSelectorModal] Could not load cornerstoneDICOMImageLoader:", err);
		return null;
	}
}

import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "../dicom/dicomArchiveFilter";
import {
	detectExternalCtViewers,
	isDesktopApp,
	openCbctPopoutWindow,
	openInExternalViewer,
	openInNewWindow,
	scanDownloadsForCt,
	type DesktopCtDownloadItem,
	type DesktopExternalViewerInfo,
} from "../../native/desktopBridge";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";

export type CtLaunchMode = "crm_window" | "standalone_window" | "external_app";

export interface CtSelectorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly studies?: any[] | undefined;
	readonly onSelectStudy?: ((study: any, launchMode: CtLaunchMode) => void) | undefined;
	readonly onOpenCbctStudio?: ((study?: any, imageIds?: string[]) => void) | undefined;
	readonly onImagesLoaded?: ((imageIds: string[], studyMeta?: any) => void) | undefined;
}

const BATCH_PROCESSING_CHUNK_SIZE = 50;

export function CtSelectorModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	cardNumber,
	studies: propStudies,
	onSelectStudy,
	onOpenCbctStudio,
	onImagesLoaded,
}: CtSelectorModalProps) {
	const modalId = useId();
	const zipInputRef = useRef<HTMLInputElement | null>(null);
	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const filesInputRef = useRef<HTMLInputElement | null>(null);

	// Mode selector state
	const [launchMode, setLaunchMode] = useState<CtLaunchMode>("crm_window");

	// Downloads intake state
	const [downloads, setDownloads] = useState<DesktopCtDownloadItem[]>([]);
	const [isScanningDownloads, setIsScanningDownloads] = useState<boolean>(false);
	const [externalViewers, setExternalViewers] = useState<DesktopExternalViewerInfo[]>([]);
	const [selectedViewerId, setSelectedViewerId] = useState<string>("picasso");

	// Drag & Drop / Extraction state
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const [isExtracting, setIsExtracting] = useState<boolean>(false);
	const [extractionStatus, setExtractionStatus] = useState<string>("");
	const [extractionPercent, setExtractionPercent] = useState<number | null>(null);

	// Recent Patient Studies State
	const [patientStudies, setPatientStudies] = useState<any[]>(propStudies ?? []);
	const [isLoadingStudies, setIsLoadingStudies] = useState<boolean>(false);

	const isDesktop = isDesktopApp();

	// Scan downloads
	const refreshDownloads = useCallback(async () => {
		setIsScanningDownloads(true);
		try {
			const items = await scanDownloadsForCt();
			setDownloads(items);
		} catch (err) {
			logger.warn("[CtSelectorModal] Scan downloads error:", err);
			setDownloads([]);
		} finally {
			setIsScanningDownloads(false);
		}
	}, []);

	// Initial load
	useEffect(() => {
		if (!isOpen) return;

		void refreshDownloads();

		void detectExternalCtViewers().then((viewers) => {
			setExternalViewers(viewers);
			if (viewers.length > 0) {
				const available = viewers.find((v) => v.isAvailable);
				if (available) {
					setSelectedViewerId(available.id);
				} else {
					setSelectedViewerId(viewers[0].id);
				}
			}
		});

		// Load patient studies if not passed via props
		if (!propStudies && patientId) {
			setIsLoadingStudies(true);
			fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`)
				.then((res) => (res.ok ? res.json() : []))
				.then((data) => {
					if (Array.isArray(data)) {
						const cbctOnly = data.filter(
							(s) => s.kind === "cbct" || s.kind === "ct" || s.modality === "CT",
						);
						setPatientStudies(cbctOnly.length > 0 ? cbctOnly : data);
					}
				})
				.catch((err) => {
					logger.warn("[CtSelectorModal] Failed to fetch patient studies:", err);
				})
				.finally(() => {
					setIsLoadingStudies(false);
				});
		} else if (propStudies) {
			setPatientStudies(propStudies);
		}
	}, [isOpen, refreshDownloads, patientId, propStudies]);

	// Close on Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Execute study opening according to chosen mode
	const launchStudy = useCallback(
		async (study: any, imageIds?: string[], filePath?: string) => {
			if (launchMode === "crm_window") {
				if (onSelectStudy) {
					onSelectStudy(study, "crm_window");
				}
				if (onImagesLoaded && imageIds && imageIds.length > 0) {
					onImagesLoaded(imageIds, study);
				}
				if (onOpenCbctStudio) {
					onOpenCbctStudio(study, imageIds);
				}
				onClose();
			} else if (launchMode === "standalone_window") {
				const studyId = study?.id || "quick-ct";
				const res = await openCbctPopoutWindow({
					studyId,
					patientId: patientId || undefined,
					patientName: patientName || undefined,
					title: `3D КТ - ${patientName || "Исследование"}`,
				});
				if (!res.success && res.error) {
					showToast(res.error, "error");
				} else {
					showToast("Окно 3D КТ открыто для внешнего монитора", "success");
					onClose();
				}
			} else if (launchMode === "external_app") {
				const res = await openInExternalViewer({
					viewerId: selectedViewerId,
					filePath: filePath || study?.storagePath,
				});
				if (res.success) {
					showToast("КТ запущено во внешнем просмотрщике томографа", "success");
					onClose();
				} else {
					showToast(res.error || "Не удалось запустить внешний просмотрщик томографа", "error");
				}
			}
		},
		[
			launchMode,
			onSelectStudy,
			onImagesLoaded,
			onOpenCbctStudio,
			onClose,
			patientId,
			patientName,
			selectedViewerId,
		],
	);

	// Parse individual files
	const processFileList = useCallback(
		async (fileList: FileList | File[]) => {
			const files = Array.from(fileList);
			if (files.length === 0) return;

			// Check if single zip file
			const zipFile = files.find(
				(f) =>
					f.name.toLowerCase().endsWith(".zip") ||
					f.type === "application/zip" ||
					f.type === "application/x-zip-compressed",
			);

			if (zipFile && files.length === 1) {
				await processZipFile(zipFile);
				return;
			}

			// Direct DICOM files processing
			setIsExtracting(true);
			setExtractionStatus(`Обработка файлов DICOM (${files.length} шт.)...`);
			setExtractionPercent(0);

			try {
				const imageIds: string[] = [];
				let processed = 0;
				const dicomLoader = await getDicomImageLoader();

				for (const file of files) {
					if (isDicomdirEntry(file.name)) continue;

					// Quick 1KB header check
					const slice = await file.slice(0, 1024).arrayBuffer();
					const u8 = new Uint8Array(slice);

					if (isDicomEntry(file.name, u8)) {
						try {
							const id = dicomLoader?.wadouri?.fileManager?.add(file) ?? URL.createObjectURL(file);
							imageIds.push(id);
						} catch (err) {
							logger.warn("[CtSelectorModal] Error adding DICOM file:", err);
						}
					}
					processed++;
					setExtractionPercent(Math.round((processed / files.length) * 100));
				}

				if (imageIds.length === 0) {
					showToast("В выбранных файлах не обнаружено валидных срезов DICOM", "error");
					return;
				}

				showToast(`Успешно загружено ${imageIds.length} срезов КТ`, "success");
				const meta = {
					id: `import-${Date.now()}`,
					title: `КТ: ${files[0]?.name || "Импортированная серия"} (${imageIds.length} срезов)`,
					kind: "cbct",
					sliceCount: imageIds.length,
					capturedAt: new Date().toISOString(),
				};

				await launchStudy(meta, imageIds);
			} catch (err) {
				logger.error("[CtSelectorModal] Error reading files:", err);
				showToast("Сбой при разборе файлов исследования", "error");
			} finally {
				setIsExtracting(false);
				setExtractionStatus("");
				setExtractionPercent(null);
			}
		},
		[launchStudy],
	);

	// Process ZIP archive
	const processZipFile = useCallback(
		async (zipFile: File) => {
			setIsExtracting(true);
			setExtractionStatus(`Распаковка архива КТ: ${zipFile.name}...`);
			setExtractionPercent(0);

			let archiveBuffer: Uint8Array | null = null;
			try {
				archiveBuffer = new Uint8Array(await zipFile.arrayBuffer());
			} catch (err) {
				logger.error("[CtSelectorModal] ArrayBuffer failed:", err);
				showToast("Не удалось прочитать файл архива", "error");
				setIsExtracting(false);
				return;
			}

			return new Promise<void>((resolve) => {
				fflate.unzip(archiveBuffer!, async (err, unzipped) => {
					archiveBuffer = null; // Free compressed memory
					if (err) {
						logger.error("[CtSelectorModal] Unzip error:", err);
						showToast("Повреждённый ZIP-архив КТ. Проверьте целостность файла.", "error");
						setIsExtracting(false);
						setExtractionPercent(null);
						resolve();
						return;
					}

					const entries = sortDicomEntries(Object.keys(unzipped));
					const totalFiles = entries.length;

					if (totalFiles === 0) {
						showToast("Архив пуст или не содержит файлов", "error");
						setIsExtracting(false);
						resolve();
						return;
					}

					const imageIds: string[] = [];
					let currentIndex = 0;
					const dicomLoader = await getDicomImageLoader();

					const processNextBatch = () => {
						const batchEnd = Math.min(
							currentIndex + BATCH_PROCESSING_CHUNK_SIZE,
							totalFiles,
						);

						for (let i = currentIndex; i < batchEnd; i++) {
							const filename = entries[i];
							if (!filename) continue;

							if (isDicomdirEntry(filename)) {
								delete unzipped[filename];
								continue;
							}

							const fileData = unzipped[filename];
							if (!fileData) continue;

							if (isDicomEntry(filename, fileData)) {
								const file = new File([fileData], filename);
								const id = dicomLoader?.wadouri?.fileManager?.add(file) ?? URL.createObjectURL(file);
								imageIds.push(id);
							}
							delete unzipped[filename]; // Zero-leak GC
						}

						currentIndex = batchEnd;
						const pct = Math.round((currentIndex / totalFiles) * 100);
						setExtractionPercent(pct);
						setExtractionStatus(
							`Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (найдено ${imageIds.length} DICOM)...`,
						);

						if (currentIndex < totalFiles) {
							setTimeout(processNextBatch, 0);
						} else {
							setIsExtracting(false);
							setExtractionPercent(null);
							setExtractionStatus("");

							if (imageIds.length === 0) {
								showToast(
									"В архиве не найдено корректных срезов КТ/DICOM. Убедитесь, что это архив томограммы.",
									"error",
								);
								resolve();
								return;
							}

							showToast(`Распаковано и загружено ${imageIds.length} срезов КТ`, "success");
							const studyMeta = {
								id: `zip-${Date.now()}`,
								title: `КТ из архива: ${zipFile.name} (${imageIds.length} срезов)`,
								kind: "cbct",
								sliceCount: imageIds.length,
								capturedAt: new Date().toISOString(),
							};

							void launchStudy(studyMeta, imageIds).then(() => resolve());
						}
					};

					processNextBatch();
				});
			});
		},
		[launchStudy],
	);

	// Drag & Drop handlers
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragOver) setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const items = e.dataTransfer.items;
		if (items && items.length > 0) {
			const files: File[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.kind === "file") {
					const file = item.getAsFile();
					if (file) files.push(file);
				}
			}
			if (files.length > 0) {
				await processFileList(files);
				return;
			}
		}

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			await processFileList(e.dataTransfer.files);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none"
			data-testid="ct-selector-modal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
		>
			<div
				className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--line,#334155)] bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="ct-selector-modal"
				style={{
					backgroundColor: "var(--paper)",
					color: "var(--ink)",
					borderColor: "var(--line)",
				}}
			>
				{/* ═══════════════════════════════════════════════════════════════════
				    МОДАЛЬНАЯ ШАПКА: Заголовок, контекст пациента, статус десктопа и крестик
				    ═══════════════════════════════════════════════════════════════════ */}
				<header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
							<Scan className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2
									id={`${modalId}-title`}
									className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 leading-tight"
								>
									Клинический КТ-селектор
								</h2>
								<span
									className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
									data-testid="badge-ct-3d"
								>
									3D КЛКТ
								</span>
								{isDesktop ? (
									<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
										<CheckCircle2 size={12} />
										<span>DENTE Desktop (.exe)</span>
									</span>
								) : (
									<div className="flex items-center gap-1.5">
										<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-500/15 text-[var(--muted)] border border-[var(--line)]">
											Браузер
										</span>
										<a
											href="/download/dente-desktop.exe"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 transition-colors no-underline cursor-pointer"
											data-testid="link-download-desktop-app"
											title="Скачать приложение DENTE Desktop для Windows (.exe) с аппаратным ускорением GPU"
										>
											<HardDrive size={11} />
											<span>Скачать .EXE</span>
										</a>
									</div>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
								{patientName ? (
									<>
										Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
										{cardNumber ? ` · Медкарта: ${cardNumber}` : ""}
									</>
								) : (
									"Быстрый запуск и добавление КТ-исследований"
								)}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 border border-transparent hover:border-[var(--line)]"
						data-testid="btn-close-ct-selector"
						title="Закрыть окно селектора (Esc)"
					>
						<X size={18} />
					</button>
				</header>

				{/* ═══════════════════════════════════════════════════════════════════
				    ОСНОВНОЕ ТЕЛО МОДАЛКИ (Скроллируемый контент)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
					{/* ═══════════════════════════════════════════════════════════════════
					    СЕКЦИЯ 2: БЫСТРЫЙ ВЫБОР РЕЖИМА ОТКРЫТИЯ (3 понятных сценария)
					    ═══════════════════════════════════════════════════════════════════ */}
					<section
						className="flex flex-col gap-2"
						data-testid="ct-selector-launch-modes"
						aria-label="Режим запуска КТ"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
								Режим открытия КТ
							</span>
							<span className="text-[11px] text-[var(--muted)]">
								{launchMode === "standalone_window"
									? "Отдельное окно для второго монитора врача"
									: launchMode === "external_app"
										? "Нативный просмотрщик производителя томографа"
										: "Встроенный просмотрщик внутри медицинской карты"}
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
							{/* Режим 1: В текущем окне CRM */}
							<button
								type="button"
								onClick={() => setLaunchMode("crm_window")}
								data-testid="mode-crm-window"
								className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
									launchMode === "crm_window"
										? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper)]"
								}`}
							>
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
										launchMode === "crm_window"
											? "bg-teal-600 text-white"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
								>
									<Activity size={16} />
								</div>
								<div className="min-w-0">
									<strong className="block text-xs font-bold text-[var(--ink)]">
										В текущем окне CRM
									</strong>
									<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
										Встроенная 3D Студия и MPR-срезы прямо в медкарте
									</span>
								</div>
							</button>

							{/* Режим 2: В отдельном окне DENTE (для 2-го монитора) */}
							<button
								type="button"
								onClick={() => setLaunchMode("standalone_window")}
								data-testid="mode-standalone-window"
								className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
									launchMode === "standalone_window"
										? "border-cyan-500 bg-cyan-500/10 shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-cyan-500/40 hover:bg-[var(--paper)]"
								}`}
							>
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
										launchMode === "standalone_window"
											? "bg-cyan-600 text-white"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
								>
									<MonitorUp size={16} />
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<strong className="text-xs font-bold text-[var(--ink)]">
											В отдельном окне
										</strong>
										<span className="text-[10px] font-semibold px-1 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
											2-й монитор
										</span>
									</div>
									<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
										Автономный полноэкранный вьюер без помех для CRM
									</span>
								</div>
							</button>

							{/* Режим 3: В приложении томографа (Picasso / Ez3D / Romexis) */}
							<button
								type="button"
								onClick={() => setLaunchMode("external_app")}
								data-testid="mode-external-app"
								className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
									launchMode === "external_app"
										? "border-amber-500 bg-amber-500/10 shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-amber-500/40 hover:bg-[var(--paper)]"
								}`}
							>
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
										launchMode === "external_app"
											? "bg-amber-600 text-white"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
								>
									<ExternalLink size={16} />
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<strong className="text-xs font-bold text-[var(--ink)]">
											Вьюер томографа
										</strong>
										<span className="text-[10px] font-semibold px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
											Picasso/Ez3D
										</span>
									</div>
									<span className="block text-[11px] text-[var(--muted)] leading-snug mt-0.5">
										{isDesktop
											? "Запуск нативного приложения производителя"
											: "Доступно в приложении DENTE Desktop (.exe)"}
									</span>
								</div>
							</button>
						</div>

						{/* Выбор внешнего просмотрщика томографа при активном external_app */}
						{launchMode === "external_app" && (
							<div className="mt-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap text-xs">
								<div className="flex items-center gap-2">
									<Sparkles size={14} className="text-amber-600 shrink-0" />
									<span className="text-[var(--ink)] font-medium">
										Программа для запуска исследования:
									</span>
								</div>
								<div className="flex items-center gap-2">
									<select
										value={selectedViewerId}
										onChange={(e) => setSelectedViewerId(e.target.value)}
										className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-amber-500 cursor-pointer"
										data-testid="select-external-ct-viewer"
									>
										<option value="picasso">Picasso Viewer (Vatech / E-WOO)</option>
										<option value="ez3d">Ez3D-i / Ez3D2009 (Vatech)</option>
										<option value="romexis">Planmeca Romexis 3D</option>
										<option value="ondemand3d">CyberMed OnDemand3D</option>
										<option value="icat">i-CATVision</option>
									</select>
								</div>
							</div>
						)}
					</section>

					{/* ═══════════════════════════════════════════════════════════════════
					    СЕКЦИЯ 1: «СВЕЖИЕ КТ ИЗ ЗАГРУЗОК» (Quick Downloads Intake)
					    ═══════════════════════════════════════════════════════════════════ */}
					<section
						className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"
						data-testid="ct-selector-downloads-section"
					>
						<div className="flex items-center justify-between gap-3 flex-wrap">
							<div className="flex items-center gap-2">
								<FolderDown className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<h3 className="text-xs font-bold text-[var(--ink)] m-0 uppercase tracking-wider">
									Свежие КТ из папки «Загрузки»
								</h3>
								<span className="text-[11px] text-[var(--muted)]">
									({downloads.length})
								</span>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={refreshDownloads}
									disabled={isScanningDownloads}
									className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
									data-testid="btn-refresh-downloads"
									title="Повторно проверить папку Загрузки на наличие новых архивов КТ"
								>
									<RefreshCw
										size={12}
										className={isScanningDownloads ? "animate-spin" : ""}
									/>
									<span>{isScanningDownloads ? "Сканирование..." : "Обновить Загрузки"}</span>
								</button>
							</div>
						</div>

						{/* Список найденных КТ из Загрузок или честное пустое состояние */}
						{downloads.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
								{downloads.map((item) => (
									<div
										key={item.id}
										className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3 hover:border-teal-500/40 transition-all shadow-xs"
										data-testid={`ct-download-item-${item.id}`}
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center shrink-0">
												<FileArchive size={16} />
											</div>
											<div className="min-w-0">
												<strong className="block text-xs font-bold text-[var(--ink)] truncate">
													{item.patientName || item.fileName}
												</strong>
												<div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
													<span>
														{item.fileSizeBytes
															? `${(item.fileSizeBytes / (1024 * 1024)).toFixed(0)} МБ`
															: "Архив КТ"}
													</span>
													<span>·</span>
													<span>
														{item.detectedAtIso
															? new Date(item.detectedAtIso).toLocaleTimeString("ru-RU", {
																	hour: "2-digit",
																	minute: "2-digit",
																})
															: "Сегодня"}
													</span>
													<span className="px-1 py-0.2 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
														3D КТ
													</span>
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={() => launchStudy(item, undefined, item.filePath)}
											className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
											data-testid="btn-open-quick-ct"
											title="Открыть это исследование в выбранном режиме"
										>
											<ChevronRight size={14} />
											<span>В 1 клик</span>
										</button>
									</div>
								))}
							</div>
						) : (
							<div
								className="p-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-center flex flex-col items-center justify-center gap-1.5 text-xs text-[var(--muted)]"
								data-testid="downloads-empty-state"
							>
								<FolderSearch size={20} className="text-[var(--muted)] opacity-60" />
								<span className="font-semibold text-[var(--ink)]">
									В папке «Загрузки» нет свежих КТ
								</span>
								<span className="text-[11px] text-[var(--muted)] max-w-md">
									Скачанные архивы от Пикассо или других диагностических центров появятся здесь
									автоматически. Вы также можете перетащить архив или папку ниже.
								</span>
							</div>
						)}
					</section>

					{/* ═══════════════════════════════════════════════════════════════════
					    СЕКЦИЯ 3: УНИВЕРСАЛЬНАЯ ДРОПЗОНА DRAG & DROP (.zip, .dcm, папки)
					    ═══════════════════════════════════════════════════════════════════ */}
					<section className="flex flex-col gap-2">
						<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
							Добавление КТ вручную или перетаскиванием
						</span>

						{/* Скрытые файловые инпуты */}
						<input
							ref={zipInputRef}
							type="file"
							accept=".zip,.rar,.7z,application/zip,application/x-zip-compressed"
							className="hidden"
							data-testid="input-pick-zip-archive"
							onChange={(e) => {
								if (e.target.files && e.target.files[0]) {
									void processZipFile(e.target.files[0]);
								}
								e.target.value = "";
							}}
						/>
						<input
							ref={folderInputRef}
							type="file"
							multiple
							// @ts-expect-error directory attribute
							webkitdirectory=""
							className="hidden"
							data-testid="input-pick-dicom-folder"
							onChange={(e) => {
								if (e.target.files && e.target.files.length > 0) {
									void processFileList(e.target.files);
								}
								e.target.value = "";
							}}
						/>
						<input
							ref={filesInputRef}
							type="file"
							multiple
							accept=".dcm,.dicom,application/dicom"
							className="hidden"
							data-testid="input-pick-dcm-files"
							onChange={(e) => {
								if (e.target.files && e.target.files.length > 0) {
									void processFileList(e.target.files);
								}
								e.target.value = "";
							}}
						/>

						<div
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							data-testid="ct-selector-dropzone"
							className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center transition-all ${
								isDragOver
									? "border-teal-500 bg-teal-500/10 scale-[1.01]"
									: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-teal-500/50 hover:bg-[var(--paper)]"
							}`}
						>
							<div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center">
								<UploadCloud size={24} />
							</div>

							<div>
								<strong className="text-sm font-bold text-[var(--ink)] block">
									Перетащите сюда архив КТ от Пикассо или папку со срезами
								</strong>
								<span className="text-xs text-[var(--muted)] block mt-0.5 max-w-md">
									Поддерживаются ZIP-архивы, папки DICOM, файлы срезов .dcm от томографов KaVo,
									Vatech, Planmeca, Sirona, CyberMed
								</span>
							</div>

							{/* Extraction Progress Bar if active */}
							{isExtracting && (
								<div className="w-full max-w-md flex flex-col gap-1.5 my-1">
									<div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
										<span>{extractionStatus || "Обработка архива..."}</span>
										<span>{extractionPercent !== null ? `${extractionPercent}%` : ""}</span>
									</div>
									<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
										<div
											className="h-full bg-teal-500 transition-all duration-150"
											style={{
												width: `${extractionPercent !== null ? extractionPercent : 100}%`,
											}}
										/>
									</div>
								</div>
							)}

							<div className="flex flex-wrap items-center justify-center gap-2 mt-1">
								<button
									type="button"
									onClick={() => zipInputRef.current?.click()}
									disabled={isExtracting}
									className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
									data-testid="btn-pick-zip-archive"
								>
									<FileArchive size={14} />
									<span>Выбрать ZIP-архив</span>
								</button>

								<button
									type="button"
									onClick={() => folderInputRef.current?.click()}
									disabled={isExtracting}
									className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
									data-testid="btn-pick-dicom-folder"
								>
									<Folder size={14} />
									<span>Выбрать папку DICOM</span>
								</button>

								<button
									type="button"
									onClick={() => filesInputRef.current?.click()}
									disabled={isExtracting}
									className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
									data-testid="btn-pick-dcm-files"
								>
									<Scan size={14} />
									<span>Файлы .dcm</span>
								</button>
							</div>
						</div>
					</section>

					{/* ═══════════════════════════════════════════════════════════════════
					    СЕКЦИЯ 4: НЕprismДАВНИЕ ИССЛЕДОВАНИЯ ПАЦИЕНТА
					    ═══════════════════════════════════════════════════════════════════ */}
					<section
						className="flex flex-col gap-2.5"
						data-testid="ct-selector-recent-studies"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
								Недавние исследования пациента
							</span>
							<span className="text-[11px] text-[var(--muted)]">
								{patientStudies.length > 0
									? `Найдено: ${patientStudies.length}`
									: "Нет сохранённых исследований"}
							</span>
						</div>

						{isLoadingStudies ? (
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
								<RefreshCw size={14} className="animate-spin text-teal-500" />
								<span>Загрузка архива снимков пациента...</span>
							</div>
						) : patientStudies.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{patientStudies.map((study) => (
									<div
										key={study.id}
										className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-teal-500/40 flex items-center justify-between gap-3 transition-all"
										data-testid={`recent-study-card-${study.id}`}
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="w-10 h-10 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
												<Layers size={18} />
											</div>
											<div className="min-w-0">
												<strong className="block text-xs font-bold text-[var(--ink)] leading-snug line-clamp-2">
													{study.title || "3D КЛКТ исследование"}
												</strong>
												<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] flex-wrap">
													<span>
														{study.capturedAt || study.studyDate
															? new Date(
																	study.capturedAt || study.studyDate,
																).toLocaleDateString("ru-RU", {
																	day: "numeric",
																	month: "short",
																	year: "numeric",
																})
															: "Архив"}
													</span>
													{study.sliceCount ? (
														<>
															<span>·</span>
															<span>{study.sliceCount} срезов</span>
														</>
													) : null}
													{study.voxelSpacing ? (
														<>
															<span>·</span>
															<span>{study.voxelSpacing}</span>
														</>
													) : null}
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={() => launchStudy(study)}
											className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-teal-600 hover:text-white text-[var(--ink)] border border-[var(--line)] hover:border-teal-600 font-semibold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs"
											data-testid={`btn-open-recent-study-${study.id}`}
											title="Открыть в выбранном режиме"
										>
											<ChevronRight size={14} />
											<span>Открыть</span>
										</button>
									</div>
								))}
							</div>
						) : (
							<div
								className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center text-xs text-[var(--muted)]"
								data-testid="no-recent-studies"
							>
								У пациента пока нет привязанных КТ-исследований в базе клиники. Добавьте файл выше
								или выберите архив из Загрузок.
							</div>
						)}
					</section>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    ПОДВАЛ МОДАЛКИ: Быстрое информирование и кнопка закрытия
				    ═══════════════════════════════════════════════════════════════════ */}
				<footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs text-[var(--muted)]">
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
						<span>
							Поддерживает прямое открытие архивов от Picasso, Vatech, Romexis, OnDemand3D
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export default CtSelectorModal;
