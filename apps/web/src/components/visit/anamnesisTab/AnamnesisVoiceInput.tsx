/**
 * apps/web/src/components/visit/anamnesisTab/AnamnesisVoiceInput.tsx
 *
 * Layer 2: Основные жалобы пациента у кресла, голосовой ввод примечаний врача (Whisper),
 * свободный ввод терапии и нижняя панель действий (перенос в дневник, синхронизация с ЭМК).
 */

import React, { useId } from "react";
import { Activity, Check, Plus, RotateCcw, Save, Stethoscope } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { PATIENT_COMPLAINTS_LIST } from "./types";

export interface AnamnesisVoiceInputProps {
	readonly selectedComplaints: readonly string[];
	readonly toggleComplaint: (item: string) => void;
	readonly customNotes: string;
	readonly setCustomNotes: React.Dispatch<React.SetStateAction<string>>;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onApplyToDiary: () => void;
}

export const AnamnesisVoiceInput: React.FC<AnamnesisVoiceInputProps> = ({
	selectedComplaints,
	toggleComplaint,
	customNotes,
	setCustomNotes,
	onApplyPhysiologicalNorm,
	onApplyToDiary,
}) => {
	const customNotesId = useId();

	return (
		<>
			{/* ═══ БЛОК 4: ОСНОВНЫЕ ЖАЛОБЫ ПАЦИЕНТА ═══ */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
					<Stethoscope className="w-4 h-4 text-teal-500" />
					<span>4. Основные жалобы пациента у кресла</span>
				</label>
				<div className="flex flex-wrap gap-2">
					{PATIENT_COMPLAINTS_LIST.map((item) => {
						const isSelected = selectedComplaints.includes(item);
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleComplaint(item)}
								className={`anamnesis-chip ${isSelected ? "anamnesis-chip--active-teal" : ""}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═══ БЛОК 5: ДОПОЛНИТЕЛЬНЫЕ ПРИМЕЧАНИЯ С ГОЛОСОМ ═══ */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor={customNotesId}
						className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider"
					>
						Дополнительные примечания врача и постоянная терапия:
					</label>
					<div className="flex items-center">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							onResult={(text) =>
								setCustomNotes((prev) => (prev ? `${prev} ${text}` : text))
							}
						/>
					</div>
				</div>
				<textarea
					id={customNotesId}
					rows={3}
					value={customNotes}
					onChange={(e) => setCustomNotes(e.target.value)}
					placeholder="Индивидуальные особенности, перенесенные операции, реакция на анестезию, принимаемые препараты..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[var(--teal,#0d9488)] outline-none resize-y transition-all placeholder:text-[var(--muted,#64748b)]"
					data-testid="anamnesis-custom-notes"
				/>
			</div>

			{/* ═══ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ (0 DISABLED КНОПОК) ═══ */}
			<div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
				<button
					type="button"
					onClick={onApplyPhysiologicalNorm}
					className="anamnesis-top-btn anamnesis-top-btn--secondary"
					title="Сбросить все риски до физиологической нормы"
				>
					<RotateCcw className="w-3.5 h-3.5 text-slate-500" />
					<span>Сброс в норму</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onApplyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--secondary"
						data-testid="sync-anamnesis-btn"
						title="Перенести текущие данные анамнеза в дневник приёма"
					>
						<Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>В дневник приёма</span>
					</button>

					<button
						type="button"
						onClick={onApplyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--primary"
						data-testid="btn-save-anamnesis-to-patient"
						title="Сохранить анамнез и аллергии в медицинскую карту пациента"
					>
						<Save className="w-3.5 h-3.5" />
						<span>Сохранить в медкарту</span>
					</button>
				</div>
			</div>
		</>
	);
};
