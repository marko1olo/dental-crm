/**
 * apps/web/src/components/perio/PerioChartModal.tsx
 *
 * Dedicated Periodontal Examination Modal & Mobile Bottom Sheet Drawer (Apple HIG & Пародонтологическая карта приёма).
 * SSOT wrapper delegating to PeriodontogramChart.
 * 0-Modal Blocking, 0px Horizontal Scroll, 48px Touch Targets, Dark Mode AAA WCAG.
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import React from "react";
import { PeriodontogramChart } from "./PeriodontogramChart";
import "./perioChart.css";

export interface PerioChartModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onSave?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly visitId?: string | undefined;
}

export const PerioChartModal: React.FC<PerioChartModalProps> = React.memo(({
	isOpen,
	onClose,
	patientId,
	patientName,
	organizationId,
	doctorId,
	doctorName,
	initialTeeth,
	onSave,
	onInsertToProtocol,
	readOnly = false,
	visitId,
}) => {
	if (!isOpen) return null;

	return (
		<PeriodontogramChart
			isModal={true}
			isOpen={isOpen}
			onClose={onClose}
			patientId={patientId}
			patientName={patientName}
			organizationId={organizationId}
			doctorId={doctorId}
			doctorName={doctorName}
			initialTeeth={initialTeeth}
			onChange={onSave}
			onSave={onSave}
			onInsertToProtocol={onInsertToProtocol}
			readOnly={readOnly}
			visitId={visitId}
		/>
	);
});

PerioChartModal.displayName = "PerioChartModal";
export default PerioChartModal;
