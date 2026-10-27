/**
 * TopBarEmergencyBell — SOS Экстренная помощь и CITO LAN тревоги (Мандат 8b, <= 120 строк).
 * Уведомления вынесены в WorkspaceTopBarActions, дублирующий колокольчик выкорчеван.
 */

import React from "react";
import { AlertOctagon } from "lucide-react";
import { LanCitoEmergencyBanner } from "../../sync/LanCitoEmergencyBanner";

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
	const handleSos = () => {
		if (onEmergencyClick) {
			onEmergencyClick();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-emergency-rescue"));
		}
	};

	return (
		<>
			{showSosButton && (
				<div className="flex items-center gap-1.5 sm:gap-2">
					{/* Кнопка экстренной помощи SOS у кресла (Ctrl+Alt+E) */}
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
				</div>
			)}

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
