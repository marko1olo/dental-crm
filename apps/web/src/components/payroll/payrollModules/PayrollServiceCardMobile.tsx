import React from "react";
import type { DoctorCompletedServiceItem } from "../staffPayrollEngine";

export interface PayrollServiceCardMobileProps {
	readonly srv: DoctorCompletedServiceItem;
	readonly baseCommissionPercent: number;
}

export const PayrollServiceCardMobile: React.FC<PayrollServiceCardMobileProps> = ({
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
		<div className="payroll-mobile-card">
			<div className="payroll-mobile-card-header">
				<div className="flex-1 min-w-0 pr-2">
					<div className="font-semibold text-xs text-[var(--ink,#0f172a)] leading-snug">{srv.serviceNameRu}</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						{srv.dateIso} • {srv.patientName} (карта: {srv.medicalCardNumber})
					</div>
				</div>
				<div className="text-right flex-shrink-0">
					<div className="font-bold text-[var(--teal,#0d9488)] text-sm">
						{isFullyRefunded ? "0 ₽" : isUnpaidDebt ? (
							<span className="text-rose-600 dark:text-rose-400">0 ₽ (долг)</span>
						) : (
							`${Math.round(earned / 100).toLocaleString("ru-RU")} ₽`
						)}
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)]">
						{isWarranty ? "Гарантия" : isUnpaidDebt ? "Долг" : `Касса: ${Math.round(cashCollectedKop / 100).toLocaleString("ru-RU")} ₽`}
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
};
