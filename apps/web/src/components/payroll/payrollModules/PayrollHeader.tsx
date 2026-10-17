import React from "react";
import { PayrollHeaderTopBar } from "./PayrollHeaderTopBar";
import { PayrollHeaderPeriodFilters } from "./PayrollHeaderPeriodFilters";
import { PayrollHeaderDoctorPicker } from "./PayrollHeaderDoctorPicker";

export interface PayrollHeaderProps {
	readonly clinicName: string;
	readonly taxRegime: "employee" | "self_employed";
	readonly isProgressiveTaxApplied?: boolean | undefined;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly periodPreset: "current_month" | "previous_month" | "quarter" | "custom";
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly doctorsList: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly selectedDoctorId: string;
	readonly soloSpecialtyId: string;
	readonly activeWorkspaceTab?: "payroll" | "timesheet" | undefined;
	readonly onSelectWorkspaceTab?: ((tab: "payroll" | "timesheet") => void) | undefined;
	readonly onClose: () => void;
	readonly onSelectPeriodPreset: (preset: "current_month" | "previous_month" | "quarter" | "custom") => void;
	readonly onSetTaxRegime: (regime: "employee" | "self_employed") => void;
	readonly onSetPayoutModel: (model: "percentage" | "chair_rental") => void;
	readonly onSetPeriodStart: (val: string) => void;
	readonly onSetPeriodEnd: (val: string) => void;
	readonly onSelectDoctorId: (id: string) => void;
	readonly onSelectSoloSpecialtyId: (val: string) => void;
}

export const PayrollHeader: React.FC<PayrollHeaderProps> = ({
	clinicName,
	taxRegime,
	isProgressiveTaxApplied,
	payoutModel,
	periodPreset,
	periodStart,
	periodEnd,
	doctorsList,
	selectedDoctorId,
	soloSpecialtyId,
	activeWorkspaceTab = "payroll",
	onSelectWorkspaceTab,
	onClose,
	onSelectPeriodPreset,
	onSetTaxRegime,
	onSetPayoutModel,
	onSetPeriodStart,
	onSetPeriodEnd,
	onSelectDoctorId,
	onSelectSoloSpecialtyId,
}) => {
	return (
		<>
			<PayrollHeaderTopBar
				clinicName={clinicName}
				taxRegime={taxRegime}
				isProgressiveTaxApplied={isProgressiveTaxApplied}
				activeWorkspaceTab={activeWorkspaceTab}
				onSelectWorkspaceTab={onSelectWorkspaceTab}
				onClose={onClose}
			/>

			{activeWorkspaceTab === "payroll" && (
				<div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<PayrollHeaderPeriodFilters
						periodPreset={periodPreset}
						taxRegime={taxRegime}
						payoutModel={payoutModel}
						onSelectPeriodPreset={onSelectPeriodPreset}
						onSetTaxRegime={onSetTaxRegime}
						onSetPayoutModel={onSetPayoutModel}
					/>

					<PayrollHeaderDoctorPicker
						doctorsList={doctorsList}
						selectedDoctorId={selectedDoctorId}
						soloSpecialtyId={soloSpecialtyId}
						periodStart={periodStart}
						periodEnd={periodEnd}
						onSetPeriodStart={onSetPeriodStart}
						onSetPeriodEnd={onSetPeriodEnd}
						onSelectDoctorId={onSelectDoctorId}
						onSelectSoloSpecialtyId={onSelectSoloSpecialtyId}
					/>
				</div>
			)}
		</>
	);
};

export default PayrollHeader;
