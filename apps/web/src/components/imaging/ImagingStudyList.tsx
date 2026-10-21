import { ImagingStudyListEmptyState } from "./ImagingStudyListEmptyState.js";
import { ImagingStudyRow } from "./ImagingStudyRow.js";
import { ImagingToothFilterBar } from "./ImagingToothFilterBar.js";
import type { ImagingStudy } from "./types.js";
import { useImagingStudyFilter } from "./useImagingStudyFilter.js";

export * from "./ImagingStudyListEmptyState.js";
export * from "./ImagingStudyRow.js";
export * from "./ImagingStudyThumbnail.js";
export * from "./ImagingToothFilterBar.js";
export * from "./imagingStudyListConstants.js";
export * from "./useImagingStudyFilter.js";

export interface ImagingStudyListProps {
	visibleImagingStudies: ImagingStudy[];
	activeImagingStudies: ImagingStudy[];
	selectedImagingStudy?: ImagingStudy | null;
	activePatient?: { fullName?: string; name?: string } | null;
	imagingKindFilter: string;
	setImagingKindFilter: (filter: string) => void;
	imagingToothFilter?: string;
	setImagingToothFilter?: (filter: string) => void;
	imagingKindLabels: Record<string, string>;
	imagingSourceLabels: Record<string, string>;
	imagingPreviewSource: (study: ImagingStudy) => string | undefined;
	imagingViewerHref: (study: ImagingStudy) => string;
	onSelectStudy: (studyId: string) => void;
	formatShortDate: (date: string) => string;
}

export function ImagingStudyList(p: ImagingStudyListProps) {
	const {
		effectiveToothFilter,
		handleToothChange,
		availableTeeth,
		displayStudies,
	} = useImagingStudyFilter(
		p.visibleImagingStudies,
		p.activeImagingStudies,
		p.imagingToothFilter,
		p.setImagingToothFilter,
		p.onSelectStudy,
	);

	return (
		<div className="imaging-list flex flex-col gap-2">
			<ImagingToothFilterBar
				effectiveToothFilter={effectiveToothFilter}
				availableTeeth={availableTeeth}
				onToothChange={handleToothChange}
			/>

			{displayStudies?.length === 0 && (
				<ImagingStudyListEmptyState
					activePatient={p.activePatient}
					activeImagingStudies={p.activeImagingStudies}
					effectiveToothFilter={effectiveToothFilter}
					imagingKindFilter={p.imagingKindFilter}
					imagingKindLabels={p.imagingKindLabels}
					onClearToothFilter={() => handleToothChange("all")}
					onClearKindFilter={() => p.setImagingKindFilter("all")}
				/>
			)}

			{(displayStudies || []).map((study) => (
				<ImagingStudyRow
					key={study.id}
					study={study}
					selectedImagingStudy={p.selectedImagingStudy}
					previewSrc={p.imagingPreviewSource(study)}
					imagingKindLabels={p.imagingKindLabels}
					imagingSourceLabels={p.imagingSourceLabels}
					imagingViewerHref={p.imagingViewerHref}
					onSelectStudy={p.onSelectStudy}
					formatShortDate={p.formatShortDate}
				/>
			))}
		</div>
	);
}
