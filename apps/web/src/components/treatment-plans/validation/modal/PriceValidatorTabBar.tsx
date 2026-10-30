import React from "react";
import { Award } from "lucide-react";

export type PriceValidatorActiveTab = "prices" | "star_protocols" | "summary";

interface PriceValidatorTabBarProps {
	readonly activeTab: PriceValidatorActiveTab;
	readonly onTabChange: (tab: PriceValidatorActiveTab) => void;
	readonly starChecksCount: number;
}

export const PriceValidatorTabBar: React.FC<PriceValidatorTabBarProps> = ({
	activeTab,
	onTabChange,
	starChecksCount,
}) => {
	return (
		<div className="flex items-center justify-between px-6 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => onTabChange("prices")}
					className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
						activeTab === "prices"
							? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Сверка цен и прайс-листа
				</button>
				<button
					type="button"
					onClick={() => onTabChange("star_protocols")}
					className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer inline-flex items-center justify-center ${
						activeTab === "star_protocols"
							? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					<Award size={14} />
					<span>Стандарты и прейскурант</span>
					<span className="px-1.5 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] text-[10px] font-mono">
						{starChecksCount}
					</span>
				</button>
				<button
					type="button"
					onClick={() => onTabChange("summary")}
					className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
						activeTab === "summary"
							? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Экспертное заключение
				</button>
			</div>

			<div className="text-xs text-[var(--muted)] font-mono">
				Код в прейскуранте
			</div>
		</div>
	);
};
