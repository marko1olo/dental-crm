import React from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import type { DentalLabFinancialGateResult } from "./dentalLabFinancialGateTypes";

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
					? "bg-[var(--success-soft)] border-[var(--success-line)] text-[var(--success-ink)]"
					: "bg-[var(--warning-soft)] border-[var(--warning-line)] text-[var(--warning-ink)]"
			}`}
			data-testid={
				isCleared ? "lab-gate-banner-cleared" : "lab-gate-banner-blocked"
			}
		>
			<div className="flex items-center gap-2 min-w-0">
				{isCleared ? (
					<CheckCircle2
						size={16}
						className="text-[var(--success-ink)] shrink-0"
					/>
				) : (
					<AlertCircle
						size={16}
						className="text-[var(--warning-ink)] shrink-0"
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
					className="px-2.5 py-1 rounded-lg bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] font-semibold text-xs inline-flex items-center gap-1.5"
					data-testid="lab-override-active-badge"
				>
					<Check size={14} className="shrink-0" />
					<span>Наряд отправлен в лабораторию</span>
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
								reason: "Клиническое решение лечащего врача",
							})
						}
						className="h-8 px-2.5 rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-[0.98]"
						data-testid="btn-lab-override-financial-gate"
						title="Отправить наряд в лабораторию — клиническое решение лечащего врача"
					>
						<Check size={14} className="shrink-0" />
						<span>Отправить в лабораторию</span>
					</button>
				)
			)}
		</div>
	);
}
