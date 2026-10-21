import { CheckCheck, Search, X } from "lucide-react";
import type React from "react";
import type { PriceDiffStats } from "./itemTypes";

export interface PriceDiffSearchActionsProps {
	readonly searchTerm: string;
	readonly onSearchTermChange: (term: string) => void;
	readonly searchInputId: string;
	readonly stats: PriceDiffStats;
	readonly onAcceptAll: () => void;
	readonly onDeselectAll: () => void;
}

export const PriceDiffSearchActions: React.FC<PriceDiffSearchActionsProps> = ({
	searchTerm,
	onSearchTermChange,
	searchInputId,
	stats,
	onAcceptAll,
	onDeselectAll,
}) => {
	return (
		<div className="pricelist-diff-toolbar-right">
			<div className="dente-search-wrap pricelist-diff-search-box">
				<Search
					size={14}
					className="dente-search-icon pricelist-diff-search-icon"
				/>
				<input
					id={searchInputId}
					type="text"
					className="dente-search-input pricelist-diff-search-input"
					placeholder="Поиск..."
					value={searchTerm}
					onChange={(e) => onSearchTermChange(e.target.value)}
				/>
				{searchTerm && (
					<button
						type="button"
						className="dente-search-clear pricelist-diff-search-clear"
						onClick={() => onSearchTermChange("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<button
				type="button"
				className="pricelist-diff-btn pricelist-diff-btn-success"
				onClick={onAcceptAll}
				title="Принять все сопоставления в один клик"
			>
				<CheckCheck size={13} />
				<span>{`Принять всё (${stats.total})`}</span>
			</button>

			{stats.approvedCount > 0 && stats.approvedCount < stats.total && (
				<button
					type="button"
					className="pricelist-diff-btn"
					onClick={onDeselectAll}
					title="Снять отметки выбора"
				>
					<span>Снять выбор</span>
				</button>
			)}
		</div>
	);
};
