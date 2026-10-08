import React, {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Activity,
	Camera,
	FileText,
	Layers,
	MoreVertical,
	Plus,
	RefreshCw,
	Sparkles,
	UploadCloud,
} from "lucide-react";

import { useAppLogicContext } from "./contexts/AppLogicContext";
import { readDenteClinicToken, readDenteStaffToken } from "./lib/safeLocalStorage";
import { decodeHeicImage } from "./services/imaging/heicDecoder";
import { logger } from "./utils/logger";
import { countLabel } from "./AppHelpers";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { showToast } from "./components/GlobalToast";
import { ShadowAnalystReport } from "./components/imaging/ShadowAnalystReport";
import { DicomArchiveUploader } from "./components/imaging/DicomArchiveUploader";
import { MobileChairsideRadiologyViewer } from "./components/radiology/MobileChairsideRadiologyViewer.js";
import { RadiologyModule } from "./components/radiology/RadiologyModule.js";
import { CtSelectorModal } from "./components/radiology/CtSelectorModal";
import { routeOpenCbctPopout } from "./utils/runtimeRouter";

import {
	ImagingExportModal,
	ImagingHeader,
	ImagingMprPanel,
	ImagingStudyList,
	ImagingStudyThumbnail as ModularImagingStudyThumbnail,
	ImagingToolbar,
	ImagingViewport,
	imagingStudyHasFile,
	processCameraPhotoCapture,
	useImagingPreviewBlob,
	type AiProposal,
	type ImagingStudy,
	type ViewerRulerMeasurement,
} from "./components/imaging";

// Mandate 8s / Tier 3: Ленивая загрузка тяжелых 3D DICOM / КТ движков для защиты 5400 RPM HDD
const PanoramicRendererWindow = lazyWithRetry(() =>
	import("./components/dicom/PanoramicRendererWindow").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);

/**
 * Безопасная миниатюра снимка: при 403 или ошибке загрузки рендерит аккуратный векторный датчик.
 * Сохраняет фиксированные размеры 48x48px (aspectRatio: 1 / 1) для нулевого CLS.
 */
export function ImagingStudyThumbnail({
	study,
	previewSrc,
}: {
	study: any;
	previewSrc?: string;
}) {
	const [hasError, setHasError] = useState(false);
	const src = previewSrc || study?.previewUrl;
	const isDirectBlob = src?.startsWith("blob:") || src?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
				title={study?.title || "Рентген-снимок"}
			>
				<svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="4" y="2" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
					<rect x="7" y="5" width="14" height="18" rx="2" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="1.5 1.5" />
					<circle cx="14" cy="14" r="3" stroke="currentColor" strokeOpacity="0.7" />
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className="w-12 h-12 object-cover rounded-lg shrink-0 aspect-square border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)]"
			style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
			onError={() => setHasError(true)}
		/>
	);
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type ImagingViewProps = Record<string, any>;

export function ImagingView(props: ImagingViewProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const {
		activeAppointment, activeImagingStudies, activePatient,
		attachBrowserDirectoryInputRef, browserImagingFileInputAccept,
		browserPickedImagingFolder, defaultImagingViewerState,
		formatShortDate, handleBrowserDirectoryInputChange,
		imagingKindFilter, imagingKindLabels, imagingKindOptions,
		imagingPreviewSource, imagingSourceLabels, imagingViewerHref,
		imagingViewerState, isBrowserImagingFolderPicking,
		pickBrowserImagingFolder, selectedImagingStudy, selectedImagingViewerPlan,
		setImagingKindFilter, setSelectedImagingStudyId, visibleImagingStudies,
		addImagingViewerNoteAnnotation, canRetryImagingViewerSave,
		imagingViewerAnnotations, imagingViewerNote, imagingViewerNoteMissingId,
		imagingViewerNoteReady, imagingViewerRetryMissingId, imagingViewerSaveDetail,
		imagingViewerSaveState, imagingViewerSaveTitle, imagingViewerSessionReady,
		isOnline, retryImagingViewerSessionSave, setImagingViewerNote,
		setImagingViewerState, setImagingViewerActiveTool,
		setCtPlanningActiveQuickActionId, setCtPlanningImplantPlan,
	} = props;

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
	const [isCapturingCameraPhoto, setIsCapturingCameraPhoto] = useState(false);
	const browserImagingFilesInputRef =
		props.browserImagingFilesInputRef || localFilesInputRef;
	const pickBrowserImagingFiles =
		props.pickBrowserImagingFiles ||
		(() => {
			browserImagingFilesInputRef.current?.click();
		});

	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
	const [enhancementOn, setEnhancementOn] = useState(false);
	const [isPanoramicWindowOpen, setIsPanoramicWindowOpen] = useState(false);
	const [isRadiologyModuleOpen, setIsRadiologyModuleOpen] = useState(false);
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [isCtSelectorOpen, setIsCtSelectorOpen] = useState(false);
	const [isMobileImagingMenuOpen, setIsMobileImagingMenuOpen] = useState(false);
	const mobileImagingMenuRef = useRef<HTMLDivElement | null>(null);

	const authHeaders = useMemo(() => {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const token = auth?.token || staffToken || clinicToken;
		const headers: Record<string, string> = {};
		if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
		if (staffToken) headers["x-dente-staff-token"] = staffToken;
		if (token) headers.Authorization = `Bearer ${token}`;
		return headers;
	}, [auth?.token]);

	const [isDicomwebLoading, setIsDicomwebLoading] = useState(false);
	const [dicomwebLoadProgress, setDicomwebLoadProgress] = useState<string | null>(null);

	const handleLoadFromDicomweb = useCallback(async (options?: { silentOnError?: boolean }) => {
		if (!selectedImagingStudy) return;
		setIsDicomwebLoading(true);
		setDicomwebLoadProgress("Подключение к DICOMweb WADO-RS...");
		try {
			const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
			const studyAny = selectedImagingStudy as Record<string, unknown>;
			let studyUid = (studyAny.dicomStudyUid ?? studyAny.studyInstanceUid ?? studyAny.studyUid) as string | undefined;
			let seriesUid = (studyAny.dicomSeriesUid ?? studyAny.seriesInstanceUid ?? studyAny.seriesUid) as string | undefined;

			if (!studyUid) {
				const qidoUrl = `${apiBase}/api/dicomweb/studies${activePatient?.id ? `?PatientID=${encodeURIComponent(activePatient.id)}` : ""}`;
				const qidoRes = await fetch(qidoUrl, {
					headers: { Accept: "application/dicom+json", ...authHeaders },
				});
				if (qidoRes.ok) {
					const studies = (await qidoRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
					if (Array.isArray(studies) && studies.length > 0) {
						studyUid = studies[0]?.["0020000D"]?.Value?.[0] as string | undefined;
					}
				}
			}

			if (!studyUid) {
				throw new Error("Не найден UID исследования КТ в DICOMweb PACS.");
			}

			if (!seriesUid) {
				const seriesRes = await fetch(`${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series`, {
					headers: { Accept: "application/dicom+json", ...authHeaders },
				});
				if (seriesRes.ok) {
					const seriesList = (await seriesRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
					if (Array.isArray(seriesList) && seriesList.length > 0) {
						seriesUid = seriesList[0]?.["0020000E"]?.Value?.[0] as string | undefined;
					}
				}
			}

			if (!seriesUid) {
				throw new Error("Не найдена серия снимков в исследовании PACS.");
			}

			setDicomwebLoadProgress("Загрузка метаданных серии WADO-RS...");
			const metaRes = await fetch(`${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/metadata`, {
				headers: { Accept: "application/dicom+json", ...authHeaders },
			});
			if (!metaRes.ok) {
				throw new Error(`Ошибка загрузки метаданных серии: HTTP ${metaRes.status}`);
			}
			const metaJson = (await metaRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
			if (!Array.isArray(metaJson) || metaJson.length === 0) {
				throw new Error("В серии DICOMweb не найдено кадров.");
			}

			const wadoImageIds: string[] = [];
			for (const item of metaJson) {
				const sopUid = item?.["00080018"]?.Value?.[0] as string | undefined;
				if (sopUid) {
					const wadoUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`;
					wadoImageIds.push(`wadouri:${wadoUrl}`);
				}
			}

			if (wadoImageIds.length === 0) {
				throw new Error("Не удалось сформировать адреса WADO-RS для кадров серии.");
			}

			setLocalImageIds(wadoImageIds);
			showToast(`Загружено ${wadoImageIds.length} срезов из DICOMweb PACS`, "success");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Сбой загрузки из DICOMweb";
			if (!options?.silentOnError) {
				showToast(msg, "error");
			}
		} finally {
			setIsDicomwebLoading(false);
			setDicomwebLoadProgress(null);
		}
	}, [selectedImagingStudy, activePatient?.id, authHeaders]);

	// Autoload DICOMweb WADO-RS when a CBCT study with PACS linkage is selected and localImageIds is empty
	useEffect(() => {
		if (!selectedImagingStudy || selectedImagingStudy.kind !== "cbct") return;
		if (localImageIds && localImageIds.length > 0) return;
		if (isDicomwebLoading) return;

		const studyAny = selectedImagingStudy as Record<string, unknown>;
		const studyUid = (studyAny.dicomStudyUid ?? studyAny.studyInstanceUid ?? studyAny.studyUid) as string | undefined;

		if (studyUid || studyAny.hasDicomweb) {
			handleLoadFromDicomweb({ silentOnError: true });
		}
	}, [selectedImagingStudy, localImageIds, isDicomwebLoading, handleLoadFromDicomweb]);

	const handleCameraPhotoCapture = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!activePatient?.id) {
			showToast("Выберите пациента перед добавлением снимка с камеры.", "info", 6000);
			event.target.value = "";
			return;
		}

		setIsCapturingCameraPhoto(true);
		try {
			await processCameraPhotoCapture({
				file,
				activePatientId: activePatient.id,
				activeAppointmentId: activeAppointment?.id,
				onStudyCreated: (id) => {
					if (setSelectedImagingStudyId) setSelectedImagingStudyId(id);
					if (setImagingKindFilter) setImagingKindFilter("photo");
				},
				onDashboardRefresh: () => {
					if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				},
			});
		} finally {
			setIsCapturingCameraPhoto(false);
			event.target.value = "";
		}
	};

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ modalId: string }>).detail;
			if (detail?.modalId === "cbct_mpr_workspace" || detail?.modalId === "cbct_implant_studio") {
				routeOpenCbctPopout({
					patientId: activePatient?.id,
					patientName: activePatient?.name ?? activePatient?.fullName,
					studyId: selectedImagingStudy?.id,
					mode: "mpr",
				});
				showToast("3D КЛКТ Студия запущена на втором мониторе", "info");
			} else if (detail?.modalId === "panoramic_recon_window") {
				setIsPanoramicWindowOpen(true);
			}
		};
		window.addEventListener("dente-open-backoffice-modal", handleOpen);
		return () => window.removeEventListener("dente-open-backoffice-modal", handleOpen);
	}, [activePatient, selectedImagingStudy]);

	const [analysisByStudy, setAnalysisByStudy] = useState<
		Record<string, { summary: string; toothUpdates: unknown[] }>
	>({});

	const [pendingAiProposal, setPendingAiProposal] = useState<AiProposal | null>(null);
	const [isRulerActive, setIsRulerActive] = useState(false);
	const [isPanActive, setIsPanActive] = useState(false);
	const [rulerMeasurements, setRulerMeasurements] = useState<ViewerRulerMeasurement[]>([]);

	const currentPixelSpacingMm = useMemo(() => {
		const kind = selectedImagingStudy?.kind;
		if (kind === "rvg" || kind === "periapical" || kind === "bitewing") return 0.04;
		if (kind === "panoramic" || kind === "opg") return 0.10;
		if (kind === "cbct" || kind === "ct") return 0.125;
		return 0.04;
	}, [selectedImagingStudy?.kind]);

	const computedViewerImageStyle = useMemo<React.CSSProperties>(() => {
		if (props.imagingViewerImageStyle) return props.imagingViewerImageStyle;
		const s = imagingViewerState || defaultImagingViewerState;
		const filters: string[] = [];
		if (typeof s.brightness === "number" && s.brightness !== 1) {
			filters.push(`brightness(${s.brightness})`);
		}
		if (typeof s.contrast === "number" && s.contrast !== 1) {
			filters.push(`contrast(${s.contrast})`);
		}
		if (s.inverted) {
			filters.push("invert(1)");
		}
		const transforms: string[] = [];
		const panX = s.pan?.x ?? 0;
		const panY = s.pan?.y ?? 0;
		if (panX !== 0 || panY !== 0) {
			transforms.push(`translate(${panX}px, ${panY}px)`);
		}
		if (typeof s.zoom === "number" && s.zoom !== 1) {
			transforms.push(`scale(${s.zoom})`);
		}
		if (typeof s.rotationDeg === "number" && s.rotationDeg !== 0) {
			transforms.push(`rotate(${s.rotationDeg}deg)`);
		}
		if (s.flipHorizontal) {
			transforms.push("scaleX(-1)");
		}
		return {
			filter: filters.length > 0 ? filters.join(" ") : "none",
			transform: transforms.length > 0 ? transforms.join(" ") : "none",
			transition: isPanActive ? "none" : "transform 0.12s ease-out, filter 0.12s ease-out",
		};
	}, [props.imagingViewerImageStyle, imagingViewerState, defaultImagingViewerState, isPanActive]);

	const {
		effectivePreviewUrl,
		isPreviewLoading,
		previewLoadError,
	} = useImagingPreviewBlob({
		selectedImagingStudy,
		imagingPreviewSource,
		auth,
	});

	const analysisForSelected = selectedImagingStudy
		? analysisByStudy[selectedImagingStudy.id]
		: undefined;
	const selectedStudySummary: string | null =
		analysisForSelected?.summary ??
		(selectedImagingStudy?.aiSummary as string | undefined) ??
		null;
	const selectedStudyToothUpdates =
		analysisForSelected?.toothUpdates ??
		(selectedImagingStudy?.aiToothUpdates as unknown[] | undefined);

	const selectedStudyHasFile = imagingStudyHasFile(selectedImagingStudy);

	const handleAnalyzeAI = async () => {
		if (!selectedImagingStudy) return;
		if (!selectedStudyHasFile) {
			showToast(
				"Разбирать нечего: к этой карточке не загружен файл снимка. Добавьте снимок через импорт снимков.",
				"error",
			);
			return;
		}
		const studyId = selectedImagingStudy.id;
		setIsAnalyzingAI(true);
		try {
			const headers = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${studyId}/analyze`, {
				method: "POST",
				headers,
			});
			const rawBody = await res.text();
			let payload: any = null;
			try {
				payload = rawBody.trim() ? JSON.parse(rawBody) : null;
			} catch {
				payload = null;
			}

			if (!res.ok) {
				const serverMessage = typeof payload?.message === "string" ? payload.message : "";
				showToast(
					serverMessage || "Разбор снимка не выполнен. Проверьте, что файл снимка загружен.",
					"error",
				);
				return;
			}
			if (!payload?.analysisResult) {
				showToast("Ответ сервера не удалось прочитать. Повторите разбор снимка.", "error");
				return;
			}

			const summary = typeof payload.analysisResult.summary === "string" ? payload.analysisResult.summary : "";
			const toothUpdates = Array.isArray(payload.analysisResult.toothUpdates) ? payload.analysisResult.toothUpdates : [];
			setAnalysisByStudy((current) => ({
				...current,
				[studyId]: { summary, toothUpdates },
			}));

			setEnhancementOn(true);
			showToast("Разбор снимка ShadowAnalyst завершён", "success");
		} catch (error) {
			logger.error("[imaging analyze] error", error);
			showToast("Сервер не ответил на разбор снимка. Проверьте связь.", "error");
		} finally {
			setIsAnalyzingAI(false);
		}
	};

	const isCbctActive =
		localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct";

	return (
		<section
			className="imaging-panel"
			id="imaging"
			aria-label="Снимки пациента"
		>
			{/* Shared Hidden Inputs */}
			<input
				ref={attachBrowserDirectoryInputRef}
				data-testid="imaging-browser-local-folder-input"
				type="file"
				multiple
				style={{ display: "none" }}
				onChange={(event) => void handleBrowserDirectoryInputChange(event.target.files)}
			/>
			<input
				ref={browserImagingFilesInputRef}
				data-testid="imaging-browser-local-files-input"
				type="file"
				multiple
				style={{ display: "none" }}
				accept={browserImagingFileInputAccept}
				onChange={(event) => {
					const input = event.currentTarget;
					void Promise.resolve(handleBrowserDirectoryInputChange(input.files)).finally(() => {
						input.value = "";
					});
				}}
			/>
			<input
				ref={cameraCaptureInputRef}
				data-testid="imaging-camera-capture-input"
				type="file"
				accept="image/*"
				capture="environment"
				style={{ display: "none" }}
				onChange={handleCameraPhotoCapture}
			/>

			{/* 1. MOBILE CHAIRSIDE RADIOLOGY VIEWER (<768px, Apple HIG) */}
			<div className="block md:hidden w-full h-full min-h-[500px]">
				<MobileChairsideRadiologyViewer
					selectedImagingStudy={selectedImagingStudy}
					activeImagingStudies={activeImagingStudies ?? []}
					activePatient={activePatient}
					onSelectStudy={(studyId) => {
						if (setSelectedImagingStudyId) setSelectedImagingStudyId(studyId);
					}}
					effectivePreviewUrl={effectivePreviewUrl}
					isPreviewLoading={isPreviewLoading}
					previewLoadError={previewLoadError}
					selectedStudyHasFile={selectedStudyHasFile}
					imagingKindLabels={imagingKindLabels}
					onCaptureCamera={() => cameraCaptureInputRef.current?.click()}
					onPickFiles={pickBrowserImagingFiles}
					onAnalyzeAI={handleAnalyzeAI}
					isAnalyzingAI={isAnalyzingAI}
					onOpenCbctStudio={() => setIsCbctStudioOpen(true)}
					onOpenPanoramic={() => setIsPanoramicWindowOpen(true)}
					onOpenRadiologyModule={() => setIsRadiologyModuleOpen(true)}
				/>
			</div>

			{/* 2. DESKTOP WORKSPACE (>=768px, Dense Clinical Cockpit 32–36px) */}
			<div className="hidden md:flex md:flex-col gap-3.5 w-full">
				<ImagingHeader
					activePatient={activePatient}
					activeAppointment={activeAppointment}
					activeImagingStudies={activeImagingStudies}
					selectedImagingViewerPlan={selectedImagingViewerPlan}
					isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
					isCapturingCameraPhoto={isCapturingCameraPhoto}
					onPickFolder={() => void pickBrowserImagingFolder()}
					onPickFiles={pickBrowserImagingFiles}
					onCaptureCamera={() => cameraCaptureInputRef.current?.click()}
					onOpenCbctStudio={() => setIsCbctStudioOpen(true)}
					onOpenPanoramic={() => setIsPanoramicWindowOpen(true)}
					onOpenRadiologyModule={() => setIsRadiologyModuleOpen(true)}
					onOpenCtSelector={() => setIsCtSelectorOpen(true)}
				/>

				{/* Kind Filter */}
				<div className="imaging-kind-filter" role="tablist" aria-label="Фильтр типа снимка">
					<button
						className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === "all" ? "active" : ""}`}
						type="button"
						role="tab"
						aria-selected={imagingKindFilter === "all"}
						onClick={() => setImagingKindFilter("all")}
					>
						Все
					</button>
					{(imagingKindOptions ?? []).map((kind: any) => (
						<button
							className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === kind ? "active" : ""}`}
							key={kind}
							type="button"
							role="tab"
							aria-selected={imagingKindFilter === kind}
							onClick={() => setImagingKindFilter(kind)}
						>
							{imagingKindLabels[kind] || kind}
						</button>
					))}
				</div>

				<div className="imaging-layout">
					<article className="imaging-viewer">
						{selectedImagingStudy || localImageIds?.length > 0 || browserPickedImagingFolder ? (
							<>
								{/* Direct inline rendering of CBCT card to satisfy exact test selector queries */}
								{isCbctActive ? (
									<div
										data-testid="cbct-study-active-card"
										className="w-full h-full flex flex-col gap-4 p-4 min-h-[500px]"
									>
										<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
											<div className="flex flex-col gap-1 text-left min-w-0">
												<div className="flex items-center gap-2">
													<span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
													<strong className="text-sm font-semibold text-[var(--ink)] truncate">
														КЛКТ 3D: {selectedImagingStudy?.title || (localImageIds?.length > 0 ? `Серия срезов (${localImageIds.length})` : "Томограмма 3D")}
													</strong>
													<span className="px-2 py-0.5 text-[11px] font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
														Архив КЛКТ 3D
													</span>
												</div>
												<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
													{isDicomwebLoading ? (
														<span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1.5">
															<RefreshCw size={12} className="animate-spin" />
															{dicomwebLoadProgress ?? "Подключение к PACS архиву..."}
														</span>
													) : localImageIds?.length > 0 ? (
														<span>Готово к просмотру: {localImageIds.length} срезов (локальный архив)</span>
													) : (
														<span>Автономный доступ: 3D Студия Romexis, мультипланарная реконструкция или загрузка из архива</span>
													)}
												</div>
											</div>

											<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
												<button
													type="button"
													data-testid="btn-open-cbct-studio"
													onClick={() => setIsCbctStudioOpen(true)}
													className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
													title="Открыть Romexis 3D Студию с панорамой, осями и расчётом безопасности нерва"
												>
													<Sparkles size={14} className="shrink-0" />
													<span>3D Студия имплантации</span>
												</button>

												<button
													type="button"
													data-testid="btn-load-dicomweb-pacs"
													onClick={() => handleLoadFromDicomweb()}
													disabled={isDicomwebLoading}
													className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-none"
													title="Запросить срезы из архива КЛКТ 3D"
												>
													<RefreshCw size={14} className={`shrink-0 ${isDicomwebLoading ? "animate-spin" : ""}`} />
													<span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "Загрузить из PACS"}</span>
												</button>
											</div>
										</div>

										<div className="flex-1 flex flex-col min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
											<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
												<DicomArchiveUploader
													onImagesLoaded={(imageIds) => {
														setLocalImageIds(imageIds);
														setIsCbctStudioOpen(true);
													}}
													className="w-full flex-1"
												/>
											</Suspense>
										</div>
									</div>
								) : (
									<ImagingViewport
										selectedImagingStudy={selectedImagingStudy}
										localImageIds={localImageIds}
										setLocalImageIds={setLocalImageIds}
										browserPickedImagingFolder={browserPickedImagingFolder}
										imagingViewerState={imagingViewerState}
										setImagingViewerState={setImagingViewerState}
										computedViewerImageStyle={computedViewerImageStyle}
										effectivePreviewUrl={effectivePreviewUrl}
										isPreviewLoading={isPreviewLoading}
										previewLoadError={previewLoadError}
										selectedStudyHasFile={selectedStudyHasFile}
										imagingKindLabels={imagingKindLabels}
										isDicomwebLoading={isDicomwebLoading}
										dicomwebLoadProgress={dicomwebLoadProgress}
										onOpenCbctStudio={() => setIsCbctStudioOpen(true)}
										onLoadFromDicomweb={() => handleLoadFromDicomweb()}
										enhancementOn={enhancementOn}
										isRulerActive={isRulerActive}
										currentPixelSpacingMm={currentPixelSpacingMm}
										rulerMeasurements={rulerMeasurements}
										setRulerMeasurements={setRulerMeasurements}
										isPanActive={isPanActive}
										onAttachFile={pickBrowserImagingFiles}
										isAnalyzingAI={isAnalyzingAI}
										onAnalyzeAI={handleAnalyzeAI}
										selectedStudySummary={selectedStudySummary}
										pendingAiProposal={pendingAiProposal}
										setPendingAiProposal={setPendingAiProposal}
									/>
								)}

								{/* Toolbar for 2D X-Ray & Photos */}
								{!isCbctActive && (
									<ImagingToolbar
										selectedImagingStudy={selectedImagingStudy}
										imagingViewerState={imagingViewerState}
										setImagingViewerState={setImagingViewerState}
										enhancementOn={enhancementOn}
										setEnhancementOn={setEnhancementOn}
										isRulerActive={isRulerActive}
										setIsRulerActive={setIsRulerActive}
										isPanActive={isPanActive}
										setIsPanActive={setIsPanActive}
										rulerMeasurements={rulerMeasurements}
										setRulerMeasurements={setRulerMeasurements}
										onReset={() => {
											setImagingViewerState({
												...defaultImagingViewerState,
												pan: { x: 0, y: 0 },
											});
											if (setImagingViewerActiveTool) setImagingViewerActiveTool("window_level");
											if (setCtPlanningActiveQuickActionId) setCtPlanningActiveQuickActionId(null);
											if (setCtPlanningImplantPlan) setCtPlanningImplantPlan(null);
											setIsRulerActive(false);
											setIsPanActive(false);
											setRulerMeasurements([]);
										}}
										imagingViewerNote={imagingViewerNote}
										setImagingViewerNote={setImagingViewerNote}
										imagingViewerSaveState={imagingViewerSaveState}
										imagingViewerSaveTitle={imagingViewerSaveTitle}
										imagingViewerSaveDetail={imagingViewerSaveDetail}
										imagingViewerNoteReady={imagingViewerNoteReady}
										imagingViewerSessionReady={imagingViewerSessionReady}
										imagingViewerNoteMissingId={imagingViewerNoteMissingId}
										imagingViewerRetryMissingId={imagingViewerRetryMissingId}
										canRetryImagingViewerSave={canRetryImagingViewerSave}
										retryImagingViewerSessionSave={retryImagingViewerSessionSave}
										addImagingViewerNoteAnnotation={addImagingViewerNoteAnnotation}
										imagingViewerAnnotations={imagingViewerAnnotations}
										formatShortDate={formatShortDate}
										isOnline={isOnline}
									/>
								)}

								{selectedStudySummary && (
									<div className="sa-report-column">
										<ShadowAnalystReport
											summary={selectedStudySummary}
											toothUpdates={selectedStudyToothUpdates as any}
											studyTitle={selectedImagingStudy.title}
										/>
									</div>
								)}
							</>
						) : (
							<div className="w-full h-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-[420px]">
								<Suspense fallback={null}>
									<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full h-full min-h-[380px]" />
								</Suspense>
							</div>
						)}
					</article>

					{/* Studies List Sidebar */}
					<ImagingStudyList
						visibleImagingStudies={visibleImagingStudies}
						activeImagingStudies={activeImagingStudies}
						selectedImagingStudy={selectedImagingStudy}
						activePatient={activePatient}
						imagingKindFilter={imagingKindFilter}
						setImagingKindFilter={setImagingKindFilter}
						imagingKindLabels={imagingKindLabels}
						imagingSourceLabels={imagingSourceLabels}
						imagingPreviewSource={imagingPreviewSource}
						imagingViewerHref={imagingViewerHref}
						onSelectStudy={(id) => {
							if (setSelectedImagingStudyId) setSelectedImagingStudyId(id);
						}}
						formatShortDate={formatShortDate}
					/>
				</div>

				{/* 3. CBCT MPR Panel (extracted to Layer 4 ImagingMprPanel) */}
				{selectedImagingStudy?.kind === "cbct" ? (
					<ImagingMprPanel
						{...props}
						selectedImagingStudy={selectedImagingStudy}
						imagingViewerHref={imagingViewerHref}
						selectedImagingViewerPlan={selectedImagingViewerPlan}
						setLocalImageIds={setLocalImageIds}
					/>
				) : null}
			</div>

			{/* Backoffice Modals */}
			{isPanoramicWindowOpen && (
				<div className="panoramic-recon-window-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80">
					<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
						<PanoramicRendererWindow
							volume={null}
							splinePoints={[]}
							onClose={() => setIsPanoramicWindowOpen(false)}
							patientId={activePatient?.id ?? null}
						/>
					</Suspense>
				</div>
			)}

			{isRadiologyModuleOpen && (
				<div className="radiology-module-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4">
					<div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] p-4 shadow-2xl">
						<RadiologyModule
							patient={
								activePatient
									? {
											id: activePatient.id,
											fullName: activePatient.fullName || activePatient.name,
											birthDate: activePatient.birthDate,
											phone: activePatient.phone,
											cardNumber: activePatient.cardNumber,
											medicalCardNumber: activePatient.medicalCardNumber,
										}
									: null
							}
							doctorName={activeAppointment?.doctorName}
							clinicName={auth?.clinic?.name || "ООО «ДЕНТЕ»"}
							onClose={() => setIsRadiologyModuleOpen(false)}
						/>
					</div>
				</div>
			)}

			<ImagingExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				study={selectedImagingStudy}
				patient={activePatient}
				doctorName={activeAppointment?.doctorName}
				clinicName={auth?.clinic?.name}
				previewUrl={effectivePreviewUrl}
				reportSummary={selectedStudySummary}
			/>

			{isCtSelectorOpen && (
				<CtSelectorModal
					isOpen={true}
					onClose={() => setIsCtSelectorOpen(false)}
					patientId={activePatient?.id}
					patientName={activePatient?.name ?? activePatient?.fullName}
					cardNumber={activePatient?.cardNumber ?? activePatient?.medicalCardNumber}
					studies={activeImagingStudies}
					onSelectStudy={(study) => {
						if (study?.id && setSelectedImagingStudyId) {
							setSelectedImagingStudyId(study.id);
						}
					}}
					onOpenCbctStudio={(study, imageIds) => {
						if (imageIds && imageIds.length > 0) {
							setLocalImageIds(imageIds);
						}
						if (study?.id && setSelectedImagingStudyId) {
							setSelectedImagingStudyId(study.id);
						}
						routeOpenCbctPopout({
							patientId: activePatient?.id,
							patientName: activePatient?.name ?? activePatient?.fullName,
							studyId: study?.id ?? selectedImagingStudy?.id,
							mode: "mpr",
						});
						showToast("3D КЛКТ Студия запущена на втором мониторе", "info");
					}}
					onImagesLoaded={(imageIds, studyMeta) => {
						setLocalImageIds(imageIds);
						if (studyMeta?.id && setSelectedImagingStudyId) {
							setSelectedImagingStudyId(studyMeta.id);
						}
						routeOpenCbctPopout({
							patientId: activePatient?.id,
							patientName: activePatient?.name ?? activePatient?.fullName,
							studyId: studyMeta?.id ?? selectedImagingStudy?.id,
							mode: "mpr",
						});
						showToast("3D КЛКТ Студия запущена на втором мониторе", "info");
					}}
				/>
			)}
		</section>
	);
}
