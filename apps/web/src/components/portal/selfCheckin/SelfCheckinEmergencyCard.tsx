/**
 * SelfCheckinEmergencyCard.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Emergency triage card for immediate doctor call on acute tooth pain:
 * - Touch action manipulation, high contrast amber warning style
 * - Instant queue ticket generation without routine questionnaire delay
 */

import React, { memo } from "react";
import { AlertCircle } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface SelfCheckinEmergencyCardProps {
	readonly onEmergencyCheckin?: (() => void) | undefined;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onOneTouchCheckin: () => void;
}

export const SelfCheckinEmergencyCard: React.FC<SelfCheckinEmergencyCardProps> = memo(({
	onEmergencyCheckin,
	onApplyPhysiologicalNorm,
	onOneTouchCheckin,
}) => {
	const handleEmergency = () => {
		triggerHaptic("heavy");
		if (onEmergencyCheckin) {
			onEmergencyCheckin();
		} else {
			onApplyPhysiologicalNorm();
			onOneTouchCheckin();
		}
	};

	return (
		<div
			style={{
				padding: "16px",
				borderRadius: "14px",
				border: "2px solid var(--amber, #f59e0b)",
				backgroundColor: "var(--amber-soft, rgba(245, 158, 11, 0.08))",
				marginBottom: "14px",
				textAlign: "center",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					marginBottom: "8px",
					color: "var(--amber, #d97706)",
					fontWeight: 800,
					fontSize: "16px",
				}}
			>
				<AlertCircle size={24} />
				<span>Экстренный приём при острой боли</span>
			</div>
			<p style={{ fontSize: "14px", color: "var(--ink)", margin: "0 0 14px 0", lineHeight: "1.4" }}>
				Дежурный врач примет вас вне очереди. Нажмите кнопку ниже для вызова врача и получения экстренного талона.
			</p>
			<button
				type="button"
				className="selfcheckin-btn-primary"
				style={{
					width: "100%",
					minHeight: "56px",
					backgroundColor: "var(--amber, #f59e0b)",
					borderColor: "var(--amber, #f59e0b)",
					color: "#ffffff",
					fontSize: "16px",
					fontWeight: 800,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
					cursor: "pointer",
					borderRadius: "12px",
				}}
				onClick={handleEmergency}
				data-testid="kiosk-emergency-action-btn"
			>
				<AlertCircle size={22} />
				<span>Вызвать дежурного врача — Экстренный талон</span>
			</button>
		</div>
	);
});

SelfCheckinEmergencyCard.displayName = "SelfCheckinEmergencyCard";
