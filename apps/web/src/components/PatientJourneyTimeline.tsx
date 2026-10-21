import React from "react";
import "./PatientJourneyTimeline.css";
import {
	highlightMatch,
	renderEventIcon,
	toFriendlyRussianProcedure,
} from "./patientJourneyModules/journeyHelpers";
import type {
	JourneyEvent,
	PatientJourneyTimelineProps,
} from "./patientJourneyModules/journeyTypes";
import { PatientTimelineCard } from "./patientJourneyModules/PatientJourneyCard";
import { PatientJourneyEmptyState } from "./patientJourneyModules/PatientJourneyEmptyState";
import { PatientJourneyHeader } from "./patientJourneyModules/PatientJourneyHeader";
import { PatientJourneyProgress } from "./patientJourneyModules/PatientJourneyProgress";
import { usePatientJourneyEvents } from "./patientJourneyModules/usePatientJourneyEvents";

export {
	highlightMatch,
	type JourneyEvent,
	type PatientJourneyTimelineProps,
	PatientTimelineCard,
	renderEventIcon,
	toFriendlyRussianProcedure,
};

export const PatientJourneyTimeline: React.FC<PatientJourneyTimelineProps> =
	React.memo(({ patientId, dashboard }) => {
		const {
			searchQuery,
			setSearchQuery,
			setDisplayLimit,
			filteredEvents,
			eventsSlice,
			totalItemsCount,
			completedItemsCount,
			progressPercentage,
			showProgress,
		} = usePatientJourneyEvents(patientId, dashboard);

		return (
			<div className="patient-journey-timeline flex flex-col gap-3">
				<PatientJourneyHeader
					patientId={patientId}
					totalEventsCount={filteredEvents.length}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
				/>

				<PatientJourneyProgress
					showProgress={showProgress}
					progressPercentage={progressPercentage}
					completedItemsCount={completedItemsCount}
					totalItemsCount={totalItemsCount}
				/>

				{filteredEvents.length === 0 && (
					<PatientJourneyEmptyState
						searchQuery={searchQuery}
						onResetSearch={() => setSearchQuery("")}
					/>
				)}

				<div className="timeline-track flex flex-col gap-2.5">
					{eventsSlice.visibleItems.map((evt, index) => (
						<PatientTimelineCard
							key={evt.id}
							evt={evt}
							isFirst={index === 0}
							isLast={index === eventsSlice.visibleItems.length - 1}
							searchQuery={searchQuery}
						/>
					))}
				</div>

				{eventsSlice.hasMore && (
					<div className="flex items-center justify-center gap-2 pt-2">
						<button
							type="button"
							data-testid="timeline-load-more-btn"
							onClick={() => setDisplayLimit((prev) => prev + 15)}
							className="min-h-[36px] h-9 px-4 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
						>
							<span>
								Загрузить ранее ({eventsSlice.remainingCount} из{" "}
								{eventsSlice.totalCount})
							</span>
						</button>
						<button
							type="button"
							data-testid="timeline-load-all-btn"
							onClick={() => setDisplayLimit(eventsSlice.totalCount)}
							className="min-h-[36px] h-9 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						>
							<span>Показать все</span>
						</button>
					</div>
				)}
			</div>
		);
	});

PatientJourneyTimeline.displayName = "PatientJourneyTimeline";
