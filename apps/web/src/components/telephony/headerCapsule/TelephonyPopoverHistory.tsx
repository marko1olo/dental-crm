import React from "react";
import { Clock, PhoneIncoming, PhoneOutgoing, PhoneMissed, RotateCcw } from "lucide-react";
import type { CallHistoryItem } from "../../../store/telephonyTypes";

export interface TelephonyPopoverHistoryProps {
	history: CallHistoryItem[];
	onRedial: (phone: string) => void;
	onOpenDrawer: () => void;
}

export function TelephonyPopoverHistory({
	history, onRedial, onOpenDrawer,
}: TelephonyPopoverHistoryProps): React.JSX.Element {
	const recent = history.slice(0, 5);

	if (recent.length === 0) {
		return (
			<div className="py-6 text-center text-xs text-[var(--muted)] flex flex-col items-center gap-1.5">
				<Clock size={20} className="opacity-40" />
				<span>Журнал звонков пуст</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-col divide-y divide-[var(--line-subtle,var(--line))] max-h-48 overflow-y-auto">
				{recent.map((call) => {
					const isMissed = call.status === "missed";
					const isOutbound = call.direction === "outbound";
					return (
						<div
							key={call.id || call.callId || call.timestamp}
							className="py-1.5 px-1 flex items-center justify-between gap-2 text-xs hover:bg-[var(--paper-soft)] rounded-lg transition-colors"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="shrink-0">
									{isMissed ? (
										<PhoneMissed size={14} className="text-rose-500" />
									) : isOutbound ? (
										<PhoneOutgoing size={14} className="text-teal-500" />
									) : (
										<PhoneIncoming size={14} className="text-emerald-500" />
									)}
								</span>
								<div className="min-w-0 flex flex-col">
									<span className="font-bold text-[var(--ink)] truncate max-w-[150px]">
										{call.patientName || call.phone}
									</span>
									<span className="text-[10px] font-mono text-[var(--muted)] truncate">
										{call.phone}
									</span>
								</div>
							</div>

							<button
								type="button"
								onClick={() => onRedial(call.phone)}
								className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] p-1.5 rounded-lg hover:bg-[var(--paper-subtle)] text-[var(--muted)] hover:text-[var(--teal)] flex items-center justify-center cursor-pointer shrink-0"
								title={`Набрать ${call.phone}`}
								aria-label={`Перезвонить на ${call.phone}`}
							>
								<RotateCcw size={13} />
							</button>
						</div>
					);
				})}
			</div>

			<button
				type="button"
				onClick={onOpenDrawer}
				className="secondary-button min-h-[44px] sm:min-h-[34px] w-full text-xs font-medium rounded-xl flex items-center justify-center cursor-pointer mt-1"
			>
				<span>Открыть полный журнал</span>
			</button>
		</div>
	);
}
