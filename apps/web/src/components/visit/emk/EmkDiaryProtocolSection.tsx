import React from "react";
import { Bold, BookOpen, Eraser, FileCheck, Italic, List, Pill, Tag } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import type { EmkSectionProps } from "./EmkTypes";

export interface EmkDiaryProtocolSectionProps extends EmkSectionProps {
	onOpenTemplatesModal?: (() => void) | undefined;
	focusedField?: "diagnosis" | "treatmentPlan" | "recommendations" | undefined;
}

export function EmkDiaryProtocolSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
	onOpenTemplatesModal,
	focusedField,
}: EmkDiaryProtocolSectionProps) {
	// 26px compact formatting tools (DEF-VIS-05, Mandates 8c, 8d)
	const applyFormatting = (prefix: string, suffix: string = "") => {
		const curr = visitNoteForm?.treatmentPlan || "";
		if (!curr) return;
		updateVisitNoteField("treatmentPlan", `${prefix}${curr}${suffix}`);
	};

	return (
		<div className="flex flex-col gap-2.5">
			{/* Диагноз */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Tag size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Основной диагноз по МКБ-10</span>
					</label>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
						Код и расшифровка диагноза
					</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="diagnosis"
					label="Диагноз МКБ-10"
					value={visitNoteForm?.diagnosis || ""}
					onCommit={updateVisitNoteField}
					placeholder="Код МКБ-10 и клинический развернутый диагноз..."
					className="w-full min-h-[60px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>

			{/* Протокол лечения / Дневник */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<div className="flex items-center gap-2">
						<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
							<FileCheck size={15} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Протокол лечения и манипуляций</span>
						</label>
						{onOpenTemplatesModal && (
							<button
								type="button"
								onClick={onOpenTemplatesModal}
								className="emk-toolbar-btn"
								data-testid="btn-open-protocols-catalog-diary"
								title="Открыть полный каталог клинических протоколов (1 142 шаблона)"
							>
								<BookOpen size={13} className="text-[var(--teal)]" />
								<span>Каталог протоколов (1 142)</span>
							</button>
						)}
					</div>

					{/* 28px compact formatting toolbar */}
					<div className="flex items-center gap-1 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg px-1.5 py-0.5 h-[28px]">
						<button
							type="button"
							onClick={() => applyFormatting("**", "**")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
							title="Жирный"
						>
							<Bold size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("_", "_")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
							title="Курсив"
						>
							<Italic size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("\n• ")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
							title="Список"
						>
							<List size={12} />
						</button>
						<button
							type="button"
							onClick={() => updateVisitNoteField("treatmentPlan", "")}
							className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer transition-colors"
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
					className="w-full min-h-[130px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>

			{/* Рекомендации и назначения */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Pill size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Клинические рекомендации и назначения пациенту</span>
					</label>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
						Режим, гигиена, лекарственные средства
					</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="recommendations"
					label="Рекомендации"
					value={visitNoteForm?.recommendations || ""}
					onCommit={updateVisitNoteField}
					placeholder="Назначения врача, режим питания, медикаментозная терапия, дата контрольного визита..."
					className="w-full min-h-[75px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>
		</div>
	);
}
