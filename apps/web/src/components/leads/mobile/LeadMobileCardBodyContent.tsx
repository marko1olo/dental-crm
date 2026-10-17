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
}

export const LeadMobileCardBodyContent: React.FC<LeadMobileCardBodyContentProps> = ({ lead }) => {
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
						<span key={tag} className="leads-mobile-tag">{tag}</span>
					))}
				</div>
			)}

			{lead.existingPatient && (
				<div className="mt-1">
					<span className="leads-mobile-existing-patient">
						<UserCheck size={11} />
						<span>Постоянный пациент: {lead.existingPatient.fullName}</span>
					</span>
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
