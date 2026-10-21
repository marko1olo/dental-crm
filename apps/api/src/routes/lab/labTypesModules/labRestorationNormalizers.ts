import { restorationTypeSchema, restorationMaterialSchema, stumpPreparationShadeSchema } from "@dental/shared";

export function normalizeRestorationType(val: unknown): string {
	if (typeof val !== "string") return "crown_monolithic";
	const clean = val.trim().toLowerCase();
	const map: Record<string, string> = {
		single_crown: "crown_monolithic",
		crown: "crown_monolithic",
		crown_zirconia: "crown_monolithic",
		crown_emax: "crown_layered_cutback",
		bridge: "bridge_retainer",
		bridge_retainer: "bridge_retainer",
		bridge_pontic: "bridge_pontic",
		veneer: "veneer_laminate",
		veneer_laminate: "veneer_laminate",
		inlay_onlay: "inlay",
		inlay: "inlay",
		onlay: "onlay",
		overlay: "overlay",
		all_on_4_6: "screw_retained_crown",
		all_on_arch: "screw_retained_crown",
		implant_abutment: "custom_abutment_tibase",
		custom_abutment_tibase: "custom_abutment_tibase",
		screw_retained_crown: "screw_retained_crown",
		surgical_guide: "surgical_guide",
		aligner_nightguard: "clear_aligner_stage",
		aligners_nightguard: "clear_aligner_stage",
		aligners: "clear_aligner_stage",
		aligner_splint: "clear_aligner_stage",
		clear_aligner_stage: "clear_aligner_stage",
		occlusal_splint: "occlusal_splint_nightguard",
		nightguard_bruxism: "occlusal_splint_nightguard",
		occlusal_splint_nightguard: "occlusal_splint_nightguard",
		endocrown: "endocrown",
		crown_monolithic: "crown_monolithic",
		crown_layered_cutback: "crown_layered_cutback",
		digital_waxup_mockup: "digital_waxup_mockup",
	};
	return map[clean] || (restorationTypeSchema.options.includes(val as any) ? val : "crown_monolithic");
}

export function normalizeRestorationMaterial(val: unknown): string {
	if (typeof val !== "string") return "zirconia_multilayer_gradient";
	const clean = val.trim().toLowerCase();
	const map: Record<string, string> = {
		zirconia_multilayer: "zirconia_multilayer_gradient",
		zirconia: "zirconia_multilayer_gradient",
		zirconia_multilayer_gradient: "zirconia_multilayer_gradient",
		zirconia_3y: "zirconia_3y_high_strength",
		zirconia_3y_high_strength: "zirconia_3y_high_strength",
		zirconia_4y: "zirconia_4y_high_translucent",
		zirconia_4y_high_translucent: "zirconia_4y_high_translucent",
		zirconia_5y: "zirconia_5y_ultra_translucent",
		zirconia_5y_ultra_translucent: "zirconia_5y_ultra_translucent",
		emax_lithium_disilicate: "emax_lithium_disilicate_press",
		emax_press: "emax_lithium_disilicate_press",
		emax_lithium_disilicate_press: "emax_lithium_disilicate_press",
		emax_cad: "emax_lithium_disilicate_cad",
		emax_lithium_disilicate_cad: "emax_lithium_disilicate_cad",
		emax: "emax_lithium_disilicate_press",
		pfm_cocr: "cocr_milled_cast",
		metal_ceramic: "cocr_milled_cast",
		cocr_milled_cast: "cocr_milled_cast",
		pmma_temporary: "pmma_cad_provisional",
		pmma: "pmma_cad_provisional",
		pmma_cad_provisional: "pmma_cad_provisional",
		titanium_custom_abutment: "titanium_grade_5",
		titanium: "titanium_grade_5",
		titanium_grade_5: "titanium_grade_5",
		composite_lab_nanohybrid: "composite_lab_nanohybrid",
		peek_biohpp: "peek_biohpp",
		resin_3d_surgical_guide: "resin_3d_surgical_guide",
		resin_3d_splint_biocompatible: "resin_3d_splint_biocompatible",
	};
	return map[clean] || (restorationMaterialSchema.options.includes(val as any) ? val : "zirconia_multilayer_gradient");
}

export function normalizeShadeSystem(val: unknown): "VITA_CLASSICAL" | "VITA_3D_MASTER" | "BLEACH" {
	if (typeof val !== "string") return "VITA_CLASSICAL";
	const clean = val.trim().toUpperCase();
	if (clean === "CLASSICAL" || clean === "VITA_CLASSICAL") return "VITA_CLASSICAL";
	if (clean === "3D_MASTER" || clean === "VITA_3D_MASTER") return "VITA_3D_MASTER";
	if (clean === "BLEACH") return "BLEACH";
	return "VITA_CLASSICAL";
}

export function normalizeStumpShade(val: unknown): string | null {
	if (!val || typeof val !== "string") return null;
	const clean = val.trim().toUpperCase();
	if (stumpPreparationShadeSchema.options.includes(clean as any)) return clean;
	return null;
}
