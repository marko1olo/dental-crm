import React from "react";
import { type FreedSlot, formatMoment, formatDuration } from "./types";
import { FreedSlotCandidateDispatcher } from "./FreedSlotCandidateDispatcher";

interface Props {
	slot: FreedSlot;
	isOpen: boolean;
	onToggleOpen: () => void;
	called: Set<string>;
	onMarkCalled: (key: string) => void;
	onSelectPatientId?: (id: string) => void;
}

export const FreedSlotRow: React.FC<Props> = ({
	slot, isOpen, onToggleOpen, called, onMarkCalled, onSelectPatientId,
}) => {
	return (
		<tr key={slot.appointmentId}>
			<td className="ops-strong whitespace-nowrap min-w-[130px]" data-label="Когда">
				{formatMoment(slot.startsAt)}
				<span className="ops-note block">{formatDuration(slot.startsAt, slot.endsAt)}</span>
			</td>
			<td data-label="Врач" className="max-w-[180px] truncate" title={slot.doctorName ?? "врач не указан"}>
				{slot.doctorName ?? "врач не указан"}
			</td>
			<td data-label="Почему освободилось" className="max-w-[200px] break-words">
				<span className={`ops-state ops-state--${slot.status === "no_show" ? "bad" : "warn"}`}>
					{slot.freedBecause}
				</span>
			</td>
			<td data-label="Кому предложить" className="min-w-[220px]">
				<FreedSlotCandidateDispatcher
					slot={slot}
					isOpen={isOpen}
					onToggleOpen={onToggleOpen}
					called={called}
					onMarkCalled={onMarkCalled}
					onSelectPatientId={onSelectPatientId}
				/>
			</td>
		</tr>
	);
};
