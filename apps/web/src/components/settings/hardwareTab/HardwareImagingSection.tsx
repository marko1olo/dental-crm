import React from "react";
import type { DentalSensorModel } from "../radiology/sensorGateway.js";
import type {
	HardwareDeviceCategory,
	HardwareDeviceConfig,
	HardwarePreset,
} from "../../../services/hardware/hardwarePresets.js";
import { HardwareToolbar } from "./HardwareToolbar.js";
import { HardwarePresetsGrid } from "./HardwarePresetsGrid.js";
import { HardwareSensorGatewayCard } from "./HardwareSensorGatewayCard.js";
import { HardwareDevicesList } from "./HardwareDevicesList.js";

interface Props {
	devices: HardwareDeviceConfig[];
	filteredDevices: HardwareDeviceConfig[];
	filterCategory: HardwareDeviceCategory | "all";
	stats: { ready: number; notFound: number; untested: number };
	testingDeviceIds: Set<string>;
	isPresetsPickerOpen: boolean;
	presets: HardwarePreset[];
	selectedNewPresetId: string;
	activeGatewaySensorId: string;
	isDetectingSensor: boolean;
	gatewayStatusMessage: string;
	selectedGatewaySensor?: DentalSensorModel;
	activeDeviceId: string | null;
	onFilterChange: (cat: HardwareDeviceCategory | "all") => void;
	onTestAll: () => void;
	onTogglePresetsPicker: () => void;
	onSelectPreset: (id: string) => void;
	onAddDevice: (presetId: string) => void;
	onSensorSelect: (id: string) => void;
	onAutoDetectSensor: () => void;
	onTestSensorHealth: () => void;
	onSetActiveDeviceId: (id: string | null) => void;
	onTestConnection: (id: string, e?: React.MouseEvent) => void;
	onSimulateScan: (dev: HardwareDeviceConfig, e?: React.MouseEvent) => void;
	onUpdateDevice: (id: string, patch: Partial<HardwareDeviceConfig>) => void;
	onResetDefaults: (id: string, name: string) => void;
	onRemoveDevice: (id: string, name: string, e?: React.MouseEvent) => void;
}

export const HardwareImagingSection: React.FC<Props> = ({
	devices,
	filteredDevices,
	filterCategory,
	stats,
	testingDeviceIds,
	isPresetsPickerOpen,
	presets,
	selectedNewPresetId,
	activeGatewaySensorId,
	isDetectingSensor,
	gatewayStatusMessage,
	selectedGatewaySensor,
	activeDeviceId,
	onFilterChange,
	onTestAll,
	onTogglePresetsPicker,
	onSelectPreset,
	onAddDevice,
	onSensorSelect,
	onAutoDetectSensor,
	onTestSensorHealth,
	onSetActiveDeviceId,
	onTestConnection,
	onSimulateScan,
	onUpdateDevice,
	onResetDefaults,
	onRemoveDevice,
}) => {
	return (
		<>
			<HardwareToolbar
				devices={devices}
				filterCategory={filterCategory}
				stats={stats}
				testingDeviceIds={testingDeviceIds}
				isPresetsPickerOpen={isPresetsPickerOpen}
				onFilterChange={onFilterChange}
				onTestAll={onTestAll}
				onTogglePresetsPicker={onTogglePresetsPicker}
			/>

			{isPresetsPickerOpen && (
				<HardwarePresetsGrid
					presets={presets}
					selectedPresetId={selectedNewPresetId}
					onSelectPreset={onSelectPreset}
					onAddDevice={onAddDevice}
				/>
			)}

			<HardwareSensorGatewayCard
				activeGatewaySensorId={activeGatewaySensorId}
				isDetectingSensor={isDetectingSensor}
				gatewayStatusMessage={gatewayStatusMessage}
				selectedGatewaySensor={selectedGatewaySensor}
				onSensorSelect={onSensorSelect}
				onAutoDetect={onAutoDetectSensor}
				onTestHealth={onTestSensorHealth}
			/>

			<HardwareDevicesList
				devices={filteredDevices}
				activeDeviceId={activeDeviceId}
				testingDeviceIds={testingDeviceIds}
				onSetActiveDeviceId={onSetActiveDeviceId}
				onOpenPresetsPicker={onTogglePresetsPicker}
				onTestConnection={onTestConnection}
				onSimulateScan={onSimulateScan}
				onUpdateDevice={onUpdateDevice}
				onResetDefaults={onResetDefaults}
				onRemoveDevice={onRemoveDevice}
			/>
		</>
	);
};
