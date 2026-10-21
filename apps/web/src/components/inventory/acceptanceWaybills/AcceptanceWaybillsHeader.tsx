import { FileDown, Sparkles, X } from "lucide-react";
import type React from "react";
import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsEngine.js";
import { AcceptanceWaybillsMetaBar } from "./AcceptanceWaybillsMetaBar.js";

export interface AcceptanceWaybillsHeaderProps {
	readonly waybill: AcceptanceWaybillDocument;
	readonly setWaybill: React.Dispatch<React.SetStateAction<AcceptanceWaybillDocument>>;
	readonly selectedSupplierId: string;
	readonly onSupplierChange: (id: string) => void;
	readonly onLoadSample: () => void;
	readonly onClose: () => void;
}

export const AcceptanceWaybillsHeader: React.FC<AcceptanceWaybillsHeaderProps> = ({
	waybill,
	setWaybill,
	selectedSupplierId,
	onSupplierChange,
	onLoadSample,
	onClose,
}) => {
	return (
		<>
			<header className="acceptance-modal-header">
				<div className="acceptance-modal-title">
					<FileDown size={20} style={{ color: "var(--teal, #0d9488)" }} />
					<span>Приходная накладная поставщика</span>
					<span
						style={{
							fontSize: 11,
							padding: "2px 8px",
							borderRadius: 12,
							background: "rgba(13, 148, 136, 0.12)",
							color: "var(--teal, #0d9488)",
							fontWeight: 700,
						}}
					>
						FEFO контроль
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<button
						type="button"
						onClick={onLoadSample}
						className="acceptance-btn-secondary"
						style={{ height: 32, fontSize: 12 }}
						title="Загрузить образцовую накладную от Стомторга со стандартным набором материалов"
						data-testid="btn-load-sample-waybill"
					>
						<Sparkles size={14} style={{ color: "var(--teal, #0d9488)" }} />
						<span>Образец (Стомторг)</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="acceptance-btn-danger"
						title="Закрыть окно"
						data-testid="btn-close-acceptance-modal"
					>
						<X size={18} />
					</button>
				</div>
			</header>

			<AcceptanceWaybillsMetaBar
				waybill={waybill}
				setWaybill={setWaybill}
				selectedSupplierId={selectedSupplierId}
				onSupplierChange={onSupplierChange}
			/>
		</>
	);
};

export default AcceptanceWaybillsHeader;
