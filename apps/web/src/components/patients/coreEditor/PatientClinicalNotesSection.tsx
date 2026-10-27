import React, { useState } from "react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import type { PatientCoreDraft } from "./usePatientCoreDraftDebounce";

const CLINICAL_PRESETS = [
	"Аллергия на латекс",
	"Аллергия на анестезию",
	"Бронхиальная астма",
	"Гипертония",
	"Сахарный диабет",
	"Антикоагулянты",
	"Дентофобия / тревожный",
	"Рвотный рефлекс",
];

export interface PatientClinicalNotesSectionProps {
	localNotes: string;
	onFieldChange: (field: keyof PatientCoreDraft, value: string) => void;
	onBlur: (field: keyof PatientCoreDraft) => void;
	commitField: (field: keyof PatientCoreDraft, value: string) => void;
	setLocalDraft: React.Dispatch<React.SetStateAction<PatientCoreDraft>>;
	latestLocalRef: React.MutableRefObject<PatientCoreDraft>;
}

export const PatientClinicalNotesSection: React.FC<PatientClinicalNotesSectionProps> = ({
	localNotes,
	onFieldChange,
	onBlur,
	commitField,
	setLocalDraft,
	latestLocalRef,
}) => {
	const [showPresets, setShowPresets] = useState(false);

	const handleAddPreset = (chip: string) => {
		const currentVal = (latestLocalRef.current.notes || "").trim();
		if (currentVal.toLowerCase().includes(chip.toLowerCase())) return;
		const nextVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip.toLowerCase();
		commitField("notes", nextVal);
		setLocalDraft((prev) => ({ ...prev, notes: nextVal }));
	};

	return (
		<div className="form-span-2 flex flex-col gap-1.5">
			<div className="flex justify-between items-center">
				<span className="text-xs font-bold text-[var(--muted)]">Клинические заметки и особенности приёма</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowPresets((p) => !p)}
						className="text-[11px] font-semibold text-[var(--teal)] hover:underline cursor-pointer"
					>
						{showPresets ? "Скрыть подсказки ▴" : "+ Клинические пометки ▾"}
					</button>
					<SmartMicrophoneButton
						context="general"
						onResult={(t) => {
							const prev = latestLocalRef.current.notes || "";
							const nextVal = prev ? `${prev}, ${t}` : t;
							commitField("notes", nextVal);
							setLocalDraft((prev) => ({ ...prev, notes: nextVal }));
						}}
					/>
				</div>
			</div>
			<textarea
				value={localNotes}
				onChange={(e) => onFieldChange("notes", e.target.value)}
				onBlur={() => onBlur("notes")}
				placeholder="Особые клинические примечания врача, реакции на анестезию"
				rows={2}
				className="w-full p-2.5 rounded-lg border border-[var(--line)] text-xs resize-y bg-[var(--paper)] text-[var(--ink)]"
			/>
			{showPresets && (
				<div className="flex flex-wrap gap-1 p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
					{CLINICAL_PRESETS.map((preset) => (
						<button
							key={preset}
							type="button"
							onClick={() => handleAddPreset(preset)}
							className="text-[11px] px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer transition-colors"
						>
							+ {preset}
						</button>
					))}
				</div>
			)}
		</div>
	);
};
