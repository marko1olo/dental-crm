import React from "react";
import { ChevronDown, Package, Percent, Sparkles } from "lucide-react";

export interface PresenterToolsButtonsBarProps {
	readonly activeToolsPanel: "copilot" | "bundles" | "doctorDiscount" | null;
	readonly setActiveToolsPanel: React.Dispatch<React.SetStateAction<"copilot" | "bundles" | "doctorDiscount" | null>>;
	readonly doctorDiscountPercent: number;
	readonly doctorDiscountRub: number;
	readonly doctorDiscountMode: "percent" | "fixed";
	readonly embedded?: boolean | undefined;
}

export const PresenterToolsButtonsBar: React.FC<PresenterToolsButtonsBarProps> = ({
	activeToolsPanel,
	setActiveToolsPanel,
	doctorDiscountPercent,
	doctorDiscountRub,
	doctorDiscountMode,
	embedded = false,
}) => {
	const isDiscountActive = (doctorDiscountMode === "fixed" && doctorDiscountRub > 0) || doctorDiscountPercent > 0;
	const discountLabel =
		doctorDiscountMode === "fixed" && doctorDiscountRub > 0
			? `Скидка: ${doctorDiscountRub.toLocaleString("ru-RU")} ₽`
			: doctorDiscountPercent > 0
				? `Скидка: ${doctorDiscountPercent}%`
				: "Скидка";

	return (
		<div className={embedded ? "flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none max-w-full no-print text-xs py-0.5 shrink-0" : "flex items-center justify-between gap-2 px-3 sm:px-6 py-1.5 bg-[var(--tp-surface)] border-b border-[var(--tp-border)] no-print text-xs overflow-x-auto scrollbar-none"}>
			<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none py-0.5 max-w-full shrink-0">
				<span className="text-[11px] font-bold text-[var(--tp-text-muted)] mr-1 hidden sm:inline shrink-0 whitespace-nowrap">Инструменты:</span>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "copilot" ? null : "copilot"))}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl text-xs sm:text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs shrink-0 whitespace-nowrap ${
						activeToolsPanel === "copilot"
							? "bg-[var(--teal)] text-[var(--paper-strong)] border-[var(--teal)]"
							: "bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal)] border-[var(--line)]"
					}`}
					data-testid="toggle-copilot-panel-btn"
					title="AI Copilot у кресла: готовые сценарии и оптимизация бюджета"
				>
					<Sparkles size={13} className={activeToolsPanel === "copilot" ? "text-amber-300 shrink-0" : "text-amber-500 shrink-0"} />
					<span className="shrink-0 whitespace-nowrap">AI Copilot</span>
					<ChevronDown size={12} className={`transition-transform duration-150 shrink-0 ${activeToolsPanel === "copilot" ? "rotate-180" : ""}`} />
				</button>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "bundles" ? null : "bundles"))}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl text-xs sm:text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs shrink-0 whitespace-nowrap ${
						activeToolsPanel === "bundles"
							? "bg-[var(--teal)] text-[var(--paper-strong)] border-[var(--teal)]"
							: "bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal)] border-[var(--line)]"
					}`}
					data-testid="toggle-bundles-panel-btn"
					title="Готовые клинические пакеты услуг"
				>
					<Package size={13} className="shrink-0" />
					<span className="shrink-0 whitespace-nowrap">Пакеты</span>
					<ChevronDown size={12} className={`transition-transform duration-150 shrink-0 ${activeToolsPanel === "bundles" ? "rotate-180" : ""}`} />
				</button>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "doctorDiscount" ? null : "doctorDiscount"))}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl text-xs sm:text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs shrink-0 whitespace-nowrap ${
						activeToolsPanel === "doctorDiscount" || isDiscountActive
							? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] border-[var(--teal)]"
							: "bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal)] border-[var(--line)]"
					}`}
					data-testid="toggle-discount-panel-btn"
					title="Скидка врача (% или ₽ на этапы, гарантийные переделки и персонал)"
				>
					<Percent size={13} className="shrink-0" />
					<span className="shrink-0 whitespace-nowrap">{discountLabel}</span>
					<ChevronDown size={12} className={`transition-transform duration-150 shrink-0 ${activeToolsPanel === "doctorDiscount" ? "rotate-180" : ""}`} />
				</button>
			</div>

			<div className="flex items-center gap-2">
				{doctorDiscountPercent === 100 && (
					<span className="text-[11px] font-bold text-[var(--teal-dark,var(--teal))]">
						100% гарантия / персонал
					</span>
				)}
			</div>
		</div>
	);
};
