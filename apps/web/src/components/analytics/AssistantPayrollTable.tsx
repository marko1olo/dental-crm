/**
 * apps/web/src/components/analytics/AssistantPayrollTable.tsx
 *
 * Таблица начислений ассистентам клиники (десктопная ведомость и мобильные карточки Apple HIG).
 * Мандат 8b: Декомпозиция монолита в лаконичный компонент.
 * Мандат 8am: Семантические токены оформления без хардкодных цветов.
 */

import React from "react";
import {
	type AssistantPayrollItem,
	formatRub,
} from "./doctorPayrollExportUtils";

export interface AssistantPayrollTableProps {
	readonly assistantRows: readonly AssistantPayrollItem[];
	readonly loading: boolean;
}

export const AssistantPayrollTable: React.FC<AssistantPayrollTableProps> = ({
	assistantRows,
	loading,
}) => {
	return (
		<>
			{/* Десктопная ведомость */}
			<div className="hidden sm:block rounded-xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] font-medium">
								<th className="py-2.5 px-3">Ассистент клиники</th>
								<th className="py-2.5 px-3">Должность</th>
								<th className="py-2.5 px-3 text-center">Смен / Часов</th>
								<th className="py-2.5 px-3 text-center">Приёмов</th>
								<th className="py-2.5 px-3 text-center">Снимки / Хирургия</th>
								<th className="py-2.5 px-3 text-right">Базовая ставка</th>
								<th className="py-2.5 px-3 text-right">Доплаты</th>
								<th className="py-2.5 px-3 text-right">НДФЛ 13%</th>
								<th className="py-2.5 px-3 text-right font-semibold text-[var(--ink)]">
									К выплате (на руки)
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line-subtle)] text-[var(--ink)]">
							{assistantRows.length === 0 ? (
								<tr>
									<td colSpan={9} className="py-8 text-center text-[var(--ink-muted)]">
										{loading ? "Формирование ведомости..." : "Нет данных по ассистентам за выбранный период"}
									</td>
								</tr>
							) : (
								assistantRows.map((ast) => (
									<tr
										key={ast.assistantId}
										data-testid="assistant-payroll-row"
										className="hover:bg-[var(--paper-soft)] transition-colors"
									>
										<td data-label="Ассистент клиники" className="py-2.5 px-3 font-semibold">
											{ast.assistantName}
										</td>
										<td data-label="Должность" className="py-2.5 px-3 text-[var(--ink-muted)]">
											{ast.role}
										</td>
										<td data-label="Смен / Часов" className="ops-num py-2.5 px-3 text-center tabular-nums">
											{ast.shiftsCount} см / {ast.hoursWorked} ч
										</td>
										<td data-label="Приёмов" className="ops-num py-2.5 px-3 text-center tabular-nums">
											{ast.appointmentsAssisted}
										</td>
										<td data-label="Снимки / Хирургия" className="ops-num py-2.5 px-3 text-center tabular-nums text-[var(--ink-muted)]">
											{ast.radiographCount} сн / {ast.surgeryCount} хир
										</td>
										<td data-label="Базовая ставка" className="ops-num py-2.5 px-3 text-right tabular-nums">
											{formatRub(ast.baseShiftPayoutRub)}
										</td>
										<td data-label="Доплаты" className="ops-num py-2.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">
											{formatRub(ast.radiographPayoutRub + ast.surgeryPayoutRub)}
										</td>
										<td data-label="НДФЛ 13%" className="ops-num py-2.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">
											-{formatRub(ast.ndflTaxRub)}
										</td>
										<td data-label="К выплате (на руки)" className="ops-num py-2.5 px-3 text-right tabular-nums font-bold text-[var(--primary)]">
											{formatRub(ast.payoutRub)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Мобильные Grouped Cards (iOS Settings style) для 390px — Apple HIG min-h 52px */}
			<div className="sm:hidden space-y-3 overflow-x-clip max-w-full">
				{assistantRows.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--ink-muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
						{loading ? "Загрузка..." : "Нет данных по ассистентам"}
					</div>
				) : (
					assistantRows.map((ast) => (
						<div
							key={ast.assistantId}
							data-testid="payroll-card-assistant"
							className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2.5 min-h-[52px]"
						>
							<div className="flex items-center justify-between">
								<div className="min-w-0 pr-2">
									<div className="text-sm font-bold text-[var(--ink)] truncate">{ast.assistantName}</div>
									<div className="text-[11px] text-[var(--ink-muted)] truncate">{ast.role}</div>
								</div>
								<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--ink)] shrink-0">
									{ast.shiftsCount} смен / {ast.hoursWorked} ч
								</span>
							</div>

							<div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">Приёмов:</span>
									<span className="font-medium text-[var(--ink)] tabular-nums">{ast.appointmentsAssisted}</span>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">Снимки:</span>
									<span className="text-[var(--ink-muted)] tabular-nums">{ast.radiographCount} шт</span>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">Хирургия:</span>
									<span className="text-[var(--ink-muted)] tabular-nums">{ast.surgeryCount} опер</span>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)] text-xs">
								<span className="text-[var(--ink-muted)]">Ставка + Доплаты:</span>
								<span className="font-medium text-[var(--ink)] tabular-nums">
									{formatRub(ast.baseShiftPayoutRub + ast.radiographPayoutRub + ast.surgeryPayoutRub)}
								</span>
							</div>

							<div className="flex items-center justify-between pt-1 text-xs">
								<span className="text-[var(--ink-muted)]">НДФЛ 13%:</span>
								<span className="text-[var(--ink-muted)] tabular-nums">-{formatRub(ast.ndflTaxRub)}</span>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)]">
								<span className="text-xs font-medium text-[var(--ink-muted)]">К выплате на руки:</span>
								<span className="text-sm font-bold text-[var(--primary)] tabular-nums">
									{formatRub(ast.payoutRub)}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</>
	);
};
