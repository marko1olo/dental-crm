import React from "react";
import { Scan } from "lucide-react";
import type { PatientTimelineProps } from "./patientTimeline/types";
import { usePatientTimelineLogic } from "./patientTimeline/usePatientTimelineLogic";
import { PatientTimelineFilters } from "./patientTimeline/PatientTimelineFilters";
import { PatientTimelineDateGroup } from "./patientTimeline/PatientTimelineDateGroup";
import { PatientTimelineZoomBar } from "./patientTimeline/PatientTimelineZoomBar";

export * from "./patientTimeline/types";
export * from "./patientTimeline/timelineFilterUtils";
export * from "./patientTimeline/usePatientTimelineLogic";
export * from "./patientTimeline/PatientTimelineFilters";
export * from "./patientTimeline/PatientTimelineThumbnail";
export * from "./patientTimeline/PatientTimelineCardActions";
export * from "./patientTimeline/PatientTimelineStudyCard";
export * from "./patientTimeline/PatientTimelineDateGroup";
export * from "./patientTimeline/PatientTimelineZoomBar";

export const PatientTimeline: React.FC<PatientTimelineProps> = (props) => {
	const { className = "", onOpenStudio, onOpenScan3d, onOpenViewer, onOpenControl, onOpenTactileSearch } = props;
	const {
		activeStudyId,
		cardWidth,
		setCardWidth,
		selectedModalityFilter,
		setSelectedModalityFilter,
		selectedDateFilter,
		setSelectedDateFilter,
		selectedDatePreset,
		setSelectedDatePreset,
		selectedToothFilter,
		setSelectedToothFilter,
		filteredStudies,
		groupedStudies,
		availableDates,
		availableTeeth,
		handleCardClick,
		handleCardDoubleClick,
		activeStudy,
	} = usePatientTimelineLogic(props);

	return (
		<div
			className={`flex flex-col w-full h-full bg-[#080d18] text-slate-100 rounded-xl border border-[#1b273d] overflow-hidden select-none ${className}`}
			data-testid="patient-timeline-container"
		>
			<PatientTimelineFilters
				filteredCount={filteredStudies.length}
				selectedDatePreset={selectedDatePreset}
				onSelectDatePreset={setSelectedDatePreset}
				selectedDateFilter={selectedDateFilter}
				onSelectDateFilter={setSelectedDateFilter}
				availableDates={availableDates}
				selectedToothFilter={selectedToothFilter}
				onSelectToothFilter={setSelectedToothFilter}
				availableTeeth={availableTeeth}
				selectedModalityFilter={selectedModalityFilter}
				onSelectModalityFilter={setSelectedModalityFilter}
				onOpenTactileSearch={onOpenTactileSearch}
			/>

			<div
				className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-6"
				data-testid="timeline-groups-scroll-area"
			>
				{groupedStudies.length === 0 ? (
					<div
						className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2"
						data-testid="timeline-empty-message"
					>
						<Scan className="w-8 h-8 opacity-40 text-emerald-400" />
						<span className="text-xs font-semibold">Нет снимков по выбранным фильтрам</span>
					</div>
				) : (
					groupedStudies.map((group) => (
						<PatientTimelineDateGroup
							key={group.dateKey}
							group={group}
							cardWidth={cardWidth}
							activeStudyId={activeStudyId}
							onCardClick={handleCardClick}
							onCardDoubleClick={handleCardDoubleClick}
							onOpenStudio={onOpenStudio}
							onOpenScan3d={onOpenScan3d}
							onOpenViewer={onOpenViewer}
							onOpenControl={onOpenControl}
						/>
					))
				)}
			</div>

			<PatientTimelineZoomBar
				activeStudy={activeStudy}
				cardWidth={cardWidth}
				onCardWidthChange={setCardWidth}
			/>
		</div>
	);
};
