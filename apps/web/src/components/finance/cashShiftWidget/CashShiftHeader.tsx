import React from "react";
import { Layers, Lock, Unlock } from "lucide-react";

interface CashShiftHeaderProps {
	readonly isShiftOpen: boolean;
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly openedAt: string;
	readonly pendingOfflineCount: number;
	readonly totalTurnoverRub: number;
	readonly isProcessing: boolean;
	readonly onToggleShift: () => void;
}

export function CashShiftHeader({
	isShiftOpen,
	shiftNumber,
	cashierName,
	openedAt,
	pendingOfflineCount,
	totalTurnoverRub,
	isProcessing,
	onToggleShift,
}: CashShiftHeaderProps) {
	return (
		<div className="cash-shift-header">
			<div className="flex items-center gap-3">
				<div className={`cash-shift-status-icon ${isShiftOpen ? "cash-shift-status-open" : "cash-shift-status-closed"}`}>
					{isShiftOpen ? <Unlock className="text-[var(--ok,#10b981)]" size={24} /> : <Lock className="text-[var(--danger,#ef4444)]" size={24} />}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink,#0f172a)]">
							Кассовая смена №{shiftNumber}
						</h3>
						<span
							className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
								isShiftOpen
									? "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]"
									: "bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] border border-[var(--danger,rgba(239,68,68,0.2))]"
							}`}
						>
							{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
						</span>
						{pendingOfflineCount > 0 && (
							<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning-fg,#b45309)] dark:text-[var(--warning,#fbbf24)] border border-[var(--warning,rgba(245,158,11,0.3))] animate-pulse flex items-center gap-1">
								<Layers size={12} />
								Очередь: {pendingOfflineCount}
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2 mt-0.5">
						<span>
							Кассир: <strong className="text-[var(--ink,#0f172a)]">{cashierName}</strong>
						</span>
						{isShiftOpen && (
							<>
								<span>·</span>
								<span className="flex items-center gap-1">Открыта с {openedAt}</span>
							</>
						)}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleShift}
					aria-busy={isProcessing}
					className={`cash-shift-btn min-h-[48px] px-5 text-sm font-bold shadow-md cursor-pointer ${
						isShiftOpen ? "cash-shift-btn-open" : "cash-shift-btn-closed"
					}`}
					data-testid="cash-shift-toggle-btn"
				>
					{isShiftOpen ? (
						<>
							<Lock size={16} />
							<span>Сформировать Z-отчет и закрыть смену</span>
						</>
					) : (
						<>
							<Unlock size={16} />
							<span>{shiftNumber === 1 && totalTurnoverRub === 0 ? "+ Открыть первую смену" : "Открыть смену"}</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
}
