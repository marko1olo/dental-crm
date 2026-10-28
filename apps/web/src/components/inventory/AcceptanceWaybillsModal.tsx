/**
 * ACCEPTANCE WAYBILLS MODAL (МАНДАТЫ 8e, 8k, 8n, 8s)
 * Канонический реэкспорт SSOT InboundWaybillModal.
 */

import React from "react";
import { InboundWaybillModal, type InboundWaybillModalProps } from "./InboundWaybillModal.js";

export type AcceptanceWaybillsModalProps = InboundWaybillModalProps & {
	readonly initialWaybill?: any;
};

export const AcceptanceWaybillsModal: React.FC<AcceptanceWaybillsModalProps> = (props) => {
	return <InboundWaybillModal {...props} />;
};

export default AcceptanceWaybillsModal;
