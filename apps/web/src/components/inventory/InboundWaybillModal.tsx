/**
 * INBOUND WAYBILL MODAL (SSOT ПРИХОДНАЯ НАКЛАДНАЯ)
 * Канонический SSOT фасад (Мандаты 8b, 8e, 8n).
 * Делегирует в AcceptanceWaybillsModal, устраняя дублирование и рассинхрон модалок.
 */

import type React from "react";
import { AcceptanceWaybillsModal } from "./AcceptanceWaybillsModal.js";
import type { InboundWaybillLine, InboundWaybillModalProps } from "./inboundWaybill/inboundWaybillTypes.js";

export type { InboundWaybillLine, InboundWaybillModalProps };

export const InboundWaybillModal: React.FC<InboundWaybillModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	inventoryItems = [],
	onWaybillPosted,
	onInvoicePosted,
	getHeaders,
}) => {
	return (
		<AcceptanceWaybillsModal
			isOpen={isOpen}
			onClose={onClose}
			organizationId={organizationId}
			inventoryItems={inventoryItems}
			onWaybillPosted={async (doc) => {
				if (onWaybillPosted) await onWaybillPosted();
				if (onInvoicePosted) await onInvoicePosted();
			}}
			getHeaders={getHeaders}
		/>
	);
};

export default InboundWaybillModal;