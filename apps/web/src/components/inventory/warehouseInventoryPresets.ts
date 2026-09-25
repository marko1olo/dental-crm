import type {
	WarehouseInventoryCommissionMember,
	WarehouseAuditItemLine,
} from "./warehouseInventoryEngine.js";
import { computeAuditLineItem } from "./warehouseInventoryEngine.js";

export const SOLO_DOCTOR_COMMISSION_MEMBERS: readonly WarehouseInventoryCommissionMember[] = [
	{
		fullName: "Кузнецов Михаил Сергеевич",
		position: "Врач-стоматолог (МОЛ)",
		role: "chairman",
		roleRu: "Председатель комиссии (МОЛ / Единолично)",
	},
];

export const DEFAULT_COMMISSION_MEMBERS: readonly WarehouseInventoryCommissionMember[] = [
	{
		fullName: "Захаров Игорь Валентинович",
		position: "Главный врач клиники",
		role: "chairman",
		roleRu: "Председатель комиссии",
	},
	{
		fullName: "Васильев Олег Петрович",
		position: "Заведующий складом",
		role: "mol",
		roleRu: "МОЛ (Материально ответственное лицо)",
	},
	{
		fullName: "Смирнова Анна Викторовна",
		position: "Главная медицинская сестра",
		role: "member",
		roleRu: "Член комиссии",
	},
	{
		fullName: "Лебедева Елена Николаевна",
		position: "Ведущий бухгалтер",
		role: "accountant",
		roleRu: "Бухгалтер-ревизор",
	},
];

export const DEFAULT_INVENTORY_ITEMS_PRESET: readonly WarehouseAuditItemLine[] = [
	computeAuditLineItem({
		itemId: "mat_ultracain_forte",
		sku: "AN-ULTRA-01",
		nameRu: "Ультракаин Д-С Форте (100 карпул/уп)",
		category: "Анестетики",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-2026A44",
		manufactureDate: "2024-01-10",
		expiryDate: "2027-12-31",
		storageLocationRu: "Стеллаж А-1, Полка 2",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 15,
		actualQuantity: 15,
		unitCostKopecks: 650000, // 6 500.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_septanest_adren",
		sku: "AN-SEPT-02",
		nameRu: "Септанест с адреналином 1:100 000 (50 карпул)",
		category: "Анестетики",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-2024S19",
		manufactureDate: "2023-05-15",
		expiryDate: "2026-08-15", // Просрочен
		storageLocationRu: "Стеллаж А-1, Полка 3",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 8,
		actualQuantity: 8,
		unitCostKopecks: 420000, // 4 200.00 ₽
		isWriteoffRequired: true,
	}),
	computeAuditLineItem({
		itemId: "mat_filtek_z250_a2",
		sku: "COMP-Z250-A2",
		nameRu: "Композит Filtek Z250 шприц 4г, оттенок A2",
		category: "Композиты и адгезивы",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-FLTK-992",
		manufactureDate: "2024-03-01",
		expiryDate: "2026-09-15", // < 30 дней
		storageLocationRu: "Стеллаж Б-2, Сейф 1",
		temperatureRegimeRu: "+18°C..+23°C",
		bookQuantity: 20,
		actualQuantity: 22, // Излишек +2
		unitCostKopecks: 285000, // 2 850.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_filtek_supreme_a3b",
		sku: "COMP-SUPR-A3B",
		nameRu: "Filtek Supreme XTE Universal Body A3B 4г",
		category: "Композиты и адгезивы",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-XTE-4410",
		manufactureDate: "2024-06-10",
		expiryDate: "2026-10-20", // < 60 дней
		storageLocationRu: "Стеллаж Б-2, Сейф 1",
		temperatureRegimeRu: "+18°C..+23°C",
		bookQuantity: 12,
		actualQuantity: 10, // Недостача -2
		unitCostKopecks: 360000, // 3 600.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_single_bond_universal",
		sku: "ADH-SBU-05",
		nameRu: "Адгезив Single Bond Universal 5 мл",
		category: "Композиты и адгезивы",
		unitRu: "фл",
		okeiCode: "796",
		batchNumber: "LOT-SBU-811",
		manufactureDate: "2024-08-01",
		expiryDate: "2027-08-01", // Свежий
		storageLocationRu: "Холодильник ХОЛ-1 (+4°C)",
		temperatureRegimeRu: "+2°C..+8°C",
		bookQuantity: 6,
		actualQuantity: 6,
		unitCostKopecks: 540000, // 5 400.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_impl_osstem_40_10",
		sku: "IMP-OSST-4010",
		nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
		category: "Имплантология",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-OS-5541",
		manufactureDate: "2024-02-15",
		expiryDate: "2029-06-30",
		storageLocationRu: "Сейф имплантатов С-1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 10,
		actualQuantity: 9, // Недостача -1
		unitCostKopecks: 1250000, // 12 500.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_bio_oss_05g",
		sku: "BONE-BIOOSS-05",
		nameRu: "Костный заменитель Geistlich Bio-Oss гранулы 0.5г",
		category: "Имплантология и хирургия",
		unitRu: "фл",
		okeiCode: "796",
		batchNumber: "LOT-OSS-3129",
		manufactureDate: "2024-04-12",
		expiryDate: "2028-04-12",
		storageLocationRu: "Сейф имплантатов С-1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 8,
		actualQuantity: 8,
		unitCostKopecks: 1120000, // 11 200.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_suture_vicryl_40",
		sku: "SUT-VIC-40",
		nameRu: "Шовный материал Vicryl 4-0 колющая игла 17 мм",
		category: "Хирургия и шовный материал",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-ETH-2041",
		manufactureDate: "2024-01-20",
		expiryDate: "2028-01-20",
		storageLocationRu: "Стеллаж В-1, Бокс 4",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 14,
		actualQuantity: 14,
		unitCostKopecks: 480000, // 4 800.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_alginate_hydrogum",
		sku: "IMP-HYDR-453",
		nameRu: "Альгинатная слепочная масса Hydrogum 5 453г",
		category: "Ортопедия и слепочные массы",
		unitRu: "пак",
		okeiCode: "166",
		batchNumber: "LOT-ZHM-110",
		manufactureDate: "2024-05-10",
		expiryDate: "2027-05-10",
		storageLocationRu: "Стеллаж Г-3, Полка 1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 18,
		actualQuantity: 19, // Излишек +1
		unitCostKopecks: 145000, // 1 450.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_disinf_surfanios_5l",
		sku: "DS-SURF-5L",
		nameRu: "Дезинфицирующее средство Сурфаниос Лемон Фреш 5л",
		category: "Дезинфекция и стерилизация",
		unitRu: "кан",
		okeiCode: "112",
		batchNumber: "LOT-AN-8802",
		manufactureDate: "2023-01-10",
		expiryDate: "2026-08-01", // Просрочен
		storageLocationRu: "Зона дезсредств Д-1",
		temperatureRegimeRu: "+5°C..+25°C",
		bookQuantity: 4,
		actualQuantity: 4,
		unitCostKopecks: 620000, // 6 200.00 ₽
		isWriteoffRequired: true,
	}),
];

