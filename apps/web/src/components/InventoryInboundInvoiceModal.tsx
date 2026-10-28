/**
 * apps/web/src/components/InventoryInboundInvoiceModal.tsx
 * Корневой фасад модального окна приходной накладной (Мандат 8b: <= 15 строк).
 */

export {
	WarehouseInboundInvoiceModal as InventoryInboundInvoiceModal,
	default,
} from "./inventory/WarehouseInboundInvoiceModal.js";
export type {
	WarehouseInboundInvoiceModalProps as InventoryInboundInvoiceModalProps,
	InboundInvoiceItem as InboundInvoiceItemLine,
} from "./inventory/WarehouseInboundInvoiceModal.js";
