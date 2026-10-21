import { ArrowRight, ShieldCheck } from "lucide-react";
import type React from "react";

export interface FastCheckoutGuidanceRibbonProps {
	readonly isValid: boolean;
	readonly isSimpleCashierMode: boolean;
	readonly setIsSimpleCashierMode: React.Dispatch<
		React.SetStateAction<boolean>
	>;
}

export const FastCheckoutGuidanceRibbon: React.FC<
	FastCheckoutGuidanceRibbonProps
> = ({ isValid, isSimpleCashierMode, setIsSimpleCashierMode }) => (
	<div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-xs flex-wrap">
		<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 min-w-0">
			<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] shrink-0">
				1
			</span>
			<span className="truncate">Способ</span>
		</div>
		<ArrowRight size={12} className="text-[var(--muted,#64748b)] shrink-0" />
		<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 min-w-0">
			<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] shrink-0">
				2
			</span>
			<span className="truncate">Сумма</span>
		</div>
		<ArrowRight size={12} className="text-[var(--muted,#64748b)] shrink-0" />
		<div
			className={`flex items-center gap-1.5 font-bold min-w-0 ${isValid ? "text-emerald-700 dark:text-emerald-300" : "text-amber-600"}`}
		>
			<span
				className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${isValid ? "bg-emerald-600" : "bg-amber-500"} text-white text-[9px] shrink-0`}
			>
				3
			</span>
			<span className="truncate">Кассовый чек</span>
		</div>
		<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center min-w-0">
			<ShieldCheck
				size={13}
				className="inline mr-1 shrink-0 text-emerald-500"
			/>
			<span className="truncate">Для пациентов-физлиц ИНН не требуется</span>
		</span>
		<button
			type="button"
			onClick={() => setIsSimpleCashierMode((prev) => !prev)}
			className={`min-h-[44px] sm:min-h-[30px] sm:h-7.5 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ml-auto flex items-center gap-1.5 shrink-0 ${
				isSimpleCashierMode
					? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/30"
					: "bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-500"
			}`}
			title="Переключить крупный режим «Простая касса» для врача/кассира"
			data-testid="toggle-simple-cashier-btn"
		>
			<span>Простая касса</span>
			<span className="text-[10px] opacity-90 font-mono">
				[{isSimpleCashierMode ? "Крупно" : "Сплит"}]
			</span>
		</button>
	</div>
);
