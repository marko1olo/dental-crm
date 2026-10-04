import React from "react";
import { Activity, PlusCircle, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

export function EmkObjectiveStatusSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
}: EmkSectionProps) {
	const toothPrefix = activeTooth ? `Зуб ${activeTooth}: ` : "";

	const objectiveChips = [
		"Слизистая оболочка полости рта бледно-розовая, влажная. Десневой край плотный, без признаков воспаления.",
		`${toothPrefix}глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки резко болезненно.`,
		`${toothPrefix}кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Реакция на холод кратковременная.`,
		`${toothPrefix}перкуссия безболезненная. Термометрия безболезненная. Подвижность физиологическая.`,
		`${toothPrefix}перкуссия резко болезненна в вертикальном направлении. Пальпация по переходной складке умеренно болезненна.`,
		"Прикус ортогнатический. Движения в ВНЧС плавные, в полном объеме, безболезненные, щелчков и крепитации нет.",
		"Регионарные лимфатические узлы (поднижнечелюстные, шейные) не увеличены, эластичные, подвижные, безболезненные при пальпации.",
	];

	const examinationChips = [
		"Прицельная внутриротовая радиовизиография: изменений в периапикальных тканях не выявлено.",
		"ЭОД: порог электровозбудимости пульпы 2–6 мкА (норма).",
		"ЭОД: порог электровозбудимости пульпы 20–40 мкА (воспаление коронковой пульпы).",
		"ЭОД: порог электровозбудимости пульпы >100 мкА (некроз пульпы / периодонтит).",
		"ОПТГ: деструкции костной ткани не определяется, альвеолярный край сохранен.",
	];

	const handleAddChip = (fieldKey: string, chipText: string) => {
		const current = visitNoteForm?.[fieldKey] || "";
		updateVisitNoteField(fieldKey, appendClinicalText(current, chipText, " "));
	};

	const handleApplyFullObjectiveNorm = () => {
		const normText =
			"Полость рта санирована / норма. Прикус физиологический / ортогнатический. Слизистая интактна (бледно-розовая, влажная, без патологических элементов). Регионарные лимфоузлы не увеличены, пальпация безболезненна. Движения в ВНЧС плавные, в полном объеме, безболезненные, щелчков нет.";
		updateVisitNoteField("objectiveStatus", normText);
	};

	const handleApplySanitizedNorm = () => {
		handleAddChip("objectiveStatus", "Полость рта санирована / норма. Твердые ткани зубов без видимых кариозных поражений.");
	};

	const handleApplyBiteNorm = () => {
		handleAddChip("objectiveStatus", "Прикус физиологический / ортогнатический. Смыкание зубных рядов по I классу Энгля.");
	};

	const handleApplyMucosaNorm = () => {
		handleAddChip("objectiveStatus", "Слизистая интактна: бледно-розовая, умеренно влажная, десневые сосочки плотные, без признаков воспаления.");
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Объективный статус */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Stethoscope size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Осмотр и зубная формула</span>
					</label>
					<div className="flex items-center gap-1.5" data-testid="emk-objective-norm-presets-bar">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">Внешний осмотр, СОПР, зубные ряды</span>
						<button
							type="button"
							data-testid="btn-emk-full-objective-norm"
							onClick={handleApplyFullObjectiveNorm}
							className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
							title="0-Клик полная норма осмотра: санирована, прикус ортогнатический, слизистая интактна"
						>
							<ShieldCheck size={12} className="text-emerald-600" />
							<span>0-Клик: Норма осмотра</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="objectiveStatus"
					label="Объективный статус"
					value={visitNoteForm?.objectiveStatus || ""}
					onCommit={updateVisitNoteField}
					placeholder="Внешний осмотр, лимфоузлы, прикус, состояние СОПР, десен, детальный статус зуба (кариозная полость, перкуссия, зондирование, подвижность)..."
					className="w-full min-h-[90px] p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Быстрые шаблоны осмотра: чистый кликабельный спойлер без серого мусора и стрелок */}
				<details className="group text-xs transition-all">
					<summary className="inline-flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] transition-colors rounded-lg hover:bg-[var(--paper-soft)]">
						<Sparkles size={12} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Шаблоны осмотра и статуса</span>
					</summary>
					<div className="pt-1.5 flex flex-col gap-1.5">
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								data-testid="btn-emk-sanitized-norm"
								onClick={handleApplySanitizedNorm}
								className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-700 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
								title="Полость рта санирована / норма"
							>
								<Sparkles size={11} className="text-emerald-500" />
								<span>Полость рта санирована / норма</span>
							</button>
							<button
								type="button"
								data-testid="btn-emk-bite-norm"
								onClick={handleApplyBiteNorm}
								className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-700 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
								title="Прикус физиологический / ортогнатический"
							>
								<Sparkles size={11} className="text-blue-500" />
								<span>Прикус физиологический / ортогнатический</span>
							</button>
							<button
								type="button"
								data-testid="btn-emk-mucosa-norm"
								onClick={handleApplyMucosaNorm}
								className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-700 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
								title="Слизистая интактна"
							>
								<Sparkles size={11} className="text-teal-500" />
								<span>Слизистая интактна</span>
							</button>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							{objectiveChips.map((chip, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => handleAddChip("objectiveStatus", chip)}
									className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
									title={chip}
								>
									<PlusCircle size={11} className="text-[var(--muted)]" />
									<span className="max-w-[280px] truncate">{chip}</span>
								</button>
							))}
						</div>
					</div>
				</details>
			</div>

			{/* Дополнительные исследования */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Activity size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Инструментальные и аппаратные исследования</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Рентгенография, ЭОД, КЛКТ, термометрия</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="examination"
					label="Дополнительные исследования"
					value={visitNoteForm?.examination || ""}
					onCommit={updateVisitNoteField}
					placeholder="Данные рентгенографии, ЭОД, КЛКТ, диагностических проб..."
					className="w-full min-h-[70px] p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Быстрые шаблоны исследований */}
				<details className="group text-xs transition-all">
					<summary className="inline-flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] transition-colors rounded-lg hover:bg-[var(--paper-soft)]">
						<Sparkles size={12} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Шаблоны исследований</span>
					</summary>
					<div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
						{examinationChips.map((chip, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => handleAddChip("examination", chip)}
								className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
								title={chip}
							>
								<PlusCircle size={11} className="text-[var(--muted)]" />
								<span className="max-w-[280px] truncate">{chip}</span>
							</button>
						))}
					</div>
				</details>
			</div>
		</div>
	);
}
