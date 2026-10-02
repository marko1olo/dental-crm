import type React from "react";
import { AlertTriangle, Lock } from "lucide-react";

export interface VisitDiaryReviseAndLockFootersProps {
	readonly isRevising: boolean;
	readonly revisionReason: string;
	readonly setRevisionReason: (r: string) => void;
	readonly cancelRevise: () => void;
	readonly isRevisingBusy: boolean;
	readonly doRevise: () => void;
	readonly beginRevise: () => void;
	readonly diaryDoctorFullName?: string | null;
	readonly lockedAt?: string | null;
	readonly hasCryptoSignature?: boolean;
	readonly diaryHash?: string | null;
	readonly revisionCount: number;
	readonly setShowPreview: (p: boolean) => void;
}

export function VisitDiaryReviseAndLockFooters({
	isRevising,
	revisionReason,
	setRevisionReason,
	cancelRevise,
	isRevisingBusy,
	doRevise,
	beginRevise,
	diaryDoctorFullName,
	lockedAt,
	hasCryptoSignature,
	diaryHash,
	revisionCount,
	setShowPreview,
}: VisitDiaryReviseAndLockFootersProps) {
	if (isRevising) {
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
						className="vde-043__btn vde-043__btn--ghost"
					>
						Отмена
					</button>
					<button
						type="button"
						data-testid="diary-revise-save"
						onClick={doRevise}
						disabled={isRevisingBusy}
						className="vde-043__btn vde-043__btn--amber"
					>
						{isRevisingBusy ? "Сохраняю..." : "Сохранить правку («Исправленному верить»)"}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="vde-043__footer vde-043__footer--locked">
			<div className="vde-043__lock-meta">
				<Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span>
					Дневник подписан{" "}
					{diaryDoctorFullName ? `(${diaryDoctorFullName})` : ""}{" "}
					{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : ""}.
				</span>
				{hasCryptoSignature && (
					<span
						className="vde-043__sig-chip"
						title={diaryHash ? `SHA-256: ${diaryHash}` : undefined}
					>
						КЭП (ГОСТ)
					</span>
				)}
				{revisionCount > 0 && (
					<span className="vde-043__rev-chip">
						Редакция #{revisionCount + 1}
					</span>
				)}
			</div>
			<div className="vde-043__footer-actions">
				<button
					type="button"
					data-testid="diary-revise-begin"
					onClick={beginRevise}
					className="vde-043__btn vde-043__btn--amber"
					title="Внести исправление в закрытый дневник («Исправленному верить»)"
				>
					Внести исправление
				</button>
				<button
					type="button"
					data-testid="diary-form-043-open"
					onClick={() => setShowPreview(true)}
					className="vde-043__btn"
					title="Печать медицинской карты"
				>
					Печать карты
				</button>
			</div>
		</div>
	);
}
