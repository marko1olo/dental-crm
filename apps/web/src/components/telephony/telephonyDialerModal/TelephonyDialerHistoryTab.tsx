import React from "react";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOff } from "lucide-react";
import { formatPhoneDisplay } from "../../../store/telephonyStore";
import type { CallHistoryItem } from "../../../store/telephonyTypes";

interface TelephonyDialerHistoryTabProps {
	callHistory: CallHistoryItem[];
	onSelectCall: (phone: string) => void;
}

export const TelephonyDialerHistoryTab: React.FC<TelephonyDialerHistoryTabProps> = ({
	callHistory,
	onSelectCall,
}) => {
	if (callHistory.length === 0) {
		return (
			<div className="py-8 text-center text-xs text-[var(--muted)] space-y-1">
				<div className="font-semibold text-[var(--ink)]">История звонков пуста</div>
				<div>Ожидание вебхука АТС</div>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{callHistory.slice(0, 10).map((item) => (
				<div
					key={item.id}
					className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs shadow-xs"
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div
							className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
								item.status === "answered" || item.status === "connected"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
									: item.status === "rejected"
										? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
										: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
							}`}
						>
							{item.status === "answered" || item.status === "connected" ? (
								<PhoneIncoming size={13} />
							) : item.status === "rejected" ? (
								<PhoneOff size={13} />
							) : (
								<PhoneMissed size={13} />
							)}
						</div>

						<div className="min-w-0 flex-1">
							<div
								className="font-bold text-[var(--ink)] truncate"
								title={item.patientName || formatPhoneDisplay(item.phone)}
							>
								{item.patientName || formatPhoneDisplay(item.phone)}
							</div>
							<div className="text-[10px] font-mono text-[var(--muted)]">
								{formatPhoneDisplay(item.phone)}
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={() => onSelectCall(item.phone)}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center cursor-pointer"
						title="Набрать"
						aria-label={`Набрать ${item.phone}`}
					>
						<PhoneCall size={14} />
					</button>
				</div>
			))}
		</div>
	);
};
