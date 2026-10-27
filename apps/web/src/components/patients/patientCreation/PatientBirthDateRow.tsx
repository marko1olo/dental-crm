import { Baby } from "lucide-react";
import React, { type ChangeEvent, type KeyboardEvent } from "react";
import type { PatientFieldRequirements } from "../patientFieldRequirementsConfig";

export interface PatientBirthDateRowProps {
	readonly effectiveBirthDate: string;
	readonly onBirthDateChange: (date: string) => void;
	readonly onQuickCreateKeyDown?: ((e: KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly isChild: boolean;
	readonly onToggleChild: () => void;
	readonly fieldRequirements: PatientFieldRequirements;
	readonly birthDateError?: string | undefined;
}

export function PatientBirthDateRow({
	effectiveBirthDate,
	onBirthDateChange,
	onQuickCreateKeyDown,
	isChild,
	onToggleChild,
	fieldRequirements,
	birthDateError,
}: PatientBirthDateRowProps) {
	return (
		<div className="create-patient-form-field">
			<div className="flex items-center justify-between">
				<label htmlFor="patient-create-birth-date" className="create-patient-label">
					Дата рождения{" "}
					{fieldRequirements.requireBirthDate ? (
						<span className="text-rose-500 font-bold">*</span>
					) : (
						<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
					)}
				</label>
				<button
					type="button"
					onClick={onToggleChild}
					data-testid="patient-create-child-toggle"
					className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
						isChild
							? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
							: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--glass-border)] hover:text-[var(--ink)]"
					}`}
					title="Переключить режим ребенка (<18 лет) для привязки родителя"
				>
					<Baby size={12} className="shrink-0" />
					<span>{isChild ? "Ребёнок (<18)" : "+ Ребёнок"}</span>
				</button>
			</div>
			<input
				id="patient-create-birth-date"
				type="date"
				autoComplete="bday"
				title="Дата рождения нового пациента"
				value={effectiveBirthDate}
				onChange={(event: ChangeEvent<HTMLInputElement>) => onBirthDateChange(event.target.value)}
				onKeyDown={onQuickCreateKeyDown}
				className={`create-patient-input ${birthDateError ? "border-rose-500" : ""}`}
				aria-invalid={!!birthDateError}
			/>
			{birthDateError && (
				<span className="text-xs text-rose-500 font-semibold mt-1">{birthDateError}</span>
			)}
		</div>
	);
}
