import type React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CryptoProSigner } from "../../CryptoProSigner";
import { VisitDiaryReviseAndLockFooters } from "../VisitDiaryReviseAndLockFooters";

export interface VisitDiaryActionsFooterProps {
	readonly isLocked: boolean;
	readonly isSaving: boolean;
	readonly doSave: (silent?: boolean) => Promise<any>;
	readonly ensureDraftSavedForSigning: () => Promise<{ id: string; hash: string | null } | null>;
	readonly doLock: (thumbprint: string, signature: string, alreadySavedId?: string | null) => Promise<any>;
	readonly diaryHash?: string | null;
	readonly lockedAt?: string | null;
	readonly isRevising: boolean;
	readonly revisionReason: string;
	readonly setRevisionReason: (val: string) => void;
	readonly cancelRevise: () => void;
	readonly isRevisingBusy: boolean;
	readonly doRevise: () => Promise<any>;
	readonly beginRevise: () => void;
	readonly diaryDoctorFullName?: string | null;
	readonly hasCryptoSignature?: boolean;
	readonly revisionCount?: number;
	readonly setShowPreview: (val: boolean) => void;
	readonly onCompleteVisitAndBilling: () => Promise<void>;
}

export const VisitDiaryActionsFooter: React.FC<VisitDiaryActionsFooterProps> = ({
	isLocked,
	isSaving,
	doSave,
	ensureDraftSavedForSigning,
	doLock,
	diaryHash,
	lockedAt,
	isRevising,
	revisionReason,
	setRevisionReason,
	cancelRevise,
	isRevisingBusy,
	doRevise,
	beginRevise,
	diaryDoctorFullName,
	hasCryptoSignature,
	revisionCount,
	setShowPreview,
	onCompleteVisitAndBilling,
}) => {
	if (isLocked) {
		return (
			<VisitDiaryReviseAndLockFooters
				isRevising={isRevising}
				revisionReason={revisionReason}
				setRevisionReason={setRevisionReason}
				cancelRevise={cancelRevise}
				isRevisingBusy={isRevisingBusy}
				doRevise={doRevise}
				beginRevise={beginRevise}
				diaryDoctorFullName={diaryDoctorFullName ?? null}
				lockedAt={lockedAt ?? null}
				hasCryptoSignature={Boolean(hasCryptoSignature)}
				diaryHash={diaryHash ?? null}
				revisionCount={revisionCount ?? 0}
				setShowPreview={setShowPreview}
			/>
		);
	}

	return (
		<div className="clinical-diary__footer vde-043__footer">
			<span className="clinical-diary__footer-hint vde-043__footer-hint">
				<AlertTriangle className="w-3 h-3" /> Автосохранение активно
			</span>
			<button
				type="button"
				id="diary-save-btn"
				data-testid="diary-save-btn"
				onClick={() => doSave(false)}
				className="clinical-diary__btn vde-043__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
			>
				{isSaving ? "Сохраняю..." : "Сохранить черновик"}
			</button>
			<button
				type="button"
				id="diary-complete-visit-btn"
				data-testid="diary-complete-visit-btn"
				onClick={onCompleteVisitAndBilling}
				className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-bold text-xs rounded-xl transition-all shadow-sm min-h-[44px] cursor-pointer"
				title="Завершить приём и перейти к кассе (без обязательной ЭЦП)"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0" />
				<span>Завершить приём и счёт</span>
			</button>
			<CryptoProSigner
				diaryHash={diaryHash ?? null}
				isLocked={isLocked}
				lockedAt={lockedAt ?? null}
				ensureDraftSaved={ensureDraftSavedForSigning}
				onLock={doLock}
			/>
		</div>
	);
};
