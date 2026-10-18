import React from "react";
import { Bot, DollarSign, Megaphone, Settings } from "lucide-react";

export interface MarketingAttributionHeaderProps {
	readonly activeSection: "attribution" | "romi" | "field_settings";
	readonly onSelectSection: (s: "attribution" | "romi" | "field_settings") => void;
}

export const MarketingAttributionHeader: React.FC<MarketingAttributionHeaderProps> = ({
	activeSection,
	onSelectSection,
}) => {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
			<div className="space-y-1">
				<div className="flex items-center gap-2.5">
					<div className="p-2.5 rounded-2xl bg-teal-500/10 text-[var(--teal)]">
						<Megaphone size={22} />
					</div>
					<div>
						<h2 className="text-lg font-black text-[var(--ink)] m-0 flex items-center gap-2">
							Сквозная аналитика маркетинга и каналов записи
						</h2>
						<p className="text-xs text-[var(--muted)] m-0">
							Раздельный учет самозаписи, окупаемость рекламы ROMI и обязательность полей карты
						</p>
					</div>
				</div>
			</div>

			<div className="dente-segmented-bar" role="tablist" aria-label="Сквозная аналитика маркетинга">
				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "attribution"}
					onClick={() => onSelectSection("attribution")}
					className={`dente-segmented-item ${activeSection === "attribution" ? "active" : ""}`}
					data-active={activeSection === "attribution"}
					data-testid="tab-online-vs-admin"
				>
					<Bot size={14} className="text-[var(--teal)]" />
					<span>Онлайн vs Администраторы</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "romi"}
					onClick={() => onSelectSection("romi")}
					className={`dente-segmented-item ${activeSection === "romi" ? "active" : ""}`}
					data-active={activeSection === "romi"}
					data-testid="tab-romi-table"
				>
					<DollarSign size={14} className="text-emerald-500" />
					<span>ROMI и Затраты</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "field_settings"}
					onClick={() => onSelectSection("field_settings")}
					className={`dente-segmented-item ${activeSection === "field_settings" ? "active" : ""}`}
					data-active={activeSection === "field_settings"}
					data-testid="tab-field-requirements"
				>
					<Settings size={14} className="text-indigo-500" />
					<span>Обязательность полей карты</span>
				</button>
			</div>
		</header>
	);
};
