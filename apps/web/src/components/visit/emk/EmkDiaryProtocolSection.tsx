import React from "react";
import { Bold, Eraser, FileCheck, Italic, List, Pill, PlusCircle, Tag } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

export interface EmkDiaryProtocolSectionProps extends EmkSectionProps {
	onOpenTemplatesModal?: () => void;
}

export function EmkDiaryProtocolSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
	onOpenTemplatesModal,
}: EmkDiaryProtocolSectionProps) {
	const toothPrefix = activeTooth ? `Зуб ${activeTooth}: ` : "";

	const icd10Chips = [
		{ code: "K02.1", label: `${toothPrefix}K02.1 Кариес дентина (средний/глубокий)` },
		{ code: "K04.0", label: `${toothPrefix}K04.0 Пульпит начальный / острый очаговый` },
		{ code: "K04.03", label: `${toothPrefix}K04.03 Хронический фиброзный пульпит` },
		{ code: "K04.5", label: `${toothPrefix}K04.5 Хронический апикальный периодонтит` },
		{ code: "K05.3", label: "K05.3 Хронический генерализованный пародонтит легкой/средней степени" },
		{ code: "K05.1", label: "K05.1 Хронический катаральный гингивит" },
		{ code: "K03.6", label: "K03.6 Зубные отложения (над- и поддесневой зубной камень)" },
		{ code: "Z01.2", label: "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)" },
	];

	const recommendationChips = [
		"Чистка зубов 2 раза в день выметающими движениями в течение 2–3 минут (зубная паста, флосс, ирригатор).",
		"Воздержаться от приема пищи и окрашивающих напитков в течение 2 часов после постановки пломбы.",
		"При болевом синдроме: Нимесулид 100 мг (1 таб.) или Ибупрофен 400 мг после еды, не более 2–3 дней.",
		"Ротовые ванночки с раствором Хлоргексидина 0.05% или Мирамистина 3 раза в день после еды 5 дней.",
		"Щадящая диета: исключить твердую, грубую, чрезмерно горячую и острую пищу.",
		"Явка на продолжение эндодонтического лечения через 2–3 дня.",
		"Плановый контрольный осмотр через 6 месяцев.",
	];

	const handleAddChip = (fieldKey: string, chipText: string) => {
		const current = visitNoteForm?.[fieldKey] || "";
		updateVisitNoteField(fieldKey, appendClinicalText(current, chipText, " "));
	};

	// 26px compact formatting tools (DEF-VIS-05, Mandates 8c, 8d)
	const applyFormatting = (prefix: string, suffix: string = "") => {
		const curr = visitNoteForm?.treatmentPlan || "";
		if (!curr) return;
		updateVisitNoteField("treatmentPlan", `${prefix}${curr}${suffix}`);
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Диагноз */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Tag size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Основной диагноз по МКБ-10</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Код и расшифровка диагноза</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="diagnosis"
					label="Диагноз МКБ-10"
					value={visitNoteForm?.diagnosis || ""}
					onCommit={updateVisitNoteField}
					placeholder="Код МКБ-10 и клинический развернутый диагноз..."
					className="w-full min-h-[60px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые чипы МКБ-10 */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{icd10Chips.map((chip, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => updateVisitNoteField("diagnosis", chip.label)}
							className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1"
							title={chip.label}
						>
							<span className="font-mono font-bold text-[var(--teal)]">{chip.code}</span>
							<span className="max-w-[180px] truncate">{chip.label.replace(/^.*K\d+(\.\d+)?\s*/, "")}</span>
						</button>
					))}
				</div>
			</div>

			{/* Протокол лечения / Дневник */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileCheck size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Протокол лечения и манипуляций</span>
					</label>

					{/* 26px compact formatting toolbar */}
					<div className="flex items-center gap-1 bg-[var(--paper-subtle,rgba(0,0,0,0.02))] border border-[var(--line)] rounded-md px-1.5 py-0.5 h-[26px]">
						<button
							type="button"
							onClick={() => applyFormatting("**", "**")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Жирный"
						>
							<Bold size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("_", "_")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Курсив"
						>
							<Italic size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("\n• ")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Список"
						>
							<List size={12} />
						</button>
						<button
							type="button"
							onClick={() => updateVisitNoteField("treatmentPlan", "")}
							className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer"
							title="Очистить"
						>
							<Eraser size={12} />
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="treatmentPlan"
					label="Протокол лечения"
					value={visitNoteForm?.treatmentPlan || ""}
					onCommit={updateVisitNoteField}
					placeholder="Подробный протокол вмешательства: препарирование, медикаментозная обработка, пломбировочный материал, полировка, рекомендации..."
					className="w-full min-h-[140px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>
			</div>

			{/* Рекомендации и назначения */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Pill size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Клинические рекомендации и назначения пациенту</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Режим, гигиена, лекарственные средства</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="recommendations"
					label="Рекомендации"
					value={visitNoteForm?.recommendations || ""}
					onCommit={updateVisitNoteField}
					placeholder="Назначения врача, режим питания, медикаментозная терапия, дата контрольного визита..."
					className="w-full min-h-[80px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые чипы рекомендаций */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{recommendationChips.map((chip, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => handleAddChip("recommendations", chip)}
							className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1"
							title={chip}
						>
							<PlusCircle size={10} className="text-[var(--muted)]" />
							<span className="max-w-[220px] truncate">{chip}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
