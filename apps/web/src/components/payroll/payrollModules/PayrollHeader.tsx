import React, { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
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
	onClose,
	onSelectPeriodPreset,
	onSetTaxRegime,
	onSetPayoutModel,
	onSetPeriodStart,
	onSetPeriodEnd,
	onSelectDoctorId,
	onSelectSoloSpecialtyId,
}) => {
	const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

	const selectedDoctorName = doctorsList.find((d) => d.id === selectedDoctorId)?.name
		?? (doctorsList.length === 0 ? "Соло-практика" : "Врач не выбран");

	const presetLabelsRu: Record<string, string> = {
		current_month: "Текущий месяц",
		previous_month: "Прошлый месяц",
		quarter: "Квартал",
		custom: "Период",
	};

	return (
		<>
			<PayrollHeaderTopBar
				clinicName={clinicName}
				taxRegime={taxRegime}
				isProgressiveTaxApplied={isProgressiveTaxApplied}
				onClose={onClose}
			/>

			{/* Mobile Compact Period & Doctor Bar */}
			<div className="sm:hidden flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs">
				<div className="flex items-center gap-1.5 truncate pr-2">
					<span className="font-bold text-[var(--ink,#0f172a)] truncate">
						{selectedDoctorName}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)] shrink-0">
						• {presetLabelsRu[periodPreset] ?? periodPreset}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
					className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)] rounded-lg bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer shrink-0"
					data-testid="doctor-payroll-toggle-filters-mobile"
				>
					<Filter className="w-3 h-3" />
					<span>{isMobileFiltersOpen ? "Свернуть" : "Параметры"}</span>
					{isMobileFiltersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
				</button>
			</div>

			<div className={`${isMobileFiltersOpen ? "flex" : "hidden sm:flex"} flex-col gap-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]`}>
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
		</>
	);
};

export default PayrollHeader;
