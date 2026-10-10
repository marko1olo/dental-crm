/**
 * @file TelephonyRecentCallsList.tsx
 * @description Layer 4: Presentation subcomponent for recent call history journal.
 * Compact list with 1-click redial and WhatsApp interaction triggers.
 */

import {
	MessageSquare,
	Phone,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
} from "lucide-react";
import React from "react";
import { formatPhoneDisplay } from "../../../store/telephonyStore";
import type { TelephonyRecentCallsListProps } from "./types";

export function TelephonyRecentCallsList({
	callHistory,
	onRedial,
	onSendWhatsApp,
}: TelephonyRecentCallsListProps) {
	return (
		<div className="space-y-2">
			{callHistory.length === 0 ? (
				<div
					className="py-8 text-center text-xs text-[var(--muted,#64748b)] space-y-1"
					data-testid="telephony-history-empty"
				>
					<div className="font-semibold text-[var(--ink,#0f172a)]">
						История звонков пуста
					</div>
					<div>
						Ожидание вебхука АТС (UIS / Mango / Zadarma / Asterisk)
					</div>
				</div>
			) : (
				callHistory.slice(0, 15).map((item) => (
					<div
						key={item.id}
						className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs shadow-xs"
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
									className="font-bold text-[var(--ink,#0f172a)] truncate leading-snug"
									title={item.patientName || formatPhoneDisplay(item.phone)}
								>
									{item.patientName || formatPhoneDisplay(item.phone)}
								</div>
								<div className="text-[10px] font-mono text-[var(--muted,#64748b)] flex items-center gap-1.5 min-w-0">
									<span className="truncate">{formatPhoneDisplay(item.phone)}</span>
									{item.timestamp && (
										<span className="shrink-0">
											·{" "}
											{new Date(item.timestamp).toLocaleTimeString("ru-RU", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							{/* Quick Call Button >= 44x44px */}
							<button
								type="button"
								onClick={() => onRedial(item.phone)}
								className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center cursor-pointer"
								title="Перезвонить"
								aria-label={`Перезвонить ${item.phone}`}
							>
								<Phone size={14} />
							</button>

							{/* Quick WhatsApp Trigger >= 44x44px */}
							<button
								type="button"
								onClick={() => onSendWhatsApp(item.phone)}
								className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-flex items-center justify-center cursor-pointer"
								title="Написать в WhatsApp"
								aria-label={`Написать в WhatsApp ${item.phone}`}
							>
								<MessageSquare size={14} />
							</button>
						</div>
					</div>
				))
			)}
		</div>
	);
}
