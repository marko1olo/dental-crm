/**
 * DENTE Dental CRM — Column Focus Patient Badges
 * Mandate 8b (<= 120 lines)
 */

import { UserCheck } from "lucide-react";
import React from "react";
import { useAppStore } from "../../../store/appStore";
import type { Lead } from "../../../store/leadsStore";
import { usePatientStore } from "../../../store/patientStore";

interface ColumnFocusPatientBadgesProps {
	lead: Lead;
	onClose: () => void;
}

export const ColumnFocusPatientBadges: React.FC<
	ColumnFocusPatientBadgesProps
> = ({ lead, onClose }) => {
	const dropReasonMatch = lead.dropReason || null;
	if (!lead.existingPatient && !(lead.status === "trash" && dropReasonMatch)) {
		return null;
	}

	const handleOpenPatient = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!lead.existingPatient) return;
		usePatientStore.getState().setSelectedPatientId(lead.existingPatient.id);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") window.location.hash = "patients";
		onClose();
	};

	return (
		<div className="flex flex-wrap gap-1 my-1">
			{lead.existingPatient && (
				<div
					className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft)] border border-[var(--teal)] px-1.5 py-0.5 rounded cursor-pointer"
					onClick={handleOpenPatient}
					title={`Постоянный пациент: ${lead.existingPatient.fullName}`}
					data-testid={`expanded-existing-patient-badge-${lead.id}`}
				>
					<UserCheck size={11} className="shrink-0" />
					<span>Постоянный: {lead.existingPatient.fullName}</span>
				</div>
			)}
			{lead.status === "trash" && dropReasonMatch && (
				<div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
					<span>Срыв: {dropReasonMatch}</span>
				</div>
			)}
		</div>
	);
};
