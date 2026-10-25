import React from "react";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

export interface PayrollChecksTableProps {
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly commissionPercent: number;
}

export function PayrollChecksTable({ services, commissionPercent }: PayrollChecksTableProps): React.JSX.Element {
	const fmt = (kop: number) => (kop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";

	if (services.length === 0) {
		return (
			<div className="text-center py-8 text-xs text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)] rounded-xl">
				За выбранный период оплаченных услуг не зафиксировано
			</div>
		);
	}

	return (
		<div className="hidden md:block overflow-x-auto bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs" data-testid="payroll-checks-table">
			<table className="w-full text-xs text-left border-collapse">
				<thead>
					<tr className="border-b border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted)]">
						<th className="py-2.5 px-3 font-semibold">Дата</th>
						<th className="py-2.5 px-3 font-semibold">Пациент (карта)</th>
						<th className="py-2.5 px-3 font-semibold">Услуга</th>
						<th className="py-2.5 px-3 font-semibold text-center">Чек №</th>
						<th className="py-2.5 px-3 font-semibold text-right">Оплачено</th>
						<th className="py-2.5 px-3 font-semibold text-right">ЗТЛ</th>
						<th className="py-2.5 px-3 font-semibold text-right">Материалы</th>
						<th className="py-2.5 px-3 font-semibold text-right">Чистая база</th>
						<th className="py-2.5 px-3 font-semibold text-right">Начислено</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)]">
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
							<tr key={item.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
								<td className="py-2 px-3 font-mono text-[var(--muted)] whitespace-nowrap">{item.dateIso}</td>
								<td className="py-2 px-3">
									<div className="font-semibold text-[var(--ink)]">{item.patientName}</div>
									<div className="text-[10px] text-[var(--muted)]">{item.medicalCardNumber}</div>
								</td>
								<td className="py-2 px-3">
									<div className="text-[var(--ink)] font-medium">
										{item.toothCode ? `Зуб ${item.toothCode}: ` : ""}{item.serviceNameRu}
									</div>
									{item.order804nCode && (
										<span className="text-[10px] font-mono text-[var(--muted)]">{item.order804nCode}</span>
									)}
								</td>
								<td className="py-2 px-3 text-center font-mono text-[var(--muted)]">
									{item.receiptNumber || item.id.slice(0, 6)}
								</td>
								<td className="py-2 px-3 text-right font-mono font-semibold text-[var(--ink)]">
									{fmt(paidKop)}
								</td>
								<td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
									{labKop > 0 ? `-${fmt(labKop)}` : "—"}
								</td>
								<td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
									{matKop > 0 ? `-${fmt(matKop)}` : "—"}
								</td>
								<td className="py-2 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300">
									{fmt(netBaseKop)}
								</td>
								<td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
									{fmt(earnedKop)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
