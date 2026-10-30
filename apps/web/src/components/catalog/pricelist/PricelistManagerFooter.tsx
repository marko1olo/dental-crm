import { ShieldCheck } from "lucide-react";
import React from "react";
import { STATUTORY_VAT_EXEMPTION_NOTE } from "./servicePricelistPresets";

export interface PricelistManagerFooterProps {
	readonly visibleCount: number;
	readonly filteredTotalCount: number;
	readonly totalCatalogCount: number;
	readonly selectedCount: number;
}

export const PricelistManagerFooter: React.FC<PricelistManagerFooterProps> = ({
	visibleCount,
	filteredTotalCount,
	totalCatalogCount,
	selectedCount,
}) => {
	return (
		<footer
			className="pricelist-footer-bar"
			style={{ padding: "0.625rem 1.25rem" }}
		>
			<div
				className="pricelist-footer-legal"
				style={{ display: "flex", alignItems: "center", gap: "6px" }}
			>
				<ShieldCheck size={16} className="pricelist-legal-icon" />
				<span style={{ fontSize: "0.75rem" }}>
					Официальный справочник услуг клиники · Без НДС
				</span>
			</div>

			<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
				Отображено {visibleCount} из {filteredTotalCount} позиций
				{filteredTotalCount !== totalCatalogCount &&
					` (всего в каталоге: ${totalCatalogCount})`}
				{selectedCount > 0 && ` · Выбрано ${selectedCount}`}
			</div>
		</footer>
	);
};
