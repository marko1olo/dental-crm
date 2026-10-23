import type { InboundWaybillLine } from "./inboundWaybillTypes.js";

export const CANONICAL_SUPPLIERS = [
	{ id: "sup_stomtorg", name: "ООО «Стомторг»", inn: "7701234567" },
	{ id: "sup_kavo", name: "KaVo Dental Russland", inn: "7705432109" },
	{ id: "sup_vladmiva", name: "ЗАО «ВладМиВа»", inn: "3123012345" },
	{ id: "sup_dentalmarket", name: "ООО «ДенталМаркет»", inn: "7709876543" },
	{ id: "sup_3m", name: "3M ESPE Стоматология", inn: "7725019876" },
];

export const SAMPLE_PRESETS: Record<string, InboundWaybillLine[]> = {
	stomtorg: [
		{ id: "p1", name: "Септанест 1:100 000 (Septodont)", lotNumber: "LOT-SEP2026-01", expirationDate: "2028-10-31", quantity: 5, unit: "уп", unitCostRub: 4200, category: "anesthesia" },
		{ id: "p2", name: "Филтек Z250 шприц 4г (3M ESPE)", lotNumber: "LOT-FLK2026-A2", expirationDate: "2027-12-31", quantity: 4, unit: "шт", unitCostRub: 2850, category: "composite" },
		{ id: "p3", name: "ОптиБонд FL набор (Kerr)", lotNumber: "LOT-OPT2026-04", expirationDate: "2027-06-30", quantity: 2, unit: "наб", unitCostRub: 8900, category: "composite" },
		{ id: "p4", name: "Крафт-пакеты СтериТ 100х200мм", lotNumber: "LOT-ST-2026", expirationDate: "2029-05-31", quantity: 10, unit: "уп", unitCostRub: 650, category: "sterilization" },
	],
	consumables: [
		{ id: "c1", name: "Перчатки нитриловые неопудренные (M)", lotNumber: "LOT-GLV-26M", expirationDate: "2029-01-31", quantity: 15, unit: "уп", unitCostRub: 580, category: "consumables" },
		{ id: "c2", name: "Слюноотсосы одноразовые (100 шт.)", lotNumber: "LOT-SL-2026", expirationDate: "2029-12-31", quantity: 10, unit: "уп", unitCostRub: 320, category: "consumables" },
		{ id: "c3", name: "Валики ватные стоматологические №2", lotNumber: "LOT-COT-26", expirationDate: "2029-08-31", quantity: 12, unit: "уп", unitCostRub: 290, category: "consumables" },
		{ id: "c4", name: "Нагрудники для пациентов 2-слойные", lotNumber: "LOT-BIB-26", expirationDate: "2029-12-31", quantity: 8, unit: "уп", unitCostRub: 450, category: "consumables" },
	],
};
