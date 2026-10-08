import React, { Suspense } from "react";
import {
	ExternalLink,
	RefreshCw,
	UploadCloud,
} from "lucide-react";
import { DicomArchiveUploader } from "./DicomArchiveUploader";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { MprWindowPreset } from "./types";
import { ImagingMprSliders } from "./ImagingMprSliders";

const CtPlanningToolsPanel = lazyWithRetry(() =>
	import("../../ctPlanningTools").then((module) => ({
		default: module.CtPlanningToolsPanel,
	})),
);

export interface ImagingMprPanelProps {
	selectedImagingStudy?: any;
	imagingViewerHref: (study: any) => string;
	selectedImagingViewerPlan?: any;
	dicomViewerWorkbenchManifest?: any;
	dicomLabel?: any;
	dicomQualityModeLabels?: any;
	dicomTextureStrategyLabels?: any;
	imagingViewerSaveTitle: Record<string, string>;
	imagingViewerSaveState: string;
	imagingViewerAnnotations?: any[];
	mprClinicalNextStep?: string;
	mprClinicalChecklist?: any[];
	mprOperatorSummaryCards?: any[];
	mprControlsReady: boolean;
	imagingViewerActiveTool: string;
	ctPlanningActiveQuickActionId?: string | null;
	applyCtPlanningQuickAction: (actionId: string) => void;
	ctPlanningImplantPlan?: any;
	selectCtPlanningImplant: (implantId: string | null) => void;
	ctPlanningAnnotationRefs?: any[];
	createCtPlanningArtifact?: () => void;
	dicomViewerToolStateBundle?: any;
	mprControlsAutoOpen?: boolean;
	setLocalImageIds: (ids: string[]) => void;
	cbctWorkbenchPlanes?: any[];
	cbctWorkbenchProjections?: string[];
	mprProjection?: string;
	setMprProjection: (proj: string) => void;
	mprSeriesRequiredProjectionLabel?: string;
	mprUnavailableProjectionLabel?: string;
	mprAxisVisualizerStyle?: React.CSSProperties;
	mprAxisVisualizerLabel?: string;
	handleMprKeyboardNavigation?: (e: React.KeyboardEvent) => void;
	mprProjectionCompass?: any;
	mprCrosshairEnabled?: boolean;
	mprAxisAngleBadge?: string;
	mprSlabBadge?: string;
	mprSliceBadge?: string;
	mprActiveProjectionLabel?: string;
	mprActiveProjectionOrientation?: string;
	mprAxisDirectionLabel?: string;
	mprSlabMm?: number;
	mprSliceLabel?: string;
	mprAxisGuidance?: any;
	mprWorkbenchSummaryText?: string;
	mprLinkedPlanesEnabled?: boolean;
	mprNearestClinicalPreset?: any;
	applyNearestMprClinicalPreset?: () => void;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue?: string;
	mprAxisBounds: { min: number; max: number };
	clampMprAxisDeg: (deg: number) => number;
	setMprAxisDeg: (deg: number) => void;
	mprAxisNudgeDeg?: number[];
	formatSignedMprStep: (val: number, unit: string) => string;
	mprAxisPresetDeg?: number[];
	mprSlabRangeValue?: string;
	mprSlabBounds: { min: number; max: number };
	clampMprSlabMm: (mm: number) => number;
	setMprSlabMm: (mm: number) => void;
	mprSlabNudgeMm?: number[];
	mprSlabPresetMm?: number[];
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue?: string;
	clampMprSliceIndex: (idx: number, max: number) => number;
	setMprSliceIndex: (idx: number) => void;
	mprSliceNudgeSteps?: number[];
	mprSlicePresetFractions?: any[];
	mprSliceIndexFromFraction: (frac: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt?: any;
	formatTime: (t: any) => string;
	mprWorkbenchDraftRestored?: boolean;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets?: any[];
	describeMprClinicalPresetProjectionFallback: any;
	mprClinicalPresetButtonClass?: any;
	applyMprClinicalPreset?: any;
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset: string;
	setMprWindowPreset: (preset: any) => void;
	setMprCrosshairEnabled: (enabled: boolean) => void;
	setMprLinkedPlanesEnabled: (enabled: boolean) => void;
	cbctWorkbenchSeries?: any;
}

export function ImagingMprPanel(props: ImagingMprPanelProps) {
	const {
		selectedImagingStudy,
		imagingViewerHref,
		selectedImagingViewerPlan,
		dicomViewerWorkbenchManifest,
		dicomLabel,
		dicomQualityModeLabels,
		dicomTextureStrategyLabels,
		imagingViewerSaveTitle,
		imagingViewerSaveState,
		imagingViewerAnnotations,
		mprClinicalNextStep,
		mprClinicalChecklist,
		mprOperatorSummaryCards,
		mprControlsReady,
		imagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		applyCtPlanningQuickAction,
		ctPlanningImplantPlan,
		selectCtPlanningImplant,
		ctPlanningAnnotationRefs,
		createCtPlanningArtifact,
		dicomViewerToolStateBundle,
		mprControlsAutoOpen,
		setLocalImageIds,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		mprProjection,
		setMprProjection,
		mprSeriesRequiredProjectionLabel,
		mprUnavailableProjectionLabel,
		mprAxisVisualizerStyle,
		mprAxisVisualizerLabel,
		handleMprKeyboardNavigation,
		mprProjectionCompass,
		mprCrosshairEnabled,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisDirectionLabel,
		mprSlabMm,
		mprSliceLabel,
		mprAxisGuidance,
		mprWorkbenchSummaryText,
		mprLinkedPlanesEnabled,
		mprNearestClinicalPreset,
		applyNearestMprClinicalPreset,
		mprProjectionLabels,
		mprAxisDeg,
		mprAxisRangeValue,
		mprAxisBounds,
		clampMprAxisDeg,
		setMprAxisDeg,
		mprAxisNudgeDeg,
		formatSignedMprStep,
		mprAxisPresetDeg,
		mprSlabRangeValue,
		mprSlabBounds,
		clampMprSlabMm,
		setMprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		mprSliceRangeValue,
		clampMprSliceIndex,
		setMprSliceIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceIndexFromFraction,
		resetMprControls,
		mprWorkbenchLocalSavedAt,
		formatTime,
		mprWorkbenchDraftRestored,
		restoreMprWorkbenchLocalDraft,
		mprClinicalPresets,
		describeMprClinicalPresetProjectionFallback,
		mprClinicalPresetButtonClass,
		applyMprClinicalPreset,
		mprWindowPresetLabels,
		mprWindowPreset,
		setMprWindowPreset,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		cbctWorkbenchSeries,
	} = props;

	return (
		<section
			className="clinical-mpr-panel"
			aria-label="Управление КЛКТ и КТ-срезами"
		>
			<div className="clinical-mpr-head">
				<div>
					<p className="eyebrow">Рабочее место КЛКТ</p>
					<h3>
						3 плоскости, косой срез, панорама и внешний КТ-просмотрщик
					</h3>
					<small>
						Основной прием не блокируется: если серия тяжелая, CRM оставляет
						предпросмотр и предлагает внешний просмотр или локальный модуль
						объема.
					</small>
				</div>
				<a
					className="secondary-button"
					href={imagingViewerHref(selectedImagingStudy)}
					target="_blank"
					rel="noreferrer noopener"
					aria-label={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy?.title}`}
					title={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy?.title}`}
				>
					<ExternalLink aria-hidden="true" /> КТ-просмотрщик
				</a>
			</div>
			<section
				className="clinical-mpr-summary-grid"
				aria-label="Краткий статус КЛКТ"
			>
				<article>
					<strong>
						{selectedImagingViewerPlan?.mode === "cbct_mpr"
							? "Маршрут КТ-срезов"
							: "Быстрый предпросмотр"}
					</strong>
					<span>
						{selectedImagingViewerPlan?.nextAction ??
							"Откройте КТ-просмотрщик, когда нужен 3D-разбор."}
					</span>
				</article>
				<article>
					<strong>
						{dicomViewerWorkbenchManifest
							? `готовность загрузки ${dicomViewerWorkbenchManifest.readiness.readinessScore}%`
							: "Рабочее место опционально"}
					</strong>
					<span>
						{dicomViewerWorkbenchManifest
							? `${dicomLabel(dicomQualityModeLabels, dicomViewerWorkbenchManifest.renderCachePlan.qualityMode, "режим качества")} / ${dicomLabel(
									dicomTextureStrategyLabels,
									dicomViewerWorkbenchManifest.renderCachePlan
										.textureStrategy,
									"план загрузки",
								)}`
							: "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
					</span>
				</article>
				<article>
					<strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
					<span>
						{imagingViewerAnnotations?.length} разметок; исходные снимки
						остаются в просмотрщике или исходной папке.
					</span>
				</article>
			</section>
			<section
				className="mpr-clinical-roadmap"
				data-testid="ct-mpr-clinical-roadmap"
				aria-label="Клиническая готовность КТ-срезов"
			>
				<div className="mpr-clinical-roadmap-head">
					<strong>Карта КТ-срезов</strong>
					<span>{mprClinicalNextStep}</span>
				</div>
				<div className="mpr-clinical-roadmap-steps">
					{(mprClinicalChecklist ?? []).map((item: any) => (
						<article
							className={`mpr-clinical-step status-${item.status}`}
							key={item.id}
						>
							<strong>{item.title}</strong>
							<span>{item.detail}</span>
						</article>
					))}
				</div>
			</section>
			<section
				className="mpr-operator-summary"
				data-testid="ct-mpr-operator-summary"
				aria-label="Быстрая сводка настройки КТ-срезов"
			>
				{(mprOperatorSummaryCards ?? []).map((card: any) => (
					<article className={`tone-${card.tone}`} key={card.id}>
						<span>{card.title}</span>
						<strong>{card.value}</strong>
						<p>{card.detail}</p>
					</article>
				))}
			</section>
			<Suspense fallback={null}>
				<CtPlanningToolsPanel
					canPlan={mprControlsReady}
					activeTool={imagingViewerActiveTool}
					activeQuickActionId={ctPlanningActiveQuickActionId}
					onActivateTool={applyCtPlanningQuickAction}
					selectedImplantId={ctPlanningImplantPlan?.itemId ?? null}
					selectedImplantPlan={ctPlanningImplantPlan}
					onSelectImplant={selectCtPlanningImplant}
					localAnnotations={imagingViewerAnnotations}
					annotationRefs={ctPlanningAnnotationRefs}
					onCreateArtifact={createCtPlanningArtifact}
					toolStateBundle={
						dicomViewerWorkbenchManifest?.toolStateBundle ??
						dicomViewerToolStateBundle
					}
				/>
			</Suspense>
			<details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
				<summary>
					<span>Управление КТ-срезами</span>
					<small>
						Открывается только для КТ-разбора; обычный прием остается без
						лишних панелей.
					</small>
				</summary>
				{!mprControlsReady && (
					<div
						className="mpr-dropzone-notice p-4 mb-4 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20"
						data-testid="mpr-dicom-load-dropzone-notice"
					>
						<div className="flex items-center gap-2 mb-2 text-teal-800 dark:text-teal-200">
							<UploadCloud size={18} />
							<strong className="text-sm font-semibold">
								Для управления КТ-срезами и осями загрузите файлы DICOM
							</strong>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
							Инструменты мультипланарной реконструкции (MPR) активируются при наличии срезов в памяти. Выберите папку с исследованием или ZIP-архив срезов:
						</p>
						<Suspense fallback={null}>
							<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full" />
						</Suspense>
					</div>
				)}
				<div className="clinical-mpr-grid">
					<div className="mpr-plane-grid">
						{(cbctWorkbenchPlanes ?? []).map((plane: any) => {
							const planeSupported = (
								cbctWorkbenchProjections ?? []
							).includes(plane.key);
							const planeAvailable = mprControlsReady && planeSupported;
							const planeUnavailableReason = !mprControlsReady
								? mprSeriesRequiredProjectionLabel
								: planeSupported
									? ""
									: mprUnavailableProjectionLabel;
							return (
								<button
									className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
									key={plane.key}
									type="button"
									onClick={() => setMprProjection(plane.key)}
									disabled={!planeAvailable}
									aria-pressed={mprProjection === plane.key}
									aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
								>
									<strong>{plane.title}</strong>
									<span>{plane.detail}</span>
									{planeUnavailableReason ? (
										<small className="mpr-plane-unavailable">
											{planeUnavailableReason}
										</small>
									) : null}
								</button>
							);
						})}
					</div>
					<div
						className={`mpr-axis-visualizer ${mprControlsReady ? "" : "disabled"}`}
						data-testid="ct-mpr-axis-visualizer"
						style={mprAxisVisualizerStyle}
						role="img"
						aria-label={mprAxisVisualizerLabel}
						aria-describedby="ct-mpr-keyboard-help"
						aria-disabled={!mprControlsReady}
						aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End"
						tabIndex={mprControlsReady ? 0 : -1}
						onKeyDown={handleMprKeyboardNavigation}
					>
						<span className="visually-hidden" id="ct-mpr-keyboard-help">
							Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
							меняют срез, PageUp и PageDown меняют толщину слоя, Home и End
							переходят к началу и концу серии.
						</span>
						<div className="mpr-axis-board" aria-hidden="true">
							<span className="mpr-axis-label mpr-axis-label-top">
								{mprProjectionCompass?.top}
							</span>
							<span className="mpr-axis-label mpr-axis-label-right">
								{mprProjectionCompass?.right}
							</span>
							<span className="mpr-axis-label mpr-axis-label-bottom">
								{mprProjectionCompass?.bottom}
							</span>
							<span className="mpr-axis-label mpr-axis-label-left">
								{mprProjectionCompass?.left}
							</span>
							<span className="mpr-axis-slab" />
							<span className="mpr-axis-slice-marker" />
							<span className="mpr-axis-line mpr-axis-line-primary" />
							<span className="mpr-axis-line mpr-axis-line-secondary" />
							<span
								className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`}
							/>
							<span className="mpr-axis-angle-badge">
								{mprAxisAngleBadge}
							</span>
							<span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
							<span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
						</div>
						<div className="mpr-axis-facts">
							<strong>{mprActiveProjectionLabel}</strong>
							<span>{mprActiveProjectionOrientation}</span>
							<span>{mprProjectionCompass?.summary}</span>
							<span>{mprAxisDirectionLabel}</span>
							<span>слой {mprSlabMm} мм</span>
							<span>{mprSliceLabel}</span>
							<div
								className="mpr-axis-guidance"
								data-testid="ct-mpr-axis-guidance"
							>
								<span>{mprAxisGuidance?.tiltLabel ?? ""}</span>
								<span>{mprAxisGuidance?.slabLabel ?? ""}</span>
								<span>{mprAxisGuidance?.sliceLabel ?? ""}</span>
							</div>
							<small
								className="mpr-workbench-summary"
								data-testid="ct-mpr-workbench-summary"
								aria-live="polite"
							>
								{mprWorkbenchSummaryText}
							</small>
							<small>
								{mprControlsReady
									? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
									: "сначала откройте готовую КЛКТ/КТ-серию"}
							</small>
							<div
								className={`mpr-preset-fit ${mprNearestClinicalPreset?.exact ? "exact" : ""}`}
								data-testid="ct-mpr-preset-fit"
							>
								<span>{mprNearestClinicalPreset?.label ?? "пользовательский протокол"}</span>
								<button
									type="button"
									onClick={applyNearestMprClinicalPreset}
									disabled={
										!mprControlsReady ||
										!mprNearestClinicalPreset?.deltas?.length ||
										!mprNearestClinicalPreset?.title
									}
									aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset?.label ?? ""}`}
									title={`Подогнать под протокол: ${mprNearestClinicalPreset?.label ?? ""}`}
								>
									Подогнать
								</button>
							</div>
						</div>
					</div>
					<ImagingMprSliders {...props} />
				</div>
			</details>
			<div className="clinical-mpr-safety">
				<span>
					{selectedImagingViewerPlan?.nextAction ??
						"Подготовить серию КЛКТ/КТ к просмотру срезов."}
				</span>
				<span>
					{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ??
						"Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}
				</span>
				<span>
					ИИ-описание не является диагнозом; врач подтверждает все выводы.
				</span>
			</div>
		</section>
	);
}
