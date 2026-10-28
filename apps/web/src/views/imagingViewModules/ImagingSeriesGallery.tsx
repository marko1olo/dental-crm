import React from "react";
import { ImagingStudyList } from "../../components/imaging";

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
