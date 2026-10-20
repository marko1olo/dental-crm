import React from "react";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

export interface PayrollChecksMobileCardsProps {
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly commissionPercent: number;
}

export function PayrollChecksMobileCards({ services, commissionPercent }: PayrollChecksMobileCardsProps): React.JSX.Element {
	const fmt = (kop: number) => (kop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";

	if (services.length === 0) {
		return (
			<div className="md:hidden text-center py-6 text-xs text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)] rounded-xl">
				Нет оплаченных услуг за период
			</div>
		);
	}

	return (
		<div className="md:hidden flex flex-col gap-2.5">
			{services.map((item) => {
				const isDebt = item.isPaid === false || item.isDebt === true || item.invoiceStatus === "unpaid";
				if (isDebt) return null;

				const paidKop = item.actuallyPaidGrossKop ?? (item.paidAmountKop !== undefined ? Math.min(item.grossRevenueKop, item.paidAmountKop) : item.grossRevenueKop);
				const labKop = item.labCostKop || 0;
				const matKop = item.materialCostKop || 0;
				const netBaseKop = Math.max(0, paidKop - labKop - matKop);
				const rate = item.customCommissionPercent ?? commissionPercent;
				const earnedKop = Math.round((netBaseKop * rate) / 100);

				return (
					<div
						key={item.id}
						className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs flex flex-col gap-2"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<div className="font-bold text-sm text-[var(--ink)] truncate">{item.patientName}</div>
								<div className="text-xs text-[var(--ink)] font-medium mt-0.5">
									{item.toothCode ? `Зуб ${item.toothCode}: ` : ""}{item.serviceNameRu}
								</div>
							</div>
							<div className="text-right shrink-0">
								<div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
									+{fmt(earnedKop)}
								</div>
								<div className="text-[10px] text-[var(--muted)] font-mono">{rate}%</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-[var(--line)] text-xs">
							<div className="flex items-center gap-1.5 text-[var(--muted)]">
								<span className="font-mono">{item.dateIso}</span>
								<span>· Чек №{item.receiptNumber || item.id.slice(0, 6)}</span>
							</div>
							<div className="flex items-center gap-2 font-mono text-xs">
								<span className="text-[var(--ink)] font-semibold">Оплачено: {fmt(paidKop)}</span>
								{(labKop > 0 || matKop > 0) && (
									<span className="text-amber-600 text-[11px]">
										Затраты: -{fmt(labKop + matKop)}
									</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
