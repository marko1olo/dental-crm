/**
 * DoctorPopoverActions.tsx — Chair popover bottom action buttons (bind, unassign, full modal).
 */

import React from "react";
import { Clock, Pin, XCircle } from "lucide-react";
import type { ScheduleChairDoctorPopoverProps } from "./chairDoctorPopoverTypes";

interface DoctorPopoverActionsProps {
	chair: ScheduleChairDoctorPopoverProps["chair"];
	targetDocId: string;
	hasDoctor: boolean;
	handleBindDoctorToChair: ScheduleChairDoctorPopoverProps["handleBindDoctorToChair"];
	handleUnassignDoctor: ScheduleChairDoctorPopoverProps["handleUnassignDoctor"];
	openAssignModal: ScheduleChairDoctorPopoverProps["openAssignModal"];
	onClose: () => void;
}

export function DoctorPopoverActions({
	chair,
	targetDocId,
	hasDoctor,
	handleBindDoctorToChair,
	handleUnassignDoctor,
	openAssignModal,
	onClose,
}: DoctorPopoverActionsProps) {
	return (
		<div className="flex flex-col gap-1 pt-1 border-t border-[var(--line)]">
			<button
				type="button"
				onClick={() => {
					if (targetDocId) handleBindDoctorToChair(chair.id, targetDocId);
					onClose();
				}}
				className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				data-testid={`chair-popover-bind-doctor-${chair.id}`}
			>
				<Pin size={14} className="text-[var(--teal)] shrink-0" />
				<span>Закрепить врача за креслом</span>
			</button>
			{hasDoctor && (
				<button
					type="button"
					onClick={() => {
						handleUnassignDoctor(chair.id);
						onClose();
					}}
					className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
					style={{ minHeight: "44px" }}
					data-testid={`chair-popover-unassign-${chair.id}`}
				>
					<XCircle size={14} />
					<span>Снять врача с кресла</span>
				</button>
			)}
			<button
				type="button"
				onClick={() => {
					openAssignModal(chair.id);
					onClose();
				}}
				className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				data-testid={`btn-chair-open-full-modal-${chair.id}`}
			>
				<Clock size={14} />
				<span>Расширенная настройка</span>
			</button>
		</div>
	);
}
