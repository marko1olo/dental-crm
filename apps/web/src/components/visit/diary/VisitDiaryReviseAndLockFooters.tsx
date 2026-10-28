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
		<div className="clinical-diary__footer clinical-diary__footer--locked">
			<div className="clinical-diary__lock-meta">
				<Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span>
					Дневник подписан {diaryDoctorFullName ? `(${diaryDoctorFullName})` : ""}{" "}
					{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : ""}.
				</span>
				{hasCryptoSignature && (
					<span className="clinical-diary__sig-chip" title={diaryHash ? `SHA-256: ${diaryHash}` : undefined}>
						КЭП (ГОСТ)
					</span>
				)}
				{revisionCount > 0 && (
					<span className="clinical-diary__rev-chip">
						Редакция #{revisionCount + 1}
					</span>
				)}
			</div>
			<div className="clinical-diary__footer-actions">
				<button
					type="button"
					data-testid="diary-revise-begin"
					onClick={beginRevise}
					className="clinical-diary__btn clinical-diary__btn--amber border border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-300 font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:bg-amber-500/20 transition-colors"
					title="Внести исправление в закрытый дневник («Исправленному верить»)"
				>
					Внести исправление
				</button>
				<button
					type="button"
					id="diary-emr-card-open-btn"
					data-testid="diary-emr-card-open"
					data-legacy-testid="diary-form-043-open"
					onClick={() => setShowPreview(true)}
					className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
					title="Предпросмотр и печать медицинской карты приёма"
				>
					Печать карты
				</button>
			</div>
		</div>
	);
}
