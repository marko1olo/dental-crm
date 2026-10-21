export function mapConstructionTypeToRestorationType(val?: string | null): string {
	if (!val) return "crown_monolithic";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		single_crown: "crown_monolithic",
		crown_zirconia: "crown_monolithic",
		crown_emax: "crown_layered_cutback",
		crown: "crown_monolithic",
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
		aligner_splint: "clear_aligner_stage",
		aligner_nightguard: "clear_aligner_stage",
		aligners_nightguard: "clear_aligner_stage",
		aligners: "clear_aligner_stage",
		clasp_denture: "crown_monolithic",
		endocrown: "endocrown",
		core_buildup_post: "crown_monolithic",
		nightguard_bruxism: "occlusal_splint_nightguard",
		occlusal_splint: "occlusal_splint_nightguard",
		sports_mouthguard: "occlusal_splint_nightguard",
		bleaching_tray: "occlusal_splint_nightguard",
		full_denture: "crown_monolithic",
		custom_impression_tray: "crown_monolithic",
	};
	return map[lower] || "crown_monolithic";
}

export function mapMaterialToRestorationMaterial(val?: string | null): string {
	if (!val) return "zirconia_multilayer_gradient";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		zirconia_multilayer: "zirconia_multilayer_gradient",
		zirconia: "zirconia_multilayer_gradient",
		emax_lithium_disilicate: "emax_lithium_disilicate_press",
		emax_press: "emax_lithium_disilicate_press",
		emax_cad: "emax_lithium_disilicate_cad",
		emax: "emax_lithium_disilicate_press",
		pfm_cocr: "cocr_milled_cast",
		metal_ceramic: "cocr_milled_cast",
		pmma_temporary: "pmma_cad_provisional",
		pmma: "pmma_cad_provisional",
		titanium_custom_abutment: "titanium_grade_5",
		titanium: "titanium_grade_5",
		composite_lab_nanohybrid: "composite_lab_nanohybrid",
		peek_biohpp: "peek_biohpp",
		resin_3d_surgical_guide: "resin_3d_surgical_guide",
		resin_3d_splint_biocompatible: "resin_3d_splint_biocompatible",
	};
	return map[lower] || "zirconia_multilayer_gradient";
}
