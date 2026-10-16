import React from "react";
import { Search, X } from "lucide-react";

export interface PsoTableToolbarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly testFilter: string;
	readonly setTestFilter: (filter: string) => void;
}

export const PsoTableToolbar: React.FC<PsoTableToolbarProps> = ({
	searchQuery,
	setSearchQuery,
	testFilter,
	setTestFilter,
}) => {
	return (
		<div
			className="sanpin-table-toolbar min-w-0 flex-nowrap"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				padding: "0.4rem 0.75rem",
				background: "var(--paper-soft, #f8fafc)",
				borderBottom: "1px solid var(--line, #e2e8f0)",
			}}
		>
			<div className="dente-search-wrap min-w-0 shrink" style={{ flex: "1 1 200px", maxWidth: 360 }}>
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					placeholder="Поиск по инструментарию, моющему средству, сотруднику..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="dente-search-input !h-9"
				/>
				{searchQuery && (
					<button
						type="button"
						className="dente-search-clear"
						onClick={() => setSearchQuery("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
				<select
					value={testFilter}
					onChange={(e) => setTestFilter(e.target.value)}
					className="sanpin-select shrink-0"
					style={{ minHeight: "36px", height: "36px", fontSize: "0.825rem", padding: "0.35rem 0.75rem", borderRadius: "8px" }}
				>
					<option value="all">Все пробы партии</option>
					<option value="approved">Партия допущена (Проба отрицательная)</option>
					<option value="rejected">Брак / Повторная очистка</option>
				</select>
			</div>
		</div>
	);
};
