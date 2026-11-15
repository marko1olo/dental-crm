/**
 * PendingCashierOrdersSection.tsx — Секция выполненных приёмов, ожидающих оплаты в кассе (54-ФЗ).
 * Mandate 8b (<= 100 lines), Mandate 8bi (0px шума, информативное отображение вместо пустой заглушки).
 */

import React from "react";
import type { PayrollServiceOrder } from "./payrollCatalogData";

export interface PendingCashierOrdersSectionProps {
	readonly pendingOrders: readonly PayrollServiceOrder[];
	readonly rub: (kopecks: number) => string;
}

export const PendingCashierOrdersSection: React.FC<PendingCashierOrdersSectionProps> = ({
	pendingOrders,
	rub,
}) => {
	if (pendingOrders.length === 0) return null;

	const totalGrossKop = pendingOrders.reduce((acc, o) => acc + o.grossKopecks, 0);

	return (
		<div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]" data-testid="payroll-pending-cashier-orders">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					<span>Выполненные приёмы, ожидающие оплаты в кассе ({pendingOrders.length})</span>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Ожидает кассы: {rub(totalGrossKop)}
				</span>
			</div>
			<div className="text-[11px] text-[var(--muted)] leading-tight">
				Приёмы проведены врачом, наряды сформированы. Комиссия начисляется автоматически при оплате чека в кассе (54-ФЗ).
			</div>

			<div className="hidden sm:block payroll-studio-table-container">
				<table className="payroll-studio-table">
					<thead>
						<tr>
							<th>Наряд / Дата</th>
							<th>Пациент</th>
							<th>Услуга</th>
							<th className="text-right">Сумма наряда</th>
							<th className="text-right">ЗТЛ</th>
							<th className="text-right">Материалы</th>
							<th className="text-center">Статус кассы</th>
						</tr>
					</thead>
					<tbody>
						{pendingOrders.map((ord) => (
							<tr key={ord.id} className="opacity-90">
								<td className="font-mono text-xs text-[var(--muted)]">
									<div>{ord.orderNumber}</div>
									<div className="text-[10px]">{ord.dateIso}</div>
								</td>
								<td className="font-medium">
									<div>{ord.patientName}</div>
									<div className="text-[10px] text-[var(--muted)]">Карта: {ord.medicalCardNumber}</div>
								</td>
								<td>
									<div className="truncate max-w-[200px]">{ord.serviceNameRu}</div>
									<span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] text-[var(--muted)]">
										{ord.categoryLabelRu}
									</span>
								</td>
								<td className="text-right font-medium">{rub(ord.grossKopecks)}</td>
								<td className="text-right text-[var(--muted)]">
									{ord.labCostKopecks > 0 ? rub(ord.labCostKopecks) : "—"}
								</td>
								<td className="text-right text-[var(--muted)]">
									{ord.materialCostKopecks > 0 ? rub(ord.materialCostKopecks) : "—"}
								</td>
								<td className="text-center">
									<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
										Ожидает оплаты в кассе
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="sm:hidden flex flex-col gap-2">
				{pendingOrders.map((ord) => (
					<div key={ord.id} className="payroll-studio-mobile-card border-dashed border-amber-500/30">
						<div className="payroll-studio-mobile-card-row">
							<div>
								<div className="font-bold text-xs text-[var(--ink)]">{ord.patientName}</div>
								<div className="text-[11px] text-[var(--muted)]">{ord.serviceNameRu}</div>
							</div>
							<span className="font-bold text-xs text-amber-600 dark:text-amber-400">
								{rub(ord.grossKopecks)}
							</span>
						</div>
						<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]">
							<span>{ord.dateIso} • {ord.categoryLabelRu}</span>
							<span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">В кассу →</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
