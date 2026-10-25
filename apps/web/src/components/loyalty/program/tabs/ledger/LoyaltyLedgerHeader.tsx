import type React from "react";
import { Download, Search, X } from "lucide-react";

export interface LoyaltyLedgerHeaderProps {
	readonly ledgerSearch: string;
	readonly onLedgerSearchChange: (search: string) => void;
	readonly onExportLedger: () => void;
}

export const LoyaltyLedgerHeader: React.FC<LoyaltyLedgerHeaderProps> = ({
	ledgerSearch,
	onLedgerSearchChange,
	onExportLedger,
}) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "1rem",
				flexWrap: "wrap",
				gap: "0.75rem",
			}}
		>
			<div className="dente-search-wrap w-64">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					placeholder="Поиск по операциям..."
					value={ledgerSearch}
					onChange={(e) => onLedgerSearchChange(e.target.value)}
					className="dente-search-input"
					aria-label="Поиск по операциям программы лояльности"
				/>
				{ledgerSearch && (
					<button
						type="button"
						className="dente-search-clear"
						onClick={() => onLedgerSearchChange("")}
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={onExportLedger}
				className="primary-button h-[32px] min-h-[32px] text-xs font-semibold px-3 rounded-lg inline-flex items-center gap-1.5"
			>
				<Download size={14} />
				Экспорт CSV (RFC 4180 / UTF-8 BOM)
			</button>
		</div>
	);
};
