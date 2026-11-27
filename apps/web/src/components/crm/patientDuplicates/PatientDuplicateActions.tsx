import type React from "react";
import type { DuplicateCandidate } from "../../../lib/patientDuplicatesApi";
import type { DuplicateConfirmState } from "./types";

interface Props {
	candidate: DuplicateCandidate;
	pairKey: string;
	isBusy: boolean;
	pendingConfirm: DuplicateConfirmState | null;
	onStartConfirm: (key: string, keepLeft: boolean) => void;
	onCancelConfirm: () => void;
	onMerge: (candidate: DuplicateCandidate, keepLeft: boolean) => void;
	onDismiss: (candidate: DuplicateCandidate) => void;
}

export const PatientDuplicateActions: React.FC<Props> = ({
	candidate,
	pairKey,
	isBusy,
	pendingConfirm,
	onStartConfirm,
	onCancelConfirm,
	onMerge,
	onDismiss,
}) => {
	if (pendingConfirm) {
		return (
			<>
				<span className="ops-note">
					Останется карточка «{pendingConfirm.keepLeft ? candidate.leftName : candidate.rightName}». Вторая станет архивной ссылкой, ничего не удалится.
				</span>
				<button
					className="primary-button h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
					type="button"
					disabled={isBusy}
					onClick={() => onMerge(candidate, pendingConfirm.keepLeft)}
				>
					{isBusy ? "Объединяю…" : "Подтвердить объединение"}
				</button>
				<button
					className="secondary-button h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 shrink-0"
					type="button"
					onClick={onCancelConfirm}
				>
					Отмена
				</button>
			</>
		);
	}

	return (
		<>
			<button
				className="secondary-button h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 shrink-0"
				type="button"
				disabled={isBusy}
				onClick={() => onStartConfirm(pairKey, true)}
			>
				Оставить первую
			</button>
			<button
				className="secondary-button h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 shrink-0"
				type="button"
				disabled={isBusy}
				onClick={() => onStartConfirm(pairKey, false)}
			>
				Оставить вторую
			</button>
			<button
				className="secondary-button h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 shrink-0"
				type="button"
				disabled={isBusy}
				onClick={() => onDismiss(candidate)}
			>
				Это разные люди
			</button>
		</>
	);
};
