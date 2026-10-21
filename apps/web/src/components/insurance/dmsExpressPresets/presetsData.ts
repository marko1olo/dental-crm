/**
 * presetsData.ts — Стандартные справочники диагнозов, зубной формулы FDI и демо-позиций визита
 */

import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { BillItemToSplit } from "./types.js";

export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", title: "Кариес дентина", name: "Кариес дентина" },
	{ code: "K02.2", title: "Кариес цемента", name: "Кариес цемента" },
	{ code: "K04.0", title: "Пульпит (острый/хронический)", name: "Пульпит (острый/хронический)" },
	{ code: "K04.4", title: "Острый апикальный периодонтит", name: "Острый апикальный периодонтит" },
	{ code: "K04.5", title: "Хронический апикальный периодонтит", name: "Хронический апикальный периодонтит" },
	{ code: "K05.1", title: "Хронический гингивит", name: "Хронический гингивит" },
	{ code: "K05.3", title: "Хронический пародонтит", name: "Хронический пародонтит" },
	{ code: "K01.1", title: "Дистопия/ретенция зуба мудрости", name: "Дистопия/ретенция зуба мудрости" },
	{ code: "K08.1", title: "Потеря зубов вследствие удаления/травмы", name: "Потеря зубов вследствие удаления/травмы" },
] as const;

export const FDI_ADULT_TEETH_UPPER = [
	"1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1",
	"2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
] as const;

export const FDI_ADULT_TEETH_LOWER = [
	"4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1",
	"3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
] as const;

export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly BillItemToSplit[] = [
	{
		id: "bill-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000,
	},
	{
		id: "bill-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000,
	},
	{
		id: "bill-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000,
	},
];

export function getActiveBillItemsToSplit(
	isDemo = isDemoShowcaseMode(),
): readonly BillItemToSplit[] {
	return isDemo ? DEFAULT_BILL_ITEMS_TO_SPLIT : [];
}
