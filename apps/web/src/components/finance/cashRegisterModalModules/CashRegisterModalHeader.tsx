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
	<div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
		<div className="flex items-center gap-3">
			<div
				className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isShiftActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}
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
						className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${isShiftActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"}`}
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
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "reconciliation" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
						data-testid="tab-reconciliation"
					>
						Сверка итогов
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("drawer")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "drawer" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
						data-testid="tab-drawer"
					>
						Кассовый ящик
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("tape")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "tape" ? "bg-[var(--teal)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
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
