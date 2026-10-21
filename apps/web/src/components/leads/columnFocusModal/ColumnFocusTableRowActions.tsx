/**
 * DENTE Dental CRM — Column Focus Spreadsheet Table Row Actions
 * Mandate 8b (<= 120 lines)
 */

import { ArrowRight, Calendar, UserCheck, UserPlus } from "lucide-react";
import React from "react";
import { useAppStore } from "../../../store/appStore";
import type { Lead } from "../../../store/leadsStore";
import { usePatientStore } from "../../../store/patientStore";

interface ColumnFocusTableRowActionsProps {
	lead: Lead;
	nextStageInfo?: { status: Lead["status"]; label: string } | null | undefined;
	onStatusChange: (leadId: string, status: Lead["status"]) => void;
	onScheduleLead: (id: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onClose: () => void;
}

export const ColumnFocusTableRowActions: React.FC<
	ColumnFocusTableRowActionsProps
> = ({
	lead,
	nextStageInfo,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
}) => {
	const handleOpenPatient = () => {
		if (!lead.existingPatient) return;
		usePatientStore.getState().setSelectedPatientId(lead.existingPatient.id);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") window.location.hash = "patients";
		onClose();
	};

	return (
		<div className="flex items-center justify-end gap-1">
			{nextStageInfo && (
				<button
					type="button"
					onClick={() => onStatusChange(lead.id, nextStageInfo.status)}
					className="expanded-focus-table-action-btn"
					title={`В ${nextStageInfo.label}`}
				>
					<ArrowRight size={12} />
				</button>
			)}
			{lead.status !== "trash" && (
				<button
					type="button"
					onClick={() => onScheduleLead(lead.id)}
					className="expanded-focus-table-action-btn"
					title="Записать на приём"
				>
					<Calendar size={12} />
				</button>
			)}
			{lead.existingPatient ? (
				<button
					type="button"
					onClick={handleOpenPatient}
					className="expanded-focus-table-action-btn"
					title={`Открыть карту: ${lead.existingPatient.fullName}`}
					data-testid={`expanded-table-open-patient-btn-${lead.id}`}
				>
					<UserCheck size={12} />
				</button>
			) : (
				<button
					type="button"
					onClick={() => void onCreatePatient(lead)}
					className="expanded-focus-table-action-btn"
					title="Создать карту пациента"
					data-testid={`expanded-table-create-patient-btn-${lead.id}`}
				>
					<UserPlus size={12} />
				</button>
			)}
		</div>
	);
};
