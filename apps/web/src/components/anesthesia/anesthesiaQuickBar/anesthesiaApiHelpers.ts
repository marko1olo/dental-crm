import type {
	AnestheticDrugId,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";

export function resolveDrugMeta(drugId: AnestheticDrugId) {
	if (drugId === "articaine_1_100k") {
		return {
			drugEnum: "articaine" as const,
			vasoEnum: "1:100000" as const,
			concentrationPct: 4.0,
			brandName: "Убистезин форте 1:100 000",
		};
	}
	if (drugId === "septanest_1_100k") {
		return {
			drugEnum: "articaine" as const,
			vasoEnum: "1:100000" as const,
			concentrationPct: 4.0,
			brandName: "Септанест 1:100 000",
		};
	}
	if (drugId === "mepivacaine_plain") {
		return {
			drugEnum: "mepivacaine" as const,
			vasoEnum: "none" as const,
			concentrationPct: 3.0,
			brandName: "Скандонест 3%",
		};
	}
	if (drugId === "lidocaine_1_100k") {
		return {
			drugEnum: "lidocaine" as const,
			vasoEnum: "1:100000" as const,
			concentrationPct: 2.0,
			brandName: "Лидокаин 2% с адреналином",
		};
	}
	if (drugId === "lidocaine_plain") {
		return {
			drugEnum: "lidocaine" as const,
			vasoEnum: "none" as const,
			concentrationPct: 2.0,
			brandName: "Лидокаин 2% чистый",
		};
	}
	if (drugId === "bupivacaine_05") {
		return {
			drugEnum: "bupivacaine" as const,
			vasoEnum: "none" as const,
			concentrationPct: 0.5,
			brandName: "Бупивакаин 0.5%",
		};
	}
	return {
		drugEnum: "articaine" as const,
		vasoEnum: "1:200000" as const,
		concentrationPct: 4.0,
		brandName: "Ультракаин Д-С",
	};
}

export function resolveTechniqueEnum(techniqueId: InjectionTechniqueId) {
	if (techniqueId === "mandibular_torus") return "mandibular_block";
	if (techniqueId === "mental_incisive") return "mental_block";
	if (techniqueId === "tuberal") return "tuberal_block";
	if (techniqueId === "palatal_greater") return "palatine_block";
	if (techniqueId === "incisive_canal") return "incisive_block";
	if (techniqueId === "intraligamentary_sta") return "intraligamentary";
	if (techniqueId === "intraseptal") return "intraosseous";
	if (techniqueId === "application_topical") return "topical";
	return "infiltration";
}
