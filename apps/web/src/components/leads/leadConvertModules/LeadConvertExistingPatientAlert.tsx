/**
 * DENTE Dental CRM — Lead Convert Existing Patient Alert
 * Mandate 8b (<= 120 lines)
 */

import { UserCheck } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadConvertExistingPatientAlertProps {
	existingPatient: NonNullable<Lead["existingPatient"]>;
}

export const LeadConvertExistingPatientAlert: React.FC<LeadConvertExistingPatientAlertProps> = ({
	existingPatient,
}) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				padding: "6px 10px",
				background: "var(--amber-soft, rgba(245, 158, 11, 0.15))",
				color: "var(--amber-dark, var(--ink))",
				border: "1px solid var(--amber, #f59e0b)",
				borderRadius: 8,
				fontSize: 12,
				fontWeight: 600,
			}}
			data-testid="lead-convert-existing-patient-alert"
		>
			<UserCheck size={15} className="shrink-0 text-[var(--amber)]" />
			<span>
				Повторный пациент: {existingPatient.fullName} (новая карта не создается,
				приём привяжется к существующей)
			</span>
		</div>
	);
};
