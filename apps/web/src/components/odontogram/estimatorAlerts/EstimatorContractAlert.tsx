import type React from "react";
import { AlertTriangle } from "lucide-react";
import { requestFailureCause } from "../../../lib/panelStateText";

export interface EstimatorContractAlertProps {
	readonly contractFailure: { status: number | null } | null;
	readonly onRetryContract: () => void;
}

export const EstimatorContractAlert: React.FC<EstimatorContractAlertProps> = ({
	contractFailure,
	onRetryContract,
}) => {
	if (!contractFailure) return null;

	return (
		<div
			role="alert"
			className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
		>
			<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			<div className="flex-1 min-w-0 break-words">
				<div className="font-semibold">
					Договор ДМС не прочитан: {requestFailureCause(contractFailure.status)}.
				</div>
				<div className="mt-0.5">
					Суммы ниже показаны БЕЗ покрытия ДМС — пациент по договору заплатит
					меньше. Не называйте эти суммы пациенту, пока договор не прочитан.
				</div>
			</div>
			<button
				type="button"
				onClick={onRetryContract}
				className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-[var(--paper-hover,var(--paper-soft))] dark:hover:bg-amber-900/60 transition-colors"
			>
				Повторить
			</button>
		</div>
	);
};
