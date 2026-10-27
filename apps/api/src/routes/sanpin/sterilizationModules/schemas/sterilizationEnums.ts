import { z } from "zod";

export function normalizeSterilizationBody(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object") return {};
	const body = { ...(raw as Record<string, unknown>) };

	if (body.sterilizerType) {
		const st = String(body.sterilizerType).toLowerCase();
		if (st.includes("autoclave") || st.includes("steam")) {
			body.sterilizerType = "autoclave_steam";
		} else if (st.includes("dry") || st.includes("gp")) {
			body.sterilizerType = "dry_heat";
		} else if (st.includes("plasma")) {
			body.sterilizerType = "plasma";
		} else if (st.includes("gas") || st.includes("eo")) {
			body.sterilizerType = "gas_eo";
		}
	}

	if (body.packagingType) {
		const pt = String(body.packagingType).toLowerCase();
		if (pt === "kraft_pouch" || pt === "kraft_bag" || pt === "kraft_heat_sealed") {
			body.packagingType = "kraft_heat_sealed";
		} else if (pt === "kraft_self_seal" || pt === "kraft_self_adhesive") {
			body.packagingType = "kraft_self_adhesive";
		} else if (pt.includes("laminat") || pt.includes("kombin")) {
			body.packagingType = "laminated_heat_sealed";
		} else if (pt.includes("casset") || pt.includes("kasset") || pt === "metal_cassette") {
			body.packagingType = "metal_cassette";
		} else if (pt.includes("unwrapped") || pt.includes("open") || pt === "unwrapped_open_tray") {
			body.packagingType = "unwrapped_open_tray";
		} else if (pt === "bix_no_filter") {
			body.packagingType = "bix_no_filter";
		} else if (pt === "bix_with_filter") {
			body.packagingType = "bix_with_filter";
		} else if (pt === "double_soft_crepe") {
			body.packagingType = "double_soft_crepe";
		} else {
			body.packagingType = "kraft_heat_sealed";
		}
	}

	if (body.temperatureCelsius === undefined && body.actualTemperature !== undefined) {
		body.temperatureCelsius = Number(body.actualTemperature);
	}
	if (body.pressureBar === undefined && body.actualPressure !== undefined) {
		body.pressureBar = Number(body.actualPressure);
	}
	if (body.durationMin === undefined && body.actualDuration !== undefined) {
		body.durationMin = Number(body.actualDuration);
	}
	if (body.indicatorType) {
		const ind = String(body.indicatorType).toLowerCase();
		if (ind.includes("4")) body.indicatorType = "class4_multivariable";
		else if (ind.includes("5")) body.indicatorType = "class5_integrating";
		else if (ind.includes("6")) body.indicatorType = "class6_emulating";
		else if (ind.includes("bio")) body.indicatorType = "biological";
		else if (ind.includes("bowie")) body.indicatorType = "bowie_dick";
		else body.indicatorType = "class5_integrating";
	} else {
		body.indicatorType = "class5_integrating";
	}
	if (typeof body.operatorId === "string") {
		const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRe.test(body.operatorId)) {
			delete body.operatorId;
		}
	}
	return body;
}

export const packagingTypeSchema = z
	.enum([
		"kraft_heat_sealed",
		"kraft_self_adhesive",
		"laminated_heat_sealed",
		"metal_cassette",
		"bix_filter",
		"unpacked",
		"other",
	])
	.optional()
	.nullable();

export const indicatorTypeSchema = z
	.enum([
		"class4_multivariable",
		"class5_integrating",
		"class6_emulating",
		"biological",
		"bowie_dick",
		"helix",
	])
	.optional()
	.nullable();

export const cycleModeSchema = z
	.enum([
		"B",
		"S",
		"N",
		"dry_heat_180",
		"dry_heat_160",
		"plasma_vh2o2",
		"ethylene_oxide",
	])
	.optional()
	.nullable();
