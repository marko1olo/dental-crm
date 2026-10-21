/**
 * DENTE Dental CRM — Lead Form Contact Bar
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquare, PhoneCall } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";

interface LeadFormContactBarProps {
	currentLead: Lead;
	borderColor: string;
}

export const LeadFormContactBar: React.FC<LeadFormContactBarProps> = ({
	currentLead,
	borderColor,
}) => {
	if (!currentLead.phone) return null;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				background: "var(--paper-soft)",
				border: `1px solid ${borderColor}`,
				borderRadius: 8,
				padding: "6px 12px",
				marginBottom: 12,
				gap: 8,
			}}
			data-testid="drawer-lead-contact-bar"
		>
			<span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
				{currentLead.phone}
			</span>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<a
					href={`tel:${currentLead.phone.replace(/[^\d+]/g, "")}`}
					className="secondary-button"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						height: 30,
						padding: "0 8px",
						fontSize: 12,
						borderRadius: 6,
						textDecoration: "none",
					}}
					title="Позвонить"
				>
					<PhoneCall size={12} color="var(--teal)" />
					<span>Звонок</span>
				</a>
				<a
					href={formatWhatsAppUrl(
						currentLead.phone,
						`Здравствуйте, ${currentLead.name}! Вас беспокоит стоматология DENTE.`,
					)}
					target="_blank"
					rel="noopener noreferrer"
					className="secondary-button"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						height: 30,
						padding: "0 8px",
						fontSize: 12,
						borderRadius: 6,
						textDecoration: "none",
						color: "var(--teal-dark, var(--teal))",
						background: "var(--teal-soft)",
						borderColor: "var(--teal)",
					}}
					title="WhatsApp"
				>
					<MessageSquare size={12} />
					<span>WhatsApp</span>
				</a>
			</div>
		</div>
	);
};
