/**
 * prescriptionPackagesExtended.ts — Extended 1-Click Clinical Fast Packages
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { DentalFastPrescriptionPackage } from "./prescriptionPackageTypes";

export const PACKAGES_EXTENDED: readonly DentalFastPrescriptionPackage[] = [
	{
		id: "standard_anti_inflammatory_course",
		label: "«Стандартный противовоспалительный курс» (Амоксиклав + Нимесил + Хлоргексидин)",
		desc: "Амоксиклав 875/125 мг №14 + Нимесил 100 мг №9 + Хлоргексидин 0.05% 100 мл",
		drugIds: ["amoxiclav_875_125", "nimesil_100", "chlorhexidine_005"],
		badge: "Клинический курс",
	},
	{
		id: "post_extraction_implant",
		label: "Комплект после удаления / имплантации (Нимесил 100мг + Хлоргексидин 0.05% + Амоксиклав 875/125)",
		desc: "Нимесил 100 мг №9 + Хлоргексидин 0.05% 100 мл + Амоксиклав 875/125 мг №14 (хирургический протокол)",
		drugIds: ["nimesil_100", "chlorhexidine_005", "amoxiclav_875_125"],
		badge: "Хирургия / Удаление",
	},
	{
		id: "cyfran_st_pericoronitis",
		label: "Комплект: Перикоронит / Абсцесс (Цифран СТ + Нимесил 100мг + Хлоргексидин 0.05%)",
		desc: "Цифран СТ (500+600 мг) №10 + Нимесил 100 мг №9 + Хлоргексидин 0.05% (протокол при абсцессе/перикороните)",
		drugIds: ["cyfran_st", "nimesil_100", "chlorhexidine_005"],
		badge: "Абсцесс / Перикоронит",
	},
	{
		id: "endo_periodontitis",
		label: "Комплект: Эндодонтия / Периодонтит (Ибупрофен 400мг + Супрастин 25мг)",
		desc: "Ибупрофен 400 мг №20 + Супрастин 25 мг №20 (противовоспалительный и противоотечный комплекс)",
		drugIds: ["ibuprofen_400", "suprastin_25"],
		badge: "Эндодонтия / Периодонтит",
	},
	{
		id: "acute_pain_express",
		label: "Экспресс-обезболивание (Кетанов / Кеторолак 10мг при острой боли)",
		desc: "Кетанов (Кеторолак) 10 мг №10 (быстрое купирование выраженного болевого синдрома)",
		drugIds: ["ketorolac_10"],
		badge: "Острая боль",
	},
	{
		id: "suprastin_antiallergic",
		label: "«Супрастин 25 мг (Противоотечное / Антигистаминное)»",
		desc: "Rp: Tab. Chloropyramini 25mg, D.t.d. N 20 in tab., S. По 1 таблетке 2-3 раза в день во время еды 3-5 дней.",
		drugIds: ["suprastin_25"],
		badge: "Противоотечное",
	},
	{
		id: "dental_statutory_express_formulary",
		label: "«Стоматологический экспресс-формуляр»",
		desc: "Амоксиклав 875/125 мг + Ципролет 500 мг + Нимесил 100 мг + Кеторол 10 мг + Хлоргексидин 0.05% + Холисал + Солкосерил",
		drugIds: [
			"amoxiclav_875_125",
			"ciprolet_500",
			"nimesil_100",
			"ketorol_10",
			"chlorhexidine_005",
			"holisal_gel",
			"solcoseryl_dental",
		],
		badge: "Экспресс-формуляр",
	},
	{
		id: "solcoseryl_mucosa_regeneration",
		label: "«Регенерация слизистой рта (Солкосерил + Холисал + Хлоргексидин)»",
		desc: "Солкосерил дентальная паста 5 г + Холисал гель 10 г + Хлоргексидин 0.05% 100 мл (язвы, афты, травмы слизистой)",
		drugIds: ["solcoseryl_dental", "holisal_gel", "chlorhexidine_005"],
		badge: "Слизистая",
	},
	{
		id: "ciprolet_fluoroquinolone_reserve",
		label: "«Антибиотик резерва (Ципролет 500 мг при аллергии на пенициллины)»",
		desc: "Ципролет 500 мг №10 + Нимесил 100 мг №9 + Хлоргексидин 0.05% 100 мл",
		drugIds: ["ciprolet_500", "nimesil_100", "chlorhexidine_005"],
		badge: "Фторхинолон",
	},
];
