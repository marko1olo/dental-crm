import { type ChestnyZnakScannedItem, createChestnyZnakScannedItem } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export const SAMPLE_BARCODES = [
	{
		label: "Ультракаин® Д-С форте",
		code: "0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Септанест 1:100 000",
		code: "010340093000001421SN09876543210\x1d17271231\x1d10SER99\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 390,
	},
	{
		label: "Убистезин",
		code: "010404671900001221UBI1234567890\x1d17280331\x1d10LOT42\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 520,
	},
	{
		label: "Хлоргексидина биглюконат 0.05% (100 мл)",
		code: "010460123456789321CHX1234567890\x1d17280630\x1d10LOTCHX26\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 85,
	},
	{
		label: "Мирамистин 0.01% (150 мл)",
		code: "010460700836005921MIR1234567890\x1d17280930\x1d10LOTMIR26\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 410,
	},
	{
		label: "Просроченный (2024)",
		code: "010366479800001621SNEXPIRED123\x1d17240101\x1d10EXP01\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Ошибка КС GTIN",
		code: "010366479800001921SNBADCHECKSUM\x1d17280531\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
];

/**
 * Изоляция демонстрационных кодов маркировки от боевого контура (Мандат 8wy).
 * В боевом режиме (production) возвращает пустой массив (0% моков), в демо — образцы.
 */
export function getMdlpSampleBarcodes(
	isDemo = isDemoShowcaseMode(),
): readonly (typeof SAMPLE_BARCODES)[number][] {
	return isDemo ? SAMPLE_BARCODES : [];
}

export const EMERGENCY_DISPENSE_PRESETS = [
	{
		label: "Ультракаин® Д-С форте 1:100 000 (1 карпула)",
		shortName: "Ультракаин 1:100 000",
		code: SAMPLE_BARCODES[0]!.code,
		cost: 450,
		badge: "Анестезия",
	},
	{
		label: "Септанест 1:100 000 (1 карпула)",
		shortName: "Септанест 1:100 000",
		code: SAMPLE_BARCODES[1]!.code,
		cost: 390,
		badge: "Анестезия",
	},
	{
		label: "Скандонест 3% (Мепивакаин без адреналина)",
		shortName: "Скандонест (Мепивакаин)",
		code: "010340093000002121SCANDO987654\x1d17281231\x1d10SER77\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 420,
		badge: "Без адреналина",
	},
	{
		label: "Хлоргексидина биглюконат 0.05% (Антисептик)",
		shortName: "Хлоргексидин 0.05%",
		code: SAMPLE_BARCODES[3]!.code,
		cost: 85,
		badge: "Антисептик",
	},
	{
		label: "Мирамистин 0.01% (Антисептический раствор)",
		shortName: "Мирамистин 0.01%",
		code: SAMPLE_BARCODES[4]!.code,
		cost: 410,
		badge: "Антисептик",
	},
	{
		label: "Имплантат Dentium SuperLine Ø4.0 L10",
		shortName: "Dentium Ø4.0 L10",
		code: "010880946282001521DENTIUM123456\x1d17291231\x1d10LOTDENT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 12500,
		badge: "Имплант",
	},
	{
		label: "Имплантат Osstem TS III SA Ø4.5 L10",
		shortName: "Osstem TS III Ø4.5",
		code: "010880946282002221OSSTEM987654\x1d17291231\x1d10LOTOSS2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 11900,
		badge: "Имплант",
	},
];

/** Пакетное формирование карпул анестетика за смену без поштучного сканирования у кресла (Мандат 8n) */
export function createShiftCarpulesBatch(count = 10): readonly ChestnyZnakScannedItem[] {
	const now = new Date();
	const series = `ART-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
	const batch: ChestnyZnakScannedItem[] = [];

	for (let i = 1; i <= count; i++) {
		const serial = `SN${String(i).padStart(4, "0")}${1000 + i}`;
		const rawCode = `010366479800001621${serial}\x1d17280531\x1d10${series}\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234`;
		const item = createChestnyZnakScannedItem(rawCode, { costRub: 450 });
		batch.push(item);
	}
	return batch;
}
