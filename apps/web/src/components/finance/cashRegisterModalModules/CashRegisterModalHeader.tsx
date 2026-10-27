import { ShieldCheck, X } from "lucide-react";
import type React from "react";

export interface CashRegisterModalHeaderProps {
	readonly isShiftActive: boolean;
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly kktRegNumber: string;
	readonly ofdName: string;
	readonly activeTab: "reconciliation" | "drawer" | "tape";
	readonly setActiveTab: (tab: "reconciliation" | "drawer" | "tape") => void;
	readonly onClose: () => void;
}

export const CashRegisterModalHeader: React.FC<
	CashRegisterModalHeaderProps
> = ({
	isShiftActive,
	shiftNumber,
	cashierFullName,
	kktRegNumber,
	ofdName,
	activeTab,
	setActiveTab,
	onClose,
}) => (
	<div className="relative p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
		<div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)]" aria-hidden="true" />
		<div className="flex items-center gap-3">
			<div
				className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isShiftActive ? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
			>
				<ShieldCheck size={22} />
			</div>
			<div>
				<h2
					id="cash-register-modal-title"
					className="text-base sm:text-lg font-black text-[var(--ink)] flex items-center gap-2 m-0 flex-wrap"
				>
					<span>Кассовая смена</span>
					<span
						className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${isShiftActive ? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal-strong,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border-[var(--teal,#0d9488)]/30" : "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"}`}
					>
						{isShiftActive ? `Смена №${shiftNumber} активна` : "Смена закрыта"}
					</span>
				</h2>
				<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
					Кассир:{" "}
					<strong className="text-[var(--ink)]">{cashierFullName}</strong> •
					Касса: {kktRegNumber} • ОФД: {ofdName}
				</p>
			</div>
		</div>

		<div className="flex items-center gap-2">
			{isShiftActive && (
				<div className="hidden sm:flex bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)]">
					<button
						type="button"
						onClick={() => setActiveTab("reconciliation")}
						className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "reconciliation" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"}`}
						data-testid="tab-reconciliation"
					>
						Сверка итогов
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("drawer")}
						className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "drawer" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"}`}
						data-testid="tab-drawer"
					>
						Кассовый ящик
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("tape")}
						className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "tape" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"}`}
						data-testid="tab-tape"
					>
						Чековая лента
					</button>
				</div>
			)}
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer"
				aria-label="Закрыть модальное окно"
				data-testid="btn-close-cash-register-modal"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	</div>
);
