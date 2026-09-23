/**
 * DENTE CRM — useHardwareSettings hook.
 *
 * Reactive state and operations for Hardware Studio:
 * - Load/save device configurations to local storage & broadcast events
 * - Preset auto-fill and 1-click device setup
 * - Diagnostic connection tests (🟢/🟡/⚪)
 * - 0 disabled buttons per Mandate 8e
 */

import { useCallback, useEffect, useState } from "react";
import {
	HARDWARE_PRESETS,
	createDefaultDeviceConfig,
	getHardwarePresetById,
	loadHardwareConfigs,
	saveHardwareConfigs,
	testHardwareConnection,
	dispatchSimulatedScanForDevice,
	type HardwareDeviceCategory,
	type HardwareDeviceConfig,
	type HardwarePreset,
} from "../services/hardware/hardwarePresets.js";

export function useHardwareSettings() {
	const [devices, setDevices] = useState<HardwareDeviceConfig[]>(() => loadHardwareConfigs());
	const [filterCategory, setFilterCategory] = useState<HardwareDeviceCategory | "all">("all");
	const [testingDeviceIds, setTestingDeviceIds] = useState<Set<string>>(new Set());
	const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

	// Synchronize with storage updates from other tabs / windows
	useEffect(() => {
		const handleStorageUpdate = (e: Event) => {
			const customEvent = e as CustomEvent<HardwareDeviceConfig[]>;
			if (customEvent.detail) {
				setDevices(customEvent.detail);
			} else {
				setDevices(loadHardwareConfigs());
			}
		};

		window.addEventListener("dental-crm:hardware-configs-updated", handleStorageUpdate);
		return () => {
			window.removeEventListener("dental-crm:hardware-configs-updated", handleStorageUpdate);
		};
	}, []);

	// Add new device from preset
	const addDeviceFromPreset = useCallback((presetId: string): HardwareDeviceConfig => {
		const preset = getHardwarePresetById(presetId) || HARDWARE_PRESETS[0]!;
		const newConfig = createDefaultDeviceConfig(preset, devices.length + 1);
		const updated = [newConfig, ...devices];
		setDevices(updated);
		saveHardwareConfigs(updated);
		setActiveDeviceId(newConfig.id);
		return newConfig;
	}, [devices]);

	// Update existing device
	const updateDevice = useCallback((id: string, patch: Partial<HardwareDeviceConfig>) => {
		setDevices((prev) => {
			const updated = prev.map((dev) => (dev.id === id ? { ...dev, ...patch } : dev));
			saveHardwareConfigs(updated);
			return updated;
		});
	}, []);

	// Remove device
	const removeDevice = useCallback((id: string) => {
		setDevices((prev) => {
			const updated = prev.filter((dev) => dev.id !== id);
			saveHardwareConfigs(updated);
			return updated;
		});
		if (activeDeviceId === id) {
			setActiveDeviceId(null);
		}
	}, [activeDeviceId]);

	// Reset device paths to preset defaults in 1 click
	const resetDeviceToDefaults = useCallback((id: string) => {
		setDevices((prev) => {
			const target = prev.find((dev) => dev.id === id);
			if (!target) return prev;
			const preset = getHardwarePresetById(target.presetId);
			if (!preset) return prev;

			const updated = prev.map((dev) =>
				dev.id === id
					? {
							...dev,
							executablePath: preset.defaultExecutablePath,
							hotFolderPath: preset.defaultHotFolderPath,
							protocol: preset.protocol,
							protocolTemplate: preset.protocolTemplate,
							supportedExtensions: [...preset.supportedExtensions],
							status: "untested" as const,
							statusMessage: "⚪ Нажмите для проверки связи",
						}
					: dev,
			);
			saveHardwareConfigs(updated);
			return updated;
		});
	}, []);

	// Test connection for a single device
	const testDeviceConnection = useCallback(async (id: string) => {
		const target = devices.find((d) => d.id === id);
		if (!target) return;

		setTestingDeviceIds((prev) => new Set(prev).add(id));
		updateDevice(id, { status: "testing", statusMessage: "⏳ Проверка связи с аппаратом..." });

		try {
			const result = await testHardwareConnection(target);
			updateDevice(id, {
				status: result.status,
				statusMessage: result.statusMessage,
				latencyMs: result.latencyMs,
				lastCheckedAt: new Date().toISOString(),
			});
		} catch (err) {
			updateDevice(id, {
				status: "not_found",
				statusMessage: `🟡 Ошибка связи: ${err instanceof Error ? err.message : String(err)}`,
				lastCheckedAt: new Date().toISOString(),
			});
		} finally {
			setTestingDeviceIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	}, [devices, updateDevice]);

	// Test all configured devices
	const testAllDevices = useCallback(async () => {
		await Promise.all(devices.map((dev) => testDeviceConnection(dev.id)));
	}, [devices, testDeviceConnection]);

	// Send simulated scan
	const triggerTestScan = useCallback((id: string) => {
		const target = devices.find((d) => d.id === id);
		if (!target) return null;
		return dispatchSimulatedScanForDevice(target);
	}, [devices]);

	// Filtered devices list
	const filteredDevices = devices.filter((dev) => {
		if (filterCategory === "all") return true;
		return dev.category === filterCategory;
	});

	// Counters
	const stats = {
		total: devices.length,
		ready: devices.filter((d) => d.status === "ready").length,
		notFound: devices.filter((d) => d.status === "not_found").length,
		untested: devices.filter((d) => d.status === "untested" || d.status === "testing").length,
	};

	return {
		devices,
		filteredDevices,
		filterCategory,
		setFilterCategory,
		activeDeviceId,
		setActiveDeviceId,
		testingDeviceIds,
		stats,
		presets: HARDWARE_PRESETS,
		addDeviceFromPreset,
		updateDevice,
		removeDevice,
		resetDeviceToDefaults,
		testDeviceConnection,
		testAllDevices,
		triggerTestScan,
	};
}
