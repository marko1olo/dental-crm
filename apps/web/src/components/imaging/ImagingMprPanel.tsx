import React, { Suspense } from "react";
import { UploadCloud } from "lucide-react";
import { DicomArchiveUploader } from "./DicomArchiveUploader";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { ImagingMprSliders } from "./ImagingMprSliders";
import { ImagingMprHeaderSummary } from "./imagingMprPanel/ImagingMprHeaderSummary";
import { ImagingMprRoadmapSection } from "./imagingMprPanel/ImagingMprRoadmapSection";
import { ImagingMprPlaneGrid } from "./imagingMprPanel/ImagingMprPlaneGrid";
import { ImagingMprAxisVisualizer } from "./imagingMprPanel/ImagingMprAxisVisualizer";
import type { ImagingMprPanelProps } from "./imagingMprPanel/types";

export type { ImagingMprPanelProps };

const CtPlanningToolsPanel = lazyWithRetry(() =>
	import("../../ctPlanningTools").then((module) => ({
		default: module.CtPlanningToolsPanel,
	})),
);

export function ImagingMprPanel(props: ImagingMprPanelProps) {
	const {
		mprControlsAutoOpen, mprControlsReady, setLocalImageIds,
		selectedImagingViewerPlan, cbctWorkbenchSeries,
	} = props;

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
				<div className="clinical-mpr-grid">
					<ImagingMprPlaneGrid {...props} />
					<ImagingMprAxisVisualizer {...props} />
					<ImagingMprSliders {...props} />
				</div>
			</details>
			<div className="clinical-mpr-safety">
				<span>{selectedImagingViewerPlan?.nextAction ?? "Подготовить серию КЛКТ/КТ к просмотру срезов."}</span>
				<span>{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ?? "Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}</span>
				<span>ИИ-описание не является диагнозом; врач подтверждает все выводы.</span>
			</div>
		</section>
	);
}

export default ImagingMprPanel;
