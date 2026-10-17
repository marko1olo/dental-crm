import type { ChangeEvent } from "react";
import React, { useState } from "react";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { formatPhoneNumber } from "../../utils/inputSanitation";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface PatientCoreEditorFormProps {
	readonly patientCoreDraft: PatientCoreDraft;
	readonly updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
}

const CLINICAL_PRESETS = [
	"Аллергия на латекс", "Аллергия на анестезию", "Бронхиальная астма",
	"Гипертония", "Сахарный диабет", "Антикоагулянты", "Дентофобия / тревожный", "Рвотный рефлекс",
];

export function PatientCoreEditorForm({ patientCoreDraft, updatePatientCoreDraft }: PatientCoreEditorFormProps) {
	const [showPresets, setShowPresets] = useState(false);

	const handleAddPreset = (chip: string) => {
		const currentVal = patientCoreDraft.notes.trim();
		if (currentVal.toLowerCase().includes(chip.toLowerCase())) return;
		updatePatientCoreDraft("notes", currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip.toLowerCase());
	};

	return (
		<div className="patient-core-form-grid">
			<label>
				ФИО пациента
				<input autoComplete="name" value={patientCoreDraft.fullName} onChange={(e) => updatePatientCoreDraft("fullName", e.target.value)} placeholder="Фамилия Имя Отчество" />
			</label>
			<label>
				Дата рождения
				<input type="date" autoComplete="bday" value={patientCoreDraft.birthDate} onChange={(e) => updatePatientCoreDraft("birthDate", e.target.value)} />
			</label>
			<label>
				Телефон
				<input type="tel" inputMode="tel" autoComplete="tel" value={patientCoreDraft.phone} onChange={(e) => updatePatientCoreDraft("phone", formatPhoneNumber(e.target.value))} placeholder="+7..." />
			</label>
			<label>
				Email
				<input type="email" autoComplete="email" value={patientCoreDraft.email} onChange={(e) => updatePatientCoreDraft("email", e.target.value)} placeholder="patient@mail.ru" />
			</label>

			<div className="form-span-2 flex flex-col gap-1.5">
				<div className="flex justify-between items-center">
					<span className="text-xs font-bold text-[var(--muted)]">Клинические заметки и особенности приёма</span>
					<div className="flex items-center gap-2">
						<button type="button" onClick={() => setShowPresets((p) => !p)} className="text-[11px] font-semibold text-[var(--teal)] hover:underline cursor-pointer">
							{showPresets ? "Скрыть подсказки ▴" : "+ Клинические пометки ▾"}
						</button>
						<SmartMicrophoneButton context="general" onResult={(t) => {
							const prev = patientCoreDraft.notes || "";
							updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
						}} />
					</div>
				</div>
				<textarea
					value={patientCoreDraft.notes}
					onChange={(e) => updatePatientCoreDraft("notes", e.target.value)}
					placeholder="Особые клинические примечания врача, реакции на анестезию"
					rows={2}
					className="w-full p-2.5 rounded-lg border border-[var(--line)] text-xs resize-y bg-[var(--paper)] text-[var(--ink)]"
				/>
				{showPresets && (
					<div className="flex flex-wrap gap-1 p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						{CLINICAL_PRESETS.map((preset) => (
							<button key={preset} type="button" onClick={() => handleAddPreset(preset)} className="text-[11px] px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer transition-colors">
								+ {preset}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
