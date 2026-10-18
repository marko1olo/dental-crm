/**
 * apps/web/src/components/billing/installments/InstallmentsScheduleTable.tsx
 *
 * Installment schedule tranches table with 1-click pay action.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Check, CheckCircle2, Receipt } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { InstallmentPlan } from "../installmentsEngine.js";

interface InstallmentsScheduleTableProps {
	readonly plan: InstallmentPlan;
	readonly onInitiateQuickPay: (itemId?: string) => void;
}

export const InstallmentsScheduleTable: React.FC<InstallmentsScheduleTableProps> = ({
	plan,
	onInitiateQuickPay,
}) => {
	return (
		<div className="patient-installments-table-container">
			<table className="patient-installments-table" data-testid="table-installments-schedule">
				<thead>
					<tr>
						<th style={{ width: "220px" }}>Назначение платежа</th>
						<th style={{ width: "110px" }}>Срок оплаты</th>
						<th style={{ textAlign: "right", width: "110px" }}>Сумма</th>
						<th style={{ textAlign: "right", width: "110px" }}>Оплачено</th>
						<th style={{ width: "120px", textAlign: "center" }}>Статус</th>
						<th>Чек / Оплата</th>
						<th style={{ textAlign: "right", width: "110px" }}>Действие</th>
					</tr>
				</thead>
				<tbody>
					{plan.schedule.map((item) => {
						const isPaid = item.paidKopecks >= item.amountKopecks;
						const badgeCls = isPaid
							? "patient-installments-badge-completed"
							: item.status === "overdue"
							? "patient-installments-badge-overdue"
							: item.status === "due"
							? "patient-installments-badge-due"
							: "patient-installments-badge-on-schedule";

						const labelRu = isPaid
							? "Оплачен"
							: item.status === "overdue"
							? "Просрочен"
							: item.status === "due"
							? "Ожидает оплаты"
							: "По графику";

						return (
							<tr key={item.id} data-testid={`schedule-row-${item.paymentNumber}`}>
								<td>
									<div className="font-semibold text-[var(--ink)]">{item.title}</div>
									{item.paymentNumber === 0 && (
										<div className="text-[10px] text-[var(--muted)]">Обязательный взнос в день оформления</div>
									)}
								</td>
								<td className="font-mono text-[11px] text-[var(--muted)]">
									{new Date(item.dueDateIso).toLocaleDateString("ru-RU")}
								</td>
								<td className="font-mono font-bold text-right text-[var(--ink)]">
									{formatKopecksRu(item.amountKopecks)}
								</td>
								<td className="font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
									{formatKopecksRu(item.paidKopecks)}
								</td>
								<td style={{ textAlign: "center" }}>
									<span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}`}>
										{labelRu}
									</span>
								</td>
								<td className="text-xs">
									{item.fiscalReceiptNumber ? (
										<div className="flex items-center gap-1 font-mono text-[11px] text-teal-700 dark:text-teal-400">
											<Receipt className="w-3 h-3 shrink-0" />
											<span>{item.fiscalReceiptNumber}</span>
											{item.paidAtIso && (
												<span className="text-[10px] text-[var(--muted)]">
													({new Date(item.paidAtIso).toLocaleDateString("ru-RU")})
												</span>
											)}
										</div>
									) : (
										<span className="text-[11px] text-[var(--muted)]">—</span>
									)}
								</td>
								<td style={{ textAlign: "right" }}>
									{!isPaid ? (
										<button
											type="button"
											onClick={() => onInitiateQuickPay(item.id)}
											className="h-7 px-2.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
											data-testid={`btn-pay-item-${item.paymentNumber}`}
											title="Принять взнос и пробить чек"
										>
											<Check className="w-3 h-3" />
											<span>Оплатить</span>
										</button>
									) : (
										<span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
											<CheckCircle2 className="w-3.5 h-3.5" />
											<span>Закрыт</span>
										</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
