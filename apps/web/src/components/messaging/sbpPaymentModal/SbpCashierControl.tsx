import React from "react";
import { Check, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { formatCurrencyRu } from "../omnichannelEngine.js";
import type { SbpStatusCheckMessage } from "./types.js";

export interface SbpCashierControlProps {
	readonly sumRub: number;
	readonly isCheckingStatus: boolean;
	readonly statusCheckMessage: SbpStatusCheckMessage | null;
	readonly isManualConfirmPending: boolean;
	readonly onCheckGatewayStatus: () => void;
	readonly onToggleManualConfirm: (pending: boolean) => void;
	readonly onConfirmManualReconciliation: () => void;
}

export const SbpCashierControl: React.FC<SbpCashierControlProps> = ({
	sumRub,
	isCheckingStatus,
	statusCheckMessage,
	isManualConfirmPending,
	onCheckGatewayStatus,
	onToggleManualConfirm,
	onConfirmManualReconciliation,
}) => {
	return (
		<div className="mt-3 p-3 bg-[var(--paper-soft)] border border-[var(--line-subtle)] rounded-lg flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" />
					Контроль кассира (Касса и чеки / СБП):
				</span>
				<button
					type="button"
					onClick={onCheckGatewayStatus}
					disabled={isCheckingStatus}
					title="Опросить эквайринговый шлюз НСПК на предмет зачисления"
					className="min-h-[36px] sm:min-h-[36px] min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-[var(--line-strong)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer disabled:opacity-60"
				>
					<RefreshCw size={12} className={isCheckingStatus ? "sbp-spin-icon" : ""} />
					{isCheckingStatus ? "Опрос шлюза..." : "Обновить статус"}
				</button>
			</div>

			{statusCheckMessage && (
				<div
					className={`text-xs p-1.5 rounded ${
						statusCheckMessage.type === "success"
							? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
							: statusCheckMessage.type === "warning"
								? "text-amber-700 bg-amber-500/10 dark:text-amber-300"
								: "text-[var(--muted)] bg-slate-500/10"
					}`}
				>
					{statusCheckMessage.text}
				</div>
			)}

			{!isManualConfirmPending ? (
				<button
					type="button"
					onClick={() => onToggleManualConfirm(true)}
					title="Подтвердить зачисление по мобильному банку клиники или СМС"
					className="min-h-[44px] flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold rounded-md border border-[var(--line-strong)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer"
				>
					<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400" />
					Подтвердить зачисление по банковской выписке / СМС (ручная сверка)
				</button>
			) : (
				<div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 flex flex-col gap-1.5">
					<div className="text-xs text-[var(--ink)]">
						<strong>Внимание:</strong> Вы подтверждаете, что сумма <strong>{formatCurrencyRu(sumRub)}</strong> фактически зачислена на счет клиники?
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onConfirmManualReconciliation}
							className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded bg-emerald-600 text-white cursor-pointer"
						>
							<Check size={13} /> Да, подтверждаю
						</button>
						<button
							type="button"
							onClick={() => onToggleManualConfirm(false)}
							className="min-h-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded border border-[var(--line-subtle)] bg-[var(--paper-strong)] text-[var(--muted)] cursor-pointer"
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
