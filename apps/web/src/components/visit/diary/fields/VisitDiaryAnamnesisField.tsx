import React from "react";
import { Check, Plus, Sparkles, Stethoscope } from "lucide-react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { ClinicalStenographerBar } from "../../emk/ClinicalStenographerBar";
import { COMPLAINT_QUICK_CHIPS } from "../visitDiaryTypes";

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
	if ((COMPLAINT_QUICK_CHIPS as readonly string[]).length === 0) return null;

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
				title="Зафиксировать в 1 клик: Жалоб нет"
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
				title="Зафиксировать в 1 клик: Соматически здоров"
			>
				<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
				<span>Соматически здоров</span>
			</button>

			<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 shrink-0 ml-1">
				<Sparkles className="w-3 h-3 text-[var(--teal,var(--brand-primary))]" />
				Жалобы:
			</span>
			{COMPLAINT_QUICK_CHIPS.map((chipText) => {
				const isApplied = (anamnesis ?? "").includes(chipText);
				return (
					<button
						key={chipText}
						type="button"
						onClick={() => onAddComplaintChip(chipText)}
						disabled={fieldsDisabled}
						className={`dente-filter-chip shrink-0 ${isApplied ? "active" : ""}`}
						data-active={isApplied}
						title={
							isApplied
								? `Жалоба внесена: «${chipText}»`
								: `Внести в анамнез: «${chipText}»`
						}
						data-testid={`complaint-chip-${chipText}`}
					>
						{chipText}
						{isApplied ? (
							<Check className="w-3 h-3 shrink-0" />
						) : (
							<Plus className="w-3 h-3 opacity-60 shrink-0" />
						)}
					</button>
				);
			})}
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
			<div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => {
						ensureRevisingIfLocked();
						const normSomatic = "Жалоб на момент приёма не предъявляет (профилактический осмотр). Соматически здоров, хронические заболевания и аллергии со слов отрицает.";
						setDiary((p) => ({
							...p,
							anamnesis: p.anamnesis ? `${p.anamnesis}\n${normSomatic}` : normSomatic,
						}));
						scheduleDebouncedSave();
					}}
					disabled={fieldsDisabled}
					className={`dente-filter-chip shrink-0 ${
						isSomaticNormApplied ? "active" : ""
					}`}
					data-active={isSomaticNormApplied}
					data-testid="btn-quick-norm-somatic"
					title="Зафиксировать норму в 1 клик: соматически здоров, аллергии отрицает"
				>
					<Check className="w-3 h-3 text-[var(--teal)] shrink-0" />
					<span>Соматически здоров</span>
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
