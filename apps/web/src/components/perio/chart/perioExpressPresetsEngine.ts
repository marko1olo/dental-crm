/**
 * perioExpressPresetsEngine.ts — Применение экспресс-пресетов пародонта (Норма, Профгигиена, Гингивит, Пародонтит).
 * Архитектурный слой Layer 2: Pure Engine (Мандат 8b, <= 120 строк).
 */

import type { PerioToothRecord } from "@dental/shared";
import {
	applyGingivalRecessionPreset,
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
} from "../perioMath";
import type { PresetApplyResult } from "./perioPresetTypes";

export function applyExpressPerioPreset(
	teeth: readonly PerioToothRecord[],
	presetId: PerioExpressPresetId,
): PresetApplyResult {
	let updatedTeeth: PerioToothRecord[] = [...teeth];
	let protocolText = "";

	switch (presetId) {
		case "perio_norm_express":
			updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.perio_norm_express.defaultProtocolRu;
			break;
		case "pro_hygiene_express":
			updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.pro_hygiene_express.defaultProtocolRu;
			break;
		case "gingivitis_express":
			updatedTeeth = applyGingivitisPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.gingivitis_express.defaultProtocolRu;
			break;
		case "periodontitis_mild_express":
			updatedTeeth = applyPeriodontitisMildPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.periodontitis_mild_express.defaultProtocolRu;
			break;
		case "periodontitis_moderate_express":
			updatedTeeth = applyPeriodontitisModeratePreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.periodontitis_moderate_express.defaultProtocolRu;
			break;
		case "periodontitis_severe_express":
			updatedTeeth = applyPeriodontitisSeverePreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.periodontitis_severe_express.defaultProtocolRu;
			break;
		case "recession_express":
			updatedTeeth = applyGingivalRecessionPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.recession_express.defaultProtocolRu;
			break;
	}

	const presetInfo = PERIO_EXPRESS_PRESETS[presetId];
	const title = presetInfo?.titleRu ?? presetId;

	let service: PresetApplyResult["service"];
	if (presetId === "pro_hygiene_express") {
		service = {
			code: "A16.07.051",
			name: "Профессиональная гигиена полости рта и зубов (ультразвуковое удаление отложений, Air-Flow, полировка, фторирование)",
			price: 5500,
			category: "hygiene",
		};
	}

	return {
		updatedTeeth,
		protocolText,
		title,
		service,
	};
}
