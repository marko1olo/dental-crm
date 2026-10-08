import { CheckCircle2, FileText } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import type { EmkSectionProps } from "./EmkTypes";

export function EmkComplaintsSection({
	visitNoteForm,
	updateVisitNoteField,
}: EmkSectionProps) {
	const handleFillComplaintsNorm = () => {
		if (!updateVisitNoteField) return;
		updateVisitNoteField(
			"complaint",
			"Жалоб нет. Обратился(лась) для планового профилактического осмотра и санации полости рта.",
		);
	};

	const handleFillAnamnesisNorm = () => {
		if (!updateVisitNoteField) return;
		updateVisitNoteField(
			"anamnesis",
			"Соматически здоров. Аллергологический анамнез не отягощен. Хронические заболевания отрицает. Ранее стоматологическое лечение переносил без осложнений.",
		);
	};

	return (
		<div className="flex flex-col gap-3.5">
			{/* Жалобы */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Жалобы пациента</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">
							Симптомы со слов пациента
						</span>
						<button
							type="button"
							data-testid="btn-emk-complaints-norm"
							onClick={handleFillComplaintsNorm}
							className="emk-norm-button"
							title="Заполнить жалобы нормой: Жалоб нет"
						>
							<CheckCircle2 size={14} className="shrink-0" />
							<span>✓ Жалоб нет / норма</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="complaint"
					label="Жалобы пациента"
					value={visitNoteForm?.complaint || ""}
					onCommit={updateVisitNoteField}
					placeholder="Опишите жалобы пациента (характер боли, локализация, провоцирующие факторы)..."
					className="w-full min-h-[85px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>

			{/* Анамнез */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анамнез заболевания и жизни</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">
							Развитие заболевания
						</span>
						<button
							type="button"
							data-testid="btn-emk-anamnesis-norm"
							onClick={handleFillAnamnesisNorm}
							className="emk-norm-button"
							title="Заполнить анамнез нормой: Соматически здоров"
						>
							<CheckCircle2 size={14} className="shrink-0" />
							<span>✓ Соматически здоров</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="anamnesis"
					label="Анамнез"
					value={visitNoteForm?.anamnesis || ""}
					onCommit={updateVisitNoteField}
					placeholder="История настоящего заболевания, перенесенные соматические заболевания, аллергологический статус..."
					className="w-full min-h-[85px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>
		</div>
	);
}
