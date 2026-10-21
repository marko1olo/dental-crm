import { Boxes, FileSpreadsheet, Printer, X } from "lucide-react";
import type React from "react";
import { generateInv19Html, generateInv3Html, type WarehouseInventoryAuditDocument, type WarehouseInventoryStatus } from "../warehouseInventoryEngine.js";

export interface WarehouseAuditModalHeaderProps {
	readonly docNumber: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly warehouseNameRu: string;
	readonly status: WarehouseInventoryStatus;
	readonly currentDocument: WarehouseInventoryAuditDocument;
	readonly onPrintDocument: (html: string) => void;
	readonly onClose: () => void;
}

export const WarehouseAuditModalHeader: React.FC<WarehouseAuditModalHeaderProps> = ({
	docNumber,
	orderNumber,
	orderDate,
	warehouseNameRu,
	status,
	currentDocument,
	onPrintDocument,
	onClose,
}) => {
	return (
		<header className="warehouse-inventory-header">
			<div className="warehouse-inventory-title-group">
				<div className="warehouse-inventory-icon-box">
					<Boxes size={20} />
				</div>
				<div className="min-w-0">
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<h2 className="warehouse-inventory-title truncate">Складская инвентаризация и контроль сроков</h2>
						<span
							style={{
								fontSize: "0.75rem",
								fontWeight: 700,
								padding: "2px 8px",
								borderRadius: 4,
								background: status === "applied" ? "var(--ok-bg, #ecfdf5)" : "var(--info-bg, #eff6ff)",
								color: status === "applied" ? "var(--ok-fg, #047857)" : "var(--info-fg, #1d4ed8)",
								border: `1px solid ${status === "applied" ? "var(--ok-border, #a7f3d0)" : "var(--info-border, #bfdbfe)"}`,
								flexShrink: 0,
							}}
						>
							{status === "applied"
								? "Проведена"
								: status === "approved"
									? "Утверждена"
									: status === "reconciliation"
										? "Сверка расхождений"
										: "Черновик"}
						</span>
					</div>
					<p className="warehouse-inventory-subtitle truncate">
						Опись № {docNumber} • Приказ № {orderNumber} от {orderDate} • {warehouseNameRu}
					</p>
				</div>
			</div>

			<div className="warehouse-inventory-header-actions">
				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={() => onPrintDocument(generateInv3Html(currentDocument))}
					title="Печать инвентаризационной описи"
				>
					<Printer size={14} />
					<span>Инвентаризационная опись</span>
					<span className="text-[10px] opacity-60 ml-1 font-mono">Опись</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={() => onPrintDocument(generateInv19Html(currentDocument))}
					title="Печать сличительной ведомости остатков"
				>
					<FileSpreadsheet size={14} />
					<span>Сличительная ведомость</span>
					<span className="text-[10px] opacity-60 ml-1 font-mono">Сличительная</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-ghost"
					onClick={onClose}
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>
		</header>
	);
};

export default WarehouseAuditModalHeader;
