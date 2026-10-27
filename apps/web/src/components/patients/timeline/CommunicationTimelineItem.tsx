import React from "react";
import { CallPlayer } from "../../communications/CallPlayer";
import type { PatientCommunicationEntry } from "./timelineTypes";
import { entryTitle, formatMoment, STATUS_VIEW, TONE_CLASSES } from "./timelineConstants";

export interface CommunicationTimelineItemProps {
	readonly entry: PatientCommunicationEntry;
}

export const CommunicationTimelineItem: React.FC<CommunicationTimelineItemProps> = React.memo(({ entry }) => {
	const view = STATUS_VIEW[entry.status];
	const moment = formatMoment(entry.createdAt);

	return (
		<li className="p-3 rounded-lg border text-xs bg-[var(--paper-strong)] border-[var(--glass-border)] shadow-2xs">
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-semibold text-[var(--ink)]">{entryTitle(entry)}</span>
				<span className={`px-2 py-0.5 rounded border font-medium ${TONE_CLASSES[view.tone]}`}>
					{view.label}
				</span>
				{moment ? <span className="text-[var(--muted)]">{moment}</span> : null}
			</div>
			<p className="mt-1 mb-0 text-[var(--ink)] break-words whitespace-pre-wrap">{entry.message}</p>
			{entry.recordingUrl ? (
				<CallPlayer recordingUrl={entry.recordingUrl} durationSeconds={entry.durationSeconds ?? null} />
			) : null}
			<p className="mt-1 mb-0 text-[var(--muted)]">
				{entry.actorName ? `Сотрудник: ${entry.actorName}` : "Автоматически, без участия сотрудника"}
			</p>
		</li>
	);
});

CommunicationTimelineItem.displayName = "CommunicationTimelineItem";
