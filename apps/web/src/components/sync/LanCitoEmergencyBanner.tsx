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
	cito_emergency: "Экстренно",
	emergency: "Экстренно",
	urgent: "Срочно",
	normal: "Вызов",
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
			className="lan-cito-emergency-container flex flex-col gap-2 w-full px-4 py-2 bg-[var(--danger-soft)] border-b-2 border-[var(--danger)] shadow-sm z-[999]"
		>
			{alerts.map((alert) => {
				const urgencyLabel = URGENCY_LABELS[alert.urgency || "normal"] || "Вызов";
				const isCritical =
					(alert.urgency as string) === "cito_emergency" ||
					(alert.urgency as string) === "emergency" ||
					alert.urgency === "urgent";

				return (
					<div
						key={alert.alertId}
						className="lan-cito-alert-item flex items-center justify-between flex-wrap gap-3 px-3 py-2 rounded-xl bg-[var(--paper)] border border-[var(--danger)]/40 text-[var(--ink)]"
					>
						<div className="flex items-center gap-2.5 flex-1 min-w-0">
							<div
								className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-white ${
									isCritical ? "bg-[var(--danger)]" : "bg-[var(--warning)]"
								}`}
							>
								{isCritical ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
							</div>

							<div className="flex flex-col gap-0.5 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span
										className={`inline-flex items-center h-6 px-2 text-xs font-medium rounded-full text-white ${
											isCritical ? "bg-[var(--danger)]" : "bg-[var(--warning)]"
										}`}
									>
										Экстренный вызов • {urgencyLabel}
									</span>
									<span className="font-semibold text-sm text-[var(--ink)]">
										Кабинет {alert.cabinetNumber}
									</span>
									<span className="text-xs text-[var(--ink-muted)]">
										({alert.doctorName})
									</span>
								</div>

								<div className="text-sm text-[var(--ink)]">
									{alert.customMessage || alert.reason || "Срочный вызов ассистента в кабинет"}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							{onAcknowledge && (
								<button
									type="button"
									onClick={() => onAcknowledge(alert.alertId)}
									className="min-h-[44px] h-11 px-4 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm transition-colors cursor-pointer touch-manipulation"
								>
									<Check className="w-4 h-4 shrink-0" />
									<span>Принять</span>
								</button>
							)}

							<button
								type="button"
								onClick={() => onDismiss(alert.alertId)}
								aria-label="Скрыть экстренное оповещение"
								className="min-w-[44px] min-h-[44px] h-11 px-3 rounded-xl inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer touch-manipulation"
							>
								<X className="w-4 h-4 shrink-0" />
							</button>
						</div>
					</div>
				);
			})}
		</aside>
	);
};
