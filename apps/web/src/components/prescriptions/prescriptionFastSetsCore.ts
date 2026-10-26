/**
 * prescriptionFastSetsCore.ts — Core Express Prescription Sets for 1-Click Clinic Prescribing
 * Conforms to Mandates 8e (Doctor Autonomy), 8k (Friction-Killer), 8d (Zero Emojis) & Mandate 8b (<= 120 lines).
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
			label: "После хирургии / периодонтита (Амоксиклав)",
			desc: "Амоксиклав 1000 мг 2 р/д (7 дн.) + Найз 100 мг при болях + Хлоргексидин 0.05% ванночки",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "penicillin_allergy",
			label: "При аллергии на пенициллины (Азитромицин)",
			desc: "Азитромицин 500 мг 1 р/д (3 дн.) + Ибупрофен 400 мг + Мирамистин 0.01%",
			drugIds: ["azithromycin_500", "ibuprofen_400", "miramistin_001"],
		},
		{
			id: "anti_inflammatory_course",
			label: "Противовоспалительный курс (Найз / НПВП)",
			desc: "Найз (Нимесил) 100 мг 2 р/д + Хлоргексидин 0.05% ванночки",
			drugIds: ["nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "pediatric_dental",
			label: "Детский стоматологический (Ибупрофен)",
			desc: "Ибупрофен суспензия 100 мг/5 мл с авторасчетом по весу (10 мг/кг)",
			drugIds: ["ibuprofen_suspension_100_5ml"],
		},
		{
			id: "full_dental_quad_complex",
			label: "Комплекс: Антибиотик + Пробиотик + НПВС + Антисептик",
			desc: "Амоксиклав 875/125 мг + Линекс Форте + Найз 100 мг + Хлоргексидин 0.05% ванночки",
			drugIds: [
				"amoxiclav_875_125",
				"linex_forte",
				"nimesulide_100",
				"chlorhexidine_005",
			],
		},
		{
			id: "amoxicillin_standard_course",
			label: "Стандартный курс: Амоксициллин 500 мг + Ибупрофен 400 мг",
			desc: "Амоксициллин 500 мг 3 р/д (7 дн.) + Ибупрофен 400 мг + Хлоргексидин 0.05%",
			drugIds: [
				"amoxicillin_500",
				"ibuprofen_400",
				"chlorhexidine_005",
			],
		},
		{
			id: "post_extraction_complex",
			label: "После сложного удаления (Амоксиклав + Нимесил + Хлоргексидин)",
			desc: "Амоксиклав 875/125 мг 2 р/д (7 дн.) + Нимесил 100 мг при болях + Хлоргексидин 0.05% ванночки",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "acute_periodontitis",
			label: "При остром периодонтите",
			desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Хлоргексидин 0.05% (купирование острой одонтогенной инфекции)",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
		},
	];
