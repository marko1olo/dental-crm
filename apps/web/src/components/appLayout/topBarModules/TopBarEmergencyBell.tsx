/**
 * TopBarEmergencyBell — SOS Экстренная помощь и колокольчик тревог (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { AlertOctagon, PhoneCall } from "lucide-react";
import { NotificationBell } from "../../notifications/NotificationBell";
import { LanCitoEmergencyBanner } from "../../sync/LanCitoEmergencyBanner";
import { useTelephonyStore } from "../../../store/telephonyStore";

export interface TopBarEmergencyBellProps {
	activeCitoAlerts?: any[];
	dismissCitoAlert?: (alertId: string) => void;
	onEmergencyClick?: () => void;
	showSosButton?: boolean;
}

export function TopBarEmergencyBell({
	activeCitoAlerts = [],
	dismissCitoAlert,
	onEmergencyClick,
	showSosButton = true,
}: TopBarEmergencyBellProps) {
	const activeCall = useTelephonyStore((s) => s.activeCall);

	const handleSos = () => {
		if (onEmergencyClick) {
			onEmergencyClick();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-emergency-rescue"));
		}
	};

	return (
		<>
			<div className="flex items-center gap-1.5 sm:gap-2">
				{/* Кнопка экстренной помощи SOS у кресла (Ctrl+Alt+E) */}
				{showSosButton && (
					<button
						className="secondary-button compact-top-button hidden sm:inline-flex min-h-[44px] items-center gap-1.5 text-[var(--bad-fg,#ef4444)] border-[var(--bad-fg,#ef4444)]/40 hover:bg-[var(--bad-bg,#fee2e2)] hover:border-[var(--bad-fg,#ef4444)] transition-colors cursor-pointer"
						type="button"
						id="topbar-emergency-rescue-btn"
						data-testid="topbar-emergency-rescue-btn"
						title="Экстренная помощь у кресла (Ctrl+Alt+E)"
						onClick={handleSos}
					>
						<AlertOctagon className="w-3.5 h-3.5 text-[var(--bad-fg,#ef4444)] shrink-0" aria-hidden="true" />
						<span className="hidden md:inline font-bold">SOS</span>
					</button>
				)}

				{/* Индикатор активного вызова телефонии */}
				{activeCall && (
					<button
						className="secondary-button compact-top-button h-8 min-h-[32px] px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
						type="button"
						id="topbar-chairside-telephony-btn"
						data-testid="topbar-chairside-telephony-btn"
						title={`Телефония: ${activeCall.patientName || activeCall.phone}`}
						onClick={() => {
							useTelephonyStore.getState().openCallDrawer();
						}}
					>
						<PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" aria-hidden="true" />
						<span className="hidden xl:inline max-w-[120px] truncate">{activeCall.patientName || activeCall.phone}</span>
					</button>
				)}

				{/* Тихий колокольчик уведомлений */}
				<NotificationBell />
			</div>

			{/* Баннер экстренных вызовов CITO LAN */}
			{activeCitoAlerts.length > 0 && dismissCitoAlert && (
				<LanCitoEmergencyBanner
					alerts={activeCitoAlerts}
					onDismiss={dismissCitoAlert}
					onAcknowledge={dismissCitoAlert}
				/>
			)}
		</>
	);
}
