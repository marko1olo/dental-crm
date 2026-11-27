import { logger } from "../../utils/logger";
import { type BatteryState, LOW_BATTERY_THRESHOLD } from "./types";

interface BatteryManagerLike {
	readonly level?: number | undefined;
	readonly charging?: boolean | undefined;
	addEventListener?: ((type: string, listener: () => void) => void) | undefined;
	removeEventListener?: ((type: string, listener: () => void) => void) | undefined;
}

function getBatteryProvider(
	nav: Navigator | undefined,
): (() => Promise<BatteryManagerLike>) | null {
	if (!nav) return null;
	const candidate = Reflect.get(nav, "getBattery");
	if (typeof candidate !== "function") return null;
	return () => Promise.resolve(candidate.call(nav) as Promise<BatteryManagerLike>);
}

export async function getBatteryState(): Promise<BatteryState> {
	const getBattery =
		typeof navigator !== "undefined" ? getBatteryProvider(navigator) : null;
	if (!getBattery) {
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
	try {
		const battery = await getBattery();
		const level = typeof battery?.level === "number" ? battery.level : 1.0;
		const charging = typeof battery?.charging === "boolean" ? battery.charging : true;
		const isLowBatteryDischarging = !charging && level <= LOW_BATTERY_THRESHOLD;
		return {
			isSupported: true,
			level,
			charging,
			isLowBatteryDischarging,
		};
	} catch (err) {
		logger.warn("[lanBatteryListener] Battery API unavailable", err);
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
}

export async function initBatteryListener(
	onUpdate: () => void,
): Promise<(() => void) | null> {
	const getBattery =
		typeof navigator !== "undefined" ? getBatteryProvider(navigator) : null;
	if (!getBattery) {
		return null;
	}
	try {
		const battery = await getBattery();
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
