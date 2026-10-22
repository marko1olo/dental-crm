import { FileText, Package, PackageCheck, QrCode, Truck, Warehouse } from "lucide-react";
import React from "react";

export interface InventoryOperationsDocsGroupProps {
	readonly onClose: () => void;
	readonly onOpenAcceptanceWaybills: () => void;
	readonly onOpenWarehouseManager: () => void;
	readonly onOpenMdlpScanning: () => void;
	readonly onOpenClinicalWriteoff: () => void;
	readonly onOpenWarehouseTransfer: () => void;
	readonly onOpenInventoryAudit: () => void;
	readonly onOpenMdlpDisposal: () => void;
}

export const InventoryOperationsDocsGroup: React.FC<InventoryOperationsDocsGroupProps> = ({
	onClose, onOpenAcceptanceWaybills, onOpenWarehouseManager, onOpenMdlpScanning,
	onOpenClinicalWriteoff, onOpenWarehouseTransfer, onOpenInventoryAudit, onOpenMdlpDisposal,
}) => {
	const handleAction = (action: () => void) => {
		action();
		onClose();
	};

	return (
		<>
			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-colors"
				data-testid="acceptance-waybills-trigger"
				onClick={() => handleAction(onOpenAcceptanceWaybills)}
				role="menuitem"
				title="Приходная накладная от поставщика (Стомторг, KaVo, ВладМиВа): партии по срокам годности и оприходование"
			>
				<FileText size={15} className="text-[var(--primary)] shrink-0" />
				<span>Оприходование накладной</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="warehouse-manager-trigger"
				onClick={() => handleAction(onOpenWarehouseManager)}
				role="menuitem"
				title="Управление складами и остатками: экспресс-пресеты, расход сверх остатка и списание"
			>
				<Warehouse size={15} className="text-[var(--primary)] shrink-0" />
				<span>Управление складами и остатками</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="mdlp-scanning-trigger"
				onClick={() => handleAction(onOpenMdlpScanning)}
				role="menuitem"
				title="Учет и списание маркированных медикаментов"
			>
				<QrCode size={15} className="text-[var(--primary)] shrink-0" />
				<span>Маркированные препараты</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="clinical-writeoff-trigger"
				onClick={() => handleAction(onOpenClinicalWriteoff)}
				role="menuitem"
				title="Клиническое списание расходников по нормам приёма и актам списания"
			>
				<PackageCheck size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списание по наряду</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="warehouse-transfer-trigger"
				onClick={() => handleAction(onOpenWarehouseTransfer)}
				role="menuitem"
				title="Межфилиальное перемещение материалов и препаратов"
			>
				<Truck size={15} className="text-[var(--primary)] shrink-0" />
				<span>Перемещение материалов</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="warehouse-inventory-audit-trigger"
				onClick={() => handleAction(onOpenInventoryAudit)}
				role="menuitem"
				title="Складская инвентаризация: опись остатков, сличительная ведомость и контроль сроков годности"
			>
				<PackageCheck size={15} className="text-[var(--primary)] shrink-0" />
				<span>Инвентаризация склада</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="mdlp-disposal-trigger"
				onClick={() => handleAction(onOpenMdlpDisposal)}
				role="menuitem"
				title="Списание и вывод из оборота маркированных лекарственных препаратов"
			>
				<Package size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списание маркированных препаратов</span>
			</button>
		</>
	);
};

export default InventoryOperationsDocsGroup;
