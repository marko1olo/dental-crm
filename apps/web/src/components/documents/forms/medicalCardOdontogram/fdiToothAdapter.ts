import type {
	FdiToothRecord,
	ToothClinicalStatusCode,
	ToothSurface,
} from "@dental/shared";
import type { ToothData, ToothState } from "../../../odontogram/ToothChart";
import { PERMANENT_TEETH_UPPER, PERMANENT_TEETH_LOWER } from "./types";

const STATUS_TO_STATE_MAP: Partial<Record<ToothClinicalStatusCode, ToothState>> = {
	healthy: "Healthy",
	caries_initial: "Caries",
	caries_superficial: "Caries",
	caries_media: "Caries",
	caries_profunda: "Caries",
	caries_cementum: "Caries",
	pulpitis_acute: "Pulpitis",
	pulpitis_chronic: "Pulpitis",
	pulpitis_necrosis: "Pulpitis",
	periodontitis_acute: "Periodontitis",
	periodontitis_chronic: "Periodontitis",
	periodontitis_radicular_cyst: "Periodontitis",
	filled_satisfactory: "Filled",
	filled_secondary_caries: "Caries",
	filled_defective: "Filled",
	crown_metal_ceramic: "Crown",
	crown_zirconia: "Crown",
	crown_emax: "Crown",
	crown_temporary: "Temporary_Crown",
	inlay_onlay: "Inlay",
	veneer: "Veneer",
	bridge_abutment: "Bridge_Abutment",
	bridge_pontic: "Bridge",
	implant: "Implant",
	extracted_absent: "Missing",
	root_remnant: "Root",
	retention_impacted: "Impacted",
};

export function fdiStatusCodeToToothState(code?: ToothClinicalStatusCode): ToothState {
	if (!code) return "Healthy";
	return STATUS_TO_STATE_MAP[code] ?? "Healthy";
}

export function toothStateToFdiStatusCode(state: ToothState): ToothClinicalStatusCode {
	switch (state) {
		case "Healthy": return "healthy";
		case "Caries": return "caries_media";
		case "Pulpitis": return "pulpitis_acute";
		case "Periodontitis": case "Periodontitis_Mild": case "Periodontitis_Moderate": case "Periodontitis_Severe":
			return "periodontitis_chronic";
		case "Filled": case "Root_Canal_Treated": return "filled_satisfactory";
		case "Crown": case "Planned_Crown": return "crown_zirconia";
		case "Temporary_Crown": return "crown_temporary";
		case "Implant": case "Planned_Implant": return "implant";
		case "Missing": case "Extracted": return "extracted_absent";
		case "Root": return "root_remnant";
		case "Inlay": return "inlay_onlay";
		case "Veneer": return "veneer";
		case "Bridge": return "bridge_pontic";
		case "Bridge_Abutment": return "bridge_abutment";
		case "Retained": case "Impacted": return "retention_impacted";
		default: return "healthy";
	}
}

export const SURFACE_FDI_TO_CHART: Record<ToothSurface, string> = {
	occlusal: "O",
	vestibular: "V",
	oral: "L",
	mesial: "M",
	distal: "D",
};

export const SURFACE_CHART_TO_FDI: Record<string, ToothSurface> = {
	O: "occlusal", occlusal: "occlusal",
	V: "vestibular", vestibular: "vestibular", B: "vestibular", buccal: "vestibular",
	L: "oral", oral: "oral", lingual: "oral", palatal: "oral", P: "oral",
	M: "mesial", mesial: "mesial",
	D: "distal", distal: "distal",
};

export function fdiOdontogramToTeethData(
	odontogram: Record<number, FdiToothRecord>,
): ToothData[] {
	const allTeeth = [...PERMANENT_TEETH_UPPER, ...PERMANENT_TEETH_LOWER];
	return allTeeth.map((num) => {
		const rec = odontogram[num];
		const state = fdiStatusCodeToToothState(rec?.statusCode);
		const surfaces = (rec?.surfaces ?? []).map((s) => SURFACE_FDI_TO_CHART[s] ?? s);
		return {
			toothNumber: num,
			state,
			surfaces,
			hasFracture: rec?.statusCode === "fracture",
			bridgeRole: rec?.statusCode === "bridge_pontic" ? "pontic" : rec?.statusCode === "bridge_abutment" ? "pillar" : null,
			periapicalLesion: rec?.statusCode === "periodontitis_acute" || rec?.statusCode === "periodontitis_chronic" || rec?.statusCode === "periodontitis_radicular_cyst",
		};
	});
}
