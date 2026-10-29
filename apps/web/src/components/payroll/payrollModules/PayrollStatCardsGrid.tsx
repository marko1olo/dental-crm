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
	const netBaseRub = Math.round(payrollResult.totalNetBaseKop / 100);

	return (
		<>
			{/* Mobile Apple HIG Grouped Summary Card (sm:hidden) */}
			<div className="sm:hidden flex flex-col rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs overflow-hidden" data-testid="payroll-mobile-grouped-summary">
				<div className="p-4 bg-[var(--teal-soft,#f0fdfa)] border-b border-[var(--teal,#0d9488)]/20 flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider">К выплате врачу</span>
						<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]">
							{payoutModel === "chair_rental" ? "100% маржа (аренда)" : `${payrollResult.baseCommissionPercent}% ставка`}
						</span>
					</div>
					<div className="text-[28px] font-black tracking-tight text-[var(--ok-fg,#059669)] leading-none my-1" data-testid="payroll-mobile-hero-payout">
						{netPayoutRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)]">
						{(payrollResult.advancePayoutKop ?? 0) > 0 ? (
							<span>Аванс: -{Math.round((payrollResult.advancePayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽ • Остаток: {Math.round((payrollResult.mainPayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽</span>
						) : taxRegime === "self_employed" || payoutModel === "chair_rental" ? (
							"ИП / Самозанятый (НДФЛ 0%)"
						) : payrollResult.isProgressiveTaxApplied ? (
							`НДФЛ 13-15%: ${Math.round((payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop) / 100).toLocaleString("ru-RU")} ₽`
						) : (
							`НДФЛ 13%: ${Math.round(payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU")} ₽`
						)}
					</div>
				</div>

				<div className="divide-y divide-[var(--line,#e2e8f0)] text-xs">
					<div className="flex items-center justify-between p-3.5 min-h-[44px]">
						<div className="flex flex-col">
							<span className="font-semibold text-[var(--ink,#0f172a)]">Начислено за приёмы</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">{payrollResult.serviceCount} услуг</span>
						</div>
						<span className="text-sm font-bold text-blue-600 dark:text-blue-400">
							{grossRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="flex items-center justify-between p-3.5 min-h-[44px]">
						<div className="flex flex-col">
							<span className="font-semibold text-[var(--ink,#0f172a)]">Удержано (ЗТЛ и материалы)</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								{payrollResult.totalRefundClawbackKop > 0
									? `Сторно: -${Math.round(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
									: `ЗТЛ: ${Math.round(payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU")} ₽`}
							</span>
						</div>
						<span className="text-sm font-bold text-rose-600 dark:text-rose-400">
							-{totalDeductionsRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="flex items-center justify-between p-3.5 min-h-[44px]">
						<div className="flex flex-col">
							<span className="font-semibold text-[var(--ink,#0f172a)]">Чистая выручка (Net Base)</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">База для расчета ставки</span>
						</div>
						<span className="text-sm font-bold text-[var(--teal,#0d9488)]">
							{netBaseRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			</div>

			{/* Desktop / Tablet 4-Card Stat Grid (hidden on mobile) */}
			<div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="payroll-stat-card" data-testid="payroll-card-gross">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">Начислено за приёмы</span>
					<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">{grossRevenueRub.toLocaleString("ru-RU")} ₽</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{payrollResult.serviceCount} услуг
						{payrollResult.warrantyServicesCount > 0 ? ` • ${payrollResult.warrantyServicesCount} гарантия` : ""}
					</span>
				</div>

				<div className="payroll-stat-card" data-testid="payroll-card-deductions">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
						Удержано за ЗТЛ/расходники
					</span>
					<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">-{totalDeductionsRub.toLocaleString("ru-RU")} ₽</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{payrollResult.totalRefundClawbackKop > 0
							? `Сторно: -${Math.round(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
							: `ЗТЛ: ${Math.round(payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU")} ₽`}
					</span>
				</div>

				<div className="payroll-stat-card" data-testid="payroll-card-net">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">Чистая выручка</span>
					<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
						{netBaseRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className="text-[12px] text-[var(--teal,#0d9488)] truncate" title={payrollResult.kpiTierBadgeRu}>
						{payoutModel === "chair_rental" ? "100% маржа (аренда)" : `${payrollResult.baseCommissionPercent}% ставка врача`}
					</span>
				</div>

				<div className="payroll-stat-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]" data-testid="payroll-card-payout">
					<span className="text-[12px] font-bold text-[var(--teal,#0d9488)]">К выплате врачу</span>
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
						<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники покрыты клиникой без удержания с врача.
					</span>
					<span className="font-bold">+{Math.round(payrollResult.overheadConsumablesCoveredKop / 100).toLocaleString("ru-RU")} ₽</span>
				</div>
			)}
		</>
	);
};

export default PayrollStatCardsGrid;
