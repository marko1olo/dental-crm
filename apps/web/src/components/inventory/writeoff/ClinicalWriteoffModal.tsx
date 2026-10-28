/**
 * apps/web/src/components/inventory/writeoff/ClinicalWriteoffModal.tsx
 *
 * Канонический реэкспорт SSOT ConsumablesBatchWriteoffModal (Мандаты 8b, 8e, 8n).
 */

import React from "react";
import {
	ConsumablesBatchWriteoffModal,
	type ConsumablesBatchWriteoffModalProps,
} from "../ConsumablesBatchWriteoffModal.js";

export type ClinicalWriteoffModalProps = ConsumablesBatchWriteoffModalProps;

export const DEFAULT_CLINICAL_SERVICES = [
	{ id: "srv-01", serviceCode: "A16.07.002", serviceName: "Лечение кариеса", toothNumber: "16" },
	{ id: "srv-02", serviceCode: "B01.003.004", serviceName: "Местная анестезия", toothNumber: "16" },
];

export const ClinicalWriteoffModal: React.FC<ClinicalWriteoffModalProps> = (props) => {
	return <ConsumablesBatchWriteoffModal {...props} />;
};

export default ClinicalWriteoffModal;
