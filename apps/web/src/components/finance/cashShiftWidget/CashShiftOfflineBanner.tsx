import React from "react";
import { AlertTriangle, Zap } from "lucide-react";

interface CashShiftOfflineBannerProps {
	readonly pendingOfflineCount: number;
	readonly pendingOfflineAmountRub: number;
	readonly formatMoneyRu: (v: number) => string;
	readonly onOpenOfflineBatchModal: () => void;
}

export function CashShiftOfflineBanner({
	pendingOfflineCount,
	pendingOfflineAmountRub,
	formatMoneyRu,
	onOpenOfflineBatchModal,
}: CashShiftOfflineBannerProps) {
	if (pendingOfflineCount <= 0) return null;

	return (
		<div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
			<div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
				<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
				<div>
					<span>
						В офлайн-очереди накопилось <strong>{pendingOfflineCount} неотправленных чеков</strong> на сумму <strong>{formatMoneyRu(pendingOfflineAmountRub)}</strong> (обрыв связи с кассой).
					</span>
					<div className="text-[11px] text-[var(--muted,#64748b)] font-normal">
						Все оплаты зафиксированы в программе. Пробейте очередь после восстановления связи.
					</div>
				</div>
			</div>
			<button
				type="button"
				onClick={onOpenOfflineBatchModal}
				className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
				data-testid="btn-flush-offline-queue-1click"
			>
				<Zap size={14} className="shrink-0" />
				<span>Фискализировать всю очередь</span>
			</button>
		</div>
	);
}
