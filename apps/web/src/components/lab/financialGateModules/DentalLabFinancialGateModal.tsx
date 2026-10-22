import React from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";

export interface DentalLabFinancialGateModalProps {
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

export function DentalLabFinancialGateModal({
	isPaid,
	label,
	hasOverride = false,
	onConfirmOverride,
}: DentalLabFinancialGateModalProps) {
	const isCleared = isPaid || hasOverride;

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs"
			data-testid="dental-lab-financial-gate-modal"
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
					<span
						className={`font-semibold ${
							isCleared
								? "text-emerald-700 dark:text-emerald-300"
								: "text-amber-700 dark:text-amber-300"
						}`}
					>
						{hasOverride ? "Отправлено с отсрочкой оплаты" : label}
					</span>
					{!isCleared && (
						<span className="text-[11px] text-[var(--muted)]">
							Автономия врача (Мандат 8e): отправка наряда не блокируется
						</span>
					)}
				</div>
			</div>

			{hasOverride ? (
				<span
					className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs inline-flex items-center gap-1.5"
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
