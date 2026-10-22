import type { DepositOperationRecord } from "./types";

export const PRESET_TOPUP_AMOUNTS = [1000, 5000, 10000, 20000] as const;
export const PRESET_CHARGE_AMOUNTS = [1000, 5000, 10000] as const;

export const INITIAL_DEPOSIT_OPERATIONS: DepositOperationRecord[] = [
	{
		id: "op-1",
		date: "18.09.2026",
		time: "14:25",
		type: "deposit",
		typeLabelRu: "Внесение аванса",
		amountRub: 5000,
		method: "card",
		methodLabelRu: "Банковская карта",
		status: "completed",
		note: "Пополнение депозита перед началом терапии",
	},
	{
		id: "op-2",
		date: "18.09.2026",
		time: "15:40",
		type: "charge",
		typeLabelRu: "Зачёт в счёт приёма",
		amountRub: 500,
		method: "card",
		methodLabelRu: "Депозит пациента",
		status: "completed",
		note: "Оплата анестезии и снимка 1.6",
	},
	{
		id: "op-3",
		date: "04.08.2026",
		time: "12:10",
		type: "family_share",
		typeLabelRu: "Семейный аванс",
		amountRub: 10000,
		method: "sbp",
		methodLabelRu: "СБП (QR-код)",
		status: "completed",
		note: "Пополнение общего семейного счёта",
	},
];
