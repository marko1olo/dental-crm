import React from "react";
import { ExternalLink } from "lucide-react";
import type {
	DicomViewerWorkbenchManifestResponse,
	ImagingStudy,
	ImagingViewerAnnotation,
} from "@dental/shared";
import type { ImagingViewerPlan } from "../../../constants/imagingConstants";

export interface ImagingMprHeaderSummaryProps {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	imagingViewerHref: (study?: ImagingStudy | null) => string;
	selectedImagingViewerPlan?: ImagingViewerPlan | null | undefined;
	dicomViewerWorkbenchManifest?: DicomViewerWorkbenchManifestResponse | null | undefined;
	dicomLabel?: (
		labels: Record<string, string> | undefined,
		key: string | undefined,
		fallback: string,
	) => string;
	dicomQualityModeLabels?: Record<string, string> | undefined;
	dicomTextureStrategyLabels?: Record<string, string> | undefined;
	imagingViewerSaveTitle: Record<string, string>;
	imagingViewerSaveState: string;
	imagingViewerAnnotations?: ImagingViewerAnnotation[] | undefined;
}

export function ImagingMprHeaderSummary({
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
}: ImagingMprHeaderSummaryProps) {
	const studyTitle = selectedImagingStudy?.title ?? "Исследование";

	return (
		<>
			<div className="clinical-mpr-head">
				<div>
					<p className="eyebrow">Рабочее место КЛКТ</p>
					<h3>3 плоскости, косой срез, панорама и внешний КТ-просмотрщик</h3>
					<small>Основной прием не блокируется: если серия тяжелая, CRM оставляет предпросмотр и предлагает внешний просмотр или локальный модуль объема.</small>
				</div>
				<a
					className="secondary-button"
					href={imagingViewerHref(selectedImagingStudy)}
					target="_blank"
					rel="noreferrer noopener"
					aria-label={`Открыть КТ-просмотрщик в новой вкладке: ${studyTitle}`}
					title={`Открыть КТ-просмотрщик в новой вкладке: ${studyTitle}`}
				>
					<ExternalLink aria-hidden="true" /> КТ-просмотрщик
				</a>
			</div>
			<section className="clinical-mpr-summary-grid" aria-label="Краткий статус КЛКТ">
				<article>
					<strong>{selectedImagingViewerPlan?.mode === "cbct_mpr" ? "Маршрут КТ-срезов" : "Быстрый предпросмотр"}</strong>
					<span>{selectedImagingViewerPlan?.nextAction ?? "Откройте КТ-просмотрщик, когда нужен 3D-разбор."}</span>
				</article>
				<article>
					<strong>{dicomViewerWorkbenchManifest ? `готовность загрузки ${dicomViewerWorkbenchManifest.readiness.readinessScore}%` : "Рабочее место опционально"}</strong>
					<span>
						{dicomViewerWorkbenchManifest
							? `${
									dicomLabel
										? dicomLabel(
												dicomQualityModeLabels,
												dicomViewerWorkbenchManifest.renderCachePlan.qualityMode,
												"режим качества",
											)
										: (dicomQualityModeLabels?.[
												dicomViewerWorkbenchManifest.renderCachePlan.qualityMode
											] ?? "режим качества")
								} / ${
									dicomLabel
										? dicomLabel(
												dicomTextureStrategyLabels,
												dicomViewerWorkbenchManifest.renderCachePlan.textureStrategy,
												"план загрузки",
											)
										: (dicomTextureStrategyLabels?.[
												dicomViewerWorkbenchManifest.renderCachePlan.textureStrategy
											] ?? "план загрузки")
								}`
							: "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
					</span>
				</article>
				<article>
					<strong>{imagingViewerSaveTitle[imagingViewerSaveState] ?? "Сохранение"}</strong>
					<span>{imagingViewerAnnotations?.length ?? 0} разметок; исходные снимки остаются в просмотрщике или исходной папке.</span>
				</article>
			</section>
		</>
	);
}
