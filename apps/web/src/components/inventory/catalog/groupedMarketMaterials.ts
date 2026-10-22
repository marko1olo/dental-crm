import {
	type ClinicalMarketMaterialItem,
	type ClinicalMaterialDomain,
	getClinicalMaterialsByDomain,
} from "@dental/shared";

export interface MaterialOptionGroup {
	readonly domain: ClinicalMaterialDomain;
	readonly titleRu: string;
	readonly items: readonly ClinicalMarketMaterialItem[];
}

export function getGroupedClinicalMarketMaterials(): readonly MaterialOptionGroup[] {
	return [
		{ domain: "implant_system", titleRu: "Дентальные имплантаты (16 систем РФ/СНГ)", items: getClinicalMaterialsByDomain("implant_system") },
		{ domain: "bone_graft_membrane", titleRu: "Костная пластика и мембраны (НКР)", items: getClinicalMaterialsByDomain("bone_graft_membrane") },
		{ domain: "surg_suture", titleRu: "Хирургический шовный материал", items: getClinicalMaterialsByDomain("surg_suture") },
		{ domain: "surg_hemostatic", titleRu: "Хирургический гемостаз", items: getClinicalMaterialsByDomain("surg_hemostatic") },
		{ domain: "endo_file", titleRu: "Эндодонтические машинные файлы", items: getClinicalMaterialsByDomain("endo_file") },
		{ domain: "endo_sealer", titleRu: "Эндодонтические силеры", items: getClinicalMaterialsByDomain("endo_sealer") },
		{ domain: "endo_irrigation", titleRu: "Эндодонтическая ирригация и промывание", items: getClinicalMaterialsByDomain("endo_irrigation") },
		{ domain: "endo_dressing", titleRu: "Временные внутриканальные вложения", items: getClinicalMaterialsByDomain("endo_dressing") },
		{ domain: "ortho_bracket", titleRu: "Ортодонтические брекет-системы", items: getClinicalMaterialsByDomain("ortho_bracket") },
		{ domain: "ortho_aligner", titleRu: "Элайнеры и прозрачные каппы", items: getClinicalMaterialsByDomain("ortho_aligner") },
		{ domain: "ortho_archwire", titleRu: "Ортодонтические дуги", items: getClinicalMaterialsByDomain("ortho_archwire") },
		{ domain: "ortho_miniscrew", titleRu: "Ортодонтические микроимплантаты (TAD)", items: getClinicalMaterialsByDomain("ortho_miniscrew") },
		{ domain: "prostho_a_silicone", titleRu: "А-силиконы и полиэфиры", items: getClinicalMaterialsByDomain("prostho_a_silicone") },
		{ domain: "prostho_c_silicone", titleRu: "С-силиконы", items: getClinicalMaterialsByDomain("prostho_c_silicone") },
		{ domain: "prostho_bite_reg", titleRu: "Регистраторы прикуса", items: getClinicalMaterialsByDomain("prostho_bite_reg") },
		{ domain: "prostho_cement_perm", titleRu: "Постоянные стоматологические цементы", items: getClinicalMaterialsByDomain("prostho_cement_perm") },
		{ domain: "prostho_cement_temp", titleRu: "Временные стоматологические цементы", items: getClinicalMaterialsByDomain("prostho_cement_temp") },
		{ domain: "prostho_retraction", titleRu: "Ретракционные нити", items: getClinicalMaterialsByDomain("prostho_retraction") },
		{ domain: "lab_cad_material", titleRu: "CAD/CAM зуботехнические материалы", items: getClinicalMaterialsByDomain("lab_cad_material") },
		{ domain: "therapy_composite", titleRu: "Светоотверждаемые нанокомпозиты", items: getClinicalMaterialsByDomain("therapy_composite") },
		{ domain: "therapy_adhesive", titleRu: "Адгезивные системы", items: getClinicalMaterialsByDomain("therapy_adhesive") },
	];
}
