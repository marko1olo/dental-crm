import React from "react";
import { Check, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { ClinicalStenographerBar } from "../../emk/ClinicalStenographerBar";

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
			<div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => {
						ensureRevisingIfLocked();
						const normTreatment = "Проведён плановый осмотр полости рта, онкоскрининг слизистой оболочки. Контролируемая гигиена полости рта, полировка пастой, глубокое фторирование. Индивидуальные рекомендации.";
						setDiary((p) => ({
							...p,
							treatmentDescription: p.treatmentDescription ? `${p.treatmentDescription}\n${normTreatment}` : normTreatment,
						}));
						scheduleDebouncedSave();
					}}
					disabled={fieldsDisabled}
					className={`dente-filter-chip shrink-0 ${
						Boolean(diary.treatmentDescription?.includes("плановый осмотр") || diary.treatmentDescription?.includes("онкоскрининг")) ? "active" : ""
					}`}
					data-active={Boolean(diary.treatmentDescription?.includes("плановый осмотр") || diary.treatmentDescription?.includes("онкоскрининг"))}
					data-testid="btn-quick-norm-treatment"
					title="Зафиксировать: плановый осмотр, гигиена и рекомендации"
				>
					<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
					<span>Осмотр и гигиена в норме</span>
				</button>
			</div>
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
		</div>
	);
};
