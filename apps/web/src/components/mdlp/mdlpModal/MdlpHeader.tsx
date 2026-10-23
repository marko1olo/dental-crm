import type React from "react";
import type { ChestnyZnakScanSummary } from "@dental/shared";
import type { MdlpOfflinePackage } from "../mdlpOfflineQueue.js";
import { EMERGENCY_DISPENSE_PRESETS } from "../mdlpPresetsData.js";
import type { CrptServerStatus, MdlpScanMode } from "./types.js";
import { MdlpHeaderTitle } from "./MdlpHeaderTitle.js";
import { MdlpModeTabs } from "./MdlpModeTabs.js";
import { MdlpNurseRulesBanner } from "./MdlpNurseRulesBanner.js";
import { MdlpCrptStatusStrip } from "./MdlpCrptStatusStrip.js";
import { MdlpEmergencyDrawer } from "./MdlpEmergencyDrawer.js";
import { MdlpOfflineDrawer } from "./MdlpOfflineDrawer.js";
import { MdlpMetricsStrip } from "./MdlpMetricsStrip.js";

export interface MdlpHeaderProps {
	readonly clinicName: string;
	readonly mode: MdlpScanMode;
	readonly crptStatus: CrptServerStatus;
	readonly offlineQueue: readonly MdlpOfflinePackage[];
	readonly showOfflineDrawer: boolean;
	readonly showEmergencyScannerBypass: boolean;
	readonly summary: ChestnyZnakScanSummary;
	readonly onClose: () => void;
	readonly onModeSwitch: (mode: MdlpScanMode) => void;
	readonly onQuickShiftCarpulesDisposal: () => void;
	readonly onDeferredDisposal: () => void;
	readonly onToggleOfflineDrawer: () => void;
	readonly onToggleEmergencyScannerBypass: () => void;
	readonly onEmergencyDispense: (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => void;
	readonly onSyncOfflineQueue: () => void;
}

export const MdlpHeader: React.FC<MdlpHeaderProps> = ({
	clinicName,
	mode,
	crptStatus,
	offlineQueue,
	showOfflineDrawer,
	showEmergencyScannerBypass,
	summary,
	onClose,
	onModeSwitch,
	onQuickShiftCarpulesDisposal,
	onDeferredDisposal,
	onToggleOfflineDrawer,
	onToggleEmergencyScannerBypass,
	onEmergencyDispense,
	onSyncOfflineQueue,
}) => {
	return (
		<>
			<MdlpHeaderTitle clinicName={clinicName} onClose={onClose} />
			<MdlpModeTabs mode={mode} onModeSwitch={onModeSwitch} />
			<MdlpNurseRulesBanner
				onQuickShiftCarpulesDisposal={onQuickShiftCarpulesDisposal}
				onDeferredDisposal={onDeferredDisposal}
			/>
			<MdlpCrptStatusStrip
				crptStatus={crptStatus}
				offlineQueue={offlineQueue}
				showEmergencyScannerBypass={showEmergencyScannerBypass}
				onToggleOfflineDrawer={onToggleOfflineDrawer}
				onToggleEmergencyScannerBypass={onToggleEmergencyScannerBypass}
			/>
			<MdlpEmergencyDrawer
				show={showEmergencyScannerBypass}
				onEmergencyDispense={onEmergencyDispense}
			/>
			<MdlpOfflineDrawer
				show={showOfflineDrawer}
				offlineQueue={offlineQueue}
				onToggle={onToggleOfflineDrawer}
				onSyncOfflineQueue={onSyncOfflineQueue}
			/>
			<MdlpMetricsStrip summary={summary} />
		</>
	);
};
