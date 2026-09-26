import React from "react";
import type {
	DicomFirstFramePreviewResponse,
	ImagingImportPreviewResponse,
} from "@dental/shared";
import {
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	FileCheck2,
	FlipHorizontal,
	Layers3,
	RefreshCw,
	RotateCcw,
	RotateCw,
	UploadCloud,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { importRowStatusLabels } from "./constants";
import {
	dicomFirstFrameFileFormatLabel,
	dicomFirstFrameImageTypeLabel,
	dicomSeriesDisplayText,
	dicomSeriesWarningText,
	imagingImportRowWarningText,
} from "./helpers";
import type {
	DicomFirstFrameViewerState,
	InputChangeEvent,
	TextInputChangeEvent,
} from "./types";

export interface MigrationDicomViewerSectionProps {
	dicomFirstFramePreview: DicomFirstFramePreviewResponse | null | undefined;
	typedDicomFirstFramePreview:
		| DicomFirstFramePreviewResponse
		| null
		| undefined;
	typedDicomFirstFrameViewerState: DicomFirstFrameViewerState;
	typedDefaultDicomFirstFrameViewerState: DicomFirstFrameViewerState;
	dicomFirstFrameStatusLabels: Record<string, string>;
	dicomFirstFrameSelectableCount: number;
	dicomFirstFrameCurrentIndex: number;
	dicomFirstFrameSliceMaxIndex: number;
	dicomFirstFrameLandmarkSlices: Array<{ label: string; targetIndex: number }>;
	dicomFirstFrameCanSelectPrevious: boolean;
	dicomFirstFrameCanSelectNext: boolean;
	isDicomFirstFramePreviewing: boolean;
	dicomFirstFrameImageStyle: React.CSSProperties;
	imagingImportText: string;
	imagingImportInputReady: boolean;
	isDicomSeriesPreviewLoading: boolean;
	isImagingImportLoading: boolean;
	isImagingImportCommitting: boolean;
	dicomSeriesPreview: any;
	typedDicomSeriesPreviewSeries: any[];
	imagingKindLabels: Record<string, string>;
	dicomSeriesViewerLabels: Record<string, string>;
	mprLoadStrategyLabels: Record<string, string>;
	mprResourceTierLabels: Record<string, string>;
	typedImagingImportPreview:
		| ImagingImportPreviewResponse
		| null
		| undefined;
	imagingImportCommit: any;
	updateDicomFirstFrameViewerState: (
		updater: (prev: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) => void;
	updateDicomFirstFrameViewerNumber: (
		key: "brightness" | "contrast",
		event: React.ChangeEvent<HTMLInputElement>,
	) => void;
	setDicomFirstFrameViewerState: (s: DicomFirstFrameViewerState) => void;
	previewDicomFirstFrameSlice: (index: number) => void;
	setImagingImportSourceKind: (k: any) => void;
	setImagingImportText: (t: string) => void;
	setImagingImportPreview: (p: any) => void;
	setImagingImportCommit: (c: any) => void;
	setDicomSeriesPreview: (p: any) => void;
	setDicomFolderSeriesScan: (s: any) => void;
	setDicomFolderWorkupPlan: (p: any) => void;
	previewDicomSeries: () => void;
	previewImagingImport: () => void;
	commitImagingImport: () => void;
}

export function MigrationDicomViewerSection({
	dicomFirstFramePreview,
	typedDicomFirstFramePreview,
	typedDicomFirstFrameViewerState,
	typedDefaultDicomFirstFrameViewerState,
	dicomFirstFrameStatusLabels,
	dicomFirstFrameSelectableCount,
	dicomFirstFrameCurrentIndex,
	dicomFirstFrameSliceMaxIndex,
	dicomFirstFrameLandmarkSlices,
	dicomFirstFrameCanSelectPrevious,
	dicomFirstFrameCanSelectNext,
	isDicomFirstFramePreviewing,
	dicomFirstFrameImageStyle,
	imagingImportText,
	imagingImportInputReady,
	isDicomSeriesPreviewLoading,
	isImagingImportLoading,
	isImagingImportCommitting,
	dicomSeriesPreview,
	typedDicomSeriesPreviewSeries,
	imagingKindLabels,
	dicomSeriesViewerLabels,
	mprLoadStrategyLabels,
	mprResourceTierLabels,
	typedImagingImportPreview,
	imagingImportCommit,
	updateDicomFirstFrameViewerState,
	updateDicomFirstFrameViewerNumber,
	setDicomFirstFrameViewerState,
	previewDicomFirstFrameSlice,
	setImagingImportSourceKind,
	setImagingImportText,
	setImagingImportPreview,
	setImagingImportCommit,
	setDicomSeriesPreview,
	setDicomFolderSeriesScan,
	setDicomFolderWorkupPlan,
	previewDicomSeries,
	previewImagingImport,
	commitImagingImport,
}: MigrationDicomViewerSectionProps) {
	return (
		<>
			{dicomFirstFramePreview ? (
				<section
					className={`dicom-first-frame-preview preview-${dicomFirstFramePreview.status}`}
					data-testid="dicom-first-frame-preview-result"
					aria-label="Предпросмотр первого среза снимков"
				>
					<div className="dicom-first-frame-head">
						<div>
							<strong>
								Первый срез: только ориентация, не диагностика:{" "}
								{dicomFirstFrameStatusLabels[dicomFirstFramePreview.status] ??
									dicomFirstFramePreview.status}
							</strong>
							<span>
								{dicomFirstFramePreview.sourceWidth &&
								dicomFirstFramePreview.sourceHeight
									? `${dicomFirstFramePreview.sourceWidth}x${dicomFirstFramePreview.sourceHeight}`
									: "Нет кадра снимка"}{" "}
								/{" "}
								{dicomFirstFrameFileFormatLabel(
									dicomFirstFramePreview.transferSyntaxUid,
								)}
							</span>
						</div>
						<small>{dicomFirstFramePreview.nextAction}</small>
					</div>
					{dicomFirstFramePreview.imageDataUrl ? (
						<>
							<div
								role="toolbar"
								className="dicom-first-frame-tools"
								aria-label="Инструменты предпросмотра первого среза"
							>
								<button
									className="viewer-tool-button"
									type="button"
									title="Повернуть влево"
									aria-label="Повернуть первый срез влево"
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											rotationDeg: state.rotationDeg - 90,
										}))
									}
								>
									<RotateCcw aria-hidden="true" />
								</button>
								<button
									className="viewer-tool-button"
									type="button"
									title="Повернуть вправо"
									aria-label="Повернуть первый срез вправо"
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											rotationDeg: state.rotationDeg + 90,
										}))
									}
								>
									<RotateCw aria-hidden="true" />
								</button>
								<button
									className={`viewer-tool-button ${typedDicomFirstFrameViewerState.flipHorizontal ? "active" : ""}`}
									type="button"
									title="Отразить"
									aria-label="Отразить первый срез"
									aria-pressed={typedDicomFirstFrameViewerState.flipHorizontal}
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											flipHorizontal: !state.flipHorizontal,
										}))
									}
								>
									<FlipHorizontal aria-hidden="true" />
								</button>
								<button
									className={`viewer-tool-button ${typedDicomFirstFrameViewerState.inverted ? "active" : ""}`}
									type="button"
									title="Инвертировать"
									aria-label="Инвертировать первый срез"
									aria-pressed={typedDicomFirstFrameViewerState.inverted}
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											inverted: !state.inverted,
										}))
									}
								>
									+/-
								</button>
								<button
									className="viewer-tool-button"
									type="button"
									title="Уменьшить"
									aria-label="Уменьшить первый срез"
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											zoom: Math.max(0.7, state.zoom - 0.1),
										}))
									}
								>
									<ZoomOut aria-hidden="true" />
								</button>
								<button
									className="viewer-tool-button"
									type="button"
									title="Увеличить"
									aria-label="Увеличить первый срез"
									onClick={() =>
										updateDicomFirstFrameViewerState((state) => ({
											...state,
											zoom: Math.min(2.2, state.zoom + 0.1),
										}))
									}
								>
									<ZoomIn aria-hidden="true" />
								</button>
								<button
									className="viewer-tool-button"
									type="button"
									title="Сбросить"
									aria-label="Сбросить инструменты первого среза"
									onClick={() =>
										setDicomFirstFrameViewerState(
											typedDefaultDicomFirstFrameViewerState,
										)
									}
								>
									<RefreshCw aria-hidden="true" />
								</button>
							</div>
							{dicomFirstFrameSelectableCount > 1 &&
							typeof dicomFirstFrameCurrentIndex === "number" ? (
								<div
									className="dicom-first-frame-slice-controls"
									data-testid="dicom-first-frame-slice-controls"
								>
									<button
										className="viewer-tool-button"
										type="button"
										title="Предыдущий срез"
										aria-label="Показать предыдущий срез снимков"
										disabled={!dicomFirstFrameCanSelectPrevious}
										onClick={() =>
											previewDicomFirstFrameSlice(
												dicomFirstFrameCurrentIndex - 1,
											)
										}
									>
										<ChevronLeft aria-hidden="true" />
									</button>
									<label>
										<span>
											Срез {dicomFirstFrameCurrentIndex + 1} /{" "}
											{dicomFirstFrameSelectableCount}
										</span>
										<input
											aria-label="Выбрать срез снимков"
											type="range"
											min="0"
											max={dicomFirstFrameSliceMaxIndex}
											step="1"
											value={dicomFirstFrameCurrentIndex}
											disabled={isDicomFirstFramePreviewing}
											onChange={(event: InputChangeEvent) =>
												previewDicomFirstFrameSlice(Number(event.target.value))
											}
										/>
									</label>
									<button
										className="viewer-tool-button"
										type="button"
										title="Следующий срез"
										aria-label="Показать следующий срез снимков"
										disabled={!dicomFirstFrameCanSelectNext}
										onClick={() =>
											previewDicomFirstFrameSlice(
												dicomFirstFrameCurrentIndex + 1,
											)
										}
									>
										<ChevronRight aria-hidden="true" />
									</button>
									{dicomFirstFrameLandmarkSlices.length ? (
										<div
											role="toolbar"
											className="dicom-first-frame-slice-presets"
											data-testid="dicom-first-frame-slice-presets"
											aria-label="Быстрые срезы снимков"
										>
											{dicomFirstFrameLandmarkSlices.map(
												({ label, targetIndex }) => (
													<button
														className={
															dicomFirstFrameCurrentIndex === targetIndex
																? "active"
																: ""
														}
														type="button"
														key={`${label}-${targetIndex}`}
														title={`Показать ${label}: срез ${targetIndex + 1}`}
														aria-label={`Показать опорный срез снимков ${label}: ${targetIndex + 1} из ${dicomFirstFrameSelectableCount}`}
														disabled={
															isDicomFirstFramePreviewing ||
															dicomFirstFrameCurrentIndex === targetIndex
														}
														onClick={() =>
															previewDicomFirstFrameSlice(targetIndex)
														}
													>
														{label}
														<small>{targetIndex + 1}</small>
													</button>
												),
											)}
										</div>
									) : null}
								</div>
							) : null}
							<div className="dicom-first-frame-sliders">
								<label>
									Яркость
									<input
										min="0.65"
										max="1.6"
										step="0.05"
										type="range"
										value={typedDicomFirstFrameViewerState.brightness}
										onChange={(event) =>
											updateDicomFirstFrameViewerNumber("brightness", event)
										}
									/>
								</label>
								<label>
									Контраст
									<input
										min="0.75"
										max="1.8"
										step="0.05"
										type="range"
										value={typedDicomFirstFrameViewerState.contrast}
										onChange={(event) =>
											updateDicomFirstFrameViewerNumber("contrast", event)
										}
									/>
								</label>
							</div>
							<div className="dicom-first-frame-image-wrap">
								<img
									src={dicomFirstFramePreview.imageDataUrl}
									alt="Предпросмотр ориентации первого среза снимков"
									decoding="async"
									style={dicomFirstFrameImageStyle}
								/>
							</div>
						</>
					) : null}
					<div className="dicom-first-frame-facts">
						<span>
							{dicomFirstFrameImageTypeLabel(
								dicomFirstFramePreview.photometricInterpretation,
							)}
						</span>
						<span>
							{dicomFirstFramePreview.bitsAllocated
								? `глубина ${dicomFirstFramePreview.bitsAllocated} бит`
								: "глубина не указана"}
						</span>
						<span>
							исходная яркость: центр{" "}
							{Math.round(dicomFirstFramePreview.windowCenter ?? 0)} /
							диапазон {Math.round(dicomFirstFramePreview.windowWidth ?? 0)}
						</span>
						{typeof dicomFirstFrameCurrentIndex === "number" &&
						dicomFirstFrameSelectableCount > 0 ? (
							<span>
								срез {dicomFirstFrameCurrentIndex + 1}/
								{dicomFirstFrameSelectableCount}
							</span>
						) : null}
						<span>не сохранено</span>
						<span>только инструменты предпросмотра</span>
					</div>
					{typedDicomFirstFramePreview?.warnings
						.slice(0, 4)
						.map((warning: string) => (
							<small key={warning}>{warning}</small>
						))}
				</section>
			) : null}

			<textarea
				aria-label="Данные импорта снимков"
				value={imagingImportText}
				onChange={(event: TextInputChangeEvent) => {
					setImagingImportText(event.target.value);
					setImagingImportPreview(null);
					setImagingImportCommit(null);
					setDicomSeriesPreview(null);
					setDicomFolderSeriesScan(null);
					setDicomFolderWorkupPlan(null);
				}}
			/>

			<div className="import-tool-row">
				<button
					className="secondary-button"
					type="button"
					onClick={() => {
						setImagingImportSourceKind("dicom_file");
						setImagingImportText(
							"Пациент;Телефон;Модальность;КодИсследования;КодСерии;НомерСреза;ОписаниеСерии;Дата;Путь\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;1;КТ нижней челюсти;12.05.2026;D:\\KLKT\\ivanova_2026_05_12\\IMG0001.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;2;КТ нижней челюсти;12.05.2026;D:\\KLKT\\ivanova_2026_05_12\\IMG0002.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;1.2.643.5.1.20260510.7;1.2.643.5.1.20260510.7.1;1;боковая ТРГ;10.05.2026;D:\\CEPH\\ivanova_ceph.ima\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;1.2.643.5.1.20260510.9;1.2.643.5.1.20260510.9.1;1;панорамный снимок;10.05.2026;D:\\OPG\\petrov_opg.png",
						);
						setImagingImportPreview(null);
						setImagingImportCommit(null);
						setDicomSeriesPreview(null);
						setDicomFolderSeriesScan(null);
						setDicomFolderWorkupPlan(null);
					}}
				>
					<FileCheck2 aria-hidden="true" /> Пример КТ/ОПТГ/ТРГ
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewDicomSeries()}
					disabled={isDicomSeriesPreviewLoading || !imagingImportInputReady}
				>
					<Layers3 aria-hidden="true" />{" "}
					{isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
				</button>
				<button
					className="primary-button"
					type="button"
					onClick={previewImagingImport}
					disabled={isImagingImportLoading || !imagingImportInputReady}
					aria-busy={isImagingImportLoading || undefined}
				>
					<UploadCloud aria-hidden="true" />{" "}
					{isImagingImportLoading ? "Проверяю" : "Проверить снимки"}
				</button>
			</div>

			{!imagingImportInputReady ? (
				<p
					className="import-empty-guidance"
					role="status"
					aria-live="polite"
				>
					Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед
					проверкой.
				</p>
			) : null}

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
						{(typedDicomSeriesPreviewSeries ?? [])
							.slice(0, 6)
							.map((series, idx) => (
								<article
									className={`dicom-series-row dicom-series-${series?.status}`}
									key={series?.id ?? `dicom-series-${idx}`}
								>
									<div>
										<strong>{series?.patientName ?? "Пациент ?"}</strong>
										<span>
											{series?.kind
												? imagingKindLabels[series.kind]
												: "тип не указан"}{" "}
											· {series?.modality ?? "модальность не указана"} ·{" "}
											{series?.fileCount ?? 0} файлов
										</span>
									</div>
									<div>
										<span>
											{importRowStatusLabels[series?.status ?? ""] ??
												series?.status}{" "}
											·{" "}
											{
												dicomSeriesViewerLabels[
													series?.recommendedViewer ?? ""
												]
											}
										</span>
										<small>
											{series?.mprReadiness?.recommendedLayout} ·{" "}
											{series?.mprReadiness?.canOpenMpr
												? "предпросмотр КТ-срезов готов"
												: series?.mprReadiness?.nextAction}
										</small>
										<small className="dicom-series-resource">
											{
												mprLoadStrategyLabels[
													series?.mprReadiness?.resourcePolicy
														?.loadStrategy ?? ""
												]
											}{" "}
											/{" "}
											{series?.mprReadiness?.resourcePolicy
												?.estimatedMemoryMb ?? 0}{" "}
											МБ /{" "}
											{
												mprResourceTierLabels[
													series?.mprReadiness?.resourcePolicy
														?.requiredTier ?? ""
												]
											}
										</small>
										<small>{dicomSeriesDisplayText(series)}</small>
									</div>
									<p>{dicomSeriesWarningText(series?.warnings ?? [])}</p>
								</article>
							))}
					</div>
				</div>
			) : null}

			{typedImagingImportPreview ? (
				<div className="import-preview">
					<div className="import-stats">
						<span>{typedImagingImportPreview.totalRows} строк</span>
						<span>{typedImagingImportPreview.readyRows} готово</span>
						<span>{typedImagingImportPreview.warningRows} предупреждения</span>
						<span>{typedImagingImportPreview.blockedRows} к исправлению</span>
					</div>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitImagingImport}
							disabled={
								isImagingImportCommitting ||
								!imagingImportInputReady ||
								typedImagingImportPreview.readyRows === 0
							}
							aria-busy={isImagingImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isImagingImportCommitting ? "Записываю" : "Привязать готовые"}
						</button>
						{imagingImportCommit ? (
							<span>
								Привязано: {imagingImportCommit.importedCount}. Пропущено:{" "}
								{imagingImportCommit.skippedCount}.
							</span>
						) : (
							<span>
								В карту попадут только строки с найденным пациентом, типом
								снимка и путем к файлу.
							</span>
						)}
					</div>
					<div className="import-rows">
						{(typedImagingImportPreview.rows ?? []).map((row, idx) => (
							<article
								className={`import-row import-${row?.status}`}
								key={row?.rowNumber ?? `img-row-${idx}`}
							>
								<strong>
									{row?.patientName ?? `Строка ${row?.rowNumber}`}
								</strong>
								<span>
									{importRowStatusLabels[row?.status ?? ""] ?? row?.status}
								</span>
								<span>
									{row?.kind ? imagingKindLabels[row.kind] : "тип не найден"}
								</span>
								<span>
									{row?.toothCode ?? row?.region ?? "область не найдена"}
								</span>
								<p>
									{imagingImportRowWarningText(
										row?.warnings ?? [],
										row?.filePath,
									)}
								</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</>
	);
}
