import React from "react";
import {
	PayrollHeader,
	PayrollRentalSection,
	PayrollTotalsBar,
	PayrollServicesTable,
	PayrollEmptyDoctorState,
	PayrollActionButtonsBar,
} from "./payrollModules";
import type { useDoctorPayrollModalState } from "./useDoctorPayrollModalState";

export interface DoctorPayrollModalContentProps {
	readonly clinicName: string;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly onClose: () => void;
	readonly state: ReturnType<typeof useDoctorPayrollModalState>;
	readonly onSendToMessenger: (platform?: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onDownloadCsv: () => void;
	readonly onPrintPayslip: () => void;
}

export const DoctorPayrollModalContent: React.FC<DoctorPayrollModalContentProps> = ({
	clinicName,
	doctorsList = [],
	onClose,
	state,
	onSendToMessenger,
	onDownloadCsv,
	onPrintPayslip,
}) => {
	const {
		taxRegime, setTaxRegime, payoutModel, setPayoutModel, chairRentalMode, setChairRentalMode,
		periodPreset, setPeriodPreset, handleSelectPeriodPreset, periodStart, setPeriodStart,
		periodEnd, setPeriodEnd, selectedDoctorId, setSelectedDoctorId, soloSpecialtyId, setSoloSpecialtyId,
		payrollResult, chairRentalRub, setChairRentalRub, shiftsCount, setShiftsCount, shiftRateRub,
		setShiftRateRub, advanceRub, setAdvanceRub, isNpdReceiptDone, setIsNpdReceiptDone, copyFeedback,
		servicesToUse, isLoadingEarnings, activeDoc,
	} = state;

	return (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-modal">
			<div className="payroll-modal-container">
				{/* Apple HIG Drag Handle for Mobile View */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1.5 bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="w-9 h-1 bg-[var(--line,#cbd5e1)] rounded-full" />
				</div>

				<PayrollHeader
					clinicName={clinicName}
					taxRegime={taxRegime}
					isProgressiveTaxApplied={payrollResult.isProgressiveTaxApplied}
					payoutModel={payoutModel}
					periodPreset={periodPreset}
					periodStart={periodStart}
					periodEnd={periodEnd}
					doctorsList={doctorsList}
					selectedDoctorId={selectedDoctorId}
					soloSpecialtyId={soloSpecialtyId}
					onClose={onClose}
					onSelectPeriodPreset={handleSelectPeriodPreset}
					onSetTaxRegime={setTaxRegime}
					onSetPayoutModel={setPayoutModel}
					onSetPeriodStart={(val) => { setPeriodStart(val); setPeriodPreset("custom"); }}
					onSetPeriodEnd={(val) => { setPeriodEnd(val); setPeriodPreset("custom"); }}
					onSelectDoctorId={setSelectedDoctorId}
					onSelectSoloSpecialtyId={setSoloSpecialtyId}
				/>

				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{!activeDoc ? (
						<div className="flex flex-col items-center justify-center p-8 bg-[var(--paper-soft,#f8fafc)] rounded-2xl border border-[var(--line,#e2e8f0)] text-center my-auto min-h-[300px]">
							<h3 className="text-base font-bold text-[var(--ink,#0f172a)] mb-1.5">
								Выберите врача для формирования расчетного листа
							</h3>
							<PayrollEmptyDoctorState
								doctorsList={doctorsList}
								selectedDoctorId={selectedDoctorId}
								onSelectDoctorId={setSelectedDoctorId}
							/>
						</div>
					) : (
						<>
							<PayrollRentalSection
								payoutModel={payoutModel}
								chairRentalMode={chairRentalMode}
								baseCommissionPercent={payrollResult.baseCommissionPercent}
								chairRentalRub={chairRentalRub}
								shiftsCount={shiftsCount}
								shiftRateRub={shiftRateRub}
								advanceRub={advanceRub}
								taxRegime={taxRegime}
								npd6TaxKop={payrollResult.npd6TaxKop}
								netPayoutToDoctorKop={payrollResult.netPayoutToDoctorKop}
								isNpdReceiptDone={isNpdReceiptDone}
								onSetChairRentalMode={setChairRentalMode}
								onSetChairRentalRub={setChairRentalRub}
								onSetShiftsCount={setShiftsCount}
								onSetShiftRateRub={setShiftRateRub}
								onSetAdvanceRub={setAdvanceRub}
								onSetIsNpdReceiptDone={setIsNpdReceiptDone}
							/>

							<PayrollTotalsBar
								payrollResult={payrollResult}
								payoutModel={payoutModel}
								taxRegime={taxRegime}
								copyFeedback={copyFeedback}
								onSendToMessenger={onSendToMessenger}
								onDownloadCsv={onDownloadCsv}
								onPrintPayslip={onPrintPayslip}
								onClose={onClose}
							/>

							<PayrollServicesTable
								services={servicesToUse}
								isLoading={isLoadingEarnings}
								baseCommissionPercent={payrollResult.baseCommissionPercent}
							/>
						</>
					)}
				</div>

				{/* Floating Bottom Action Bar: Desktop footer + Mobile Thumb Zone */}
				{activeDoc && (
					<PayrollActionButtonsBar
						payrollResult={payrollResult}
						copyFeedback={copyFeedback}
						onSendToMessenger={onSendToMessenger}
						onDownloadCsv={onDownloadCsv}
						onPrintPayslip={onPrintPayslip}
						onClose={onClose}
					/>
				)}
			</div>
		</div>
	);
};
