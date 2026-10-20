import React from "react";
import { User } from "lucide-react";
import {
	PayrollHeader,
	PayrollRentalSection,
	PayrollTotalsBar,
	PayrollServicesTable,
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
		taxRegime, setTaxRegime, payoutModel, setPayoutModel, chairRentalMode, setChairRentalMode, periodPreset, setPeriodPreset, handleSelectPeriodPreset,
		periodStart, setPeriodStart, periodEnd, setPeriodEnd, selectedDoctorId, setSelectedDoctorId,
		soloSpecialtyId, setSoloSpecialtyId, activeWorkspaceTab, setActiveWorkspaceTab,
		payrollResult, chairRentalRub, setChairRentalRub, shiftsCount, setShiftsCount, shiftRateRub, setShiftRateRub,
		advanceRub, setAdvanceRub, isNpdReceiptDone, setIsNpdReceiptDone, copyFeedback, servicesToUse, isLoadingEarnings,
		activeDoc,
	} = state;

	return (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-modal">
			<div className="payroll-modal-container">
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
					activeWorkspaceTab={activeWorkspaceTab}
					onSelectWorkspaceTab={setActiveWorkspaceTab}
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
							<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft,#ccfbf1)] flex items-center justify-center text-[var(--teal,#0d9488)] mb-4">
								<User className="w-7 h-7" />
							</div>
							<h3 className="text-base font-bold text-[var(--ink,#0f172a)] mb-1.5">
								Выберите врача для формирования расчетного листа
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] max-w-md mb-5 leading-relaxed">
								{doctorsList.length > 0
									? "Выберите специалиста из списка ниже или в шапке окна, чтобы рассчитать сдельную оплату, комиссию и сгенерировать ведомость."
									: "В штате клиники пока нет зарегистрированных врачей. Добавьте персонал в настройках клиники или используйте профиль соло-врача."}
							</p>
							{doctorsList.length > 0 && (
								<div className="w-full max-w-xs">
									<select
										value={selectedDoctorId}
										onChange={(e) => setSelectedDoctorId(e.target.value)}
										data-testid="payroll-empty-state-doctor-select"
										className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] shadow-sm cursor-pointer"
									>
										<option value="">— Выберите врача из списка —</option>
										{doctorsList.map((doc) => (
											<option key={doc.id} value={doc.id}>
												{doc.name}
											</option>
										))}
									</select>
								</div>
							)}
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
			</div>
		</div>
	);
};
