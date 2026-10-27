/**
 * CashShiftCompactStatus.tsx — Левая информационная часть полосы кассовой смены (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Layers, Lock, Unlock } from "lucide-react";

export interface CashShiftCompactStatusProps {
	readonly isShiftOpen: boolean;
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly totalTurnoverRub: number;
	readonly pendingOfflineCount: number;
	readonly onOpenOfflineBatchModal: () => void;
	readonly formatMoneyRu: (value: number) => string;
}

export const CashShiftCompactStatus: React.FC<CashShiftCompactStatusProps> = ({
	isShiftOpen,
	shiftNumber,
	cashierName,
	totalTurnoverRub,
	pendingOfflineCount,
	onOpenOfflineBatchModal,
	formatMoneyRu,
}) => {
	return (
		<div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap flex-1">
			<div
				className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
					isShiftOpen
						? "bg-[var(--ok-bg,rgba(16,185,129,0.15))] text-[var(--ok-fg,#10b981)]"
						: "bg-[var(--danger-soft,rgba(239,68,68,0.15))] text-[var(--danger,#ef4444)]"
				}`}
				title={isShiftOpen ? "Смена открыта" : "Смена закрыта"}
			>
				{isShiftOpen ? <Unlock size={14} /> : <Lock size={14} />}
			</div>

			<span className="font-bold text-[var(--ink)] whitespace-nowrap">
				{`Смена №${shiftNumber}:`}
			</span>

			<span
				className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
					isShiftOpen
						? "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]"
						: "bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] border border-[var(--danger,rgba(239,68,68,0.2))]"
				}`}
			>
				{isShiftOpen ? "Открыта" : "Закрыта"}
			</span>

			<span className="text-[var(--muted)] hidden 2xl:inline whitespace-nowrap shrink-0">
				Кассир: <strong className="text-[var(--ink)] font-semibold">{cashierName}</strong>
			</span>

			<span className="text-[var(--muted)] hidden sm:inline">•</span>

			<span className="font-mono font-bold text-[var(--ink)] whitespace-nowrap shrink-0 min-w-max">
				Выручка: {formatMoneyRu(totalTurnoverRub)}
			</span>

			{pendingOfflineCount > 0 && (
				<button
					type="button"
					onClick={onOpenOfflineBatchModal}
					className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning-fg,#b45309)] dark:text-[var(--warning,#fbbf24)] border border-[var(--warning,rgba(245,158,11,0.3))] flex items-center gap-1 shrink-0 cursor-pointer animate-pulse hover:opacity-90 transition-colors"
					title="В офлайн-очереди есть чеки"
				>
					<Layers size={12} />
					<span>Очередь: {pendingOfflineCount}</span>
				</button>
			)}
		</div>
	);
};
