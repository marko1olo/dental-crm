import { Layers3 } from "lucide-react";
import {
	dicomSeriesDisplayText,
	dicomSeriesWarningText,
} from "../../SettingsViewHelpers.js";
import type { DicomSeriesLabPanelProps } from "./types";

export function DicomSeriesLabPanel({
	previewDicomSeries,
	isDicomSeriesPreviewLoading,
	dicomSeriesPreview,
	seriesList,
	parserNotes,
	imagingKindLabels,
	dicomSeriesViewerLabels,
	mprLoadStrategyLabels,
	mprResourceTierLabels,
}: DicomSeriesLabPanelProps) {
	return (
		<section
			className="dicom-series-lab"
			aria-label="Предпросмотр серий снимков"
		>
			<div>
				<strong>Предпросмотр серий снимков</strong>
				<p>
					Берет текущий список снимков или результат сканирования папки и
					группирует КЛКТ/КТ по кодам исследования/серии. Тяжелые данные
					снимков не сохраняются в CRM.
				</p>
			</div>
			<button
				className="secondary-button"
				type="button"
				onClick={() => void previewDicomSeries()}
				disabled={isDicomSeriesPreviewLoading}
			>
				<Layers3 aria-hidden="true" />
				{isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
			</button>
			{dicomSeriesPreview ? (
				<div className="dicom-series-result">
					<div className="dicom-series-stats">
						<span>{dicomSeriesPreview.totalRows} файлов</span>
						<span>{dicomSeriesPreview.totalSeries} серий</span>
						<span>{dicomSeriesPreview.readySeries} готово</span>
						<span>{dicomSeriesPreview.warningSeries} предупреждения</span>
						<span>{dicomSeriesPreview.blockedSeries} нужно действие</span>
					</div>
					<div className="dicom-series-list">
						{seriesList.slice(0, 6).map((series) => (
							<article
								className={`dicom-series-row dicom-series-${series.status}`}
								key={series.id}
							>
								<div>
									<strong>{series.patientName ?? "Пациент ?"}</strong>
									<span>
										{series.kind
											? imagingKindLabels[series.kind]
											: "тип не указан"}{" "}
										· {series.modality ?? "модальность не указана"} ·{" "}
										{series.fileCount} файлов
									</span>
								</div>
								<div>
									<span>
										{dicomSeriesViewerLabels[series.recommendedViewer]}
									</span>
									<small>
										{series.mprReadiness.recommendedLayout} ·{" "}
										{series.mprReadiness.canOpenMpr
											? "предпросмотр КТ-срезов готов"
											: series.mprReadiness.nextAction}
									</small>
									<small className="dicom-series-resource">
										{
											mprLoadStrategyLabels[
												series.mprReadiness.resourcePolicy.loadStrategy
											]
										}{" "}
										/ {series.mprReadiness.resourcePolicy.estimatedMemoryMb}{" "}
										МБ /{" "}
										{
											mprResourceTierLabels[
												series.mprReadiness.resourcePolicy.requiredTier
											]
										}
									</small>
									<small>{dicomSeriesDisplayText(series)}</small>
								</div>
								<p>{dicomSeriesWarningText(series.warnings)}</p>
							</article>
						))}
					</div>
					<div className="recognition-notes">
						{parserNotes.map((note) => (
							<span key={note}>{note}</span>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
