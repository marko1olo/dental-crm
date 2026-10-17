import React from "react";
import { User } from "lucide-react";
import {
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	DEFAULT_SOLO_DOCTOR,
} from "../staffPayrollEngine";

export interface PayrollHeaderDoctorPickerProps {
	readonly doctorsList: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly selectedDoctorId: string;
	readonly soloSpecialtyId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly onSetPeriodStart: (val: string) => void;
	readonly onSetPeriodEnd: (val: string) => void;
	readonly onSelectDoctorId: (id: string) => void;
	readonly onSelectSoloSpecialtyId: (val: string) => void;
}

export const PayrollHeaderDoctorPicker: React.FC<PayrollHeaderDoctorPickerProps> = ({
	doctorsList,
	selectedDoctorId,
	soloSpecialtyId,
	periodStart,
	periodEnd,
	onSetPeriodStart,
	onSetPeriodEnd,
	onSelectDoctorId,
	onSelectSoloSpecialtyId,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-[var(--line,#e2e8f0)]/80">
			<div className="flex flex-col gap-1">
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<User className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					{doctorsList.length === 0 ? "Врач / Специализация (соло):" : "Врач / Специалист:"}
				</label>
				<select
					value={doctorsList.length === 0 ? soloSpecialtyId : selectedDoctorId}
					onChange={(e) => {
						if (doctorsList.length === 0) {
							const val = e.target.value === "solo-doctor" ? DEFAULT_SOLO_DOCTOR.specialtyId : e.target.value;
							onSelectSoloSpecialtyId(val);
						} else {
							onSelectDoctorId(e.target.value);
						}
					}}
					data-testid="doctor-payroll-select"
					className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
				>
					{doctorsList.length === 0 ? (
						SOLO_DOCTOR_SPECIALTY_PRESETS.map((spec) => (
							<option key={spec.specialtyId} value={spec.specialtyId}>
								{spec.labelRu}
							</option>
						))
					) : (
						doctorsList.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.name}
							</option>
						))
					)}
				</select>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
					Начало периода:
				</label>
				<input
					type="date"
					value={periodStart}
					onChange={(e) => onSetPeriodStart(e.target.value)}
					className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
					Конец периода:
				</label>
				<input
					type="date"
					value={periodEnd}
					onChange={(e) => onSetPeriodEnd(e.target.value)}
					className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
				/>
			</div>
		</div>
	);
};
