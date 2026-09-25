import {
	type ChestnyZnakScannedItem,
	createChestnyZnakScannedItem,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage.js";

export interface MdlpOfflinePackage {
	readonly id: string;
	readonly createdAt: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly mode: "acceptance_701" | "disposal_531";
	readonly itemsCount: number;
	readonly totalCostRub: number;
	readonly items: readonly ChestnyZnakScannedItem[];
	readonly status: "queued" | "syncing" | "synced";
	readonly reason: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = "dente_mdlp_offline_disposal_queue_v1";

export function loadMdlpOfflineQueue(): MdlpOfflinePackage[] {
	try {
		const raw = safeLocalStorageGetItem(OFFLINE_QUEUE_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveMdlpOfflineQueue(queue: readonly MdlpOfflinePackage[]): void {
	try {
		safeLocalStorageSetItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
	} catch {
		// Ignore storage write issues
	}
}

export const SAMPLE_BARCODES = [
	{
		label: "Ультракаин® Д-С форте",
		code: "0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Септанест 1:100 000",
		code: "010340093000001421SN9876543210\x1d17271231\x1d10SER99\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 390,
	},
	{
		label: "Убистезин",
		code: "010404671900001221UBI1234567890\x1d17280331\x1d10LOT42\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 520,
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
		code: "010340093000002121SCANDO98765\x1d17281231\x1d10SER77\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 420,
		badge: "Без адреналина",
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
