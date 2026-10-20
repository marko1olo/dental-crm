/**
 * prescriptionFastSetsCore.ts — Core 4 Express Prescription Sets
 * Conforms to Mandate 8b (<= 120 lines).
 */

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export const CORE_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] =
	[
		{
			id: "post_surgery_periodontitis",
			label: "«После хирургии / периодонтита»",
			desc: "Амоксиклав 875/125 мг 2 р/д + Нимесил 100 мг + Хлоргексидин 0.05%",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "penicillin_allergy",
			label: "«При аллергии на пенициллины»",
			desc: "Ципрофлоксацин 500 мг 2 р/д + Ибупрофен 400 мг при болях",
			drugIds: ["ciprofloxacin_500", "ibuprofen_400"],
		},
		{
			id: "anti_inflammatory_course",
			label: "«Противовоспалительный курс»",
			desc: "Нимесулид 100 мг 2 р/д + Супрастин 25 мг на ночь",
			drugIds: ["nimesulide_100", "suprastin_25"],
		},
		{
			id: "pediatric_dental",
			label: "«Детский стоматологический»",
			desc: "Ибупрофен суспензия 100 мг/5 мл с авторасчетом по весу (10 мг/кг)",
			drugIds: ["ibuprofen_suspension_100_5ml"],
		},
	];
