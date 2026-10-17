import React from "react";
import { Share2, Download, FileText, X } from "lucide-react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";

export interface PayrollTotalsBarProps {
	readonly payrollResult: DoctorPayrollResult;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly taxRegime: "employee" | "self_employed";
	readonly copyFeedback: string | null;
	readonly onSendToMessenger: (platform: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onDownloadCsv: () => void;
	readonly onPrintPayslip: () => void;
	readonly onClose: () => void;
}

export const PayrollTotalsBar: React.FC<PayrollTotalsBarProps> = ({
	payrollResult,
	payoutModel,
	taxRegime,
	copyFeedback,
	onSendToMessenger,
	onDownloadCsv,
	onPrintPayslip,
	onClose,
}) => {
	const totalDeductionsRub = Math.round(
		((payrollResult.chairRentalKop ?? 0) +
			payrollResult.totalLabDeductionsKop +
			payrollResult.totalMaterialDeductionsKop) /
			100,
	);

	const netPayoutRub = Math.round(payrollResult.netPayoutToDoctorKop / 100);
	const grossRevenueRub = Math.round(payrollResult.totalGrossRevenueKop / 100);

	return (
		<div className="flex flex-col gap-4">
			{/* 4 Summary Stat Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="payroll-stat-card">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
						Выручка брутто (Касса 54-ФЗ)
					</span>
					<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
						{grossRevenueRub.toLocaleString("ru-RU")} ₽
					</span>
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
					<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
						-{totalDeductionsRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{payrollResult.totalRefundClawbackKop > 0
							? `Сторно: -${Math.round(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
							: `База: ${Math.round(payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽`}
					</span>
				</div>

				<div className="payroll-stat-card">
					<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
						{payoutModel === "chair_rental" ? "Модель дохода" : "Ставка + KPI"}
					</span>
					<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
						{payoutModel === "chair_rental"
							? "100% маржа"
							: `${payrollResult.baseCommissionPercent}% ${payrollResult.kpiBonusPercent > 0 ? `+ ${payrollResult.kpiBonusPercent}%` : ""}`}
					</span>
					<span className="text-[12px] text-[var(--teal,#0d9488)] truncate" title={payrollResult.kpiTierBadgeRu}>
						{payoutModel === "chair_rental" ? "Аренда кресла (Соло)" : payrollResult.kpiTierBadgeRu}
					</span>
				</div>

				<div className="payroll-stat-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]">
					<span className="text-[12px] font-bold text-[var(--teal,#0d9488)]">
						Итого на руки (нетто)
					</span>
					<span className="text-base sm:text-lg font-black text-[var(--ok-fg,#059669)]">
						{netPayoutRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className="text-[12px] text-[var(--muted,#64748b)]">
						{(payrollResult.advancePayoutKop ?? 0) > 0 ? (
							<span>
								Аванс: -{Math.round((payrollResult.advancePayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽ • Ост:{" "}
								{Math.round((payrollResult.mainPayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽
							</span>
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

			{/* DENTE Clinical Standard Overhead Notice */}
			{payrollResult.overheadConsumablesCoveredKop !== undefined && payrollResult.overheadConsumablesCoveredKop > 0 && (
				<div className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between">
					<span>
						<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники (салфетки, валики, слюноотсосы, перчатки, маски) на сумму{" "}
						<strong>{Math.round(payrollResult.overheadConsumablesCoveredKop / 100).toLocaleString("ru-RU")} ₽</strong> покрыты клиникой и не удерживаются из зарплаты врача.
					</span>
				</div>
			)}

			{/* Storno Details Section */}
			{payrollResult.stornoItems.length > 0 && (
				<div className="flex flex-col gap-2" data-testid="doctor-payroll-storno-section">
					<h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
						<span>Сторно комиссий при возвратах и перерасчётах:</span>
						<span className="text-[10px] font-normal normal-case text-[var(--muted,#64748b)]">
							(Автоматическое сторнирование начислений при возврате денег пациенту)
						</span>
					</h4>
					{/* Desktop Storno Table */}
					<div className="hidden sm:block border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/20">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-rose-100/50 dark:bg-rose-900/40 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
									<tr>
										<th className="p-2.5 font-semibold">Дата</th>
										<th className="p-2.5 font-semibold">Чек / Документ</th>
										<th className="p-2.5 font-semibold">Услуга / Основание</th>
										<th className="p-2.5 font-semibold text-right">Возврат пациенту</th>
										<th className="p-2.5 font-semibold text-right">Сторно комиссии</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-rose-200/60 dark:divide-rose-900/40">
									{payrollResult.stornoItems.map((storno) => (
										<tr key={storno.id} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">
											<td className="p-2.5 font-medium whitespace-nowrap">{storno.dateIso}</td>
											<td className="p-2.5 font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</td>
											<td className="p-2.5 text-[var(--ink,#0f172a)]">
												<div className="font-semibold">{storno.serviceNameRu}</div>
												<div className="text-[10px] text-rose-600 dark:text-rose-400">{storno.reasonRu}</div>
												<div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">{storno.labelRu}</div>
											</td>
											<td className="p-2.5 font-bold text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
												-{Math.round(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
											</td>
											<td className="p-2.5 font-black text-right text-rose-700 dark:text-rose-300 whitespace-nowrap">
												-{Math.round(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Mobile Storno Cards */}
					<div className="block sm:hidden flex flex-col gap-2">
						{payrollResult.stornoItems.map((storno) => (
							<div key={storno.id} className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
								<div className="flex items-center justify-between gap-2">
									<span className="font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</span>
									<span className="text-[11px] text-[var(--muted,#64748b)]">{storno.dateIso}</span>
								</div>
								<div className="font-semibold text-[var(--ink,#0f172a)] mt-1">{storno.serviceNameRu}</div>
								<div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{storno.reasonRu}</div>
								<div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-rose-200/50">
									<span className="text-rose-600 dark:text-rose-400">
										Возврат: -{Math.round(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
									</span>
									<span className="font-bold text-rose-700 dark:text-rose-300">
										Сторно: -{Math.round(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Footer Actions (Desktop & Tablet) */}
			<div className="hidden sm:flex p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] items-center justify-between flex-wrap gap-3 rounded-b-xl">
				<div className="text-xs text-[var(--muted,#64748b)]">
					Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{payrollResult.specialtyTitleRu}</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onSendToMessenger("clipboard")}
						className="secondary-button dente-btn-secondary h-9 px-3.5 text-xs font-semibold gap-1.5"
						data-testid="doctor-payroll-send-messenger"
						title="Скопировать структурированный расчетный листок для WhatsApp или Telegram"
					>
						<Share2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>{copyFeedback ?? "В мессенджер"}</span>
					</button>
					<button
						type="button"
						onClick={onDownloadCsv}
						className="secondary-button dente-btn-secondary h-9 px-3.5 text-xs font-semibold gap-1.5"
						title="Выгрузить расчетную ведомость в формате CSV"
					>
						<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Экспорт зарплаты (CSV)</span>
					</button>
					<button
						type="button"
						onClick={onPrintPayslip}
						className="primary-button dente-btn-primary h-9 px-4 text-xs font-bold gap-1.5"
						data-testid="doctor-payroll-print-payslip"
						title="Сформировать печатный расчетный листок с подписями врача и бухгалтера"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>Печать расчетного листка</span>
					</button>
				</div>
			</div>

			{/* Mobile Sticky Thumb Bar (Apple HIG Natural Thumb Zone, touch targets >= 44x44px) */}
			<div className="payroll-mobile-thumb-bar sm:hidden" data-testid="doctor-payroll-mobile-thumb-bar">
				<div className="flex items-center justify-between gap-2 w-full">
					<button
						type="button"
						onClick={() => onSendToMessenger("clipboard")}
						className="payroll-mobile-touch-btn secondary-button dente-btn-secondary flex-1 justify-center min-h-[44px]"
						data-testid="doctor-payroll-mobile-messenger-btn"
					>
						<Share2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>{copyFeedback ?? "Мессенджер"}</span>
					</button>
					<button
						type="button"
						onClick={onPrintPayslip}
						className="payroll-mobile-touch-btn primary-button dente-btn-primary flex-1 justify-center min-h-[44px]"
						data-testid="doctor-payroll-mobile-print-btn"
					>
						<FileText className="w-4 h-4" />
						<span>Печать расчетного листка</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="payroll-mobile-touch-btn secondary-button dente-btn-secondary px-3 min-h-[44px] min-w-[44px]"
						aria-label="Закрыть окно"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default PayrollTotalsBar;
