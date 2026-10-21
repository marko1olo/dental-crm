import { Layers, ShieldCheck } from "lucide-react";
import type React from "react";
import { PricelistManagerHeaderActions } from "./PricelistManagerHeaderActions";

export interface PricelistManagerHeaderProps {
	readonly totalCount: number;
	readonly onOpenAdd: () => void;
	readonly onPrintA4: () => void;
	readonly onPrintConsumerStand: () => void;
	readonly onExportCsv: () => void;
	readonly onOpenImport: () => void;
	readonly onSaveAndClose: () => void;
	readonly onClose: () => void;
}

export const PricelistManagerHeader: React.FC<PricelistManagerHeaderProps> = (
	props,
) => {
	const { totalCount, ...actions } = props;

	return (
		<header
			className="pricelist-modal-header"
			style={{ padding: "0.75rem 1.25rem", gap: "0.75rem" }}
		>
			<div
				className="pricelist-header-left"
				style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
			>
				<div
					className="pricelist-header-icon"
					style={{ width: "40px", height: "40px" }}
				>
					<Layers size={22} />
				</div>
				<div>
					<div
						className="pricelist-header-title"
						style={{ fontSize: "1.125rem", fontWeight: 700 }}
					>
						Прейскурант услуг
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
						{totalCount} позиций · Классификатор Минздрава РФ · НДС 0%
					</div>
				</div>
				<div
					className="pricelist-statutory-badge"
					style={{ height: "28px", padding: "0 8px" }}
				>
					<ShieldCheck size={14} />
					<span>Каталог</span>
				</div>
			</div>

			<PricelistManagerHeaderActions {...actions} />
		</header>
	);
};
