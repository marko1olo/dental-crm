import type { ClinicalWriteoffPackage } from "./packageWriteoffTypes.js";

export const SURGERY_PACKAGE: ClinicalWriteoffPackage = {
	id: "surgery",
	title: "Хирургический пакет (Удаление)",
	description: "Анестетик + игла 27G + скальпель + шовник + губка гемостатическая",
	buttonClass: "btn-writeoff-surgery-packet",
	testId: "btn-writeoff-surgery-packet",
	items: [
		{
			id: "art_100k_carpule", sku: "MED-ANES-01", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
			category: "anesthesia", unit: "карп.", standardQuantity: 1, unitCostKopecks: 14500,
			defaultLotNumber: "LOT-ART-2026", defaultExpDate: "2027-08",
		},
		{
			id: "dental_needle_27g", sku: "MED-NEEDLE-27G", nameRu: "Игла карпульная стоматологическая 27G длинная 35 мм",
			category: "anesthesia", unit: "шт.", standardQuantity: 1, unitCostKopecks: 3000,
		},
		{
			id: "surgical_sterile_gloves", sku: "MED-GLOVE-SURG", nameRu: "Перчатки хирургические стерильные (пара)",
			category: "ppe", unit: "пар", standardQuantity: 2, unitCostKopecks: 6500,
		},
		{
			id: "surgical_scalpel_15", sku: "MED-SCALPEL-15", nameRu: "Скальпель хирургический одноразовый стерильный №15",
			category: "surgery", unit: "шт.", standardQuantity: 1, unitCostKopecks: 4200,
		},
		{
			id: "hemostatic_sponge", sku: "MED-HEMO-01", nameRu: "Губка гемостатическая коллагеновая стерильная",
			category: "surgery", unit: "шт.", standardQuantity: 1, unitCostKopecks: 9500,
		},
		{
			id: "suture_vicryl_40", sku: "MED-SUTURE-01", nameRu: "Шовный материал с атравматической иглой (ПГА/Викрил 4-0)",
			category: "surgery", unit: "шт.", standardQuantity: 1, unitCostKopecks: 16000,
		},
		{
			id: "sterile_gauze_swabs", sku: "MED-GAUZE-01", nameRu: "Салфетки марлевые стерильные 5х5 см",
			category: "surgery", unit: "шт.", standardQuantity: 5, unitCostKopecks: 600,
		},
	],
};

export const CARPULE_QUICK_PACKAGE: ClinicalWriteoffPackage = {
	id: "carpule_quick",
	title: "Списать препарат",
	description: "1 использованная карпула анестетика (Артикаин 4% 1.7 мл) + карпульная игла 30G евростандарт",
	buttonClass: "btn-writeoff-anesthetic-carpule",
	testId: "btn-writeoff-anesthetic-carpule",
	items: [
		{
			id: "art_septanest_ubistesin_carpule", sku: "MED-ANES-SEPT", nameRu: "Карпула анестетика (Артикаин 4% 1.7 мл)",
			category: "anesthesia", unit: "карп.", standardQuantity: 1, unitCostKopecks: 14500,
			defaultLotNumber: "LOT-SEPT-2026", defaultExpDate: "2027-10",
		},
		{
			id: "dental_needle_30g", sku: "MED-NEEDLE-30G", nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
			category: "anesthesia", unit: "шт.", standardQuantity: 1, unitCostKopecks: 2500,
			defaultLotNumber: "LOT-NDL-2026", defaultExpDate: "2028-01",
		},
	],
};

export const STERILIZATION_KIT_PACKAGE: ClinicalWriteoffPackage = {
	id: "sterilization_kit",
	title: "Набор стерилизации: 1 лоток + перчатки",
	description: "1 лоток стерилизации со смотровым инструментом в крафт-пакете + 2 пары перчаток + салфетка",
	buttonClass: "btn-writeoff-sterilization-kit",
	testId: "btn-writeoff-sterilization-kit",
	items: [
		{
			id: "sterilization_tray_kraft", sku: "STER-TRAY-01", nameRu: "Стерилизационный лоток со смотровым набором (крафт-пакет V-класса)",
			category: "auxiliary", unit: "лоток", standardQuantity: 1, unitCostKopecks: 8500,
			defaultLotNumber: "LOT-KRAFT-2026", defaultExpDate: "2027-01",
		},
		{
			id: "nitrile_gloves_pair", sku: "MED-GLOVE-M", nameRu: "Перчатки смотровые нитриловые неопудренные (пара)",
			category: "ppe", unit: "пар", standardQuantity: 2, unitCostKopecks: 3500,
		},
		{
			id: "antiseptic_alcohol_wipe", sku: "MED-WIPE-01", nameRu: "Антисептическая дезинфицирующая салфетка стерильная",
			category: "auxiliary", unit: "шт.", standardQuantity: 1, unitCostKopecks: 500,
		},
	],
};
