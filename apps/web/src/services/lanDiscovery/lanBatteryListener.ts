import { logger } from "../../utils/logger";
import { type BatteryState, LOW_BATTERY_THRESHOLD } from "./types";

export async function getBatteryState(): Promise<BatteryState> {
	if (
		typeof navigator === "undefined" ||
		typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function"
	) {
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
	try {
		const battery = await (navigator as unknown as {
			getBattery: () => Promise<{ level?: number; charging?: boolean }>;
		}).getBattery();
		const level = typeof battery?.level === "number" ? battery.level : 1.0;
		const charging = typeof battery?.charging === "boolean" ? battery.charging : true;
		const isLowBatteryDischarging = !charging && level <= LOW_BATTERY_THRESHOLD;
		return {
			isSupported: true,
			level,
			charging,
			isLowBatteryDischarging,
		};
	} catch {
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
}

export async function initBatteryListener(
	onUpdate: () => void,
): Promise<(() => void) | null> {
	if (
		typeof navigator === "undefined" ||
		typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function"
	) {
		return null;
	}
	try {
		const battery = await (navigator as unknown as {
			getBattery: () => Promise<{
				level?: number;
				charging?: boolean;
				addEventListener?: (type: string, listener: () => void) => void;
				removeEventListener?: (type: string, listener: () => void) => void;
			}>;
		}).getBattery();
		if (!battery) return null;

		if (typeof battery.addEventListener === "function") {
			battery.addEventListener("levelchange", onUpdate);
			battery.addEventListener("chargingchange", onUpdate);
			return () => {
				if (typeof battery.removeEventListener === "function") {
					battery.removeEventListener("levelchange", onUpdate);
					battery.removeEventListener("chargingchange", onUpdate);
				}
			};
		}
	} catch (err) {
		logger.debug("[LanDiscovery] Battery API listener skipped", err);
	}
	return null;
}
