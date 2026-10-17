import React from "react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";

export interface PayrollStatCardsGridProps {
	readonly payrollResult: DoctorPayrollResult;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly taxRegime: "employee" | "self_employed";
}

export const PayrollStatCardsGrid: React.FC<PayrollStatCardsGridProps> = ({
	payrollResult,
	payoutModel,
	taxRegime,
}) => {
	const totalDeductionsRub = Math.round(
		((payrollResult.chairRentalKop ?? 0) +
			payrollResult.totalLabDeductionsKop +
			payrollResult.totalMaterialDeductionsKop) / 100,
	);
	const netPayoutRub = Math.round(payrollResult.netPayoutToDoctorKop / 100);
	const grossRevenueRub = Math.round(payrollResult.totalGrossRevenueKop / 100);

	return (
		<>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="payroll-stat-card">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">Выручка брутто (Касса 54-ФЗ)</span>
					<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">{grossRevenueRub.toLocaleString("ru-RU")} ₽</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{payrollResult.serviceCount} услуг
						{payrollResult.warrantyServicesCount > 0 ? ` • ${payrollResult.warrantyServicesCount} гарантия` : ""}
						{payrollResult.refundedServicesCount > 0 ? ` • ${payrollResult.refundedServicesCount} возврат` : ""}
					</span>
				</div>

				<div className="payroll-stat-card">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
						{payoutModel === "chair_rental" ? "Вычеты (Аренда / ЗТЛ / Мат)" : "Вычеты (ЗТЛ / Материалы)"}
					</span>
					<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">-{totalDeductionsRub.toLocaleString("ru-RU")} ₽</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{payrollResult.totalRefundClawbackKop > 0
							? `Сторно: -${Math.round(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
							: `База: ${Math.round(payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽`}
					</span>
				</div>

				<div className="payroll-stat-card">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">{payoutModel === "chair_rental" ? "Модель дохода" : "Ставка + KPI"}</span>
					<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
						{payoutModel === "chair_rental" ? "100% маржа" : `${payrollResult.baseCommissionPercent}% ${payrollResult.kpiBonusPercent > 0 ? `+ ${payrollResult.kpiBonusPercent}%` : ""}`}
					</span>
					<span className="text-[12px] text-[var(--teal,#0d9488)] truncate" title={payrollResult.kpiTierBadgeRu}>
						{payoutModel === "chair_rental" ? "Аренда кресла (Соло)" : payrollResult.kpiTierBadgeRu}
					</span>
				</div>

				<div className="payroll-stat-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]">
					<span className="text-[12px] font-bold text-[var(--teal,#0d9488)]">Итого на руки (нетто)</span>
					<span className="text-base sm:text-lg font-black text-[var(--ok-fg,#059669)]">{netPayoutRub.toLocaleString("ru-RU")} ₽</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{(payrollResult.advancePayoutKop ?? 0) > 0 ? (
							<span>Аванс: -{Math.round((payrollResult.advancePayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽ • Ост: {Math.round((payrollResult.mainPayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽</span>
						) : taxRegime === "self_employed" || payoutModel === "chair_rental" ? (
							"ИП / Самозанятый (НДФЛ 0%)"
						) : payrollResult.isProgressiveTaxApplied ? (
							`НДФЛ 13-15%: ${Math.round((payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop) / 100).toLocaleString("ru-RU")} ₽`
						) : (
							`НДФЛ 13%: ${Math.round(payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU")} ₽`
						)}
					</span>
				</div>
			</div>

			{payrollResult.overheadConsumablesCoveredKop !== undefined && payrollResult.overheadConsumablesCoveredKop > 0 && (
				<div className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between">
					<span>
						<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники (салфетки, валики, слюноотсосы, перчатки, маски) на сумму{" "}
						<strong>{Math.round(payrollResult.overheadConsumablesCoveredKop / 100).toLocaleString("ru-RU")} ₽</strong> покрыты клиникой и не удерживаются из зарплаты врача.
					</span>
				</div>
			)}
		</>
	);
};
