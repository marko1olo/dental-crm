import type { ChangeEvent } from "react";
import React from "react";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { usePatientCoreDraftDebounce, type PatientCoreDraft } from "./coreEditor/usePatientCoreDraftDebounce";
import { PatientClinicalNotesSection } from "./coreEditor/PatientClinicalNotesSection";

export type { PatientCoreDraft };
export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface PatientCoreEditorFormProps {
	readonly patientCoreDraft: PatientCoreDraft;
	readonly updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
}

export function PatientCoreEditorForm({ patientCoreDraft, updatePatientCoreDraft }: PatientCoreEditorFormProps) {
	const {
		localDraft,
		setLocalDraft,
		latestLocalRef,
		commitField,
		handleFieldChange,
		handleBlur,
	} = usePatientCoreDraftDebounce(patientCoreDraft, updatePatientCoreDraft);

	return (
		<div className="patient-core-form-grid">
			<label>
				ФИО пациента
				<input
					autoComplete="name"
					value={localDraft.fullName}
					onChange={(e) => handleFieldChange("fullName", e.target.value)}
					onBlur={() => handleBlur("fullName")}
					placeholder="Фамилия Имя Отчество"
				/>
			</label>
			<label>
				Дата рождения
				<input
					type="date"
					autoComplete="bday"
					value={localDraft.birthDate}
					onChange={(e) => handleFieldChange("birthDate", e.target.value)}
					onBlur={() => handleBlur("birthDate")}
				/>
			</label>
			<label>
				Телефон
				<input
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={localDraft.phone}
					onChange={(e) => handleFieldChange("phone", formatPhoneNumber(e.target.value))}
					onBlur={() => handleBlur("phone")}
					placeholder="+7..."
				/>
			</label>
			<label>
				Email
				<input
					type="email"
					autoComplete="email"
					value={localDraft.email}
					onChange={(e) => handleFieldChange("email", e.target.value)}
					onBlur={() => handleBlur("email")}
					placeholder="patient@mail.ru"
				/>
			</label>

			<PatientClinicalNotesSection
				localNotes={localDraft.notes}
				onFieldChange={handleFieldChange}
				onBlur={handleBlur}
				commitField={commitField}
				setLocalDraft={setLocalDraft}
				latestLocalRef={latestLocalRef}
			/>
		</div>
	);
}
