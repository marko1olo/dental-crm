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
		<header className="pricelist-modal-header">
			<div className="pricelist-header-left">
				<div className="pricelist-header-icon">
					<Layers size={22} />
				</div>
				<div>
					<div className="pricelist-header-title">
						Прейскурант услуг
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
						{totalCount} позиций · Каталог процедур клиники · НДС 0%
					</div>
				</div>
				<div className="pricelist-statutory-badge">
					<ShieldCheck size={14} />
					<span>Каталог</span>
				</div>
			</div>

			<PricelistManagerHeaderActions {...actions} />
		</header>
	);
};
