import React, { Suspense, useState } from "react";
import { UploadCloud, Layers, Maximize2 } from "lucide-react";
import { DicomArchiveUploader } from "../dicom/DicomArchiveUploader";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { ImagingMprHeaderSummary } from "./imagingMprPanel/ImagingMprHeaderSummary";
import { ImagingMprRoadmapSection } from "./imagingMprPanel/ImagingMprRoadmapSection";
import type { ImagingMprPanelProps } from "./imagingMprPanel/types";

export type { ImagingMprPanelProps };

const CtPlanningToolsPanel = lazyWithRetry(() =>
	import("../../ctPlanningTools").then((module) => ({
		default: module.CtPlanningToolsPanel,
	})),
);

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../radiology/CbctMprImplantStudioModal").then((module) => ({
		default: module.CbctMprImplantStudioModal,
	})),
);

export function ImagingMprPanel(props: ImagingMprPanelProps) {
	const {
		mprControlsAutoOpen, mprControlsReady, setLocalImageIds,
		selectedImagingViewerPlan, cbctWorkbenchSeries,
	} = props;
	const [isStudioOpen, setIsStudioOpen] = useState(false);

	return (
		<section className="clinical-mpr-panel" aria-label="Управление КЛКТ и КТ-срезами">
			<ImagingMprHeaderSummary {...props} />
			<ImagingMprRoadmapSection {...props} />
			<Suspense fallback={null}>
				<CtPlanningToolsPanel
					canPlan={mprControlsReady}
					activeTool={(props.imagingViewerActiveTool as any) ?? null}
					activeQuickActionId={props.ctPlanningActiveQuickActionId}
					onActivateTool={(action) => {
						const id = typeof action === "string" ? action : (action as any)?.id;
						if (id) props.applyCtPlanningQuickAction(id);
					}}
					selectedImplantId={props.ctPlanningImplantPlan?.itemId ?? null}
					selectedImplantPlan={props.ctPlanningImplantPlan}
					onSelectImplant={(implant) => {
						const id = typeof implant === "string" ? implant : (implant as any)?.id ?? null;
						props.selectCtPlanningImplant(id);
					}}
					localAnnotations={props.imagingViewerAnnotations}
					annotationRefs={props.ctPlanningAnnotationRefs}
					onCreateArtifact={props.createCtPlanningArtifact}
					toolStateBundle={props.dicomViewerWorkbenchManifest?.toolStateBundle ?? props.dicomViewerToolStateBundle}
				/>
			</Suspense>
			<div className="clinical-mpr-grid my-3" data-testid="mpr-canonical-studio-dock">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
						<div className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
								<Layers className="w-5 h-5" />
							</div>
							<div>
								<h4 className="text-sm font-bold text-[var(--ink)] leading-snug">
									Мультипланарная 3D/MPR студия КЛКТ
								</h4>
								<p className="text-xs text-[var(--ink-muted)]">
									4-осевой синхронизированный вьюпорт: Axial, Coronal, Sagittal и 3D Raymarching
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setIsStudioOpen(true)}
							className="dente-btn-primary h-9 min-h-[36px] px-4 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0"
							data-testid="mpr-open-studio-btn"
						>
							<Maximize2 className="w-4 h-4" />
							<span>Открыть 3D/MPR студию КЛКТ</span>
						</button>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
						<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							<span className="font-semibold text-[var(--ink)] block">Axial</span>
							<span className="text-[11px] text-[var(--ink-muted)]">Аксиальный срез</span>
						</div>
						<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							<span className="font-semibold text-[var(--ink)] block">Coronal</span>
							<span className="text-[11px] text-[var(--ink-muted)]">Фронтальный срез</span>
						</div>
						<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							<span className="font-semibold text-[var(--ink)] block">Sagittal</span>
							<span className="text-[11px] text-[var(--ink-muted)]">Сагиттальный срез</span>
						</div>
						<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							<span className="font-semibold text-[var(--ink)] block">3D Raymarching</span>
							<span className="text-[11px] text-[var(--ink-muted)]">Плотность кости Misch D1–D5</span>
						</div>
					</div>
				</div>
			</div>
			<details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
				<summary>
					<span>Управление КТ-срезами</span>
					<small>Открывается только для КТ-разбора; обычный прием остается без лишних панелей.</small>
				</summary>
				{!mprControlsReady && (
					<div className="mpr-dropzone-notice p-4 mb-4 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20" data-testid="mpr-dicom-load-dropzone-notice">
						<div className="flex items-center gap-2 mb-2 text-teal-800 dark:text-teal-200">
							<UploadCloud size={18} />
							<strong className="text-sm font-semibold">Для управления КТ-срезами и осями загрузите файлы DICOM</strong>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
							Инструменты мультипланарной реконструкции (MPR) активируются при наличии срезов в памяти. Выберите папку с исследованием или ZIP-архив срезов:
						</p>
						<Suspense fallback={null}>
							<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full" />
						</Suspense>
					</div>
				)}
			</details>
			{isStudioOpen && (
				<Suspense fallback={null}>
					<CbctMprImplantStudioModal
						isOpen={isStudioOpen}
						onClose={() => setIsStudioOpen(false)}
						study={props.selectedImagingStudy}
						patientName={props.selectedImagingStudy?.patientFullName || "Пациент"}
						patientId={props.selectedImagingStudy?.patientId}
						initialStudioMode="mpr"
					/>
				</Suspense>
			)}
			<div className="clinical-mpr-safety">
				<span>{selectedImagingViewerPlan?.nextAction ?? "Подготовить серию КЛКТ/КТ к просмотру срезов."}</span>
				<span>{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ?? "Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}</span>
				<span>ИИ-описание не является диагнозом; врач подтверждает все выводы.</span>
			</div>
		</section>
	);
}

export default ImagingMprPanel;
