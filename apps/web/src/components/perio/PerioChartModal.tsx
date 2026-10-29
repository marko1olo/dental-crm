/**
 * PerioChartModal.tsx — Канонический модальный фасад пародонтологии DENTE CRM
 * Делегирует в SSOT PerioWorkspaceModal (Мандаты 8e, 8am).
 */

import React from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import { PerioWorkspaceModal } from "./PerioWorkspaceModal";

export interface PerioChartModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly visitId?: string | undefined;
}

export const PerioChartModal: React.FC<PerioChartModalProps> = React.memo((props) => {
	if (!props.isOpen) return null;
	return <PerioWorkspaceModal {...props} isModal={true} />;
});

PerioChartModal.displayName = "PerioChartModal";
export default PerioChartModal;
