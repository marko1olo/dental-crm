import type { AcceptanceWaybillItem } from "../acceptanceWaybillsTypes.js";
import { createWaybillItem } from "./acceptanceWaybillItemFactory.js";

export function getSampleDentalWaybillItems(receiptDateIso: string): AcceptanceWaybillItem[] {
	const getFutureDate = (monthsAhead: number) => {
		const d = new Date(receiptDateIso);
		d.setMonth(d.getMonth() + monthsAhead);
		return d.toISOString().slice(0, 10);
	};

	return [
		createWaybillItem({
			id: "item_septanest",
			name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
			category: "Анестетики",
			unit: "упак",
			batchNumber: "SEPT-2026A18",
			expirationDate: getFutureDate(22),
			quantity: 10,
			unitPriceKopecks: 540000,
			vatRate: 0,
			sku: "AN-SEPT-100",
			barcode: "4607001234567",
			notes: "Анестетик артикаинового ряда (Рег. уд. ЛС-002134)",
		}),
		createWaybillItem({
			id: "item_filtek",
			name: "Композит Filtek Z250 шприц 4г (оттенок A2, 3M ESPE)",
			category: "Терапия / Композиты",
			unit: "шт",
			batchNumber: "FLTK-88941",
			expirationDate: getFutureDate(30),
			quantity: 8,
			unitPriceKopecks: 295000,
			vatRate: 0,
			sku: "COMP-FLTK-Z250",
			barcode: "4046719001234",
			notes: "Светоотверждаемый пломбировочный материал",
		}),
		createWaybillItem({
			id: "item_optibond",
			name: "Адгезивная система OptiBond FL (набор: праймер 8мл + адгезив 8мл, Kerr)",
			category: "Адгезивы",
			unit: "набор",
			batchNumber: "OPTB-70231",
			expirationDate: getFutureDate(18),
			quantity: 3,
			unitPriceKopecks: 890000,
			vatRate: 0,
			sku: "ADH-OPTB-FL",
			barcode: "7611234567890",
			notes: "Золотой стандарт адгезии 4-го поколения",
		}),
		createWaybillItem({
			id: "item_protaper",
			name: "Эндодонтические файлы ProTaper Universal Starter Kit F1-F3 (6 шт/уп)",
			category: "Эндодонтия",
			unit: "упак",
			batchNumber: "PROT-49120",
			expirationDate: getFutureDate(48),
			quantity: 5,
			unitPriceKopecks: 385000,
			vatRate: 0,
			sku: "ENDO-PROT-UNI",
			barcode: "4011234567891",
			notes: "Никель-титановые ротационные файлы",
		}),
		createWaybillItem({
			id: "item_saliva",
			name: "Слюноотсосы одноразовые со съемным наконечником (100 шт/уп)",
			category: "Расходные материалы",
			unit: "упак",
			batchNumber: "SLVN-99412",
			expirationDate: getFutureDate(40),
			quantity: 20,
			unitPriceKopecks: 38000,
			vatRate: 0,
			sku: "DISP-SALIV-100",
			barcode: "8001234567892",
			notes: "Медицинские изделия однократного применения",
		}),
		createWaybillItem({
			id: "item_gloves",
			name: "Перчатки смотровые нитриловые неопудренные размер M (100 шт/уп)",
			category: "СИЗ",
			unit: "упак",
			batchNumber: "GLV-2026M09",
			expirationDate: getFutureDate(32),
			quantity: 15,
			unitPriceKopecks: 45000,
			vatRate: 20,
			sku: "PPE-GLV-NITR-M",
			barcode: "4601234567893",
			notes: "Средства индивидуальной защиты персонала",
		}),
	];
}
