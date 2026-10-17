import { Phone, PhoneOutgoing } from "lucide-react";
import React from "react";

export interface TelephonyFallbackLineCardProps {
	isWsConnected?: boolean;
	onSwitchToDialer: () => void;
}

export function TelephonyFallbackLineCard({
	isWsConnected,
	onSwitchToDialer,
}: TelephonyFallbackLineCardProps): React.JSX.Element {
	return (
		<div
			className="dnt-caller-card text-center py-6 space-y-3"
			data-testid="telephony-fallback-waiting-webhook"
		>
			<div className="dnt-widget-brand-icon mx-auto">
				<Phone size={20} />
			</div>
			<div>
				<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center justify-center gap-2">
					<span>Линия свободна</span>
					{!isWsConnected && (
						<span
							className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse font-normal"
							title="Связь с сервером телефонии восстанавливается..."
							data-testid="telephony-reconnecting-badge"
						>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
							<span>Переподключение...</span>
						</span>
					)}
				</h4>
				<p className="text-xs text-[var(--muted,#64748b)] mt-1">
					При поступлении звонка карточка пациента и быстрая запись откроются автоматически.
				</p>
			</div>
			<button
				type="button"
				onClick={onSwitchToDialer}
				className="primary-button dnt-cta-primary mx-auto"
			>
				<PhoneOutgoing size={14} />
				<span>Открыть номеронабиратель</span>
			</button>
		</div>
	);
}
