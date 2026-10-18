/**
 * apps/web/src/components/billing/sbp/SbpQrHeader.tsx
 *
 * Header telemetry and timer badge for SbpDynamicQrCard.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { QrCode, Clock, CheckCircle2 } from "lucide-react";

interface SbpQrHeaderProps {
	readonly status: "awaiting" | "paid" | "expired";
	readonly secondsLeft: number;
}

export const SbpQrHeader: React.FC<SbpQrHeaderProps> = ({ status, secondsLeft }) => {
	return (
		<div className="flex items-center justify-between gap-2 border-b border-[var(--line,#cbd5e1)] pb-2.5">
			<div className="flex items-center gap-2">
				<div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
					<QrCode size={16} />
				</div>
				<div>
					<span className="text-xs font-bold leading-tight flex items-center gap-1.5 text-[var(--ink,#0f172a)]">
						<span>Динамический QR СБП</span>
						<span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 px-1.5 py-0.2 rounded bg-teal-500/10 border border-teal-500/25">
							0.4% комиссия
						</span>
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)] block leading-none mt-0.5">
						НСПК · ГОСТ Р 56042-2014
					</span>
				</div>
			</div>

			{status === "awaiting" && (
				<div
					className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
						secondsLeft <= 7
							? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 animate-pulse"
							: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]"
					}`}
					data-testid="sbp-timer-indicator"
					title="Время жизни динамического QR-кода"
				>
					<Clock size={12} className={secondsLeft <= 7 ? "text-amber-600" : "text-slate-400"} />
					<span>{secondsLeft} с</span>
				</div>
			)}

			{status === "paid" && (
				<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
					<CheckCircle2 size={12} />
					<span>Оплачено</span>
				</span>
			)}
		</div>
	);
};
