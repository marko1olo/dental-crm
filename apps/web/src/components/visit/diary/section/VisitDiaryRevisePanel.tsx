import React from "react";
import { AlertTriangle } from "lucide-react";

export interface VisitDiaryRevisePanelProps {
	readonly revisionReason: string;
	readonly setRevisionReason: (r: string) => void;
	readonly cancelRevise: () => void;
	readonly isRevisingBusy: boolean;
	readonly doRevise: () => void;
}

export const VisitDiaryRevisePanel: React.FC<VisitDiaryRevisePanelProps> = ({
	revisionReason,
	setRevisionReason,
	cancelRevise,
	isRevisingBusy,
	doRevise,
}) => {
	return (
		<div className="vde-043__revise-panel" data-testid="diary-revise-panel">
			<div className="vde-043__revise-warn">
				<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
				<span>
					Режим правки закрытого дневника врачом («Исправленному верить»). Прежний текст надёжно сохраняется в истории версий.
				</span>
			</div>
			<label className="vde-043__revise-label">
				Причина правки («Исправленному верить»)
				<input
					data-testid="diary-revise-reason"
					value={revisionReason}
					onChange={(e) => setRevisionReason(e.target.value)}
					placeholder="Исправленному верить (нажмите «Сохранить правку» для мгновенного сохранения)"
					className="vde-043__input"
				/>
			</label>
			<div className="vde-043__revise-actions">
				<button
					type="button"
					data-testid="diary-revise-cancel"
					onClick={cancelRevise}
					disabled={isRevisingBusy}
					className="vde-043__btn vde-043__btn--ghost border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
				>
					Отмена
				</button>
				<button
					type="button"
					data-testid="diary-revise-save"
					onClick={doRevise}
					disabled={isRevisingBusy}
					className="vde-043__btn vde-043__btn--amber border border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-300 font-bold rounded-lg px-3 py-1.5 shadow-2xs hover:bg-amber-500/20 transition-colors"
				>
					{isRevisingBusy ? "Сохраняю..." : "Сохранить правку («Исправленному верить»)"}
				</button>
			</div>
		</div>
	);
};
