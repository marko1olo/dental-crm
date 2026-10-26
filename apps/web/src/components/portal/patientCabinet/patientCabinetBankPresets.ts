/**
 * Popular SBP Bank Apps in Russia
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 1 PRESETS)
 */

import type { SbpBankMember } from "./patientCabinetTypes.js";

export const SBP_POPULAR_BANKS: readonly SbpBankMember[] = [
	{
		id: "sber",
		nameRu: "СберБанк Онлайн",
		schemaPrefix: "sberpay://qr/sub?qrId=",
		brandColorHex: "#21a038",
		popular: true,
	},
	{
		id: "tbank",
		nameRu: "Т-Банк (Тинькофф)",
		schemaPrefix: "tinkoffbank://qr?id=",
		brandColorHex: "#ffdd2d",
		popular: true,
	},
	{
		id: "alfa",
		nameRu: "Альфа-Банк",
		schemaPrefix: "alfabank://qr/pay?qrId=",
		brandColorHex: "#ef3124",
		popular: true,
	},
	{
		id: "vtb",
		nameRu: "ВТБ Онлайн",
		schemaPrefix: "vtb://sbp/pay?qrId=",
		brandColorHex: "#0a2896",
		popular: true,
	},
	{
		id: "sbp_generic",
		nameRu: "Другой банк (СБП)",
		schemaPrefix: "https://qr.nspk.ru/",
		brandColorHex: "#1a56db",
		popular: false,
	},
];
