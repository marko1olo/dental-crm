import React, { useState } from "react";
import { ImagingStudyList, imagingStudyHasFile } from "../../components/imaging";
import type {
	ImagingSeriesGalleryProps,
	ImagingStudyThumbnailProps,
} from "./imagingViewTypes";

/**
 * Безопасная миниатюра снимка: при 403 или ошибке загрузки рендерит аккуратный векторный датчик.
 * Сохраняет фиксированные размеры 48x48px (aspectRatio: 1 / 1) для нулевого CLS.
 */
export function ImagingStudyThumbnail({ study, previewSrc }: ImagingStudyThumbnailProps) {
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

/**
 * Layer 4: Боковая галерея серий снимков пациента с датами, модальностями и миниатюрами.
 */
export function ImagingSeriesGallery(props: any) {
	const {
		visibleImagingStudies = [],
		activeImagingStudies = [],
		selectedImagingStudy = null,
		activePatient = null,
		imagingKindFilter = "all",
		setImagingKindFilter = () => {},
		imagingToothFilter = "all",
		setImagingToothFilter,
		imagingKindLabels = {},
		imagingSourceLabels = {},
		imagingPreviewSource = () => undefined,
		imagingViewerHref = () => "",
		onSelectStudy = () => {},
		formatShortDate = (d: string) => d,
	} = props;

	return (
		<div className="imaging-series-gallery flex flex-col shrink-0" data-testid="imaging-series-gallery">
			<ImagingStudyList
				visibleImagingStudies={visibleImagingStudies}
				activeImagingStudies={activeImagingStudies}
				selectedImagingStudy={selectedImagingStudy}
				activePatient={activePatient}
				imagingKindFilter={imagingKindFilter}
				setImagingKindFilter={setImagingKindFilter}
				imagingToothFilter={imagingToothFilter}
				setImagingToothFilter={setImagingToothFilter}
				imagingKindLabels={imagingKindLabels}
				imagingSourceLabels={imagingSourceLabels}
				imagingPreviewSource={imagingPreviewSource}
				imagingViewerHref={imagingViewerHref}
				onSelectStudy={onSelectStudy}
				formatShortDate={formatShortDate}
			/>
		</div>
	);
}
