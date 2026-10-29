import React from "react";
import { Check, Search } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { ClinicalStenographerBar } from "../../emk/ClinicalStenographerBar";

export interface VisitDiaryObjectiveFieldProps {
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

export const VisitDiaryObjectiveField: React.FC<VisitDiaryObjectiveFieldProps> = ({
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
	const isObjectiveNormApplied = Boolean(
		diary.statusLocalis?.includes("бледно-розовая") ||
		diary.statusLocalis?.includes("Интактные зубы") ||
		diary.statusLocalis?.includes("интактны"),
	);

	return (
		<div className="clinical-diary__field">
			<label className="clinical-diary__label" htmlFor="diary-status-localis">
				<Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
				<span className="clinical-diary__letter clinical-diary__letter--o">II</span> — Осмотр и зубная формула
				{!fieldsDisabled && (
					<div className="clinical-diary__label-mic">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							title="Диктовать объективный статус (голосовой ввод)"
							onInterim={setInterimText}
							onResult={(text) => {
								ensureRevisingIfLocked();
								setDiary((p) => ({
									...p,
									statusLocalis: p.statusLocalis ? `${p.statusLocalis} ${text}` : text,
								}));
								setInterimText("");
								scheduleDebouncedSave();
							}}
						/>
					</div>
				)}
			</label>
			<textarea
				id="diary-status-localis"
				disabled={fieldsDisabled}
				className="auto-resize-ta clinical-diary__ta"
				value={diary.statusLocalis}
				onChange={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
					setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
					scheduleDebouncedSave();
				}}
				onFocus={(e) => {
					handleAutoResize(e);
					ensureRevisingIfLocked();
				}}
				onKeyDown={steno.handleKeyDown}
				placeholder="Внешний осмотр, перкуссия, пальпация, ЭОД, рентген (Стенограф: Tab / Пробел)..."
			/>
			<div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => {
						ensureRevisingIfLocked();
						const normObj = "Слизистая оболочка полости рта бледно-розовая, влажная, без патологии. Зубные ряды интактны, прикус физиологический. Зондирование и перкуссия безболезненны.";
						setDiary((p) => ({
							...p,
							statusLocalis: p.statusLocalis ? `${p.statusLocalis}\n${normObj}` : normObj,
						}));
						scheduleDebouncedSave();
					}}
					disabled={fieldsDisabled}
					className={`dente-filter-chip shrink-0 ${
						isObjectiveNormApplied ? "active" : ""
					}`}
					data-active={isObjectiveNormApplied}
					data-testid="btn-quick-norm-objective"
					title="Зафиксировать норму в 1 клик: интактные зубы, слизистая бледно-розовая, без патологии"
				>
					<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
					<span>Интактные зубы / Осмотр в норме</span>
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
					targetField="objective"
					className="mt-1"
				/>
			)}
			{interimText && (
				<div
					className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
					data-testid="interim-text-status-localis"
				>
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
					<span className="font-bold shrink-0">Диктовка:</span>
					<span className="truncate">«{interimText}»</span>
				</div>
			)}
		</div>
	);
};
