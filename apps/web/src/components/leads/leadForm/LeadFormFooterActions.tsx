/**
 * DENTE Dental CRM — Lead Form Modal Footer Actions
 * Mandate 8b (<= 120 lines)
 */

import { Trash2, UserCheck, UserPlus } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadFormFooterActionsProps {
	isNew: boolean;
	editingLeadId: string | null;
	currentLead: Lead | null;
	isDeleting: boolean;
	creatingPatientLeadId: string | null;
	onOpenPatient: (patientId: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onDelete: () => void;
}

const secondaryBtnStyle: React.CSSProperties = {
	justifyContent: "center",
	color: "var(--teal)",
	borderColor: "var(--line)",
	minHeight: 40,
	display: "flex",
	alignItems: "center",
	gap: 6,
	fontWeight: 600,
};
const deleteBtnStyle: React.CSSProperties = {
	justifyContent: "center",
	color: "var(--rust)",
	borderColor: "var(--rust)",
	minWidth: 44,
	minHeight: 40,
	display: "flex",
	alignItems: "center",
	gap: 6,
};

export const LeadFormFooterActions: React.FC<LeadFormFooterActionsProps> = ({
	isNew,
	editingLeadId,
	currentLead,
	isDeleting,
	creatingPatientLeadId,
	onOpenPatient,
	onCreatePatient,
	onDelete,
}) => {
	return (
		<div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "stretch", flexWrap: "wrap" }}>
			<button
				type="submit"
				className="primary-button"
				disabled={isDeleting}
				style={{ flex: 1, minHeight: 40, justifyContent: "center" }}
			>
				Сохранить
			</button>

			{!isNew && currentLead ? (
				currentLead.existingPatient ? (
					<button
						type="button"
						className="secondary-button"
						data-testid="open-patient-modal-btn"
						disabled={isDeleting}
						onClick={() => onOpenPatient(currentLead.existingPatient!.id)}
						title={`Открыть карту постоянного пациента ${currentLead.existingPatient.fullName}`}
						style={secondaryBtnStyle}
					>
						<UserCheck size={16} />
						Карточка пациента
					</button>
				) : (
					<button
						type="button"
						className="secondary-button"
						data-testid="lead-create-patient-modal-btn"
						disabled={isDeleting || creatingPatientLeadId === editingLeadId}
						onClick={() => onCreatePatient(currentLead)}
						title="Создать карту пациента из обращения"
						style={secondaryBtnStyle}
					>
						<UserPlus size={16} />
						{creatingPatientLeadId === editingLeadId ? "Создаём…" : "Создать пациента"}
					</button>
				)
			) : null}

			{!isNew && editingLeadId ? (
				<button
					type="button"
					className="secondary-button"
					data-testid="lead-delete-permanent"
					disabled={isDeleting}
					onClick={onDelete}
					title="Удалить обращение из базы навсегда"
					aria-label="Удалить обращение навсегда"
					style={deleteBtnStyle}
				>
					<Trash2 size={16} />
					{isDeleting ? " Удаляем…" : " Удалить"}
				</button>
			) : null}
		</div>
	);
};
