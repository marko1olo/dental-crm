/**
 * DENTE Dental CRM — Leads Conversion Attribution Card
 * Mandate 8l (Zero Attribution Loss), Mandate 8b (<= 120 lines)
 */

import { User } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { extractLeadAttribution } from "../leadsFunnelEngine";
import { LeadConvertChannelRow } from "./LeadConvertChannelRow";
import { LeadConvertExistingPatientAlert } from "./LeadConvertExistingPatientAlert";

interface LeadConvertAttributionCardProps {
	lead: Lead;
	borderColor: string;
}

export const LeadConvertAttributionCard: React.FC<LeadConvertAttributionCardProps> = ({
	lead,
	borderColor,
}) => {
	const attribution = extractLeadAttribution(lead);

	return (
		<div
			style={{
				padding: "10px 12px",
				borderRadius: 10,
				background: "var(--paper-soft)",
				border: `1px solid ${borderColor}`,
				display: "flex",
				flexDirection: "column",
				gap: 6,
			}}
			data-testid="lead-convert-attribution-card"
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
				<span
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					<User size={13} style={{ color: "var(--teal)" }} />
					{lead.name}
				</span>
				{lead.phone && (
					<span style={{ fontSize: 12, color: "var(--muted)" }}>{lead.phone}</span>
				)}
			</div>

			{lead.existingPatient && (
				<LeadConvertExistingPatientAlert existingPatient={lead.existingPatient} />
			)}

			<LeadConvertChannelRow attribution={attribution} lead={lead} />
		</div>
	);
};
