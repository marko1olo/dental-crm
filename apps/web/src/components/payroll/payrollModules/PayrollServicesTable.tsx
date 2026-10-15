import React from "react";
import { FileText } from "lucide-react";
import type { DoctorCompletedServiceItem } from "../staffPayrollEngine";

export interface PayrollServicesTableProps {
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly isLoading: boolean;
	readonly baseCommissionPercent: number;
}

export const PayrollServicesTable: React.FC<PayrollServicesTableProps> = ({
	services,
	isLoading,
	baseCommissionPercent,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
				Детализация выполненных нарядов и приемов за период:
			</h3>

			{isLoading ? (
				<div
					className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
					data-testid="doctor-payroll-services-loading"
				>
					<div className="w-6 h-6 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin" />
					<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
						Загрузка подтвержденных нарядов и приемов из базы...
					</p>
				</div>
			) : services.length === 0 ? (
				<div
					className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
					data-testid="doctor-payroll-services-empty"
				>
					<FileText className="w-8 h-8 text-[var(--muted,#64748b)]/60" />
					<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
						Нет подтвержденных оказанных услуг за выбранный расчетный период
					</p>
					<p className="text-xs text-[var(--muted,#64748b)]">
						За выбранный диапазон дат у специалиста не зафиксировано выполненных приемов или закрытых нарядов
					</p>
				</div>
			) : (
				<>
					{/* Desktop Table View */}
					<div className="hidden sm:block border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
									<tr>
										<th className="p-2.5 font-semibold">Дата</th>
										<th className="p-2.5 font-semibold">Пациент</th>
										<th className="p-2.5 font-semibold">Услуга / Код / Зуб</th>
										<th className="p-2.5 font-semibold text-right">Касса 54-ФЗ</th>
										<th className="p-2.5 font-semibold text-right">Материалы</th>
										<th className="p-2.5 font-semibold text-right">ЗТЛ</th>
										<th className="p-2.5 font-semibold text-right">Начислено</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
									{services.map((srv) => {
										const isWarranty = srv.isWarrantyRework;
										const isFullyRefunded =
											srv.isRefunded === true ||
											(srv.refundedAmountKop !== undefined &&
												srv.refundedAmountKop >= srv.grossRevenueKop);
										const hasPartialRefund = !isFullyRefunded && (srv.refundedAmountKop ?? 0) > 0;
										const isUnpaidDebt = srv.isPaid === false || (srv.paidAmountKop !== undefined && srv.paidAmountKop === 0);
										const hasPartialPayment = !isUnpaidDebt && srv.paidAmountKop !== undefined && srv.paidAmountKop < srv.grossRevenueKop;

										// Net Revenue: комиссия начисляется строго от фактически поступивших в кассу денег (по чекам 54-ФЗ)
										let cashCollectedKop = srv.grossRevenueKop;
										if (srv.paidAmountKop !== undefined) {
											cashCollectedKop = Math.max(0, Math.min(srv.grossRevenueKop, srv.paidAmountKop));
										} else if (srv.isPaid === false) {
											cashCollectedKop = 0; // Неоплаченный долг
										}

										const effectiveGrossKop = Math.max(0, cashCollectedKop - (srv.refundedAmountKop ?? 0));
										const net = isWarranty
											? 0
											: Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);

										let earned = 0;
										if (isWarranty) {
											if (srv.warrantyType === "clinic_warranty" || srv.warrantyType === "lab_warranty") {
												earned = srv.warrantyFixedCompensationKop ?? 0;
											}
										} else if (!isFullyRefunded && !isUnpaidDebt) {
											const rate = srv.customCommissionPercent ?? baseCommissionPercent;
											earned = Math.round((net * rate) / 100);
										}

										return (
											<tr key={srv.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
												<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
												<td className="p-2.5 font-medium">
													<div>{srv.patientName}</div>
													<div className="text-[10px] text-[var(--muted,#64748b)]">
														Карта: {srv.medicalCardNumber}
													</div>
												</td>
												<td className="p-2.5 text-[var(--ink,#0f172a)]">
													<div className="font-medium">{srv.serviceNameRu}</div>
													<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
														{srv.order804nCode && (
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
																Код: {srv.order804nCode}
															</span>
														)}
														{srv.toothCode && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]">
																Зуб {srv.toothCode}
															</span>
														)}
														{srv.paymentSource === "family_deposit" && (
															<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
																Семейный депозит
															</span>
														)}
														{isWarranty && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																Гарантия {srv.warrantyType === "doctor_fault" ? "(вина врача: 0 ₽)" : "(клиника / ЗТЛ)"}
															</span>
														)}
														{isFullyRefunded && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
																Возврат / Сторно
															</span>
														)}
														{hasPartialRefund && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																Частичный возврат
															</span>
														)}
														{isUnpaidDebt && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
																Неоплаченный долг (комиссия: 0 ₽)
															</span>
														)}
														{hasPartialPayment && (
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																Оплачено 54-ФЗ: {Math.round((srv.paidAmountKop ?? 0) / 100).toLocaleString("ru-RU")} ₽ из {Math.round(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
															</span>
														)}
													</div>
												</td>
												<td className="p-2.5 font-bold text-right whitespace-nowrap">
													{isWarranty ? (
														"0 ₽"
													) : isUnpaidDebt ? (
														<span className="text-rose-600 dark:text-rose-400 line-through">
															{Math.round(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													) : (
														<span>{Math.round(cashCollectedKop / 100).toLocaleString("ru-RU")} ₽</span>
													)}
												</td>
												<td className="p-2.5 text-rose-600 dark:text-rose-400 text-right whitespace-nowrap">
													{srv.materialCostKop > 0 ? `- ${Math.round(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
												</td>
												<td className="p-2.5 text-amber-600 dark:text-amber-400 text-right whitespace-nowrap font-medium">
													{srv.labCostKop > 0 ? `- ${Math.round(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
												</td>
												<td className="p-2.5 font-bold text-[var(--teal,#0d9488)] text-right whitespace-nowrap">
													{isFullyRefunded ? (
														"0 ₽ (сторно)"
													) : isUnpaidDebt ? (
														<span className="text-rose-600 dark:text-rose-400">0 ₽ (долг)</span>
													) : (
														`${Math.round(earned / 100).toLocaleString("ru-RU")} ₽`
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* Mobile Grouped List Cards (Apple iOS HIG & Touch Ergonomics >= 52px) */}
					<div className="block sm:hidden flex flex-col gap-2.5" data-testid="doctor-payroll-mobile-services">
						{services.map((srv) => {
							const isWarranty = srv.isWarrantyRework;
							const isFullyRefunded =
								srv.isRefunded === true ||
								(srv.refundedAmountKop !== undefined &&
									srv.refundedAmountKop >= srv.grossRevenueKop);
							const hasPartialRefund = !isFullyRefunded && (srv.refundedAmountKop ?? 0) > 0;
							const isUnpaidDebt = srv.isPaid === false || (srv.paidAmountKop !== undefined && srv.paidAmountKop === 0);
							const hasPartialPayment = !isUnpaidDebt && srv.paidAmountKop !== undefined && srv.paidAmountKop < srv.grossRevenueKop;

							let cashCollectedKop = srv.grossRevenueKop;
							if (srv.paidAmountKop !== undefined) {
								cashCollectedKop = Math.max(0, Math.min(srv.grossRevenueKop, srv.paidAmountKop));
							} else if (srv.isPaid === false) {
								cashCollectedKop = 0;
							}

							const effectiveGrossKop = Math.max(0, cashCollectedKop - (srv.refundedAmountKop ?? 0));
							const net = isWarranty
								? 0
								: Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);

							let earned = 0;
							if (isWarranty) {
								if (srv.warrantyType === "clinic_warranty" || srv.warrantyType === "lab_warranty") {
									earned = srv.warrantyFixedCompensationKop ?? 0;
								}
							} else if (!isFullyRefunded && !isUnpaidDebt) {
								const rate = srv.customCommissionPercent ?? baseCommissionPercent;
								earned = Math.round((net * rate) / 100);
							}

							return (
								<div key={srv.id} className="payroll-mobile-card">
									<div className="payroll-mobile-card-header">
										<div className="flex-1 min-w-0 pr-2">
											<div className="font-semibold text-xs text-[var(--ink,#0f172a)] leading-snug">
												{srv.serviceNameRu}
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
												{srv.dateIso} • {srv.patientName} (карта: {srv.medicalCardNumber})
											</div>
										</div>
										<div className="text-right flex-shrink-0">
											<div className="font-bold text-[var(--teal,#0d9488)] text-sm">
												{isFullyRefunded ? (
													"0 ₽"
												) : isUnpaidDebt ? (
													<span className="text-rose-600 dark:text-rose-400">0 ₽ (долг)</span>
												) : (
													`${Math.round(earned / 100).toLocaleString("ru-RU")} ₽`
												)}
											</div>
											<div className="text-[10px] text-[var(--muted,#64748b)]">
												{isWarranty
													? "Гарантия"
													: isUnpaidDebt
														? "Долг"
														: `Касса: ${Math.round(cashCollectedKop / 100).toLocaleString("ru-RU")} ₽`}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--line,#e2e8f0)]/60 text-[11px]">
										{srv.order804nCode && (
											<span className="font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] text-[10px]">
												Код: {srv.order804nCode}
											</span>
										)}
										{srv.toothCode && (
											<span className="font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] text-[10px]">
												Зуб {srv.toothCode}
											</span>
										)}
										{srv.paymentSource === "family_deposit" && (
											<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
												Семейный депозит
											</span>
										)}
										{srv.materialCostKop > 0 && (
											<span className="text-rose-600 dark:text-rose-400 font-medium">
												Мат: -{Math.round(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽
											</span>
										)}
										{srv.labCostKop > 0 && (
											<span className="text-amber-600 dark:text-amber-400 font-medium">
												ЗТЛ: -{Math.round(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽
											</span>
										)}
										{isWarranty && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												Гарантия
											</span>
										)}
										{isFullyRefunded && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
												Возврат / Сторно
											</span>
										)}
										{hasPartialRefund && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												Частичный возврат
											</span>
										)}
										{isUnpaidDebt && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
												Неоплаченный долг
											</span>
										)}
										{hasPartialPayment && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												Частичная оплата 54-ФЗ
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
};

export default PayrollServicesTable;
