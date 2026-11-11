import React from "react";
import { Check, Stethoscope } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { ClinicalStenographerBar } from "../../emk/ClinicalStenographerBar";

export interface ComplaintQuickChipsBarProps {
	readonly anamnesis?: string;
	readonly fieldsDisabled: boolean;
	readonly onAddComplaintChip: (chipText: string) => void;
}

export const ComplaintQuickChipsBar: React.FC<ComplaintQuickChipsBarProps> = ({
	anamnesis,
	fieldsDisabled,
	onAddComplaintChip,
}) => {
	if (fieldsDisabled) return null;

	const isNormComplaintApplied =
		(anamnesis ?? "").includes("Жалоб нет") ||
		(anamnesis ?? "").includes("Жалоб на момент осмотра активно не предъявляет");
	const isNormAnamnesisApplied = (anamnesis ?? "").includes("Соматически здоров");

	return (
		<div
			className="mt-1.5 dente-filter-chips overflow-x-auto no-scrollbar py-0.5 max-w-full flex-nowrap touch-pan-x gap-1.5"
			data-testid="complaint-quick-chips-bar"
		>
			<button
				type="button"
				onClick={() =>
					onAddComplaintChip(
						"Жалоб на момент осмотра активно не предъявляет. Обратился(лась) для планового осмотра.",
					)
				}
				disabled={fieldsDisabled}
				className={`dente-filter-chip shrink-0 ${isNormComplaintApplied ? "active" : ""}`}
				data-active={isNormComplaintApplied}
				data-testid="btn-quick-norm-complaint"
				title="Зафиксировать: Жалоб нет"
			>
				<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
				<span>Жалоб нет</span>
			</button>

			<button
				type="button"
				onClick={() =>
					onAddComplaintChip("Соматически здоров. Аллергологический анамнез не отягощен.")
				}
				disabled={fieldsDisabled}
				className={`dente-filter-chip shrink-0 ${isNormAnamnesisApplied ? "active" : ""}`}
				data-active={isNormAnamnesisApplied}
				data-testid="btn-quick-norm-anamnesis"
				title="Зафиксировать: Соматически здоров"
			>
				<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
				<span>Соматически здоров</span>
			</button>
		</div>
	);
};

export interface VisitDiaryAnamnesisFieldProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly interimText?: string | undefined;
	readonly setInterimText: (text: string) => void;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly handleAutoResize: (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => void;
	readonly handleAddComplaintChip: (chipText: string) => void;
	readonly steno: any;
}

export const VisitDiaryAnamnesisField: React.FC<VisitDiaryAnamnesisFieldProps> = ({
	diary,
	setDiary,
	fieldsDisabled,
	interimText,
	setInterimText,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
	handleAutoResize,
	handleAddComplaintChip,
	steno,
}) => {
	const isSomaticNormApplied = Boolean(
		diary.anamnesis?.includes("Соматически здоров") ||
		diary.anamnesis?.includes("профилактический осмотр"),
	);

	return (
		<div className="clinical-diary__field">
			<label className="clinical-diary__label" htmlFor="diary-anamnesis">
				<Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
				<span className="clinical-diary__letter clinical-diary__letter--s">I</span> — Жалобы и анамнез
				{!fieldsDisabled && (
					<div className="clinical-diary__label-mic">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							title="Диктовать жалобы (голосовой ввод)"
							onInterim={setInterimText}
							onResult={(text) => {
								ensureRevisingIfLocked();
								setDiary((p) => ({
									...p,
									anamnesis: p.anamnesis ? `${p.anamnesis} ${text}` : text,
								}));
								setInterimText("");
								scheduleDebouncedSave();
							}}
						/>
					</div>
				)}
			</label>
			<textarea
				id="diary-anamnesis"
				disabled={fieldsDisabled}
				className="auto-resize-ta clinical-diary__ta"
				value={diary.anamnesis}
				onChange={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
					setDiary((p) => ({ ...p, anamnesis: e.target.value }));
					scheduleDebouncedSave();
				}}
				onFocus={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
				}}
				onKeyDown={steno.handleKeyDown}
				placeholder="Жалобы пациента, история заболевания, соматический статус (Стенограф: Tab / Пробел)..."
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
					targetField="anamnesis"
					className="mt-1"
				/>
			)}
			<ComplaintQuickChipsBar
				anamnesis={diary.anamnesis}
				fieldsDisabled={fieldsDisabled}
				onAddComplaintChip={handleAddComplaintChip}
			/>
			{interimText && (
				<div
					className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
					data-testid="interim-text-anamnesis"
				>
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
					<span className="font-bold shrink-0">Диктовка:</span>
					<span className="truncate">«{interimText}»</span>
				</div>
			)}
		</div>
	);
};
