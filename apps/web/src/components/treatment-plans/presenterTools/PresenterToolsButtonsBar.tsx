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
				: "Скидка врача";

	return (
		<div className={embedded ? "flex items-center gap-1.5 flex-wrap no-print text-xs" : "flex items-center justify-between gap-2 px-3 sm:px-6 py-1.5 bg-[var(--tp-surface)] border-b border-[var(--tp-border)] no-print text-xs overflow-x-auto scrollbar-none"}>
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--tp-text-muted)] mr-1 hidden sm:inline">Инструменты врача:</span>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "copilot" ? null : "copilot"))}
					className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
						activeToolsPanel === "copilot"
							? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
					}`}
					data-testid="toggle-copilot-panel-btn"
					title="AI Copilot у кресла: готовые сценарии и оптимизация бюджета"
				>
					<Sparkles size={13} className={activeToolsPanel === "copilot" ? "text-amber-300" : "text-amber-500"} />
					<span>AI Copilot</span>
					<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "copilot" ? "rotate-180" : ""}`} />
				</button>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "bundles" ? null : "bundles"))}
					className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
						activeToolsPanel === "bundles"
							? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
					}`}
					data-testid="toggle-bundles-panel-btn"
					title="Готовые клинические пакеты услуг"
				>
					<Package size={13} />
					<span>Клинические пакеты</span>
					<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "bundles" ? "rotate-180" : ""}`} />
				</button>

				<button
					type="button"
					onClick={() => setActiveToolsPanel((prev) => (prev === "doctorDiscount" ? null : "doctorDiscount"))}
					className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
						activeToolsPanel === "doctorDiscount" || isDiscountActive
							? "bg-emerald-600 text-white border-emerald-600"
							: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
					}`}
					data-testid="toggle-discount-panel-btn"
					title="Скидка врача (% или ₽ на этапы, гарантийные переделки и персонал)"
				>
					<Percent size={13} />
					<span>{discountLabel}</span>
					<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "doctorDiscount" ? "rotate-180" : ""}`} />
				</button>
			</div>

			<div className="flex items-center gap-2">
				{doctorDiscountPercent === 100 && (
					<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
						100% гарантия / персонал
					</span>
				)}
			</div>
		</div>
	);
};
