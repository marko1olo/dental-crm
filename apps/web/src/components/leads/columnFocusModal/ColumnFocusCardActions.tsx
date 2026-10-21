/**
 * DENTE Dental CRM — Column Focus Card Actions Row
 * Mandate 8b (<= 120 lines)
 */

import { ArrowRight, Calendar, UserCheck, UserPlus } from "lucide-react";
import React from "react";
import { useAppStore } from "../../../store/appStore";
import type { Lead } from "../../../store/leadsStore";
import { usePatientStore } from "../../../store/patientStore";

interface ColumnFocusCardActionsProps {
	lead: Lead;
	nextStageInfo?: { status: Lead["status"]; label: string } | null | undefined;
	onStatusChange: (leadId: string, status: Lead["status"]) => void;
	onScheduleLead: (id: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onClose: () => void;
}

export const ColumnFocusCardActions: React.FC<ColumnFocusCardActionsProps> = ({
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
		<div
			className="expanded-focus-card-actions-row"
			onClick={(e) => e.stopPropagation()}
		>
			{nextStageInfo && (
				<button
					type="button"
					onClick={() => onStatusChange(lead.id, nextStageInfo.status)}
					className="expanded-focus-action-btn expanded-focus-action-btn--advance"
					title={`Перевести в ${nextStageInfo.label}`}
				>
					<span>{nextStageInfo.label}</span>
					<ArrowRight size={12} />
				</button>
			)}

			{lead.status !== "trash" && (
				<button
					type="button"
					onClick={() => onScheduleLead(lead.id)}
					className="expanded-focus-action-btn expanded-focus-action-btn--schedule"
					title="Записать в расписание"
				>
					<Calendar size={12} />
					<span>Записать</span>
				</button>
			)}

			{lead.existingPatient ? (
				<button
					type="button"
					onClick={handleOpenPatient}
					className="expanded-focus-action-btn expanded-focus-action-btn--patient"
					title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
					data-testid={`expanded-open-patient-btn-${lead.id}`}
				>
					<UserCheck size={12} />
					<span>Карта</span>
				</button>
			) : (
				<button
					type="button"
					onClick={() => void onCreatePatient(lead)}
					className="expanded-focus-action-btn expanded-focus-action-btn--patient"
					title="Создать карту пациента"
					data-testid={`expanded-create-patient-btn-${lead.id}`}
				>
					<UserPlus size={12} />
					<span>В пациенты</span>
				</button>
			)}
		</div>
	);
};
