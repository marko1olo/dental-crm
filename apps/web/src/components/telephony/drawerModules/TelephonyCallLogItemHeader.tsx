import { Clock, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";
import React from "react";
import { formatDurationTimer, formatPhoneDisplay } from "../../../store/telephonyStore";

export interface TelephonyCallLogItemHeaderProps {
	kind: "incoming" | "outgoing" | "missed";
	sla: { status: string; formattedCountdown: string };
	displayName: string;
	isKnown: boolean;
	phone: string;
	timeStr: string;
	durationSeconds?: number | undefined;
	onOpenPatient?: (() => void) | undefined;
}

export function TelephonyCallLogItemHeader({
	kind,
	sla,
	displayName,
	isKnown,
	phone,
	timeStr,
	durationSeconds,
	onOpenPatient,
}: TelephonyCallLogItemHeaderProps): React.JSX.Element {
	return (
		<div className="flex items-start justify-between gap-2">
			<div className="flex items-start gap-2.5 min-w-0">
				<div
					className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
						kind === "missed"
							? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
							: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--teal)]"
					}`}
				>
					{kind === "missed" ? (
						<PhoneMissed size={14} />
					) : kind === "outgoing" ? (
						<PhoneOutgoing size={14} />
					) : (
						<PhoneIncoming size={14} />
					)}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={onOpenPatient}
							className="text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] truncate text-left cursor-pointer"
						>
							{displayName}
						</button>
						<span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] shrink-0">
							{isKnown ? "В базе" : "Новый номер"}
						</span>
					</div>
					<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--muted)] flex-wrap">
						<span className="font-mono font-semibold text-[var(--ink)]">{formatPhoneDisplay(phone)}</span>
						<span>•</span>
						<span>{timeStr}</span>
						{typeof durationSeconds === "number" && durationSeconds > 0 && (
							<>
								<span>•</span>
								<span className="font-mono">{formatDurationTimer(durationSeconds)}</span>
							</>
						)}
					</div>
				</div>
			</div>

			{kind === "missed" && sla.status !== "not_required" ? (
				<span
					className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 border ${
						sla.status === "overdue_sla"
							? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
							: sla.status === "pending_within_sla"
								? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
								: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--muted)]"
					}`}
					data-testid="call-log-sla-badge"
				>
					<Clock size={10} />
					<span className="font-mono">
						{sla.status === "pending_within_sla" ? `SLA ${sla.formattedCountdown}` : sla.formattedCountdown}
					</span>
				</span>
			) : (
				<span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)]">
					{kind === "outgoing" ? "Исходящий" : "Принят"}
				</span>
			)}
		</div>
	);
}
