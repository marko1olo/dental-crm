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
			className="recall-kanban-dropdown-menu"
			style={{
				position: "absolute", right: 0, bottom: "100%", marginBottom: "4px", zIndex: 60,
				background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px", boxShadow: "0 8px 18px rgba(0, 0, 0, 0.2)", padding: "4px", minWidth: "185px",
				display: "flex", flexDirection: "column", gap: "2px",
			}}
		>
			<button type="button" className="recall-dropdown-item" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", fontSize: "0.75rem", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }} onClick={() => { onCopySms(candidate); onClose(); }} data-testid={`recall-sms-btn-${candidate.id}`}>
				<Send size={12} /> <span>Копировать SMS</span>
			</button>
			<button type="button" className="recall-dropdown-item" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", fontSize: "0.75rem", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }} onClick={() => { onPostpone ? onPostpone(candidate, "2_weeks") : onStatusUpdate(candidate.id, "declined"); onClose(); }} data-testid={`kanban-postpone-2w-btn-${candidate.id}`}>
				<Clock size={12} /> <span>Отложить на 2 недели</span>
			</button>
			<button type="button" className="recall-dropdown-item" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", fontSize: "0.75rem", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }} onClick={() => { onPostpone ? onPostpone(candidate, "1_month") : onStatusUpdate(candidate.id, "declined"); onClose(); }} data-testid={`kanban-postpone-1m-btn-${candidate.id}`}>
				<Clock size={12} /> <span>Отложить на 1 месяц</span>
			</button>
			<button type="button" className="recall-dropdown-item" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", fontSize: "0.75rem", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%", color: "var(--color-success, #059669)" }} onClick={() => { onStatusUpdate(candidate.id, "scheduled"); onClose(); }} data-testid={`kanban-fast-scheduled-btn-${candidate.id}`}>
				<Check size={12} /> <span>Пометить: Записан</span>
			</button>
			<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "2px 0" }} />
			<div style={{ padding: "4px 8px" }}>
				<div style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)", marginBottom: "3px" }}>Статус канбана:</div>
				<select
					style={{ width: "100%", padding: "3px 4px", borderRadius: "4px", border: "1px solid var(--line, #e2e8f0)", background: "var(--paper-soft, #f8fafc)", fontSize: "0.72rem" }}
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
