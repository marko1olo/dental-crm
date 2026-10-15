/**
 * apps/web/src/components/billing/cashRegisterDrawerData.ts
 *
 * Types and telemetry mock presets for CashRegisterDrawer.
 */

import type { ReceiptItem } from "./ReceiptPreview.js";

export interface ShiftReceiptEntry {
	readonly id: string;
	readonly number: string;
	readonly time: string;
	readonly patientName: string;
	readonly totalRub: number;
	readonly method: "card" | "sbp" | "cash" | "split" | "warranty";
	readonly items: readonly ReceiptItem[];
}

export const DEFAULT_RECENT_RECEIPTS: readonly ShiftReceiptEntry[] = [
	{
		id: "rec-104",
		number: "0104",
		time: "15:42",
		patientName: "Смирнов Алексей Игоревич",
		totalRub: 12500,
		method: "card",
		items: [
			{ name: "Лечение глубокого кариеса (световая пломба Estelite)", quantity: 1, priceRub: 7500, amountRub: 7500, code804n: "A16.07.002" },
			{ name: "Анестезия инфильтрационная (Убистезин Форте)", quantity: 1, priceRub: 1500, amountRub: 1500, code804n: "B01.003.004.005" },
			{ name: "Комплексная гигиена полости рта (AirFlow)", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.051" },
		],
	},
	{
		id: "rec-103",
		number: "0103",
		time: "14:15",
		patientName: "Иванова Ольга Сергеевна",
		totalRub: 9000,
		method: "sbp",
		items: [
			{ name: "Профессиональная чистка и полировка зубов", quantity: 1, priceRub: 5500, amountRub: 5500, code804n: "A16.07.051" },
			{ name: "Ремтерапия эмали фторлаком (2 челюсти)", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.053" },
		],
	},
	{
		id: "rec-102",
		number: "0102",
		time: "12:30",
		patientName: "Ковалев Дмитрий Сергеевич",
		totalRub: 7500,
		method: "cash",
		items: [
			{ name: "Удаление подвижного молочного зуба", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.001" },
			{ name: "Наложение лечебной повязки Альвожиль", quantity: 1, priceRub: 4000, amountRub: 4000, code804n: "A15.07.001" },
		],
	},
];
