import React from "react";
import { X } from "lucide-react";
import type { ScheduleChairDoctorPopoverProps } from "./chairDoctorPopover/chairDoctorPopoverTypes";
import { DoctorPopoverDoctorList } from "./chairDoctorPopover/DoctorPopoverDoctorList";
import { DoctorPopoverDailyShifts } from "./chairDoctorPopover/DoctorPopoverDailyShifts";
import { DoctorPopoverExtendedShifts } from "./chairDoctorPopover/DoctorPopoverExtendedShifts";
import { DoctorPopoverActions } from "./chairDoctorPopover/DoctorPopoverActions";

export type { ScheduleChairDoctorPopoverProps };

export function ScheduleChairDoctorPopover({
	chair,
	doctors,
	assignment,
	suggestedDoctor,
	hasDoctor,
	dateKey,
	dashboard,
	onClose,
	handleConfirmAssignDoctor,
	handleAssignDoctorWeek,
	handleAssignDoctorMonth,
	handleQuickSubstituteDoctor,
	handleBindDoctorToChair,
	handleUnassignDoctor,
	openAssignModal,
}: ScheduleChairDoctorPopoverProps) {
	const targetDocId =
		assignment?.doctorId ||
		suggestedDoctor?.id ||
		(doctors[0]?.id ?? "");

	return (
		<div
			className="absolute top-full left-0 z-50 mt-1 p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col gap-2 min-w-[280px] max-w-[340px] text-xs"
			style={{
				boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
				zIndex: 60,
			}}
			onClick={(e) => e.stopPropagation()}
			data-testid={`chair-doctor-quick-popover-${chair.id}`}
		>
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
				<span className="text-xs font-bold text-[var(--ink)]">
					Врач на кресле «{chair.name}»
				</span>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] cursor-pointer flex items-center justify-center"
					style={{ minHeight: "44px", minWidth: "44px" }}
					aria-label="Закрыть"
				>
					<X size={16} />
				</button>
			</div>

			<DoctorPopoverDoctorList
				chair={chair}
				doctors={doctors}
				assignment={assignment}
				handleConfirmAssignDoctor={handleConfirmAssignDoctor}
				onClose={onClose}
			/>

			<div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
				<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
					Шаблоны смен:
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
					<DoctorPopoverDailyShifts
						chair={chair}
						targetDocId={targetDocId}
						onAssign={handleConfirmAssignDoctor}
						onClose={onClose}
					/>
					<DoctorPopoverExtendedShifts
						chair={chair}
						targetDocId={targetDocId}
						doctors={doctors}
						currentDocId={assignment?.doctorId}
						dateKey={dateKey}
						dashboard={dashboard}
						handleAssignDoctorWeek={handleAssignDoctorWeek}
						handleAssignDoctorMonth={handleAssignDoctorMonth}
						handleConfirmAssignDoctor={handleConfirmAssignDoctor}
						handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
						onClose={onClose}
					/>
				</div>
			</div>

			<DoctorPopoverActions
				chair={chair}
				targetDocId={targetDocId}
				hasDoctor={hasDoctor}
				handleBindDoctorToChair={handleBindDoctorToChair}
				handleUnassignDoctor={handleUnassignDoctor}
				openAssignModal={openAssignModal}
				onClose={onClose}
			/>
		</div>
	);
}
