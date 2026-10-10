import React from "react";
import { Edit3, CheckCircle2, Sparkles, Activity } from "lucide-react";
import type { OrthodonticActivationNotesProps } from "./types";

const QUICK_CLINICAL_PHRASES = [
	"Дуга без деформаций, фиксация замков надежная.",
	"Активация эластической цепочки Power Chain.",
	"Смена лигатур, гигиена полости рта удовлетворительная.",
	"Переклейка брекета со снятием старого композита и праймированием.",
	"Пациент соблюдает режим ношения эластиков 22 ч/сутки.",
	"Плановая активация винта съемного аппарата на 1/4 оборота.",
];

export const OrthodonticActivationNotes: React.FC<OrthodonticActivationNotesProps> = ({
	notes,
	setNotes,
	selectedActions,
	onToggleAction,
	powerChainSpan,
	powerChainType,
	selectedTeeth,
	onQuickPhraseInsert,
}) => {
	const handleInsertPhrase = (phrase: string) => {
		if (onQuickPhraseInsert) {
			onQuickPhraseInsert(phrase);
			return;
		}
		setNotes((prev) => (prev ? `${prev}\n${phrase}` : phrase));
	};

	return (
		<div
			data-testid="ortho-activation-notes"
			className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
					<Activity size={14} className="text-teal-600 dark:text-teal-400" />
					Протокол активации & Клинические заметки
				</span>
				<span className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
					<CheckCircle2 size={12} />
					Автосохранение в дневник
				</span>
			</div>

			{/* Быстрые клинические фразы */}
			<div className="flex flex-wrap gap-1.5">
				{QUICK_CLINICAL_PHRASES.map((phrase, idx) => (
					<button
						key={idx}
						type="button"
						onClick={() => handleInsertPhrase(phrase)}
						className="h-6 px-2 rounded-md bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-900 border border-[var(--line-subtle,#e2e8f0)] dark:border-slate-800 text-[11px] font-medium text-[var(--ink,#0f172a)] dark:text-slate-300 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-all cursor-pointer truncate max-w-full"
						title={phrase}
					>
						+ {phrase.slice(0, 36)}...
					</button>
				))}
			</div>

			{/* Текстовое поле заметок */}
			<div className="relative">
				<textarea
					id="ortho-clinical-notes-textarea"
					aria-label="Клинические заметки ортодонта"
					data-testid="ortho-clinical-notes-textarea"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={3}
					placeholder="Особые отметки врача: динамика торка, жалобы на натирание, режим чувисов, межзубная сепарация..."
					className="w-full p-2.5 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-lg text-xs leading-relaxed text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-[var(--muted,#64748b)] dark:placeholder:text-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all resize-y"
				/>
			</div>

			{/* Информационная строка статуса */}
			{(powerChainSpan || selectedTeeth?.length || selectedActions?.length) ? (
				<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 flex-wrap">
					{powerChainSpan && (
						<span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">
							Power Chain: {powerChainSpan} ({powerChainType === "short" ? "короткий шаг" : "стандарт"})
						</span>
					)}
					{selectedTeeth && selectedTeeth.length > 0 && (
						<span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
							Зубы в работе: {selectedTeeth.join(", ")}
						</span>
					)}
					{selectedActions && selectedActions.length > 0 && (
						<span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
							Манипуляций: {selectedActions.length}
						</span>
					)}
				</div>
			) : null}
		</div>
	);
};
