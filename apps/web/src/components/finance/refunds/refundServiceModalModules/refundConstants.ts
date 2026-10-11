import type { RefundClinicInfo, RefundServiceItem } from "./types";

export const DEFAULT_FALLBACK_SERVICES: readonly RefundServiceItem[] = [
	{ id: "srv-1", name: "Восстановление зуба пломбой (светоотверждаемый композит Filtek)", code804n: "A16.07.002.001", toothNumber: 46, priceRub: 4500, quantity: 1, doctorName: "Лечащий врач", commissionPct: 30, materialCostRub: 350 },
	{ id: "srv-2", name: "Анестезия инфильтрационная (Убистезин Форте 1:100000)", code804n: "B01.003.004.004", toothNumber: 46, priceRub: 900, quantity: 1, doctorName: "Лечащий врач", commissionPct: 30, materialCostRub: 120 },
	{ id: "srv-3", name: "Изоляция операционного поля (Коффердам / Раббердам)", code804n: "A16.07.002", toothNumber: 46, priceRub: 800, quantity: 1, doctorName: "Лечащий врач", commissionPct: 30, materialCostRub: 150 },
	{ id: "srv-4", name: "Прицельная внутриротовая радиовизиография", code804n: "A06.07.007", toothNumber: 46, priceRub: 600, quantity: 1, doctorName: "Лечащий врач", commissionPct: 20, materialCostRub: 0 },
	{ id: "srv-5", name: "Полировка и финишная обработка реставрации Enhance", code804n: "A16.07.025", toothNumber: 46, priceRub: 700, quantity: 1, doctorName: "Лечащий врач", commissionPct: 30, materialCostRub: 80 },
];

export const DEFAULT_CLINIC_INFO: RefundClinicInfo = {
	name: "ООО «СТОМАТОЛОГИЯ ДЕНТЕ»",
	inn: "7801234567",
	kpp: "780101001",
	address: "г. Санкт-Петербург, Невский пр-т, д. 140",
};
