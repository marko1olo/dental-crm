import React from "react";
import { Calendar } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import type { GroupedDateStudies } from "./types";
import { PatientTimelineStudyCard } from "./PatientTimelineStudyCard";

export interface PatientTimelineDateGroupProps {
	readonly group: GroupedDateStudies;
	readonly cardWidth: number;
	readonly activeStudyId?: string | null | undefined;
	readonly onCardClick: (study: ImagingStudy) => void;
	readonly onCardDoubleClick: (study: ImagingStudy) => void;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenControl?: ((study: ImagingStudy) => void) | undefined;
}

export const PatientTimelineDateGroup: React.FC<PatientTimelineDateGroupProps> = ({
	group,
	cardWidth,
	activeStudyId,
	onCardClick,
	onCardDoubleClick,
	onOpenStudio,
	onOpenScan3d,
	onOpenViewer,
	onOpenControl,
}) => {
	const count = group.items.length;
	const countLabel = count === 1 ? "снимок" : count < 5 ? "снимка" : "снимков";

	return (
		<div
			className="flex flex-col gap-3"
			data-testid={`timeline-date-group-${group.dateKey}`}
		>
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4 text-[#00C853]" />
						<span className="text-sm font-extrabold text-white tracking-wide">
							{group.formattedDate}
						</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-[#101b2f] text-emerald-300 font-semibold border border-[#233554]">
							{count} {countLabel}
						</span>
					</div>
				</div>

				<div
					className="w-full h-[2px] bg-gradient-to-r from-[#00C853] via-[#00C853]/80 to-transparent shadow-[0_0_6px_rgba(0,200,83,0.35)]"
					data-testid="timeline-green-divider-line"
				/>
			</div>

			<div
				className="flex flex-wrap items-stretch gap-3"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
				}}
			>
				{group.items.map((study) => (
					<PatientTimelineStudyCard
						key={study.id}
						study={study}
						isSelected={activeStudyId === study.id}
						cardWidth={cardWidth}
						onCardClick={onCardClick}
						onCardDoubleClick={onCardDoubleClick}
						onOpenStudio={onOpenStudio}
						onOpenScan3d={onOpenScan3d}
						onOpenViewer={onOpenViewer}
						onOpenControl={onOpenControl}
					/>
				))}
			</div>
		</div>
	);
};
