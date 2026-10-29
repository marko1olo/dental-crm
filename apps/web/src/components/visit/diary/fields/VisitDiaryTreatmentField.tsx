import React from "react";
import { FileText, Plus, Sparkles } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { ClinicalStenographerBar } from "../../emk/ClinicalStenographerBar";
import {
	appendRecommendationToSoap,
	PATIENT_RECOMMENDATIONS,
} from "../../../../lib/clinicalProtocols";

export interface PatientRecommendationsBarProps {
	readonly fieldsDisabled: boolean;
	readonly ensureRevisingIfLocked: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly scheduleDebouncedSave: () => void;
}

export const PatientRecommendationsBar: React.FC<PatientRecommendationsBarProps> = ({
	fieldsDisabled,
	ensureRevisingIfLocked,
	setDiary,
	scheduleDebouncedSave,
}) => {
	if (fieldsDisabled) return null;

	return (
		<div
			className="mt-2 p-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-soft)] flex flex-col gap-1.5"
			data-testid="patient-recommendations-bar"
		>
			<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
				Рекомендации пациенту:
			</span>
			<div className="flex flex-wrap items-center gap-1.5">
				{PATIENT_RECOMMENDATIONS.map((rec) => (
					<button
						key={rec.id}
						type="button"
						onClick={() => {
							ensureRevisingIfLocked();
							setDiary((prev) => appendRecommendationToSoap(prev, rec.text));
							scheduleDebouncedSave();
						}}
						className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--glass-border)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
						title={rec.text}
						data-testid={`rec-btn-${rec.id}`}
					>
						<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="min-w-0 break-words">{rec.label}</span>
					</button>
				))}
			</div>
		</div>
	);
};

export interface VisitDiaryTreatmentFieldProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly interimText?: string | undefined;
	readonly setInterimText: (text: string) => void;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly handleAutoResize: (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => void;
	readonly steno: any;
}

export const VisitDiaryTreatmentField: React.FC<VisitDiaryTreatmentFieldProps> = ({
	diary,
	setDiary,
	fieldsDisabled,
	interimText,
	setInterimText,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
	handleAutoResize,
	steno,
}) => {
	return (
		<div className="clinical-diary__field clinical-diary__field--span2">
			<label className="clinical-diary__label" htmlFor="diary-treatment">
				<FileText className="w-3 h-3 text-[var(--teal)]" />
				<span className="clinical-diary__letter clinical-diary__letter--p">IV</span> — Лечение и рекомендации
				{!fieldsDisabled && (
					<div className="clinical-diary__label-mic">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							title="Диктовать лечение и протокол (голосовой ввод)"
							onInterim={setInterimText}
							onResult={(text) => {
								ensureRevisingIfLocked();
								setDiary((p) => ({
									...p,
									treatmentDescription: p.treatmentDescription ? `${p.treatmentDescription} ${text}` : text,
								}));
								setInterimText("");
								scheduleDebouncedSave();
							}}
						/>
					</div>
				)}
			</label>
			<textarea
				id="diary-treatment"
				disabled={fieldsDisabled}
				className="auto-resize-ta clinical-diary__ta"
				value={diary.treatmentDescription}
				onChange={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
					setDiary((p) => ({ ...p, treatmentDescription: e.target.value }));
					scheduleDebouncedSave();
				}}
				onFocus={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
				}}
				onKeyDown={steno.handleKeyDown}
				placeholder="Протокол вмешательства: препарирование, медикаментозная обработка, пломбирование, материалы (Стенограф: Tab / Пробел)..."
			/>
			{!fieldsDisabled && (
				<ClinicalStenographerBar
					snippets={steno.fieldSnippets}
					onSelectSnippet={steno.insertSnippet}
					isListening={steno.isListening}
					isProcessing={steno.isProcessing}
					interimSpeechText={steno.interimSpeechText}
					onToggleVoice={steno.toggleVoiceDictation}
					onApplyInterim={steno.applyInterim}
					onCancelVoice={steno.stopVoiceDictation}
					targetField="treatment"
					className="mt-1"
				/>
			)}
			{interimText && (
				<div
					className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
					data-testid="interim-text-treatment"
				>
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
					<span className="font-bold shrink-0">Диктовка:</span>
					<span className="truncate">«{interimText}»</span>
				</div>
			)}
			<PatientRecommendationsBar
				fieldsDisabled={fieldsDisabled}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				setDiary={setDiary}
				scheduleDebouncedSave={scheduleDebouncedSave}
			/>
		</div>
	);
};
