/**
 * PeriodontogramChart.tsx — Интерактивная пародонтологическая карта приёма (32 зуба, 192 точки). Mandate 8b <= 120 строк.
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import React, { useId, useState } from "react";
if (typeof document !== "undefined") {
	import("./perioChart.css");
}

// Transparent zero-downtime re-exports
export * from "./chart/PerioToothVisual";
export * from "./chart/PerioToothCard";
export * from "./chart/perioPresets";
export * from "./chart/usePerioChartLogic";
export * from "./chart/usePerioKeyboardProbing";
export * from "./chart/PerioToolbar";
export * from "./chart/PerioExpressBanner";
export * from "./chart/PerioSummaryBar";
export * from "./chart/PerioHelpDrawer";
export * from "./chart/PerioKeypadDrawer";
export * from "./chart/PerioArchGrid";
export * from "./chart/PerioToothInspector";
export * from "./chart/PerioDiagnosticsPanel";
export * from "./chart/PerioMobileTouchCockpit";
export * from "./chart/PeriodontogramModalView";
export * from "./chart/PeriodontogramWorkspaceBody";

import { PeriodontogramModalView } from "./chart/PeriodontogramModalView";
import { PeriodontogramWorkspaceBody } from "./chart/PeriodontogramWorkspaceBody";
import { usePerioChartLogic } from "./chart/usePerioChartLogic";

export interface PeriodontogramChartProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly isModal?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> = React.memo(
	({
		patientId,
		patientName,
		doctorName,
		visitId,
		initialTeeth,
		onChange,
		onSave,
		onInsertToProtocol,
		readOnly = false,
		initialTier3Expanded = false,
		initialProbeKeyboardEnabled = false,
		initialSelectedTooth = 16,
		isModal = false,
		isOpen = true,
		onClose,
	}) => {
		const chartContainerId = useId();
		const [viewModeOverride, setViewModeOverride] = useState<"auto" | "touch" | "desktop">("auto");

		const logic = usePerioChartLogic({
			initialTeeth,
			patientId,
			visitId,
			initialSelectedTooth,
			onChange,
			onSave,
			onInsertToProtocol,
			readOnly,
			initialTier3Expanded,
			initialProbeKeyboardEnabled,
			doctorName,
		});

		if (isOpen === false) return null;

		const body = (
			<PeriodontogramWorkspaceBody
				chartContainerId={chartContainerId}
				logic={logic}
				viewModeOverride={viewModeOverride}
				setViewModeOverride={setViewModeOverride}
				readOnly={readOnly}
			/>
		);

		if (isModal || (isOpen === true && isModal)) {
			return (
				<PeriodontogramModalView
					patientName={patientName}
					onClose={onClose}
					onSave={() => void logic.handleSaveDraft({ closeAfter: true })}
					syncStatus={logic.syncStatus}
				>
					{body}
				</PeriodontogramModalView>
			);
		}

		return body;
	},
);

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
