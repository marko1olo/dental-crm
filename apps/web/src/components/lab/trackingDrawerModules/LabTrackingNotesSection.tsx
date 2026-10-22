import React from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";

export interface LabTrackingNotesSectionProps {
	readonly stageNote: string;
	readonly setStageNote: (note: string) => void;
	readonly handleAdvanceStage: () => Promise<void> | void;
	readonly isUpdating: boolean;
	readonly secureToken: string;
	readonly portalUrl: string;
}

/**
 * Клинический блок заметок техника/врача и перехода на следующий этап ЗТЛ.
 * Заменяет симулятор сканера и бутафорские штрихкоды на чистый клинический интерфейс.
 */
export function LabTrackingNotesSection({
	stageNote,
	setStageNote,
	handleAdvanceStage,
	isUpdating,
	secureToken,
	portalUrl,
}: LabTrackingNotesSectionProps): React.JSX.Element {
	return (
		<div className="space-y-4" data-testid="lab-tracking-notes-section">
			{/* Technician Notes & Advance Stage Action */}
			<div className="space-y-2">
				<label className="block text-xs font-bold text-[var(--ink)]">
					Заметки зубного техника / врача к текущему этапу
				</label>
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Напр. Каркас отфрезерован, требуется коррекция окклюзионного контакта на 16..."
						value={stageNote}
						onChange={(e) => setStageNote(e.target.value)}
						className="flex-1 h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
					/>
					<button
						type="button"
						onClick={() => handleAdvanceStage()}
						disabled={isUpdating}
						className="min-h-[44px] sm:min-h-[36px] h-10 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
					>
						{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						<span>Следующий этап</span>
					</button>
				</div>
			</div>

			{/* Technician Portal Link & Token */}
			<div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs">
				<div className="flex items-center gap-1.5 text-[var(--muted)]">
					<span>Номер наряда:</span>
					<span className="font-mono font-bold text-[var(--ink)]">{secureToken}</span>
				</div>
				<div className="flex items-center gap-2">
					<a
						href={portalUrl}
						target="_blank"
						rel="noreferrer"
						className="min-h-[36px] h-9 px-3.5 py-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<ExternalLink className="w-4 h-4 text-[var(--muted)]" />
						<span>Портал лаборатории</span>
					</a>
				</div>
			</div>
		</div>
	);
}

export default LabTrackingNotesSection;
