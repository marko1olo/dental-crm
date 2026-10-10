import React, {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { useAppLogicContext } from "./contexts/AppLogicContext";
import { readDenteClinicToken, readDenteStaffToken } from "./lib/safeLocalStorage";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { showToast } from "./components/GlobalToast";
import { DicomArchiveUploader } from "./components/imaging/DicomArchiveUploader";
import { MobileChairsideRadiologyViewer } from "./components/radiology/MobileChairsideRadiologyViewer.js";
import { CtSelectorModal } from "./components/radiology/CtSelectorModal";
import { routeOpenCbctPopout } from "./utils/runtimeRouter";

import {
	imagingKindLabels as defaultImagingKindLabels,
	imagingKindOptions as defaultImagingKindOptions,
	imagingSourceLabels as defaultImagingSourceLabels,
} from "./imagingUiLabels";
import {
	Imaging2dViewerSection,
	ImagingAuxiliaryModals,
	ImagingHeader,
	ImagingHiddenInputs,
	ImagingMprPanel,
	ImagingStudyList,
	computeViewerImageStyle,
	imagingStudyHasFile,
	processCameraPhotoCapture,
	useEffectiveMprProps,
	useImagingAiAnalysis,
	useImagingPreviewBlob,
	type AiProposal,
	type ViewerRulerMeasurement,
} from "./components/imaging";

// Mandate 8s / Tier 3: Ленивая загрузка тяжелых 3D DICOM / КТ движков
const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("./components/radiology/CbctMprImplantStudioModal.js").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);

/**
 * Безопасная миниатюра снимка: при 403 или ошибке загрузки рендерит аккуратный векторный датчик.
 * Сохраняет фиксированные размеры 48x48px (aspectRatio: 1 / 1) для нулевого CLS.
 */
export function ImagingStudyThumbnail({ study, previewSrc }: { study: any; previewSrc?: string }) {
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

// biome-ignore lint/suspicious/noExplicitAny: generic CRM views host props
type ImagingViewProps = Record<string, any>;

export function ImagingView(props: ImagingViewProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const {
		activeAppointment, activeImagingStudies, activePatient,
		attachBrowserDirectoryInputRef, browserImagingFileInputAccept,
		browserPickedImagingFolder, defaultImagingViewerState,
		formatShortDate, handleBrowserDirectoryInputChange,
		imagingKindFilter = "all", imagingPreviewSource, imagingViewerHref,
		imagingViewerState, isBrowserImagingFolderPicking,
		pickBrowserImagingFolder, selectedImagingStudy, selectedImagingViewerPlan,
		setImagingKindFilter, setSelectedImagingStudyId, visibleImagingStudies,
	} = props;
	const imagingKindLabels = props.imagingKindLabels ?? defaultImagingKindLabels;
	const imagingKindOptions = props.imagingKindOptions ?? defaultImagingKindOptions;
	const imagingSourceLabels = props.imagingSourceLabels ?? defaultImagingSourceLabels;

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
	const [isCapturingCameraPhoto, setIsCapturingCameraPhoto] = useState(false);
	const browserImagingFilesInputRef = props.browserImagingFilesInputRef || localFilesInputRef;
	const pickBrowserImagingFiles = props.pickBrowserImagingFiles || (() => browserImagingFilesInputRef.current?.click());

	const [localImageIds, setLocalImageIds] = useState<string[]>([]);

	// Anti-Matryoshka / Exclusive Modal Coordinator (Depth strictly = 1)
	type ImagingModalId =
		| null
		| "ct_selector"
		| "cbct_studio"
		| "panoramic"
		| "radiology_module"
		| "export"
		| "comparison";

	const [activeModal, setActiveModal] = useState<ImagingModalId>(null);
	const isCtSelectorOpen = activeModal === "ct_selector";
	const setIsCtSelectorOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "ct_selector" : prev === "ct_selector" ? null : prev));
	}, []);
	const isCbctStudioOpen = activeModal === "cbct_studio";
	const setIsCbctStudioOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "cbct_studio" : prev === "cbct_studio" ? null : prev));
	}, []);
	const isPanoramicWindowOpen = activeModal === "panoramic";
	const setIsPanoramicWindowOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "panoramic" : prev === "panoramic" ? null : prev));
	}, []);
	const isRadiologyModuleOpen = activeModal === "radiology_module";
	const setIsRadiologyModuleOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "radiology_module" : prev === "radiology_module" ? null : prev));
	}, []);
	const isExportModalOpen = activeModal === "export";
	const setIsExportModalOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "export" : prev === "export" ? null : prev));
	}, []);
	const isComparisonOpen = activeModal === "comparison";
	const setIsComparisonOpen = useCallback((open: boolean) => {
		setActiveModal((prev) => (open ? "comparison" : prev === "comparison" ? null : prev));
	}, []);

	// Global Escape key handler for exclusive depth=1 modal dismissal
	useEffect(() => {
		if (!activeModal) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				setActiveModal(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeModal]);

	const authHeaders = useMemo(() => {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const token = auth?.token || staffToken || clinicToken;
		return {
			...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		};
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
				const qidoRes = await fetch(qidoUrl, { headers: { Accept: "application/dicom+json", ...authHeaders } });
				if (qidoRes.ok) {
					const studies = (await qidoRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
					if (Array.isArray(studies) && studies.length > 0) {
						studyUid = studies[0]?.["0020000D"]?.Value?.[0] as string | undefined;
					}
				}
			}
			if (!studyUid) throw new Error("Не найден UID исследования КТ в DICOMweb PACS.");

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
			if (!seriesUid) throw new Error("Не найдена серия снимков в исследовании PACS.");

			setDicomwebLoadProgress("Загрузка метаданных серии WADO-RS...");
			const metaRes = await fetch(`${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/metadata`, {
				headers: { Accept: "application/dicom+json", ...authHeaders },
			});
			if (!metaRes.ok) throw new Error(`Ошибка загрузки метаданных серии: HTTP ${metaRes.status}`);
			const metaJson = (await metaRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
			if (!Array.isArray(metaJson) || metaJson.length === 0) throw new Error("В серии DICOMweb не найдено кадров.");

			const wadoImageIds: string[] = [];
			for (const item of metaJson) {
				const sopUid = item?.["00080018"]?.Value?.[0] as string | undefined;
				if (sopUid) {
					const wadoUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`;
					wadoImageIds.push(`wadouri:${wadoUrl}`);
				}
			}
			if (wadoImageIds.length === 0) throw new Error("Не удалось сформировать адреса WADO-RS для кадров серии.");

			setLocalImageIds(wadoImageIds);
			showToast(`Загружено ${wadoImageIds.length} срезов из DICOMweb PACS`, "success");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Сбой загрузки из DICOMweb";
			if (!options?.silentOnError) showToast(msg, "error");
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
		if (studyUid || studyAny.hasDicomweb) handleLoadFromDicomweb({ silentOnError: true });
	}, [selectedImagingStudy, localImageIds, isDicomwebLoading, handleLoadFromDicomweb]);

	const handleCameraPhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
					setSelectedImagingStudyId?.(id);
					setImagingKindFilter?.("photo");
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

	const openPopoutStudio = useCallback((studyId?: string, imageIds?: string[]) => {
		if (imageIds?.length) setLocalImageIds(imageIds);
		if (studyId && setSelectedImagingStudyId) setSelectedImagingStudyId(studyId);
		routeOpenCbctPopout({
			patientId: activePatient?.id,
			patientName: activePatient?.name ?? activePatient?.fullName,
			studyId: studyId ?? selectedImagingStudy?.id,
			mode: "mpr",
		});
		showToast("3D КЛКТ Студия запущена на втором мониторе", "info");
	}, [activePatient, selectedImagingStudy, setSelectedImagingStudyId]);

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ modalId: string }>).detail;
			if (detail?.modalId === "cbct_mpr_workspace" || detail?.modalId === "cbct_implant_studio") openPopoutStudio();
			else if (detail?.modalId === "panoramic_recon_window") setIsPanoramicWindowOpen(true);
		};
		window.addEventListener("dente-open-backoffice-modal", handleOpen);
		return () => window.removeEventListener("dente-open-backoffice-modal", handleOpen);
	}, [openPopoutStudio]);

	const {
		isAnalyzingAI,
		enhancementOn,
		setEnhancementOn,
		selectedStudyHasFile,
		handleAnalyzeAI,
		selectedStudySummary,
		selectedStudyToothUpdates,
	} = useImagingAiAnalysis({ selectedImagingStudy, auth });

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

	const computedViewerImageStyle = useMemo(
		() => computeViewerImageStyle(imagingViewerState || defaultImagingViewerState, isPanActive, props.imagingViewerImageStyle),
		[props.imagingViewerImageStyle, imagingViewerState, defaultImagingViewerState, isPanActive],
	);

	const { effectivePreviewUrl, isPreviewLoading, previewLoadError } = useImagingPreviewBlob({
		selectedImagingStudy,
		imagingPreviewSource,
		auth,
	});

	const isCbctActive = localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct";

	const effectiveMprProps = useEffectiveMprProps(props, appLogic, {
		selectedImagingStudy, setLocalImageIds, selectedImagingViewerPlan, imagingViewerHref,
	});

	return (
		<section className="imaging-panel" id="imaging" aria-label="Снимки пациента">
			<ImagingHiddenInputs
				attachBrowserDirectoryInputRef={attachBrowserDirectoryInputRef}
				browserImagingFilesInputRef={browserImagingFilesInputRef}
				cameraCaptureInputRef={cameraCaptureInputRef}
				browserImagingFileInputAccept={browserImagingFileInputAccept}
				handleBrowserDirectoryInputChange={handleBrowserDirectoryInputChange}
				handleCameraPhotoCapture={handleCameraPhotoCapture}
			/>

			{/* 1. MOBILE CHAIRSIDE RADIOLOGY VIEWER (<768px, Apple HIG) */}
			<div className="block md:hidden w-full h-full">
				<MobileChairsideRadiologyViewer
					selectedImagingStudy={selectedImagingStudy} activeImagingStudies={activeImagingStudies ?? []}
					activePatient={activePatient} onSelectStudy={(id) => setSelectedImagingStudyId?.(id)}
					effectivePreviewUrl={effectivePreviewUrl} isPreviewLoading={isPreviewLoading} previewLoadError={previewLoadError}
					selectedStudyHasFile={selectedStudyHasFile} imagingKindLabels={imagingKindLabels}
					onCaptureCamera={() => cameraCaptureInputRef.current?.click()} onPickFiles={pickBrowserImagingFiles}
					onAnalyzeAI={handleAnalyzeAI} isAnalyzingAI={isAnalyzingAI}
					onOpenCbctStudio={() => setIsCbctStudioOpen(true)} onOpenPanoramic={() => setIsPanoramicWindowOpen(true)}
					onOpenRadiologyModule={() => setIsRadiologyModuleOpen(true)}
				/>
			</div>

			{/* 2. DESKTOP WORKSPACE (>=768px, Dense Clinical Cockpit 32–36px) */}
			<div className="hidden md:flex md:flex-col gap-3.5 w-full">
				<ImagingHeader
					activePatient={activePatient} activeAppointment={activeAppointment} activeImagingStudies={activeImagingStudies}
					selectedImagingViewerPlan={selectedImagingViewerPlan} isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
					isCapturingCameraPhoto={isCapturingCameraPhoto} onPickFolder={() => void pickBrowserImagingFolder()}
					onPickFiles={pickBrowserImagingFiles} onCaptureCamera={() => cameraCaptureInputRef.current?.click()}
					onOpenCbctStudio={() => setIsCbctStudioOpen(true)} onOpenPanoramic={() => setIsPanoramicWindowOpen(true)}
					onOpenRadiologyModule={() => setIsRadiologyModuleOpen(true)} onOpenCtSelector={() => setIsCtSelectorOpen(true)}
					onOpenExport={() => setIsExportModalOpen(true)} onOpenComparison={() => setIsComparisonOpen(true)}
					imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
					imagingKindOptions={imagingKindOptions} imagingKindLabels={imagingKindLabels}
				/>

				<div className="imaging-layout">
					<article className="imaging-viewer">
						{isCbctActive ? (
							<div data-testid="cbct-study-active-card" className="w-full h-full flex flex-col gap-4 p-4 min-h-[500px]">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
									<div className="flex flex-col gap-1 text-left min-w-0">
										<div className="flex items-center gap-2">
											<span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
											<strong className="text-sm font-semibold text-[var(--ink)] truncate">
												КЛКТ 3D: {selectedImagingStudy?.title || (localImageIds?.length > 0 ? `Серия срезов (${localImageIds.length})` : "Томограмма 3D")}
											</strong>
											<span className="px-2 py-0.5 text-[11px] font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">Архив КЛКТ 3D</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
											{isDicomwebLoading ? (
												<span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1.5">
													<RefreshCw size={12} className="animate-spin" /> {dicomwebLoadProgress ?? "Подключение к PACS архиву..."}
												</span>
											) : localImageIds?.length > 0 ? (
												<span>Готово к просмотру: {localImageIds.length} срезов (локальный архив)</span>
											) : (
												<span>Автономный доступ: 3D Студия Romexis, мультипланарная реконструкция или загрузка из архива</span>
											)}
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
										<button type="button" data-testid="btn-open-cbct-studio" onClick={() => setIsCbctStudioOpen(true)} className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none" title="Открыть Romexis 3D Студию">
											<Sparkles size={14} className="shrink-0" /> <span>3D Студия имплантации</span>
										</button>
										<button type="button" data-testid="btn-load-dicomweb-pacs" onClick={() => handleLoadFromDicomweb()} disabled={isDicomwebLoading} className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-none" title="Запросить срезы из архива КЛКТ 3D">
											<RefreshCw size={14} className={`shrink-0 ${isDicomwebLoading ? "animate-spin" : ""}`} /> <span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "Загрузить из PACS"}</span>
										</button>
									</div>
								</div>
								<div className="flex-1 flex flex-col min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
									<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
										<DicomArchiveUploader onImagesLoaded={(imageIds) => { setLocalImageIds(imageIds); setIsCbctStudioOpen(true); }} className="w-full flex-1" />
									</Suspense>
								</div>
							</div>
						) : (
							<Imaging2dViewerSection
								{...({
									...props, selectedImagingStudy, localImageIds, setLocalImageIds,
									browserPickedImagingFolder, imagingViewerState,
									setImagingViewerState: props.setImagingViewerState,
									defaultImagingViewerState, computedViewerImageStyle,
									effectivePreviewUrl, isPreviewLoading, previewLoadError,
									selectedStudyHasFile, imagingKindLabels, isDicomwebLoading,
									dicomwebLoadProgress, onOpenCbctStudio: () => setIsCbctStudioOpen(true),
									onLoadFromDicomweb: () => handleLoadFromDicomweb(),
									enhancementOn, setEnhancementOn, isRulerActive, setIsRulerActive,
									currentPixelSpacingMm, rulerMeasurements, setRulerMeasurements,
									isPanActive, setIsPanActive, pickBrowserImagingFiles,
									isAnalyzingAI, onAnalyzeAI: handleAnalyzeAI, selectedStudySummary,
									selectedStudyToothUpdates, pendingAiProposal, setPendingAiProposal,
								} as any)}
							/>
						)}
					</article>

					{/* Studies List Sidebar */}
					<ImagingStudyList
						visibleImagingStudies={visibleImagingStudies} activeImagingStudies={activeImagingStudies}
						selectedImagingStudy={selectedImagingStudy} activePatient={activePatient}
						imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
						imagingKindLabels={imagingKindLabels} imagingSourceLabels={imagingSourceLabels}
						imagingPreviewSource={imagingPreviewSource} imagingViewerHref={imagingViewerHref}
						onSelectStudy={(id) => setSelectedImagingStudyId?.(id)} formatShortDate={formatShortDate}
					/>
				</div>

				{/* 3. CBCT MPR Panel */}
				{selectedImagingStudy?.kind === "cbct" ? (
					<ImagingMprPanel {...effectiveMprProps} />
				) : null}
			</div>

			{/* Backoffice Modals */}
			{isCbctStudioOpen && (
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
					<CbctMprImplantStudioModal
						isOpen={isCbctStudioOpen}
						onClose={() => setIsCbctStudioOpen(false)}
						study={selectedImagingStudy}
						patientId={activePatient?.id}
						patientName={activePatient?.name ?? activePatient?.fullName}
					/>
				</Suspense>
			)}

			{isCtSelectorOpen && (
				<CtSelectorModal
					isOpen={true}
					onClose={() => setIsCtSelectorOpen(false)}
					patientId={activePatient?.id}
					patientName={activePatient?.name ?? activePatient?.fullName}
					cardNumber={activePatient?.cardNumber ?? activePatient?.medicalCardNumber}
					studies={activeImagingStudies}
					onSelectStudy={(study) => study?.id && setSelectedImagingStudyId?.(study.id)}
					onOpenCbctStudio={(study, ids) => openPopoutStudio(study?.id, ids)}
					onImagesLoaded={(ids, meta) => openPopoutStudio(meta?.id, ids)}
				/>
			)}

			<ImagingAuxiliaryModals
				isPanoramicWindowOpen={isPanoramicWindowOpen} setIsPanoramicWindowOpen={setIsPanoramicWindowOpen}
				isRadiologyModuleOpen={isRadiologyModuleOpen} setIsRadiologyModuleOpen={setIsRadiologyModuleOpen}
				isExportModalOpen={isExportModalOpen} setIsExportModalOpen={setIsExportModalOpen}
				isComparisonOpen={isComparisonOpen} setIsComparisonOpen={setIsComparisonOpen}
				activeImagingStudies={activeImagingStudies}
				selectedImagingStudy={selectedImagingStudy} activePatient={activePatient}
				activeAppointment={activeAppointment} authClinicName={auth?.clinic?.name}
				effectivePreviewUrl={effectivePreviewUrl} selectedStudySummary={selectedStudySummary}
			/>
		</section>
	);
}
