/**
 * prescriptionPackages.ts — Clinical 1-Click Fast Prescription Packages
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b Sweet Spot 200–350 lines).
 */

export interface DentalFastPrescriptionPackage {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
	readonly badge: string;
	readonly titleRu?: string | undefined;
	readonly descriptionRu?: string | undefined;
	readonly medicationIds?: readonly string[] | undefined;
}

export function calculatePediatricIbuprofenDose(weightKg: number): {
	readonly singleDoseMg: number;
	readonly singleDoseMl: number;
	readonly maxDailyDoseMg: number;
	readonly signaRu: string;
} {
	const validWeight = Math.max(5, Math.min(60, Number(weightKg) || 10));
	const singleDoseMg = Math.round(validWeight * 10);
	const singleDoseMl = Number((validWeight / 2).toFixed(1));
	const maxDailyDoseMg = singleDoseMg * 3;
	return {
		singleDoseMg,
		singleDoseMl,
		maxDailyDoseMg,
		signaRu: `S. Внутрь с помощью мерного шприца по ${singleDoseMl} мл (${singleDoseMg} мг) до 3 раз в сутки при боли или температуре с интервалом не менее 6 часов (расчет на вес ребенка ${validWeight} кг).`,
	};
}

export const PACKAGES_CORE: readonly DentalFastPrescriptionPackage[] = [
	{
		id: "pulpitis_acute_relief",
		label: "«Пульпит (купирование острого болевого синдрома и воспаления)»",
		desc: "Нимесил 100 мг №9 + Омепразол 20 мг №20 + Хлоргексидин 0.05% 100 мл (купирование острой боли и асептического воспаления пульпы)",
		drugIds: ["nimesil_100", "omeprazole_20", "chlorhexidine_005"],
		badge: "Пульпит",
	},
	{
		id: "alveolitis_dry_socket",
		label: "«Альвеолит / Сухая лунка (постэкстракционный синдром)»",
		desc: "Амоксиклав 875/125 мг №14 + Нимесил 100 мг №9 + Холисал гель 10 г + Хлоргексидин 0.05% 100 мл (протокол лечения альвеолита)",
		drugIds: [
			"amoxiclav_875_125",
			"nimesil_100",
			"holisal_gel",
			"chlorhexidine_005",
		],
		badge: "Альвеолит",
	},
	{
		id: "post_tooth_extraction",
		label: "«После удаления зуба (стандартный хирургический протокол)»",
		desc: "Ибупрофен 400 мг №20 + Хлоргексидин 0.05% 100 мл + Супрастин 25 мг №20 (противоболевой, антисептический и противоотечный комплекс)",
		drugIds: ["ibuprofen_400", "chlorhexidine_005", "suprastin_25"],
		badge: "После удаления",
	},
	{
		id: "amoxiclav_first_line",
		label: "«Антибиотик первого ряда (Амоксиклав 875+125 мг)»",
		desc: "Rp: Amoxicillini + Acidi clavulanici 875/125mg, D.t.d. N 14 in tab., S. По 1 таблетке 2 раза в день во время еды 7 дней.",
		drugIds: ["amoxiclav_875"],
		badge: "1-й ряд",
	},
	{
		id: "clarithromycin_reserve",
		label: "«Антибиотик резерва при аллергии на пенициллины (Кларитромицин 500 мг)»",
		desc: "Rp: Clarithromycini 500mg, D.t.d. N 10 in tab., S. По 1 таблетке 1 раз в день 5-7 дней.",
		drugIds: ["clarithromycin_500"],
		badge: "Резерв (Аллергия)",
	},
	{
		id: "analgesia_nimesil",
		label: "«НПВП / Обезболивающее при острой боли (Нимесил 100 мг)»",
		desc: "Rp: Nimesulidi 100mg, D.t.d. N 10 in gran., S. По 1 пакетику 2 раза в день после еды, растворив в 100 мл воды, до 5 дней.",
		drugIds: ["nimesil_100"],
		badge: "Острая боль",
	},
	{
		id: "ibuprofen_moderate_pain",
		label: "«Обезболивающее умеренное (Ибупрофен 400 мг)»",
		desc: "Rp: Ibuprofeni 400mg, D.t.d. N 20 in tab., S. По 1 таб. при болях, не более 3 таб. в сутки.",
		drugIds: ["ibuprofen_400"],
		badge: "Умеренная боль",
	},
	{
		id: "chlorhexidine_antiseptic_rinse",
		label: "«Антисептик для полоскания (Хлоргексидин 0.05%)»",
		desc: "Rp: Sol. Chlorhexidini bigluconatis 0.05% 100ml, D.S. Ротовые ванночки 3 раза в день по 1 минуте после еды, 7-10 дней.",
		drugIds: ["chlorhexidine_005"],
		badge: "Антисептик",
	},
	{
		id: "anti_inflammatory_dental_gel",
		label: "«Противовоспалительный гель (Холисал / Метрогил Дента)»",
		desc: "Rp: Gel dentalis, D.S. Аппликации на область десен 2-3 раза в день после чистки зубов 7-10 дней.",
		drugIds: ["holisal_gel"],
		badge: "Десневой гель",
	},
];

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

export const DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE: readonly DentalFastPrescriptionPackage[] = [
	...PACKAGES_CORE,
	...PACKAGES_EXTENDED,
];

export const DENTAL_FAST_PRESCRIPTION_PACKAGES: readonly DentalFastPrescriptionPackage[] =
	DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE.map((p) => ({
		...p,
		titleRu: p.label,
		descriptionRu: p.desc,
		medicationIds: p.drugIds,
	}));
