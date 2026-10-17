import type React from "react";
import { CANONICAL_RECALL_STATUS_CONFIG, type CanonicalRecallWorkflowStatus, type PatientRecallRecord, type RecallContactStatus } from "./patientRecallEngine";
import { PatientRecallsKanbanCard } from "./PatientRecallsKanbanCard";

export interface PatientRecallsKanbanColumnProps {
	readonly colKey: CanonicalRecallWorkflowStatus;
	readonly candidates: readonly PatientRecallRecord[];
	readonly isMobileActive: boolean;
	readonly openMenuId: string | null;
	readonly setOpenMenuId: (id: string | null) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsKanbanColumn: React.FC<PatientRecallsKanbanColumnProps> = ({
	colKey,
	candidates,
	isMobileActive,
	openMenuId,
	setOpenMenuId,
	onBook,
	onWhatsApp,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	const colConfig = CANONICAL_RECALL_STATUS_CONFIG[colKey];

	return (
		<div className="recall-kanban-column" data-testid={`kanban-col-${colKey}`} data-mobile-active={isMobileActive}>
			<div className="recall-kanban-column-header">
				<div className="recall-kanban-column-title"><span>{colConfig.label}</span></div>
				<span className="recall-kanban-column-badge" data-testid={`kanban-badge-${colKey}`}>{candidates.length}</span>
			</div>
			<div className="recall-kanban-cards-list">
				{candidates.length === 0 ? (
					<div className="recall-kanban-empty">Нет пациентов в этом статусе</div>
				) : (
					candidates.map((candidate) => (
						<PatientRecallsKanbanCard
							key={candidate.id}
							candidate={candidate}
							isMenuOpen={openMenuId === candidate.id}
							onToggleMenu={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)}
							onBook={onBook}
							onWhatsApp={onWhatsApp}
							onCopySms={onCopySms}
							onStatusUpdate={onStatusUpdate}
							onPostpone={onPostpone}
						/>
					))
				)}
			</div>
		</div>
	);
};
