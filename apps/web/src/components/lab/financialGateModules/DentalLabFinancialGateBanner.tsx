import React from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import type { DentalLabFinancialGateResult } from "../dentalLabFinancialGateEngine";

export interface DentalLabFinancialGateBannerProps {
	readonly gateResult: DentalLabFinancialGateResult;
	readonly isPaid: boolean;
	readonly label: string;
	readonly hasOverride?: boolean;
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
	hasOverride = false,
	onConfirmOverride,
}: DentalLabFinancialGateBannerProps) {
	const isCleared = isPaid || hasOverride;

	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium border shadow-2xs ${
				isCleared
					? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
					: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
			}`}
			data-testid={
				isCleared ? "lab-gate-banner-cleared" : "lab-gate-banner-blocked"
			}
		>
			<div className="flex items-center gap-2 min-w-0">
				{isCleared ? (
					<CheckCircle2
						size={16}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
				) : (
					<AlertCircle
						size={16}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
				)}
				<div className="flex flex-col">
					<span className="font-semibold">
						{hasOverride ? "Отправлено с отсрочкой оплаты" : label}
					</span>
					{gateResult.isPlanExpiredNotice && (
						<span className="text-[11px] text-[var(--muted)]">
							· План &gt; 30 дней (не блокирует наряд)
						</span>
					)}
				</div>
			</div>

			{hasOverride ? (
				<span
					className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-semibold text-xs inline-flex items-center gap-1.5"
					data-testid="lab-override-active-badge"
				>
					<Check size={14} className="shrink-0" />
					<span>Согласовано врачом</span>
				</span>
			) : (
				!isPaid && onConfirmOverride && (
					<button
						type="button"
						onClick={() =>
							onConfirmOverride({
								authorized: true,
								doctorName: "Лечащий врач",
								timestampIso: new Date().toISOString(),
								reason: "Клиническое решение лечащего врача (автономия 8e)",
							})
						}
						className="min-h-[34px] px-3 py-1.5 rounded-lg border border-teal-600/40 bg-teal-500/15 hover:bg-teal-500/25 text-teal-900 dark:text-teal-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-[0.98]"
						data-testid="btn-lab-override-financial-gate"
						title="Отправить наряд в ЗТЛ — клиническое решение лечащего врача"
					>
						<Check size={14} className="shrink-0" />
						<span>Отправить по согласованию врача</span>
					</button>
				)
			)}
		</div>
	);
}
