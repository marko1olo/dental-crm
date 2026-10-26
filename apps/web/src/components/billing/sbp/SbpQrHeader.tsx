/**
 * apps/web/src/components/billing/sbp/SbpQrHeader.tsx
 *
 * Header telemetry and timer badge for SbpDynamicQrCard.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { QrCode, Clock, CheckCircle2, Loader2 } from "lucide-react";

interface SbpQrHeaderProps {
	readonly status: "loading" | "awaiting" | "paid" | "expired" | "unavailable";
	readonly secondsLeft: number;
}

export const SbpQrHeader: React.FC<SbpQrHeaderProps> = ({ status, secondsLeft }) => {
	return (
		<div className="flex items-center justify-between gap-2 border-b border-[var(--line,#cbd5e1)] pb-2.5">
			<div className="flex items-center gap-2">
				<div className="w-7 h-7 rounded-lg bg-[var(--primary-soft,var(--paper-soft))] text-[var(--primary)] flex items-center justify-center shrink-0">
					<QrCode size={16} />
				</div>
				<div>
					<span className="text-xs font-bold leading-tight flex items-center gap-1.5 text-[var(--ink,#0f172a)]">
						<span>QR-код СБП</span>
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)] block leading-none mt-0.5">
						Оплата через приложение банка
					</span>
				</div>
			</div>

			{status === "awaiting" && (
				<div
					className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
						secondsLeft <= 7
							? "bg-[var(--warning-soft,var(--amber-soft,#fef3c7))] border-[var(--warning,#d97706)]/30 text-[var(--warning,#b45309)] animate-pulse"
							: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]"
					}`}
					data-testid="sbp-timer-indicator"
					title="Время жизни динамического QR-кода"
				>
					<Clock size={12} />
					<span>{secondsLeft} с</span>
				</div>
			)}

			{status === "loading" && (
				<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] flex items-center gap-1">
					<Loader2 size={12} className="animate-spin" />
					<span>Формируем код</span>
				</span>
			)}

			{status === "paid" && (
				<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-soft,var(--emerald-soft,#dcfce7))] text-[var(--success,#15803d)] border border-[var(--success,#22c55e)]/30 flex items-center gap-1">
					<CheckCircle2 size={12} />
					<span>Оплачено</span>
				</span>
			)}
		</div>
	);
};
