import { Layers, X } from "lucide-react";
import React from "react";
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
	const { totalCount, onClose, ...actions } = props;

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
				<button
					type="button"
					className="pricelist-btn pricelist-btn-icon pricelist-close-btn-mobile"
					onClick={onClose}
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>

			<PricelistManagerHeaderActions {...actions} onClose={onClose} />
		</header>
	);
};
