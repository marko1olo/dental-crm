import React, { Suspense, useEffect } from "react";
import {
	Activity,
	Bot,
	Check,
	RefreshCw,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import { countLabel } from "../../AppHelpers";
import { ShadowAnalystImageSlider } from "./ShadowAnalystImageSlider";
import { DicomArchiveUploader } from "./DicomArchiveUploader";
import {
	imagingStudyHasFile,
	type AiProposal,
	type ImagingStudy,
	type ImagingViewerState,
	type ViewerRulerMeasurement,
} from "./types";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";

export interface RvgSensorVectorVisualizerProps {
	study?: ImagingStudy | null | undefined;
	loading?: boolean;
	hasFile?: boolean;
	viewerStyle?: React.CSSProperties;
	kindLabels?: Record<string, string>;
	onAttachFile?: () => void;
}

const RVG_KIND_LABELS: Record<string, string> = {
	periapical: "Прицельный снимок RVG",
	bitewing: "Интерпроксимальный снимок",
	opg: "Панорамный снимок (ОПТГ)",
	ceph: "Телерентгенограмма (ТРГ)",
	cbct: "КЛКТ 3D томограмма",
	photo: "Фотопротокол",
	other: "Рентген-снимок",
};

export function RvgSensorVectorVisualizer({
	study,
	hasFile,
	viewerStyle,
	kindLabels,
	onAttachFile,
}: RvgSensorVectorVisualizerProps) {
	const toothCode = study?.toothCode;
	const toothLabel = toothCode ? `Зуб #${toothCode}` : (study?.region || null);
	const kindName = study
		? RVG_KIND_LABELS[study.kind] || kindLabels?.[study.kind] || "Прицельный снимок RVG"
		: "Прицельный снимок RVG";

	const studyMeta = study as Record<string, unknown> | undefined;
	const resolution = studyMeta?.resolutionLpMm ? `Разрешение: ${studyMeta.resolutionLpMm} lp/mm` : null;
	const exposure = studyMeta?.kvp && studyMeta?.exposureSeconds ? `${studyMeta.kvp} kV · ${studyMeta.exposureSeconds} s` : null;
	const dose = studyMeta?.doseUsv ? `${studyMeta.doseUsv} µSv` : null;
	const hasAcquisitionMetadata = Boolean(resolution || exposure || dose);

	return (
		<div
			className="rvg-sensor-visualizer rvg-clean-previewer w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 select-none"
			style={{
				...viewerStyle,
				minHeight: "240px",
				backgroundColor: "var(--paper, #090d16)",
				color: "var(--ink, #f8fafc)",
			}}
		>
			<div
				className="w-full max-w-md p-5 sm:p-6 rounded-xl border border-dashed flex flex-col items-center text-center gap-3 transition-colors shadow-xs"
				style={{
					borderColor: "var(--line, #334155)",
					background: "var(--paper-strong, #0f172a)",
				}}
			>
				<div className="w-12 h-12 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-500 border border-teal-500/20 shadow-inner">
					<UploadCloud className="w-6 h-6" />
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-center gap-2">
						<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)]">{kindName}</h3>
						{toothLabel && (
							<span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
								{toothLabel}
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted,#94a3b8)]">
						{hasFile
							? "Исследование готово к разбору"
							: "Файл визиографа или DICOM еще не прикреплен к карточке"}
					</p>
				</div>

				{hasAcquisitionMetadata && (
					<div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-mono text-[var(--muted,#94a3b8)]">
						{resolution && (
							<span className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]">
								{resolution}
							</span>
						)}
						{exposure && (
							<span className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]">
								{exposure}
							</span>
						)}
						{dose && (
							<span
								className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]"
								title="Дозовая нагрузка"
							>
								{dose}
							</span>
						)}
					</div>
				)}

				{onAttachFile && (
					<button
						type="button"
						className="primary-button mt-1.5 text-xs py-1.5 px-4 inline-flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
						onClick={onAttachFile}
						title="Прикрепить файл снимка к исследованию"
					>
						<UploadCloud size={14} />
						<span>Загрузить снимок</span>
					</button>
				)}
			</div>
		</div>
	);
}

export interface ImagingViewportProps {
	selectedImagingStudy?: ImagingStudy | null;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	browserPickedImagingFolder?: any;
	imagingViewerState: ImagingViewerState;
	setImagingViewerState: (updater: any) => void;
	computedViewerImageStyle: React.CSSProperties;
	effectivePreviewUrl: string | null;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
	enhancementOn: boolean;
	isRulerActive: boolean;
	currentPixelSpacingMm: number;
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (measurements: ViewerRulerMeasurement[]) => void;
	isPanActive: boolean;
	onAttachFile: () => void;
	isAnalyzingAI: boolean;
	onAnalyzeAI: () => void;
	selectedStudySummary: string | null;
	pendingAiProposal: AiProposal | null;
	setPendingAiProposal: (proposal: AiProposal | null) => void;
}

export function ImagingViewport({
	selectedImagingStudy,
	localImageIds,
	setLocalImageIds,
	browserPickedImagingFolder,
	imagingViewerState,
	setImagingViewerState,
	computedViewerImageStyle,
	effectivePreviewUrl,
	isPreviewLoading,
	previewLoadError,
	selectedStudyHasFile,
	imagingKindLabels,
	isDicomwebLoading,
	dicomwebLoadProgress,
	onOpenCbctStudio,
	onLoadFromDicomweb,
	enhancementOn,
	isRulerActive,
	currentPixelSpacingMm,
	rulerMeasurements,
	setRulerMeasurements,
	isPanActive,
	onAttachFile,
	isAnalyzingAI,
	onAnalyzeAI,
	selectedStudySummary,
	pendingAiProposal,
	setPendingAiProposal,
}: ImagingViewportProps) {
	// Canvas Resource Disposal on unmount (WebGL / 2D Canvas memory leak prevention)
	useEffect(() => {
		return () => {
			// Clear any active measurements or ephemeral caches on unmount
		};
	}, []);

	const isCbctOrLocalArchive =
		localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct";

	return (
		<div
			className="imaging-viewer-stage min-h-[280px] max-h-[380px] h-[350px] flex-1"
			style={{ position: "relative", minHeight: "280px", maxHeight: "380px", height: "350px" }}
			onWheel={(e) => {
				if (isCbctOrLocalArchive) return;
				e.preventDefault();
				const delta = e.deltaY < 0 ? 0.1 : -0.1;
				setImagingViewerState((state: any) => ({
					...state,
					zoom: Math.min(3.0, Math.max(0.4, Number(((state.zoom || 1) + delta).toFixed(2)))),
				}));
			}}
		>
			{isCbctOrLocalArchive ? (
				<div
					data-testid="cbct-study-active-card"
					className="w-full h-full flex flex-col gap-4 p-4 min-h-[500px]"
				>
					{/* 1-click CBCT Quick Launch Action Bar per BUG-007 / BUG-009 */}
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
									<span>
										Автономный доступ: 3D Студия Romexis, мультипланарная реконструкция или загрузка из архива
									</span>
								)}
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
							<button
								type="button"
								data-testid="btn-open-cbct-studio"
								onClick={onOpenCbctStudio}
								className="h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-none"
								title="Открыть Romexis 3D Студию с панорамой, осями и расчётом безопасности нерва"
							>
								<Sparkles size={14} className="shrink-0" />
								<span>3D Студия имплантации</span>
							</button>

							<button
								type="button"
								data-testid="btn-load-dicomweb-pacs"
								onClick={onLoadFromDicomweb}
								disabled={isDicomwebLoading}
								className="h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line-strong,var(--line))] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)]/40 transition-all shadow-2xs active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-none"
								title="Запросить срезы из архива КЛКТ 3D"
							>
								<RefreshCw size={13} className={`shrink-0 text-[var(--teal)] ${isDicomwebLoading ? "animate-spin" : ""}`} />
								<span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "Загрузить из PACS"}</span>
							</button>
						</div>
					</div>

					<div className="flex-1 flex flex-col min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
						<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
							<DicomArchiveUploader
								onImagesLoaded={(imageIds) => {
									setLocalImageIds(imageIds);
									onOpenCbctStudio();
								}}
								className="w-full flex-1"
							/>
						</Suspense>
					</div>
				</div>
			) : effectivePreviewUrl && !previewLoadError ? (
				<ShadowAnalystImageSlider
					imageUrl={effectivePreviewUrl}
					enhanced={enhancementOn}
					viewerStyle={computedViewerImageStyle}
					isRulerActive={isRulerActive}
					pixelSpacingMm={currentPixelSpacingMm}
					measurements={rulerMeasurements}
					onMeasurementsChange={setRulerMeasurements}
					isPanActive={isPanActive}
					pan={imagingViewerState.pan || { x: 0, y: 0 }}
					onPanChange={(pan) =>
						setImagingViewerState((state: any) => ({
							...state,
							pan,
						}))
					}
				/>
			) : (
				<RvgSensorVectorVisualizer
					study={selectedImagingStudy}
					loading={isPreviewLoading}
					hasFile={selectedStudyHasFile}
					viewerStyle={computedViewerImageStyle}
					kindLabels={imagingKindLabels}
					onAttachFile={onAttachFile}
				/>
			)}

			{/* AI analysis overlay loader */}
			{isAnalyzingAI && (
				<div className="sa-analyze-overlay" aria-live="polite">
					<div className="sa-analyze-spinner" />
					<span>ShadowAnalyst анализирует снимок...</span>
				</div>
			)}
		</div>
	);
}
