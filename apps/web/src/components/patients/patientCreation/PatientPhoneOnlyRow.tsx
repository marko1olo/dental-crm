import React, { type ChangeEvent, type KeyboardEvent } from "react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import type { PatientFieldRequirements } from "../patientFieldRequirementsConfig";

export interface PatientPhoneOnlyRowProps {
	readonly effectivePhone: string;
	readonly onPhoneChange: (phone: string) => void;
	readonly onQuickCreateKeyDown?: ((e: KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly fieldRequirements: PatientFieldRequirements;
	readonly isAnonymous?: boolean | undefined;
	readonly phoneError?: string | undefined;
}

export function PatientPhoneOnlyRow({
	effectivePhone,
	onPhoneChange,
	onQuickCreateKeyDown,
	fieldRequirements,
	isAnonymous,
	phoneError,
}: PatientPhoneOnlyRowProps) {
	return (
		<div className="create-patient-form-field">
			<label htmlFor="patient-create-phone" className="create-patient-label">
				Телефон{" "}
				{fieldRequirements.requirePhone && !isAnonymous ? (
					<span className="text-rose-500 font-bold">*</span>
				) : (
					<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
				)}
			</label>
			<input
				id="patient-create-phone"
				data-testid="patient-creation-phone-input"
				type="tel"
				inputMode="tel"
				autoComplete="tel"
				title="Телефон нового пациента"
				placeholder="+7 (999) 000-00-00"
				value={effectivePhone}
				onChange={(event: ChangeEvent<HTMLInputElement>) =>
					onPhoneChange(formatPhoneNumber(event.target.value))
				}
				onKeyDown={onQuickCreateKeyDown}
				className={`create-patient-input ${phoneError ? "border-rose-500" : ""}`}
				aria-invalid={!!phoneError}
			/>
			{phoneError && <span className="text-xs text-rose-500 font-semibold mt-1">{phoneError}</span>}
		</div>
	);
}
