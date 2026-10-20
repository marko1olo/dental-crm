import type React from "react";
import { Lock } from "lucide-react";
import { VisitDiaryRevisePanel } from "./section/VisitDiaryRevisePanel";

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

export function VisitDiaryReviseAndLockFooters(props: VisitDiaryReviseAndLockFootersProps) {
	const {
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
	} = props;

	if (isRevising) {
		return (
			<VisitDiaryRevisePanel
				revisionReason={revisionReason}
				setRevisionReason={setRevisionReason}
				cancelRevise={cancelRevise}
				isRevisingBusy={isRevisingBusy}
				doRevise={doRevise}
			/>
		);
	}

	return (
		<div className="vde-043__footer vde-043__footer--locked">
			<div className="vde-043__lock-meta">
				<Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span>
					Дневник подписан {diaryDoctorFullName ? `(${diaryDoctorFullName})` : ""}{" "}
					{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : ""}.
				</span>
				{hasCryptoSignature && (
					<span className="vde-043__sig-chip" title={diaryHash ? `SHA-256: ${diaryHash}` : undefined}>
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
					className="vde-043__btn vde-043__btn--amber border border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-300 font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:bg-amber-500/20 transition-colors"
					title="Внести исправление в закрытый дневник («Исправленному верить»)"
				>
					Внести исправление
				</button>
				<button
					type="button"
					data-testid="diary-form-043-open"
					onClick={() => setShowPreview(true)}
					className="vde-043__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
					title="Печать медицинской карты"
				>
					Печать карты
				</button>
			</div>
		</div>
	);
}
