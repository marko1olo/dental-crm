/**
 * apps/web/src/components/analytics/DoctorPayrollTable.tsx
 *
 * Таблица начислений врачам клиники (десктопная ведомость и мобильные карточки Apple HIG).
 * Мандат 8b: Декомпозиция монолита в лаконичный компонент.
 * Мандат 8e: Автономия врача, кнопки никогда не disabled.
 * Мандат 8am: Семантические токены оформления без хардкодных цветов.
 */

import React from "react";
import { formatKopecksToRub, rublesToKopecks } from "@dental/shared";
import { Calculator } from "lucide-react";
import type { DoctorPayrollItem } from "./doctorPayrollExportUtils";

export interface DoctorPayrollTableProps {
	readonly rows: readonly DoctorPayrollItem[];
	readonly loading: boolean;
	readonly onOpenStudio: () => void;
}

export const DoctorPayrollTable: React.FC<DoctorPayrollTableProps> = ({
	rows,
	loading,
	onOpenStudio,
}) => {
	return (
		<>
			{/* Десктопная ведомость */}
			<div className="hidden sm:block rounded-xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] font-medium">
								<th className="py-2.5 px-3">Врач клиники</th>
								<th className="py-2.5 px-3">Специализация</th>
								<th className="py-2.5 px-3 text-right">Оказано услуг</th>
								<th className="py-2.5 px-3 text-right">Списано техкарт</th>
								<th className="py-2.5 px-3 text-right">Лаборатория (ЗТЛ)</th>
								<th className="py-2.5 px-3 text-right">Чистая выручка (Net)</th>
								<th className="py-2.5 px-3 text-right">Ставка %</th>
								<th className="py-2.5 px-3 text-right font-semibold text-[var(--ink)]">
									К выплате
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line-subtle)] text-[var(--ink)]">
							{rows.length === 0 ? (
								<tr>
									<td colSpan={8} className="py-10 text-center">
										<div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-[var(--ink-muted)]">
											<Calculator className="w-8 h-8 opacity-50" />
											<div className="font-semibold text-sm text-[var(--ink)]">
												{loading ? "Формирование ведомости..." : "Начислений за выбранный период не найдено"}
											</div>
											<div className="text-xs">
												Проведите приёмы в расписании или откройте расчетную ведомость в Студии зарплат.
											</div>
											{!loading && (
												<button
													type="button"
													onClick={onOpenStudio}
													className="primary-button mt-2 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
												>
													<Calculator size={14} />
													<span>Открыть ведомость / закрыть период</span>
												</button>
											)}
										</div>
									</td>
								</tr>
							) : (
								rows.map((row) => (
									<tr
										key={row.doctorId}
										data-testid="doctor-payroll-row"
										className="hover:bg-[var(--paper-soft)] transition-colors"
									>
										<td data-label="Врач клиники" className="py-2.5 px-3 font-semibold">
											{row.doctorName}
										</td>
										<td data-label="Специализация" className="py-2.5 px-3 text-[var(--ink-muted)]">
											{row.specialty}
										</td>
										<td data-label="Оказано услуг" className="ops-num py-2.5 px-3 text-right tabular-nums">
											{formatKopecksToRub(row.servicesRenderedKopecks ?? rublesToKopecks(row.servicesRenderedRub))}
										</td>
										<td data-label="Списано техкарт" className="ops-num py-2.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">
											{formatKopecksToRub(row.materialsCostKopecks ?? rublesToKopecks(row.materialsCostRub))}
										</td>
										<td data-label="Лаборатория (ЗТЛ)" className="ops-num py-2.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">
											{formatKopecksToRub(row.labCostKopecks ?? rublesToKopecks(row.labCostRub || 0))}
										</td>
										<td data-label="Чистая выручка (Net)" className="ops-num py-2.5 px-3 text-right tabular-nums font-medium">
											{formatKopecksToRub(row.netRevenueKopecks ?? rublesToKopecks(row.netRevenueRub))}
										</td>
										<td data-label="Ставка %" className="ops-num py-2.5 px-3 text-right tabular-nums">
											{row.commissionPercent.toFixed(1)}%
										</td>
										<td data-label="К выплате" className="ops-num py-2.5 px-3 text-right tabular-nums font-bold text-[var(--primary)]">
											{formatKopecksToRub(row.payoutKopecks ?? rublesToKopecks(row.payoutRub))}
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
				{rows.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--ink-muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)] flex flex-col items-center gap-2">
						<Calculator className="w-6 h-6 opacity-60 text-[var(--ink-muted)]" />
						<span className="font-medium text-[var(--ink)]">
							{loading ? "Загрузка..." : "Начислений за выбранный период не найдено. Проведите приёмы в расписании"}
						</span>
						{!loading && (
							<button
								type="button"
								onClick={onOpenStudio}
								className="primary-button mt-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer"
							>
								Открыть ведомость
							</button>
						)}
					</div>
				) : (
					rows.map((row) => (
						<div
							key={row.doctorId}
							data-testid="payroll-card-doctor"
							className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2.5 min-h-[52px]"
						>
							<div className="flex items-center justify-between">
								<div className="min-w-0 pr-2">
									<div className="text-sm font-bold text-[var(--ink)] truncate">{row.doctorName}</div>
									<div className="text-[11px] text-[var(--ink-muted)] truncate">{row.specialty}</div>
								</div>
								<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-semibold text-[var(--ink)] shrink-0">
									{row.commissionPercent}%
								</span>
							</div>

							<div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">Оказано:</span>
									<span className="font-medium text-[var(--ink)] tabular-nums">
										{formatKopecksToRub(row.servicesRenderedKopecks ?? rublesToKopecks(row.servicesRenderedRub))}
									</span>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">Материалы:</span>
									<span className="text-[var(--ink-muted)] tabular-nums">
										{formatKopecksToRub(row.materialsCostKopecks ?? rublesToKopecks(row.materialsCostRub))}
									</span>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block text-[11px]">ЗТЛ:</span>
									<span className="text-[var(--ink-muted)] tabular-nums">
										{formatKopecksToRub(row.labCostKopecks ?? rublesToKopecks(row.labCostRub || 0))}
									</span>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)]">
								<span className="text-xs font-medium text-[var(--ink-muted)]">Итого к выплате:</span>
								<span className="text-sm font-bold text-[var(--primary)] tabular-nums">
									{formatKopecksToRub(row.payoutKopecks ?? rublesToKopecks(row.payoutRub))}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</>
	);
};
