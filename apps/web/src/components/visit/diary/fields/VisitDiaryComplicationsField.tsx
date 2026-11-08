import React from "react";
import { AlertTriangle, Check } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";

export interface VisitDiaryComplicationsFieldProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly interimText?: string | undefined;
	readonly setInterimText: (text: string) => void;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly handleAutoResize: (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => void;
}

export const VisitDiaryComplicationsField: React.FC<VisitDiaryComplicationsFieldProps> = ({
	diary,
	setDiary,
	fieldsDisabled,
	interimText,
	setInterimText,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
	handleAutoResize,
}) => {
	return (
		<div className="clinical-diary__field clinical-diary__field--span2">
			<label className="clinical-diary__label" htmlFor="diary-complications">
				<AlertTriangle className="w-3 h-3 text-[var(--bad-fg,#b91c1c)]" />
				Осложнения и сопутствующие заболевания
				{!fieldsDisabled && (
					<div className="clinical-diary__label-mic">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							title="Диктовать осложнения и анамнез (голосовой ввод)"
							onInterim={setInterimText}
							onResult={(text) => {
								ensureRevisingIfLocked();
								setDiary((p) => ({
									...p,
									complications: p.complications ? `${p.complications} ${text}` : text,
								}));
								setInterimText("");
								scheduleDebouncedSave();
							}}
						/>
					</div>
				)}
			</label>
			<div className="clinical-diary__complications-grid">
				<textarea
					id="diary-complications"
					disabled={fieldsDisabled}
					className="auto-resize-ta clinical-diary__ta clinical-diary__ta--sm"
					value={diary.complications}
					onChange={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
						setDiary((p) => ({ ...p, complications: e.target.value }));
						scheduleDebouncedSave();
					}}
					onFocus={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
					}}
					placeholder="Осложнения лечения..."
				/>
				<textarea
					disabled={fieldsDisabled}
					className="auto-resize-ta clinical-diary__ta clinical-diary__ta--sm"
					value={diary.comorbidities}
					onChange={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
						setDiary((p) => ({ ...p, comorbidities: e.target.value }));
						scheduleDebouncedSave();
					}}
					onFocus={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
					}}
					placeholder="Сопутствующие заболевания (если есть)..."
				/>
			</div>
			<div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => {
						ensureRevisingIfLocked();
						setDiary((p) => ({
							...p,
							complications: "Осложнений нет.",
							comorbidities: p.comorbidities || "Соматически здоров, противопоказаний нет.",
						}));
						scheduleDebouncedSave();
					}}
					disabled={fieldsDisabled}
					className={`dente-filter-chip shrink-0 ${
						Boolean(diary.complications?.includes("Осложнений нет")) ? "active" : ""
					}`}
					data-active={Boolean(diary.complications?.includes("Осложнений нет"))}
					data-testid="btn-quick-norm-complications"
					title="Зафиксировать в 1 клик: Осложнений нет, соматически здоров"
				>
					<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
					<span>Осложнений нет (норма)</span>
				</button>
			</div>
			{interimText && (
				<div
					className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none mt-1"
					data-testid="interim-text-complications"
				>
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
					<span className="font-bold shrink-0">Диктовка:</span>
					<span className="truncate">«{interimText}»</span>
				</div>
			)}
		</div>
	);
};
