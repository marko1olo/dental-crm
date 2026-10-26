import React from "react";
import { MessageCircle, PhoneCall } from "lucide-react";

export interface PlanEmergencyButtonsProps {
	readonly emergencyPhone?: string | undefined;
	readonly whatsappUrl: string;
}

export const PlanEmergencyButtons: React.FC<PlanEmergencyButtonsProps> = ({
	emergencyPhone = "",
	whatsappUrl,
}) => {
	const phoneDigits = emergencyPhone.replace(/\D/g, "");

	return (
		<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
			<a
				href={whatsappUrl}
				target="_blank"
				rel="noreferrer"
				data-testid="emergency-whatsapp-btn"
				style={{
					flex: 1,
					minWidth: "160px",
					minHeight: "44px",
					borderRadius: "8px",
					backgroundColor: "var(--ok-fg, #25d366)",
					color: "var(--on-teal, #ffffff)",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					fontWeight: 700,
					fontSize: "13px",
					textDecoration: "none",
					padding: "8px 16px",
					touchAction: "manipulation",
					boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)",
				}}
			>
				<MessageCircle size={18} />
				<span>Написать в WhatsApp дежурному</span>
			</a>

			<a
				href={`tel:${phoneDigits}`}
				data-testid="emergency-phone-btn"
				style={{
					flex: 1,
					minWidth: "160px",
					minHeight: "44px",
					borderRadius: "8px",
					backgroundColor: "var(--pc-surface, #1e293b)",
					color: "var(--pc-text-main, var(--ink, #0f172a))",
					border: "1px solid var(--pc-border, #334155)",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					fontWeight: 700,
					fontSize: "13px",
					textDecoration: "none",
					padding: "8px 16px",
					touchAction: "manipulation",
				}}
			>
				<PhoneCall size={18} style={{ color: "var(--pc-danger, #ef4444)" }} />
				<span>Позвонить в клинику ({emergencyPhone})</span>
			</a>
		</div>
	);
};
