import { Check, Download, FileCode, FileSpreadsheet, PackageCheck } from "lucide-react";
import type React from "react";
import type { WarehouseInventoryCommissionMember, WarehouseInventoryStatus } from "../warehouseInventoryEngine.js";

export interface WarehouseAuditFooterProps {
	readonly toastMessage: string | null;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly status: WarehouseInventoryStatus;
	readonly onExportCsv: () => void;
	readonly onExportInv19Csv: () => void;
	readonly onExport1C: () => void;
	readonly onSave: () => void;
	readonly onApply: () => void;
}

export const WarehouseAuditFooter: React.FC<WarehouseAuditFooterProps> = ({
	toastMessage,
	molFullName,
	molPosition,
	commission,
	status,
	onExportCsv,
	onExportInv19Csv,
	onExport1C,
	onSave,
	onApply,
}) => {
	return (
		<footer className="warehouse-inventory-footer">
			<div className="warehouse-inventory-footer-left">
				{toastMessage ? (
					<div style={{ color: "var(--info-fg, #2563eb)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
						<Check size={16} />
						<span>{toastMessage}</span>
					</div>
				) : (
					<span>
						Ответственный сотрудник: <b>{molFullName}</b> ({molPosition}) • {commission.length === 1 ? "Комиссия: Единолично (Соло-врач)" : `Комиссия: ${commission.length} чел.`} • Статус: <b>{status}</b>
					</span>
				)}
			</div>

			<div className="warehouse-inventory-footer-right">
				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={onExportCsv}
					title="Выгрузить полную опись в CSV (UTF-8 BOM)"
				>
					<Download size={14} />
					<span>CSV (Опись)</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={onExportInv19Csv}
					title="Выгрузить сличительную ведомость расхождений в CSV"
				>
					<FileSpreadsheet size={14} />
					<span>CSV (Расхождения)</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={onExport1C}
					title="Выгрузить документ инвентаризации в формате CommerceML XML"
				>
					<FileCode size={14} />
					<span>CommerceML XML</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={onSave}
					title="Сохранить черновик описи"
				>
					<Check size={14} />
					<span>Сохранить</span>
				</button>

				<button
					type="button"
					className="warehouse-btn warehouse-btn-primary"
					onClick={onApply}
					title="Утвердить результаты и провести инвентаризацию"
				>
					<PackageCheck size={14} />
					<span>Провести инвентаризацию</span>
				</button>
			</div>
		</footer>
	);
};

export default WarehouseAuditFooter;
