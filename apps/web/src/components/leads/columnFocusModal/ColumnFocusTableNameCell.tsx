/**
 * DENTE Dental CRM — Column Focus Table Name Cell
 * Mandate 8b (<= 120 lines)
 */

import { Edit2, UserCheck } from "lucide-react";
import type React from "react";
import { useAppStore } from "../../../store/appStore";
import type { Lead } from "../../../store/leadsStore";
import { usePatientStore } from "../../../store/patientStore";

interface ColumnFocusTableNameCellProps {
	lead: Lead;
	onEditLead: (lead: Lead) => void;
	onClose: () => void;
}

export const ColumnFocusTableNameCell: React.FC<
	ColumnFocusTableNameCellProps
> = ({ lead, onEditLead, onClose }) => {
	const handleOpenPatient = () => {
		if (!lead.existingPatient) return;
		usePatientStore.getState().setSelectedPatientId(lead.existingPatient.id);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") window.location.hash = "patients";
		onClose();
	};

	return (
		<div className="flex items-center gap-1.5 min-w-0">
			<span className="expanded-focus-table-name" title={lead.name}>
				{lead.name}
			</span>
			{lead.existingPatient && (
				<span
					className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)] shrink-0 cursor-pointer"
					onClick={(e) => {
						e.stopPropagation();
						handleOpenPatient();
					}}
					title={`Постоянный пациент: ${lead.existingPatient.fullName}`}
					data-testid={`expanded-table-patient-badge-${lead.id}`}
				>
					<UserCheck size={10} />
					<span className="truncate max-w-[85px]">
						{lead.existingPatient.fullName}
					</span>
				</span>
			)}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onEditLead(lead);
				}}
				className="text-[var(--muted)] hover:text-[var(--teal)] p-0.5"
				title="Редактировать"
			>
				<Edit2 size={11} />
			</button>
		</div>
	);
};
