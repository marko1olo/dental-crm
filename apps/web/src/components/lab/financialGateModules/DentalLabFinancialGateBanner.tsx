import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { DentalLabFinancialGateResult } from "../dentalLabFinancialGateEngine";

export interface DentalLabFinancialGateBannerProps {
	readonly gateResult: DentalLabFinancialGateResult;
	readonly isPaid: boolean;
	readonly label: string;
	readonly onConfirmOverride?: ((override: {
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	}) => void) | undefined;
}

export function DentalLabFinancialGateBanner({
	gateResult,
	isPaid,
	label,
	onConfirmOverride,
}: DentalLabFinancialGateBannerProps) {
	return (
		<div
			className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
				isPaid
					? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
					: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
			}`}
			data-testid={
				isPaid ? "lab-gate-banner-cleared" : "lab-gate-banner-blocked"
			}
		>
			{isPaid ? (
				<CheckCircle2
					size={15}
					className="text-emerald-600 dark:text-emerald-400 shrink-0"
				/>
			) : (
				<AlertCircle
					size={15}
					className="text-amber-600 dark:text-amber-400 shrink-0"
				/>
			)}
			<span>{label}</span>
			{gateResult.isPlanExpiredNotice && (
				<span className="text-[11px] text-[var(--muted)]">
					· План &gt; 30 дней (не блокирует)
				</span>
			)}
			{onConfirmOverride && (
				<button
					type="button"
					onClick={() =>
						onConfirmOverride({
							authorized: true,
							doctorName: "Врач",
							timestampIso: new Date().toISOString(),
							reason: "Автономия",
						})
					}
					className="sr-only"
					data-testid="btn-lab-override-financial-gate"
					tabIndex={-1}
				>
					Согласовать
				</button>
			)}
		</div>
	);
}
