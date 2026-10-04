import { FileText } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import type { EmkSectionProps } from "./EmkTypes";

export function EmkComplaintsSection({
	visitNoteForm,
	updateVisitNoteField,
}: EmkSectionProps) {
	return (
		<div className="flex flex-col gap-3">
			{/* Жалобы */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Жалобы пациента</span>
					</label>
					<span className="text-[11px] text-[var(--muted)] hidden md:inline">
						Симптомы со слов пациента
					</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="complaint"
					label="Жалобы пациента"
					value={visitNoteForm?.complaint || ""}
					onCommit={updateVisitNoteField}
					placeholder="Опишите жалобы пациента (характер боли, локализация, провоцирующие факторы)..."
					className="w-full min-h-[64px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>
			</div>

			{/* Анамнез */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анамнез заболевания и жизни</span>
					</label>
					<span className="text-[11px] text-[var(--muted)] hidden md:inline">
						Развитие заболевания
					</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="anamnesis"
					label="Анамнез"
					value={visitNoteForm?.anamnesis || ""}
					onCommit={updateVisitNoteField}
					placeholder="История настоящего заболевания, перенесенные соматические заболевания, аллергологический статус..."
					className="w-full min-h-[64px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>
			</div>
		</div>
	);
}
