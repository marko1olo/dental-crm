import React, { useState, useEffect } from "react";
import { chairsideMemoryShield, type MemoryShieldMetrics } from "../../../services/storage/chairsideMemoryShield.js";
import { LanQrConnectionModal } from "../../network/LanQrConnectionModal.js";
import { CockpitVramBadge } from "./cockpit/CockpitVramBadge.js";
import { CockpitActionButtons } from "./cockpit/CockpitActionButtons.js";
import { CockpitFeedbackRow } from "./cockpit/CockpitFeedbackRow.js";
import { useCockpitActions } from "./cockpit/useCockpitActions.js";

interface Props {
	onTestHotFolder?: () => void;
	hotFolderStatus?: string;
}

export function HardwareCockpitBar({ onTestHotFolder, hotFolderStatus }: Props) {
	const [metrics, setMetrics] = useState<MemoryShieldMetrics>(() => chairsideMemoryShield.getMetrics());

	useEffect(() => {
		chairsideMemoryShield.initialize();
		return chairsideMemoryShield.subscribe(setMetrics);
	}, []);

	const actions = useCockpitActions({ onTestHotFolder, hotFolderStatus });

	return (
		<div
			className="hw-cockpit-bar"
			data-testid="hardware-cockpit-bar"
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "10px",
				padding: "10px 14px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
				fontSize: "12px",
			}}
		>
			<CockpitVramBadge metrics={metrics} />
			<CockpitActionButtons
				kktLoading={actions.kktLoading}
				hotFolderLoading={actions.hotFolderLoading}
				telephonyLoading={actions.telephonyLoading}
				testPrintLoading={actions.testPrintLoading}
				onTestKkt={actions.handleTestKkt}
				onTestHotFolder={actions.handleTestHotFolder}
				onTestTelephony={actions.handleTestTelephony}
				onTestPrint={actions.handleTestPrint}
				onOpenLanQr={() => actions.setIsLanQrOpen(true)}
				onPurgeMemory={actions.handlePurgeMemory}
			/>
			<CockpitFeedbackRow
				kktStatus={actions.kktStatus}
				hotFolderStatus={hotFolderStatus}
				telephonyStatus={actions.telephonyStatus}
			/>
			{actions.isLanQrOpen && (
				<LanQrConnectionModal isOpen={actions.isLanQrOpen} onClose={() => actions.setIsLanQrOpen(false)} />
			)}
		</div>
	);
}
