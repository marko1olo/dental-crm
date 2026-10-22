import React from "react";
import { SterilizerCycleLogsGridView } from "./SterilizerCycleLogsGridView.js";
import { SterilizerRegimeBanner } from "./SterilizerRegimeBanner.js";
import type { SterilizerDeviceClass, SterilizationDeviceType } from "./types.js";
import { useSterilizerCycleLogs } from "./useSterilizerCycleLogs.js";

export interface SterilizerCycleLogsTableProps {
	equipmentId?: string | null;
	equipmentName: string;
	deviceClass: SterilizerDeviceClass;
	deviceType: SterilizationDeviceType;
	onCycleLogged?: () => void;
}

export function SterilizerCycleLogsTable({
	equipmentId,
	equipmentName,
	deviceClass,
	deviceType,
	onCycleLogged,
}: SterilizerCycleLogsTableProps) {
	const { logs, loggingCycle, handleQuickLogCycle } = useSterilizerCycleLogs(
		equipmentId,
		equipmentName,
		onCycleLogged,
	);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			<SterilizerRegimeBanner
				loggingCycle={loggingCycle}
				onQuickLogCycle={handleQuickLogCycle}
			/>

			<SterilizerCycleLogsGridView logs={logs} />
		</div>
	);
}
