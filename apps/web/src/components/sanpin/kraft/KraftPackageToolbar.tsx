import { Download } from "lucide-react";
import React from "react";
import type { KraftPackageStatus } from "./kraftPackageEngine.js";

export interface KraftPackageToolbarProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly statusFilter: KraftPackageStatus | "all";
	readonly onStatusFilterChange: (status: KraftPackageStatus | "all") => void;
	readonly onExportCsv: () => void;
}

export const KraftPackageToolbar: React.FC<KraftPackageToolbarProps> = ({
	searchQuery,
	onSearchQueryChange,
	statusFilter,
	onStatusFilterChange,
	onExportCsv,
}) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "0.75rem",
			}}
		>
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
				<input
					type="text"
					placeholder="Поиск по набору, штрихкоду, автоклаву..."
					value={searchQuery}
					onChange={(e) => onSearchQueryChange(e.target.value)}
					style={{
						minHeight: "44px",
						minWidth: "260px",
						padding: "0.5rem 0.75rem",
						borderRadius: "8px",
						border: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #fff)",
						color: "var(--ink, #0f172a)",
						fontSize: "0.85rem",
					}}
				/>
				<select
					value={statusFilter}
					onChange={(e) => onStatusFilterChange(e.target.value as KraftPackageStatus | "all")}
					style={{
						minHeight: "44px",
						padding: "0.5rem",
						borderRadius: "8px",
						border: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #fff)",
						color: "var(--ink, #0f172a)",
						fontSize: "0.85rem",
					}}
				>
					<option value="all">Все статусы</option>
					<option value="sterile_valid">Стерильно</option>
					<option value="expiring_soon_7d">Истекает (≤7 дн.)</option>
					<option value="expired">Просрочено</option>
					<option value="recalled">Отозвано / Нарушено</option>
				</select>
			</div>

			<div style={{ display: "flex", gap: "0.5rem" }}>
				<button
					type="button"
					onClick={onExportCsv}
					className="kraft-btn kraft-btn-secondary"
				>
					<Download size={16} /> Экспорт CSV
				</button>
			</div>
		</div>
	);
};
