import React from "react";
import type { DoctorCompletedServiceItem } from "../staffPayrollEngine";

export interface PayrollServiceRowDesktopProps {
	readonly srv: DoctorCompletedServiceItem;
	readonly baseCommissionPercent: number;
}

export const PayrollServiceRowDesktop: React.FC<PayrollServiceRowDesktopProps> = ({
	srv,
	baseCommissionPercent,
}) => {
	const isWarranty = srv.isWarrantyRework;
	const isFullyRefunded = srv.isRefunded === true || (srv.refundedAmountKop !== undefined && srv.refundedAmountKop >= srv.grossRevenueKop);
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
	const net = isWarranty ? 0 : Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);

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
		<tr className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
			<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
			<td className="p-2.5 font-medium">
				<div>{srv.patientName}</div>
				<div className="text-[10px] text-[var(--muted,#64748b)]">Карта: {srv.medicalCardNumber}</div>
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
				{isWarranty ? "0 ₽" : isUnpaidDebt ? (
					<span className="text-rose-600 dark:text-rose-400 line-through">{Math.round(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽</span>
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
				{isFullyRefunded ? "0 ₽ (сторно)" : isUnpaidDebt ? (
					<span className="text-rose-600 dark:text-rose-400">0 ₽ (долг)</span>
				) : (
					`${Math.round(earned / 100).toLocaleString("ru-RU")} ₽`
				)}
			</td>
		</tr>
	);
};
