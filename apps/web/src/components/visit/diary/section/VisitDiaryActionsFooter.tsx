import type React from "react";
import { AlertTriangle, CheckCircle2, Printer } from "lucide-react";
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
		<div className="clinical-diary__footer flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--line)]">
			<div className="flex items-center gap-2">
				<span className="clinical-diary__footer-hint flex items-center gap-1.5 text-xs text-[var(--muted)]">
					<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<span>Автосохранение активно</span>
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{/* Вторичные действия (secondary с рамкой var(--line)) */}
				<button
					type="button"
					id="diary-save-btn"
					data-testid="diary-save-btn"
					onClick={() => doSave(false)}
					disabled={false}
					className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold rounded-xl px-3.5 py-2 shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[44px] cursor-pointer"
					title="Сохранить черновик дневника"
				>
					{isSaving ? "Сохраняю..." : "Сохранить черновик"}
				</button>

				<button
					type="button"
					id="diary-footer-print-btn"
					data-testid="diary-footer-print-btn"
					onClick={() => setShowPreview(true)}
					disabled={false}
					className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold rounded-xl px-3.5 py-2 shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
					title="Предпросмотр и печать медицинской карты приёма"
				>
					<Printer className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
					<span>Печать карты</span>
				</button>

				{/* Ровно 1 Primary CTA кнопка (#0d9488 / var(--teal)) */}
				<button
					type="button"
					id="diary-complete-visit-btn"
					data-testid="diary-complete-visit-btn"
					onClick={onCompleteVisitAndBilling}
					disabled={false}
					className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md min-h-[44px] cursor-pointer"
					title="Завершить приём, сохранить карту и перейти к оплате"
				>
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span>Завершить приём и сохранить карту</span>
				</button>

				<CryptoProSigner
					diaryHash={diaryHash ?? null}
					isLocked={isLocked}
					lockedAt={lockedAt ?? null}
					ensureDraftSaved={ensureDraftSavedForSigning}
					onLock={doLock}
				/>
			</div>
		</div>
	);
};
