import React from "react";
import {
	Activity,
	CheckCircle2,
	PlusCircle,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

interface ObjectivePresetChip {
	id: string;
	label: string;
	text: (toothPrefix: string) => string;
}

const OBJECTIVE_TARGET_CHIPS: readonly ObjectivePresetChip[] = [
	{
		id: "caries_medium_depth",
		label: "Кариозная полость средней глубины",
		text: (tp) =>
			`${tp}кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Реакция на холод кратковременная.`,
	},
	{
		id: "probing_painful_floor",
		label: "Зондирование болезненно по дну",
		text: (tp) =>
			`${tp}зондирование болезненно по дну кариозной полости, эмалево-дентинная граница чувствительна.`,
	},
	{
		id: "percussion_painless",
		label: "Перкуссия безболезненна",
		text: (tp) =>
			`${tp}перкуссия безболезненная. Термометрия безболезненная. Подвижность физиологическая.`,
	},
	{
		id: "percussion_sharp_pain",
		label: "Перкуссия резко болезненна",
		text: (tp) =>
			`${tp}перкуссия резко болезненна в вертикальном направлении. Пальпация по переходной складке умеренно болезненна.`,
	},
	{
		id: "kofferdam",
		label: "Коффердам",
		text: () => "Изоляция операционного поля коффердамом (OptiDam / Sanctuary).",
	},
	{
		id: "sopr_pale_pink",
		label: "СОПР бледно-розовая, чистая",
		text: () =>
			"Слизистая оболочка полости рта (СОПР) бледно-розовая, влажная, чистая. Десневой край плотный, без признаков воспаления.",
	},
	{
		id: "orthognathic_bite",
		label: "Прикус ортогнатический",
		text: () =>
			"Прикус ортогнатический. Смыкание зубных рядов по I классу Энгля. Движения в ВНЧС плавные, щелчков нет.",
	},
	{
		id: "eod_2_6_norm",
		label: "ЭОД 2–6 мкА",
		text: () => "ЭОД: порог электровозбудимости пульпы 2–6 мкА (норма).",
	},
];

const EXAMINATION_CHIPS = [
	"Прицельная внутриротовая радиовизиография: изменений в периапикальных тканях не выявлено.",
	"ЭОД: порог электровозбудимости пульпы 2–6 мкА (норма).",
	"ЭОД: порог электровозбудимости пульпы 20–40 мкА (воспаление коронковой пульпы).",
	"ЭОД: порог электровозбудимости пульпы >100 мкА (некроз пульпы / периодонтит).",
	"ОПТГ: деструкции костной ткани не определяется, альвеолярный край сохранен.",
];

export function EmkObjectiveStatusSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
}: EmkSectionProps) {
	const toothPrefix = activeTooth ? `Зуб ${activeTooth}: ` : "";

	const handleAddChip = (fieldKey: string, chipText: string) => {
		if (!updateVisitNoteField) return;
		const current = visitNoteForm?.[fieldKey] || "";
		updateVisitNoteField(fieldKey, appendClinicalText(current, chipText, " "));
	};

	const handleApplyFullObjectiveNorm = () => {
		if (!updateVisitNoteField) return;
		const normText =
			"Полость рта санирована / норма. Прикус физиологический / ортогнатический. Слизистая интактна (бледно-розовая, влажная, без патологических элементов). Регионарные лимфоузлы не увеличены, пальпация безболезненна. Движения в ВНЧС плавные, в полном объеме, безболезненные, щелчков нет.";
		updateVisitNoteField("objectiveStatus", normText);
	};

	const handleApplySanitizedNorm = () => {
		handleAddChip(
			"objectiveStatus",
			"Полость рта санирована / норма. Твердые ткани зубов без видимых кариозных поражений.",
		);
	};

	const handleApplyBiteNorm = () => {
		handleAddChip(
			"objectiveStatus",
			"Прикус физиологический / ортогнатический. Смыкание зубных рядов по I классу Энгля.",
		);
	};

	const handleApplyMucosaNorm = () => {
		handleAddChip(
			"objectiveStatus",
			"Слизистая интактна: бледно-розовая, умеренно влажная, десневые сосочки плотные, без признаков воспаления.",
		);
	};

	return (
		<div className="flex flex-col gap-3.5" data-testid="emk-objective-section">
			{/* 1. Объективный статус */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Stethoscope size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Осмотр и объективный статус</span>
					</label>
					<div className="flex items-center gap-2" data-testid="emk-objective-norm-presets-bar">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">
							Внешний осмотр, СОПР, зубные ряды
						</span>
						<button
							type="button"
							data-testid="btn-emk-full-objective-norm"
							onClick={handleApplyFullObjectiveNorm}
							className="emk-norm-button"
							title="Полная норма осмотра: санирована, прикус ортогнатический, слизистая интактна"
						>
							<ShieldCheck size={14} className="shrink-0" />
							<span>✓ Физиологическая норма осмотра</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="objectiveStatus"
					label="Объективный статус"
					value={visitNoteForm?.objectiveStatus || ""}
					onCommit={updateVisitNoteField}
					placeholder="Внешний осмотр, лимфоузлы, прикус, состояние СОПР, десен, детальный статус зуба (кариозная полость, перкуссия, зондирование, подвижность)..."
					className="w-full min-h-[90px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Открытые чипы осмотра без прячущих details (Эргономика у кресла) */}
				<div className="flex flex-col gap-2 pt-0.5" data-testid="emk-objective-quick-chips">
					{/* Ряд базовых норм осмотра */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							data-testid="btn-emk-sanitized-norm"
							onClick={handleApplySanitizedNorm}
							className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 touch-manipulation"
							title="Полость рта санирована / норма"
						>
							<Sparkles size={12} className="text-emerald-500 shrink-0" />
							<span>Полость рта санирована</span>
						</button>
						<button
							type="button"
							data-testid="btn-emk-bite-norm"
							onClick={handleApplyBiteNorm}
							className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 touch-manipulation"
							title="Прикус физиологический / ортогнатический"
						>
							<Sparkles size={12} className="text-blue-500 shrink-0" />
							<span>Прикус ортогнатический</span>
						</button>
						<button
							type="button"
							data-testid="btn-emk-mucosa-norm"
							onClick={handleApplyMucosaNorm}
							className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 touch-manipulation"
							title="Слизистая интактна"
						>
							<Sparkles size={12} className="text-teal-500 shrink-0" />
							<span>Слизистая интактна</span>
						</button>
					</div>

					{/* 8 ключевых чипов осмотра (открыты сразу) */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{OBJECTIVE_TARGET_CHIPS.map((chip) => (
							<button
								key={chip.id}
								type="button"
								data-testid={`btn-objective-chip-${chip.id}`}
								onClick={() => handleAddChip("objectiveStatus", chip.text(toothPrefix))}
								className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 touch-manipulation"
								title={chip.text(toothPrefix)}
							>
								<PlusCircle size={12} className="text-[var(--muted)] shrink-0" />
								<span>{chip.label}</span>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* 2. Дополнительные исследования */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Activity size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Инструментальные и аппаратные исследования</span>
					</label>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
						Рентгенография, ЭОД, КЛКТ, термометрия
					</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="examination"
					label="Дополнительные исследования"
					value={visitNoteForm?.examination || ""}
					onCommit={updateVisitNoteField}
					placeholder="Данные рентгенографии, ЭОД, КЛКТ, диагностических проб..."
					className="w-full min-h-[75px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Открытые чипы аппаратных исследований */}
				<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
					<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0 hidden sm:inline">
						Исследования:
					</span>
					{EXAMINATION_CHIPS.map((chip, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => handleAddChip("examination", chip)}
							className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs font-normal bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95 touch-manipulation"
							title={chip}
						>
							<PlusCircle size={11} className="text-[var(--muted)] shrink-0" />
							<span className="max-w-[260px] truncate">{chip}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
