/**
 * hotFolderRouting.ts — Layer 2: Маршрутизация папок томографов и визиографов (Multi-Folder Hot Folder Router).
 *
 * Implements Mandates 8e, 8s.
 */

import type { SensorBrandId, HotFolderRouteMatch } from "./types";
import { SENSOR_VENDOR_PROFILES } from "./sensorCatalogs";

/* ─────────────────────────────────────────────────────────────
 * 3. MULTI-FOLDER HOT FOLDER ROUTER
 * ───────────────────────────────────────────────────────────── */

export const VENDOR_HOT_FOLDER_MAP: readonly { readonly pattern: RegExp; readonly folder: string; readonly brand: SensorBrandId; readonly defaultModelId: string }[] = [
	{ pattern: /ezsensor|ezdent|vatech/i, folder: "C:\\EzSensor\\Capture", brand: "vatech", defaultModelId: "vatech_ezsensor_hd" },
	{ pattern: /carestream|kodak|kdis|rvg/i, folder: "C:\\Carestream\\Capture", brand: "carestream", defaultModelId: "carestream_rvg_6200" },
	{ pattern: /sidexis|sirona|sirocom/i, folder: "C:\\Sidexis\\Export", brand: "sirona", defaultModelId: "sirona_xios_supreme" },
	{ pattern: /(?<!si)dexis|dexdata/i, folder: "C:\\Dexis\\Data", brand: "dexis", defaultModelId: "dexis_titanium" },
	{ pattern: /planmeca|romexis/i, folder: "C:\\Planmeca\\Temp", brand: "planmeca", defaultModelId: "planmeca_prosensor_hd" },
	{ pattern: /sopro|pspix|acteon/i, folder: "C:\\Sopro\\Capture", brand: "acteon", defaultModelId: "acteon_sopix2" },
	{ pattern: /i-sensor|isensor|woodpecker/i, folder: "C:\\i-Sensor\\Images", brand: "woodpecker", defaultModelId: "woodpecker_isensor_h2" },
	{ pattern: /handy|hdr/i, folder: "C:\\Handy\\Capture", brand: "handy", defaultModelId: "handy_hdr_600" },
	{ pattern: /kavo|gendex|gxs|dtxstudio/i, folder: "C:\\KaVo\\Export", brand: "kavo", defaultModelId: "kavo_gxs_700" },
	{ pattern: /fona|stellaris/i, folder: "C:\\Fona\\Capture", brand: "fona", defaultModelId: "fona_stellaris" },
	{ pattern: /myray|irys|zenx/i, folder: "C:\\iRYS\\Export", brand: "myray", defaultModelId: "myray_zen_x" },
	{ pattern: /owandy|quickvision/i, folder: "C:\\Owandy\\QuickVision\\Images", brand: "owandy", defaultModelId: "owandy_opteo" },
	{ pattern: /nanopix|eighteeth/i, folder: "C:\\NanoPix\\Incoming", brand: "eighteeth", defaultModelId: "eighteeth_nanopix_2" },
	{ pattern: /xpectvision|photon/i, folder: "C:\\XpectVision\\Scans", brand: "xpect_vision", defaultModelId: "xpect_vision_photon" },
];

/**
 * Routes an incoming file path or hot-folder directory to the appropriate dental sensor vendor and model.
 */
export function routeIncomingHotFolder(inputPath: string): HotFolderRouteMatch {
	const normalized = inputPath.replace(/\//g, "\\");
	for (const rule of VENDOR_HOT_FOLDER_MAP) {
		if (rule.pattern.test(normalized)) {
			return {
				matchedFolder: rule.folder,
				brand: rule.brand,
				defaultModelId: rule.defaultModelId,
				confidence: 0.95,
			};
		}
	}

	// Default fallback to Vatech EzSensor HD
	return {
		matchedFolder: "C:\\DentalImages\\Incoming",
		brand: "vatech",
		defaultModelId: "vatech_ezsensor_hd",
		confidence: 0.6,
	};
}

/**
 * Returns all recognized vendor default hot folders.
 */
export function getAllVendorHotFolders(): string[] {
	const folders: string[] = [];
	for (const profile of SENSOR_VENDOR_PROFILES) {
		for (const folder of profile.defaultHotFolders) {
			if (!folders.includes(folder)) {
				folders.push(folder);
			}
		}
	}
	return folders;
}
