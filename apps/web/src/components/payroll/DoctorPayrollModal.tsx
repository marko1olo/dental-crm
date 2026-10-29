import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import {
	type DoctorCompletedServiceItem,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
	type DoctorPayrollResult,
} from "./staffPayrollEngine";
import { getDefaultPayrollPeriod } from "./doctorPayrollModalUtils";
import { useDoctorPayrollModalState } from "./useDoctorPayrollModalState";
import { useDoctorPayrollModalActions } from "./useDoctorPayrollModalActions";
import {
	PayrollHeader,
	PayrollRentalSection,
	PayrollTotalsBar,
	PayrollServicesTable,
	PayrollEmptyDoctorState,
	PayrollActionButtonsBar,
} from "./payrollModules";
import { useDocumentBrandingStore } from "../../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import "./doctorPayroll.css";

export { DEFAULT_SOLO_DOCTOR, SOLO_DOCTOR_SPECIALTY_PRESETS, type SoloDoctorSpecialtyPreset, getDefaultPayrollPeriod };

export interface DoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialServices?: readonly DoctorCompletedServiceItem[] | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialBasePercentage?: number | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
}

/**
 * Net Revenue summary details explaining the statutory clinic formula.
 */
interface NetRevenueBreakdownBannerProps {
	readonly result: DoctorPayrollResult;
	readonly payoutModel: "percentage" | "chair_rental";
}

const NetRevenueBreakdownBanner: React.FC<NetRevenueBreakdownBannerProps> = ({ result, payoutModel }) => {
	const grossRub = Math.round(result.totalGrossRevenueKop / 100);
	const labRub = Math.round(result.totalLabDeductionsKop / 100);
	const matRub = Math.round(result.totalMaterialDeductionsKop / 100);
	const netRub = Math.round(result.totalNetBaseKop / 100);
	const doctorFeeRub = Math.round(result.earnedBaseCommissionKop / 100);

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs flex flex-col gap-1.5" data-testid="net-revenue-formula-card">
			<div className="flex items-center justify-between font-bold text-[var(--ink,#0f172a)]">
				<span>Формула чистой выручки (Net Revenue):</span>
				<span className="text-[var(--teal,#0d9488)] font-semibold">
					{payoutModel === "chair_rental" ? "100% доход соло-врача после аренды" : `${result.baseCommissionPercent}% от чистой базы`}
				</span>
			</div>
			<div className="text-[var(--muted,#64748b)] font-mono leading-relaxed text-[11px] sm:text-xs">
				{grossRub.toLocaleString("ru-RU")} ₽ (Акты)
				{labRub > 0 ? ` − ${labRub.toLocaleString("ru-RU")} ₽ (ЗТЛ)` : ""}
				{matRub > 0 ? ` − ${matRub.toLocaleString("ru-RU")} ₽ (Материалы)` : ""}
				{result.chairRentalKop && result.chairRentalKop > 0 ? ` − ${Math.round(result.chairRentalKop / 100).toLocaleString("ru-RU")} ₽ (Аренда)` : ""}
				{` = ${netRub.toLocaleString("ru-RU")} ₽ (Чистая выручка) → Начислено врачу: ${doctorFeeRub.toLocaleString("ru-RU")} ₽`}
			</div>
		</div>
	);
};

/**
 * DoctorPayrollModal — Canonical SSOT for Doctor Net Revenue & Piecework Payroll in DENTE CRM.
 * Formula: Net Revenue = Gross Revenue − Dental Lab (ЗТЛ) − Direct Materials (Импланты).
 * Compliance: Mandates 8e (Doctor Autonomy), 8n (Solo Practice Sovereignty), 8am (1 Primary CTA),
 * 8ze (Apple HIG Touch Ergonomics, 36x5px Drag Handle, rounded-t-[24px], min 44x44px touch targets).
 */
export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorsList = [],
	initialDoctorId,
	initialServices,
	initialPeriodStart,
	initialPeriodEnd,
	initialBasePercentage,
	useClinicalCategoryRates,
}) => {
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
	const [activeTab, setActiveTab] = useState<"summary" | "services">("summary");

	const resolvedClinicName = (clinicName && clinicName.trim())
		|| branding?.clinicName
		|| branding?.clinicLegalName
		|| appLogic?.dashboard?.organization?.name
		|| appLogic?.dashboard?.clinicSettings?.clinicName
		|| "";

	const state = useDoctorPayrollModalState({
		isOpen, clinicName: resolvedClinicName, doctorsList, initialDoctorId, initialServices,
		initialPeriodStart, initialPeriodEnd, initialBasePercentage, useClinicalCategoryRates,
	});

	const { handleSendToMessenger, handleDownloadCsv, handlePrintPayslip } = useDoctorPayrollModalActions({
		payrollResult: state.payrollResult,
		servicesToUse: state.servicesToUse,
		periodStart: state.periodStart,
		periodEnd: state.periodEnd,
		soloSpecialtyId: state.soloSpecialtyId,
		resolvedClinicName,
		setCopyFeedback: state.setCopyFeedback,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-modal">
			<div className="payroll-modal-container">
				{/* Apple HIG Drag Handle for Mobile View */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1.5 bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="w-9 h-1 bg-[var(--line,#cbd5e1)] rounded-full" />
				</div>

				{/* Canonical Header with Period & Doctor Filter Controls */}
				<PayrollHeader
					clinicName={resolvedClinicName}
					taxRegime={state.taxRegime}
					isProgressiveTaxApplied={state.payrollResult.isProgressiveTaxApplied}
					payoutModel={state.payoutModel}
					periodPreset={state.periodPreset}
					periodStart={state.periodStart}
					periodEnd={state.periodEnd}
					doctorsList={doctorsList}
					selectedDoctorId={state.selectedDoctorId}
					soloSpecialtyId={state.soloSpecialtyId}
					onClose={onClose}
					onSelectPeriodPreset={state.handleSelectPeriodPreset}
					onSetTaxRegime={state.setTaxRegime}
					onSetPayoutModel={state.setPayoutModel}
					onSetPeriodStart={(val) => { state.setPeriodStart(val); state.setPeriodPreset("custom"); }}
					onSetPeriodEnd={(val) => { state.setPeriodEnd(val); state.setPeriodPreset("custom"); }}
					onSelectDoctorId={state.setSelectedDoctorId}
					onSelectSoloSpecialtyId={state.setSoloSpecialtyId}
				/>

				{/* Tab Bar for Desktop / Mobile Quick Switch */}
				<div className="px-4 sm:px-5 pt-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setActiveTab("summary")}
							className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
								activeTab === "summary"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/50"
							}`}
							data-testid="payroll-tab-summary"
						>
							Сводка и чистая выручка
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("services")}
							className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
								activeTab === "services"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/50"
							}`}
							data-testid="payroll-tab-services"
						>
							Детализация приёмов ({state.servicesToUse.length})
						</button>
					</div>
					<div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[var(--muted,#64748b)]">
						<span>{state.activeDoc ? state.activeDoc.name : "Врач не выбран"}</span>
						{state.isPeriodClosed && (
							<span className="text-[var(--teal,#0d9488)] font-bold inline-flex items-center gap-1" data-testid="doctor-payroll-period-closed-badge">
								<Check className="w-3.5 h-3.5" /> Расчетный период закрыт
							</span>
						)}
					</div>
				</div>

				{/* Scrollable Clinical Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{!state.activeDoc ? (
						<div className="flex flex-col items-center justify-center p-8 bg-[var(--paper-soft,#f8fafc)] rounded-2xl border border-[var(--line,#e2e8f0)] text-center my-auto min-h-[300px]">
							<h3 className="text-base font-bold text-[var(--ink,#0f172a)] mb-1.5">
								Выберите врача для формирования расчетного листа
							</h3>
							<PayrollEmptyDoctorState
								doctorsList={doctorsList}
								selectedDoctorId={state.selectedDoctorId}
								onSelectDoctorId={state.setSelectedDoctorId}
							/>
						</div>
					) : (
						<>
							{activeTab === "summary" ? (
								<>
									{/* Net Revenue Transparent Mathematical Breakdown */}
									<NetRevenueBreakdownBanner
										result={state.payrollResult}
										payoutModel={state.payoutModel}
									/>

									{/* Solo Doctor Chair Rental and Advance Settings */}
									<PayrollRentalSection
										payoutModel={state.payoutModel}
										chairRentalMode={state.chairRentalMode}
										baseCommissionPercent={state.payrollResult.baseCommissionPercent}
										chairRentalRub={state.chairRentalRub}
										shiftsCount={state.shiftsCount}
										shiftRateRub={state.shiftRateRub}
										advanceRub={state.advanceRub}
										taxRegime={state.taxRegime}
										npd6TaxKop={state.payrollResult.npd6TaxKop}
										netPayoutToDoctorKop={state.payrollResult.netPayoutToDoctorKop}
										isNpdReceiptDone={state.isNpdReceiptDone}
										onSetChairRentalMode={state.setChairRentalMode}
										onSetChairRentalRub={state.setChairRentalRub}
										onSetShiftsCount={state.setShiftsCount}
										onSetShiftRateRub={state.setShiftRateRub}
										onSetAdvanceRub={state.setAdvanceRub}
										onSetIsNpdReceiptDone={state.setIsNpdReceiptDone}
									/>

									{/* Net Revenue Cards & Actions */}
									<PayrollTotalsBar
										payrollResult={state.payrollResult}
										payoutModel={state.payoutModel}
										taxRegime={state.taxRegime}
										copyFeedback={state.copyFeedback}
										onSendToMessenger={handleSendToMessenger}
										onDownloadCsv={handleDownloadCsv}
										onPrintPayslip={handlePrintPayslip}
										onClose={onClose}
									/>

									{/* 1-Click Fast Settlement Period Close Trigger */}
									<div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs gap-3">
										<div className="flex flex-col gap-0.5">
											<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
												<span>Закрытие расчетного периода</span>
												{state.isPeriodClosed && (
													<span className="px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] text-[10px] font-bold">
														Зафиксирован в БД
													</span>
												)}
											</div>
											<span className="text-[var(--muted,#64748b)]">
												{state.isPeriodClosed
													? `Начисления за ${state.periodStart} — ${state.periodEnd} зафиксированы в БД (Ведомость №${state.settlementStatement?.id?.slice(0, 8) ?? "—"})`
													: `Фиксация начислений за ${state.periodStart} — ${state.periodEnd} без бюрократических согласований`}
											</span>
											{state.closingError && (
												<span className="text-red-500 font-medium text-[11px] mt-0.5">
													{state.closingError}
												</span>
											)}
										</div>
										<button
											type="button"
											onClick={state.isPeriodClosed ? state.handleReopenSettlementPeriod : state.handleCloseSettlementPeriod}
											disabled={state.isClosingPeriod}
											className={state.isPeriodClosed
												? "px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer whitespace-nowrap text-xs"
												: "px-3.5 py-1.5 rounded-lg border border-[#0d9488] bg-[#0d9488] text-white font-bold hover:bg-[#0f766e] active:scale-98 transition-all cursor-pointer whitespace-nowrap text-xs shadow-xs"
											}
											data-testid="doctor-payroll-close-period-btn"
										>
											{state.isClosingPeriod
												? "Сохранение..."
												: (state.isPeriodClosed ? "Открыть период" : "Закрыть период")}
										</button>
									</div>

									{/* Compact Recent Services List in Summary View */}
									<div className="mt-2">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
												Последние акты приёмов
											</span>
											<button
												type="button"
												onClick={() => setActiveTab("services")}
												className="text-xs font-semibold text-[var(--teal,#0d9488)] hover:underline cursor-pointer"
											>
												Все приёмы ({state.servicesToUse.length})
											</button>
										</div>
										<PayrollServicesTable
											services={state.servicesToUse.slice(0, 5)}
											isLoading={state.isLoadingEarnings}
											baseCommissionPercent={state.payrollResult.baseCommissionPercent}
										/>
									</div>
								</>
							) : (
								/* Full Completed Services Table with Lab and Material Deductions */
								<div className="flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0">
											Реестр выполненных работ и удержаний за период
										</h4>
										<span className="text-xs text-[var(--muted,#64748b)]">
											Всего приёмов: {state.servicesToUse.length}
										</span>
									</div>
									<PayrollServicesTable
										services={state.servicesToUse}
										isLoading={state.isLoadingEarnings}
										baseCommissionPercent={state.payrollResult.baseCommissionPercent}
									/>
								</div>
							)}
						</>
					)}
				</div>

				{/* Floating Bottom Action Bar: Desktop footer + Mobile Thumb Zone */}
				{state.activeDoc && (
					<PayrollActionButtonsBar
						payrollResult={state.payrollResult}
						copyFeedback={state.copyFeedback}
						onSendToMessenger={handleSendToMessenger}
						onDownloadCsv={handleDownloadCsv}
						onPrintPayslip={handlePrintPayslip}
						onClose={onClose}
						onAccrueSalary={state.handleAccrueSalary}
						isPeriodClosed={state.isPeriodClosed}
					/>
				)}
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollModal;
