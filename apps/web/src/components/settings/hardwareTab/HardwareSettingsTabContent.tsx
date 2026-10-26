import React, { useState, useMemo } from "react";
import { UNIVERSAL_SENSOR_CATALOG, autoDetectConnectedSensor, testSensorConnection } from "../../radiology/sensorGateway/index.js";
import { useHardwareSettings } from "../../../hooks/useHardwareSettings.js";
import type { HardwareDeviceConfig } from "../../../services/hardware/hardwarePresets.js";
import { showToast } from "../../GlobalToast.js";
import { HardwareCockpitBar } from "../hardware/HardwareCockpitBar.js";
import { HardwareKktSection } from "../hardware/HardwareKktSection.js";
import { HardwareScannerSection } from "../hardware/HardwareScannerSection.js";
import { HardwareLabelPrinterSection } from "../hardware/HardwareLabelPrinterSection.js";
import { HardwareAudioSection } from "../hardware/HardwareAudioSection.js";
import { HardwareDomainTabs, type HardwareDomainTab } from "./HardwareDomainTabs.js";
import { HardwareImagingSection } from "./HardwareImagingSection.js";

export type { HardwareDomainTab };

export function HardwareSettingsTabContent() {
	const [activeDomain, setActiveDomain] = useState<HardwareDomainTab>("imaging");
	const hw = useHardwareSettings();
	const [isPresetsPickerOpen, setIsPresetsPickerOpen] = useState(false);
	const [selectedNewPresetId, setSelectedNewPresetId] = useState(hw.presets[0]?.id || "vatech_ezdent");
	const [activeGatewaySensorId, setActiveGatewaySensorId] = useState<string>("vatech_ezsensor_hd");
	const [isDetectingSensor, setIsDetectingSensor] = useState<boolean>(false);
	const [gatewayStatusMessage, setGatewayStatusMessage] = useState<string>("Статус: Сенсор готов к экспозиции");

	const selectedGatewaySensor = useMemo(() => {
		return UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === activeGatewaySensorId) || UNIVERSAL_SENSOR_CATALOG[0];
	}, [activeGatewaySensorId]);

	const handleAutoDetectSensor = async () => {
		setIsDetectingSensor(true);
		try {
			const res = await autoDetectConnectedSensor();
			setActiveGatewaySensorId(res.sensorModelId);
			setGatewayStatusMessage(`Статус: ${res.sensorModelName} готов к экспозиции`);
			showToast(`Обнаружен сенсор: ${res.sensorModelName} (${res.calibratedResolution})`, "success");
		} catch {
			showToast("Датчик определен по умолчанию: Vatech EzSensor HD", "info");
		} finally {
			setIsDetectingSensor(false);
		}
	};

	const handleTestSensorHealth = async () => {
		const res = await testSensorConnection(activeGatewaySensorId);
		setGatewayStatusMessage(res.statusText);
		showToast(`${res.statusText} (${res.latencyMs} мс)`, "success");
	};

	const handleAddDevice = (presetId: string) => {
		const newConfig = hw.addDeviceFromPreset(presetId);
		showToast(`Аппарат «${newConfig.name}» успешно добавлен с путями по умолчанию`, "success");
		setIsPresetsPickerOpen(false);
	};

	const handleSimulateScan = (dev: HardwareDeviceConfig, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const result = hw.triggerTestScan(dev.id);
		if (result) {
			showToast(`Тестовый снимок «${result.fileName}» (${result.modality}) отправлен в приёмник медкарты`, "success");
		}
	};

	return (
		<div className="hw-studio-container" data-testid="hardware-studio-container">
			<HardwareCockpitBar onTestHotFolder={() => { void hw.testAllDevices(); }} />
			<HardwareDomainTabs activeDomain={activeDomain} onSelectDomain={setActiveDomain} />
			{activeDomain === "kkt" && <HardwareKktSection />}
			{activeDomain === "scanners" && <HardwareScannerSection />}
			{activeDomain === "labels" && <HardwareLabelPrinterSection />}
			{activeDomain === "audio" && <HardwareAudioSection />}
			{activeDomain === "imaging" && (
				<HardwareImagingSection
					devices={hw.devices} filteredDevices={hw.filteredDevices} filterCategory={hw.filterCategory}
					stats={hw.stats} testingDeviceIds={hw.testingDeviceIds} isPresetsPickerOpen={isPresetsPickerOpen}
					presets={hw.presets} selectedNewPresetId={selectedNewPresetId} activeGatewaySensorId={activeGatewaySensorId}
					isDetectingSensor={isDetectingSensor} gatewayStatusMessage={gatewayStatusMessage} selectedGatewaySensor={selectedGatewaySensor}
					activeDeviceId={hw.activeDeviceId} onFilterChange={hw.setFilterCategory} onTestAll={() => { void hw.testAllDevices(); }}
					onTogglePresetsPicker={() => setIsPresetsPickerOpen((prev) => !prev)} onSelectPreset={setSelectedNewPresetId}
					onAddDevice={handleAddDevice} onSensorSelect={setActiveGatewaySensorId} onAutoDetectSensor={handleAutoDetectSensor}
					onTestSensorHealth={handleTestSensorHealth} onSetActiveDeviceId={hw.setActiveDeviceId}
					onTestConnection={(id, e) => { e?.stopPropagation(); void hw.testDeviceConnection(id); }}
					onSimulateScan={handleSimulateScan} onUpdateDevice={hw.updateDevice}
					onResetDefaults={(id, name) => { hw.resetDeviceToDefaults(id); showToast(`Стандартные пути Windows для «${name}» восстановлены`, "info"); }}
					onRemoveDevice={(id, name, e) => { e?.stopPropagation(); hw.removeDevice(id); showToast(`Аппарат «${name}» удалён из профиля клиники`, "info"); }}
				/>
			)}
		</div>
	);
}
