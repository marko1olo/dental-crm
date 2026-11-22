import type React from "react";
import { Check, Clock, Send } from "lucide-react";
import {
	fromCanonicalRecallStatus,
	toCanonicalRecallStatus,
	type CanonicalRecallWorkflowStatus,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";

export interface PatientRecallsKanbanDropdownMenuProps {
	readonly candidate: PatientRecallRecord;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsKanbanDropdownMenu: React.FC<PatientRecallsKanbanDropdownMenuProps> = ({
	candidate,
	isOpen,
	onClose,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="recall-kanban-dropdown-menu absolute right-0 bottom-full mb-1 z-[60] bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-lg p-1 min-w-[185px] flex flex-col gap-0.5 text-[var(--ink)]"
		>
			<button
				type="button"
				className="recall-dropdown-item flex items-center gap-1.5 px-2 py-1.5 text-xs bg-transparent border-0 cursor-pointer text-left w-full hover:bg-[var(--paper-soft)] rounded text-[var(--ink)]"
				onClick={() => { onCopySms(candidate); onClose(); }}
				data-testid={`recall-sms-btn-${candidate.id}`}
			>
				<Send size={12} /> <span>Копировать SMS</span>
			</button>
			<button
				type="button"
				className="recall-dropdown-item flex items-center gap-1.5 px-2 py-1.5 text-xs bg-transparent border-0 cursor-pointer text-left w-full hover:bg-[var(--paper-soft)] rounded text-[var(--ink)]"
				onClick={() => { onPostpone ? onPostpone(candidate, "2_weeks") : onStatusUpdate(candidate.id, "declined"); onClose(); }}
				data-testid={`kanban-postpone-2w-btn-${candidate.id}`}
			>
				<Clock size={12} /> <span>Отложить на 2 недели</span>
			</button>
			<button
				type="button"
				className="recall-dropdown-item flex items-center gap-1.5 px-2 py-1.5 text-xs bg-transparent border-0 cursor-pointer text-left w-full hover:bg-[var(--paper-soft)] rounded text-[var(--ink)]"
				onClick={() => { onPostpone ? onPostpone(candidate, "1_month") : onStatusUpdate(candidate.id, "declined"); onClose(); }}
				data-testid={`kanban-postpone-1m-btn-${candidate.id}`}
			>
				<Clock size={12} /> <span>Отложить на 1 месяц</span>
			</button>
			<button
				type="button"
				className="recall-dropdown-item flex items-center gap-1.5 px-2 py-1.5 text-xs bg-transparent border-0 cursor-pointer text-left w-full hover:bg-[var(--paper-soft)] rounded text-[var(--success)]"
				onClick={() => { onStatusUpdate(candidate.id, "scheduled"); onClose(); }}
				data-testid={`kanban-fast-scheduled-btn-${candidate.id}`}
			>
				<Check size={12} /> <span>Пометить: Записан</span>
			</button>
			<div className="h-px bg-[var(--line)] my-0.5" />
			<div className="px-2 py-1">
				<div className="text-[11px] text-[var(--ink-muted)] mb-1">Статус канбана:</div>
				<select
					className="w-full px-1 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)]"
					value={toCanonicalRecallStatus(candidate.status)}
					onChange={(e) => {
						onStatusUpdate(candidate.id, fromCanonicalRecallStatus(e.target.value as CanonicalRecallWorkflowStatus));
						onClose();
					}}
					aria-label="Изменить статус в канбане"
					data-testid={`kanban-status-select-${candidate.id}`}
				>
					<option value="not_called">Не звонили</option>
					<option value="reached">Дозвонились</option>
					<option value="declined">Отказ / Перенос</option>
					<option value="scheduled">Записан</option>
				</select>
			</div>
		</div>
	);
};
