/**
 * DoctorPopoverDoctorList.tsx — Scrollable doctor list inside chair popover.
 */

import React from "react";
import { UserCheck } from "lucide-react";
import type { ScheduleChairDoctorPopoverProps } from "./chairDoctorPopoverTypes";

interface DoctorPopoverDoctorListProps {
	chair: ScheduleChairDoctorPopoverProps["chair"];
	doctors: ScheduleChairDoctorPopoverProps["doctors"];
	assignment: ScheduleChairDoctorPopoverProps["assignment"];
	handleConfirmAssignDoctor: ScheduleChairDoctorPopoverProps["handleConfirmAssignDoctor"];
	onClose: () => void;
}

export function DoctorPopoverDoctorList({
	chair,
	doctors,
	assignment,
	handleConfirmAssignDoctor,
	onClose,
}: DoctorPopoverDoctorListProps) {
	return (
		<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
			<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
				Выберите врача:
			</span>
			{doctors.map((doc) => {
				const isCurrent = assignment?.doctorId === doc.id;
				return (
					<button
						key={doc.id}
						type="button"
						onClick={() => {
							handleConfirmAssignDoctor(
								chair.id,
								doc.id,
								assignment?.shiftPreset === "morning" ||
									assignment?.shiftPreset === "evening"
									? assignment.shiftPreset
									: "full",
							);
							onClose();
						}}
						className={`min-h-[44px] w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
							isCurrent
								? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)] text-[var(--teal)] shadow-xs"
								: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
						}`}
						style={{ minHeight: "44px" }}
						data-testid={`chair-doctor-option-${chair.id}-${doc.id}`}
					>
						<span className="truncate">{doc.fullName}</span>
						{isCurrent && (
							<UserCheck
								size={14}
								className="text-[var(--teal)] shrink-0 ml-1"
							/>
						)}
					</button>
				);
			})}
		</div>
	);
}
