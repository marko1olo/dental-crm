/**
 * apps/web/src/components/inventory/InboundWaybillModal.tsx
 *
 * Канонический реэкспорт SSOT WarehouseInboundInvoiceModal (Мандаты 8b, 8e, 8n).
 */

import {
	WarehouseInboundInvoiceModal,
	type WarehouseInboundInvoiceModalProps,
	type InboundInvoiceItem,
} from "./WarehouseInboundInvoiceModal.js";

export type InboundWaybillModalProps = WarehouseInboundInvoiceModalProps;
export type InboundWaybillLineItem = InboundInvoiceItem;
export { WarehouseInboundInvoiceModal as InboundWaybillModal };
export default WarehouseInboundInvoiceModal;
