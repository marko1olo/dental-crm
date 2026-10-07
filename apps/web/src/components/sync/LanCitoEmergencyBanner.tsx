/**
 * LanCitoEmergencyBanner.tsx — DENTE CRM Clinic CITO Emergency Call Banner
 *
 * High-visibility clinical banner for instantaneous assistant emergency summon
 * over local Wi-Fi LAN P2P mesh:
 * - 44x44px touch targets for gloved doctor/assistant operation (Mandate 8e, frontend.md)
 * - Zero-blocking: non-modal, does not trap focus or disrupt ongoing medical chart entries
 * - 1-click dismiss / acknowledge
 */

import React from "react";
import { AlertTriangle, Bell, Check, X } from "lucide-react";
import type { ActiveCitoAlert } from "../../hooks/useLanP2P";

export interface LanCitoEmergencyBannerProps {
	readonly alerts: readonly ActiveCitoAlert[];
	readonly onDismiss: (alertId: string) => void;
	readonly onAcknowledge?: ((alertId: string) => void) | undefined;
}

const URGENCY_LABELS: Record<string, string> = {
	cito_emergency: "ЭКСТРЕННО",
	emergency: "ЭКСТРЕННО",
	urgent: "СРОЧНО",
	normal: "ВЫЗОВ",
};

export const LanCitoEmergencyBanner: React.FC<LanCitoEmergencyBannerProps> = ({
	alerts,
	onDismiss,
	onAcknowledge,
}) => {
	if (!alerts || alerts.length === 0) return null;

	return (
		<aside
			role="alert"
			aria-live="assertive"
			className="lan-cito-emergency-container"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				width: "100%",
				padding: "8px 16px",
				backgroundColor: "#fef2f2",
				borderBottom: "2px solid #ef4444",
				boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
				zIndex: 999,
				animation: "pulse-subtle 2s infinite ease-in-out",
			}}
		>
			{alerts.map((alert) => {
				const urgencyLabel = URGENCY_LABELS[alert.urgency || "normal"] || "ВЫЗОВ";
				const isCritical =
					(alert.urgency as string) === "cito_emergency" ||
					(alert.urgency as string) === "emergency" ||
					alert.urgency === "urgent";

				return (
					<div
						key={alert.alertId}
						className="lan-cito-alert-item"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: "12px",
							padding: "8px 12px",
							backgroundColor: isCritical ? "#fee2e2" : "#ffffff",
							border: `1px solid ${isCritical ? "#f87171" : "#fca5a5"}`,
							borderRadius: "8px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								flex: "1 1 auto",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: "36px",
									height: "36px",
									borderRadius: "50%",
									backgroundColor: isCritical ? "#ef4444" : "#f97316",
									color: "#ffffff",
									flexShrink: 0,
								}}
							>
								{isCritical ? <AlertTriangle size={20} /> : <Bell size={20} />}
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
									<span
										style={{
											fontSize: "11px",
											fontWeight: 700,
											letterSpacing: "0.05em",
											padding: "2px 6px",
											borderRadius: "4px",
											backgroundColor: isCritical ? "#dc2626" : "#ea580c",
											color: "#ffffff",
										}}
									>
										⚡ Экстренный вызов в кабинет / Срочно • {urgencyLabel}
									</span>
									<span style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
										Кабинет {alert.cabinetNumber}
									</span>
									<span style={{ fontSize: "13px", color: "#4b5563" }}>
										({alert.doctorName})
									</span>
								</div>

								<div style={{ fontSize: "13px", color: "#1f2937" }}>
									{alert.customMessage || alert.reason || "Срочный вызов ассистента в кабинет"}
								</div>
							</div>
						</div>

						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								flexShrink: 0,
							}}
						>
							{onAcknowledge && (
								<button
									type="button"
									onClick={() => onAcknowledge(alert.alertId)}
									style={{
										minWidth: "44px",
										minHeight: "44px",
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "0 14px",
										borderRadius: "6px",
										border: "none",
										backgroundColor: "#16a34a",
										color: "#ffffff",
										fontSize: "13px",
										fontWeight: 600,
										cursor: "pointer",
										touchAction: "manipulation",
									}}
								>
									<Check size={16} />
									<span>Принять</span>
								</button>
							)}

							<button
								type="button"
								onClick={() => onDismiss(alert.alertId)}
								aria-label="Скрыть экстренное оповещение"
								style={{
									minWidth: "44px",
									minHeight: "44px",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: "6px",
									border: "1px solid #d1d5db",
									backgroundColor: "#ffffff",
									color: "#4b5563",
									cursor: "pointer",
									touchAction: "manipulation",
								}}
							>
								<X size={18} />
							</button>
						</div>
					</div>
				);
			})}
		</aside>
	);
};
