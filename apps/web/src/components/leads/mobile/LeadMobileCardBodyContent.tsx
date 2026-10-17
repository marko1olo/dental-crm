/**
 * DENTE Dental CRM — Leads Mobile Card Body Content
 * Patient Name, Phone, Clinical Tags, Existing Patient Badge, Notes Snippet
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ChevronRight, Phone, UserCheck } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";

interface LeadMobileCardBodyContentProps {
	lead: Lead;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
}

export const LeadMobileCardBodyContent: React.FC<LeadMobileCardBodyContentProps> = ({ lead, onOpenPatientCard }) => {
	return (
		<div className="leads-mobile-card-body">
			<div className="flex items-center justify-between gap-2">
				<h3 className="leads-mobile-patient-name">{lead.name}</h3>
				<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
			</div>

			{lead.phone && (
				<span className="leads-mobile-phone-link">
					<Phone size={12} className="shrink-0" />
					<span>{lead.phone}</span>
				</span>
			)}

			{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
				<div className="leads-mobile-tags-row">
					{lead.clinicalTags.map((tag) => (
						<span key={tag} className="leads-mobile-tag">Услуга: {tag}</span>
					))}
				</div>
			)}

			{lead.existingPatient && (
				<div className="mt-1" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (onOpenPatientCard) onOpenPatientCard(lead.existingPatient!.id);
						}}
						className="leads-mobile-existing-patient"
						style={{
							cursor: "pointer",
							background: "var(--amber-soft, rgba(245, 158, 11, 0.15))",
							color: "var(--amber-dark, var(--ink))",
							border: "1px solid var(--amber, #f59e0b)",
							borderRadius: 6,
							padding: "3px 8px",
							display: "inline-flex",
							alignItems: "center",
							gap: 5,
							fontSize: 11,
							fontWeight: 600,
						}}
						title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
						data-testid={`mobile-lead-existing-patient-btn-${lead.id}`}
					>
						<UserCheck size={12} className="text-[var(--amber)]" />
						<span>⚠️ Повторный пациент: {lead.existingPatient.fullName}</span>
					</button>
				</div>
			)}

			{lead.notes && (
				<div className="leads-mobile-notes-snippet">
					{lead.notes.slice(0, 95)}
					{lead.notes.length > 95 ? "..." : ""}
				</div>
			)}
		</div>
	);
};
