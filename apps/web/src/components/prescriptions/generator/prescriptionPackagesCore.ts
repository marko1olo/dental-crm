/**
 * prescriptionPackagesCore.ts — Core 1-Click Clinical Fast Packages
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { DentalFastPrescriptionPackage } from "./prescriptionPackageTypes";

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
