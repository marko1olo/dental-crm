import {
	type ChestnyZnakScannedItem,
	createChestnyZnakScannedItem,
} from "@dental/shared";
export { createChestnyZnakScannedItem, type ChestnyZnakScannedItem };
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage.js";

export interface MdlpOfflinePackage {
	readonly id: string;
	readonly createdAt: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly mode: "acceptance_701" | "disposal_531" | "disposal_444";
	readonly itemsCount: number;
	readonly totalCostRub: number;
	readonly items: readonly ChestnyZnakScannedItem[];
	readonly status: "queued" | "syncing" | "synced";
	readonly reason: string;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly protocolNumber?: string | undefined; // 043/у
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
 * Изоляция демонстрационных штрихкодов МДЛП от боевого контура (Mandate 8c Zero Mocks).
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

// ─────────────────────────────────────────────────────────────────────────────
// FASTIFY BACKEND & POSTGRESQL 18 INTEGRATION (ZERO MOCKS MANDATE 8C/8F)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Отправка отсканированного 2D DataMatrix в Fastify API (/api/mdlp/scan)
 * с фиксацией в таблице PostgreSQL mdlp_items.
 */
export async function submitMdlpBarcodeScan(
	rawBarcode: string,
	autoRegister = true,
): Promise<{
	success: boolean;
	item?: Record<string, unknown> | null;
	parsed?: any;
	status?: string;
	error?: string;
}> {
	try {
		const res = await fetch("/api/mdlp/scan", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({ rawBarcode, autoRegister }),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => null);
			return {
				success: false,
				error: err?.message || `Ошибка сканирования в МДЛП (${res.status})`,
			};
		}

		const data = await res.json();
		return {
			success: true,
			item: data?.item ?? null,
			parsed: data?.parsed ?? null,
			status: data?.status ?? "in_stock",
		};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Сетевой сбой при связи с сервером МДЛП";
		return { success: false, error: msg };
	}
}

/**
 * Честная синхронизация очереди списаний МДЛП с бэкендом Fastify и БД PostgreSQL.
 * Заменяет фиктивное выставление статуса "synced" в localStorage на реальную отправку в /api/mdlp/dispose-batch.
 */
export async function syncMdlpQueueToBackend(
	queue: readonly MdlpOfflinePackage[],
): Promise<{
	syncedCount: number;
	failedCount: number;
	updatedQueue: MdlpOfflinePackage[];
}> {
	const queuedPackages = queue.filter((p) => p.status !== "synced");
	if (queuedPackages.length === 0) {
		return { syncedCount: 0, failedCount: 0, updatedQueue: [...queue] };
	}

	let syncedCount = 0;
	let failedCount = 0;
	const updated = queue.map((pkg) => {
		if (pkg.status === "synced") return pkg;
		return { ...pkg };
	});

	for (let i = 0; i < updated.length; i++) {
		const current = updated[i];
		if (!current || current.status === "synced") continue;

		try {
			const res = await fetch("/api/mdlp/dispose-batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					docNum: current.docNum,
					docDate: current.docDate,
					patientId: current.patientId ?? undefined,
					visitId: current.visitId ?? undefined,
					reason: current.reason || "Оказание медпомощи (синхронизация офлайн-буфера)",
					items: current.items.map((it) => ({
						rawBarcode: it.rawBarcode,
						sgtin: it.sgtin,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						patientId: current.patientId ?? undefined,
						visitId: current.visitId ?? undefined,
					})),
				}),
			});

			if (res.ok) {
				updated[i] = { ...current, status: "synced" };
				syncedCount++;
			} else {
				failedCount++;
			}
		} catch {
			failedCount++;
		}
	}

	saveMdlpOfflineQueue(updated);
	return { syncedCount, failedCount, updatedQueue: updated };
}

/**
 * Получение активной очереди списания МДЛП с бэкенда Fastify (/api/mdlp/queue)
 */
export async function fetchMdlpLiveQueue(): Promise<MdlpOfflinePackage[]> {
	try {
		const res = await fetch("/api/mdlp/queue", {
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
		});

		if (!res.ok) return [];
		const data = await res.json();
		if (!Array.isArray(data?.queue)) return [];

		return data.queue.map((item: any, idx: number) => ({
			id: item.id || `live-mdlp-q-${idx}`,
			createdAt: item.queuedAt || new Date().toISOString(),
			docNum: `АКТ-ОЧЕРЕДЬ-${idx + 1}`,
			docDate: new Date().toISOString().slice(0, 10),
			mode: "disposal_531",
			itemsCount: 1,
			totalCostRub: Number(item.costRub || 0),
			items: item.rawBarcode
				? [createChestnyZnakScannedItem(item.rawBarcode, { costRub: Number(item.costRub || 0) })]
				: [],
			status: "queued",
			reason: "Очередь выбытия карпул анестетиков (кабинет)",
			patientId: item.patientId,
			visitId: item.visitId,
		}));
	} catch {
		return [];
	}
}

