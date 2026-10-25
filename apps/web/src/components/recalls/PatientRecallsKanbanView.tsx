import React, { useState } from "react";
import {
	CANONICAL_RECALL_STATUS_CONFIG,
	type CanonicalRecallWorkflowStatus,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";
import { PatientRecallsKanbanColumn } from "./PatientRecallsKanbanColumn";
import "./recallsKanban.css";

export interface PatientRecallsKanbanViewProps {
	readonly kanbanGroups: Record<CanonicalRecallWorkflowStatus, readonly PatientRecallRecord[]>;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

const MOBILE_STATUS_LABELS: Record<CanonicalRecallWorkflowStatus, string> = {
	not_called: "Новые",
	reached: "Дозвон",
	declined: "Отказ",
	scheduled: "Запись",
};

export const PatientRecallsKanbanView: React.FC<PatientRecallsKanbanViewProps> = ({
	kanbanGroups,
	onBook,
	onWhatsApp,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	const [activeMobileColumn, setActiveMobileColumn] =
		useState<CanonicalRecallWorkflowStatus>("not_called");
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);

	const columns = ["not_called", "reached", "declined", "scheduled"] as const;

	return (
		<div className="recall-kanban-wrapper">
			{/* Apple HIG 1-Row Mobile Segmented Chip Bar */}
			<div className="recall-kanban-mobile-tabs" role="tablist" aria-label="Когорты канбан-доски">
				{columns.map((colKey) => {
					const count = kanbanGroups[colKey]?.length ?? 0;
					const isActive = activeMobileColumn === colKey;
					return (
						<button
							key={colKey}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`recall-kanban-mobile-tab ${isActive ? "active" : ""}`}
							data-testid={`kanban-mobile-tab-${colKey}`}
							onClick={() => setActiveMobileColumn(colKey)}
						>
							<span className="recall-kanban-mobile-tab-text">{MOBILE_STATUS_LABELS[colKey]}</span>
							<span className="recall-kanban-mobile-tab-count">{count}</span>
						</button>
					);
				})}
			</div>

			<div className="recall-kanban-board" data-testid="recall-kanban-board">
				{columns.map((colKey) => (
					<PatientRecallsKanbanColumn
						key={colKey}
						colKey={colKey}
						candidates={kanbanGroups[colKey]}
						isMobileActive={activeMobileColumn === colKey}
						openMenuId={openMenuId}
						setOpenMenuId={setOpenMenuId}
						onBook={onBook}
						onWhatsApp={onWhatsApp}
						onCopySms={onCopySms}
						onStatusUpdate={onStatusUpdate}
						onPostpone={onPostpone}
					/>
				))}
			</div>
		</div>
	);
};
