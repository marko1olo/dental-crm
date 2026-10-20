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
	const [localDraft, setLocalDraft] = useState<PatientCoreDraft>(patientCoreDraft);
	const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestLocalRef = React.useRef<PatientCoreDraft>(localDraft);
	latestLocalRef.current = localDraft;

	React.useEffect(() => {
		if (!timerRef.current) {
			setLocalDraft(patientCoreDraft);
		}
	}, [patientCoreDraft]);

	const commitField = React.useCallback(
		(field: keyof PatientCoreDraft, value: string) => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			updatePatientCoreDraft(field, value);
		},
		[updatePatientCoreDraft],
	);

	const handleFieldChange = React.useCallback(
		(field: keyof PatientCoreDraft, value: string) => {
			setLocalDraft((prev) => ({ ...prev, [field]: value }));
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				updatePatientCoreDraft(field, value);
				timerRef.current = null;
			}, 300);
		},
		[updatePatientCoreDraft],
	);

	const handleBlur = React.useCallback(
		(field: keyof PatientCoreDraft) => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
				updatePatientCoreDraft(field, latestLocalRef.current[field]);
			}
		},
		[updatePatientCoreDraft],
	);

	// Zero-keystroke-loss: flush pending edits before unmount
	React.useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
				const current = latestLocalRef.current;
				for (const key of Object.keys(current) as Array<keyof PatientCoreDraft>) {
					if (current[key] !== patientCoreDraft[key]) {
						updatePatientCoreDraft(key, current[key]);
					}
				}
			}
		};
	}, [updatePatientCoreDraft, patientCoreDraft]);

	const handleAddPreset = (chip: string) => {
		const currentVal = (latestLocalRef.current.notes || "").trim();
		if (currentVal.toLowerCase().includes(chip.toLowerCase())) return;
		const nextVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip.toLowerCase();
		commitField("notes", nextVal);
		setLocalDraft((prev) => ({ ...prev, notes: nextVal }));
	};

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

			<div className="form-span-2 flex flex-col gap-1.5">
				<div className="flex justify-between items-center">
					<span className="text-xs font-bold text-[var(--muted)]">Клинические заметки и особенности приёма</span>
					<div className="flex items-center gap-2">
						<button type="button" onClick={() => setShowPresets((p) => !p)} className="text-[11px] font-semibold text-[var(--teal)] hover:underline cursor-pointer">
							{showPresets ? "Скрыть подсказки ▴" : "+ Клинические пометки ▾"}
						</button>
						<SmartMicrophoneButton context="general" onResult={(t) => {
							const prev = latestLocalRef.current.notes || "";
							const nextVal = prev ? `${prev}, ${t}` : t;
							commitField("notes", nextVal);
							setLocalDraft((prev) => ({ ...prev, notes: nextVal }));
						}} />
					</div>
				</div>
				<textarea
					value={localDraft.notes}
					onChange={(e) => handleFieldChange("notes", e.target.value)}
					onBlur={() => handleBlur("notes")}
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
