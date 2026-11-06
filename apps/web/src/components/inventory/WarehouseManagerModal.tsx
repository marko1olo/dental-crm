/**
 * WarehouseManagerModal.tsx — Канонический фасад-шлюз на WarehouseStudioModal (SSOT).
 * Мандаты: 8e (Автономия врача), 8n (Соло-практика), 8am (Единый Primary CTA), 8an.
 * Устранено раздвоение модалок склада: делегирует управление в WarehouseStudioModal.
 * Захардкоженные имена устранены: подключена динамическая гидратация из useAppStore.
 */

import React from "react";
import { WarehouseStudioModal } from "./WarehouseStudioModal.js";
import { useAppStore } from "../../store/appStore.js";
import {
	type WarehouseManagerModalProps,
	type WarehouseWriteoffItem,
	CANONICAL_WAREHOUSE_PRESETS,
	DEFAULT_WAREHOUSE_ITEMS,
} from "./warehouseManagerModules/index.js";

export type { WarehouseWriteoffItem, WarehouseManagerModalProps };
export { CANONICAL_WAREHOUSE_PRESETS, DEFAULT_WAREHOUSE_ITEMS };

export const WarehouseManagerModal: React.FC<WarehouseManagerModalProps> = (props) => {
	const storeDoctorName = useAppStore((s) => s.activeDoctorName);
	const doctorName = props.doctorName || storeDoctorName || "Дежурный врач-стоматолог";
	const nurseName = props.nurseName || "Дежурный администратор";
	const cabinetName = props.cabinetName || "Кабинет №1 (Терапия/Хирургия)";

	return (
		<WarehouseStudioModal
			isOpen={props.isOpen}
			onClose={props.onClose}
			organizationId={props.organizationId || "org-main-01"}
			onConfirmWriteoff={props.onConfirmWriteoff}
			onOpenInventoryAudit={props.onOpenInventoryAudit}
			initialItems={props.initialItems}
			doctorName={doctorName}
			nurseName={nurseName}
			cabinetName={cabinetName}
		/>
	);
};

export default WarehouseManagerModal;
