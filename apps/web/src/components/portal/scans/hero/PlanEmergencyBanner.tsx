import React from "react";
import { ShieldAlert, Zap } from "lucide-react";
import { PlanEmergencyButtons } from "./PlanEmergencyButtons";

export interface PlanEmergencyBannerProps {
	readonly emergencyPhone?: string | undefined;
	readonly whatsappUrl: string;
}

export const PlanEmergencyBanner: React.FC<PlanEmergencyBannerProps> = ({
	emergencyPhone = "",
	whatsappUrl,
}) => {
	return (
		<div
			className="pc-card emergency-hotline-card"
			data-testid="emergency-hotline-banner"
			style={{
				backgroundColor: "rgba(239, 68, 68, 0.08)",
				border: "1.5px solid var(--pc-danger, #ef4444)",
				borderRadius: "12px",
				padding: "14px 16px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div
						style={{
							width: "36px",
							height: "36px",
							borderRadius: "50%",
							backgroundColor: "var(--pc-danger, #ef4444)",
							color: "var(--on-teal, #ffffff)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<ShieldAlert size={20} />
					</div>
					<div>
						<strong style={{ fontSize: "15px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							Возникла боль или дискомфорт после приема?
						</strong>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							Круглосуточная прямая связь с дежурным врачом-стоматологом клиники DENTE:
						</p>
					</div>
				</div>

				<span
					style={{
						backgroundColor: "var(--pc-danger, #ef4444)",
						color: "var(--on-teal, #ffffff)",
						fontSize: "12px",
						fontWeight: 800,
						padding: "3px 8px",
						borderRadius: "12px",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<Zap size={12} />
					<span>24/7 Линия заботы</span>
				</span>
			</div>

			<PlanEmergencyButtons emergencyPhone={emergencyPhone} whatsappUrl={whatsappUrl} />
		</div>
	);
};
