import { type ChestnyZnakScannedItem, createChestnyZnakScannedItem } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { type MdlpOfflinePackage, saveMdlpOfflineQueue } from "./mdlpOfflineQueue.js";

/** Отправка отсканированного 2D DataMatrix в API (/api/mdlp/scan) */
export async function submitMdlpBarcodeScan(
	rawBarcode: string,
	autoRegister = true,
): Promise<{ success: boolean; item?: Record<string, unknown> | null; parsed?: any; status?: string; error?: string }> {
	try {
		const res = await fetch("/api/mdlp/scan", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ rawBarcode, autoRegister }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => null);
			return { success: false, error: err?.message || `Ошибка сканирования маркировки (${res.status})` };
		}
		const data = await res.json();
		return { success: true, item: data?.item ?? null, parsed: data?.parsed ?? null, status: data?.status ?? "in_stock" };
	} catch (err: unknown) {
		return { success: false, error: err instanceof Error ? err.message : "Сетевой сбой при связи с сервером" };
	}
}

/** Реальный health-check статуса связи со шлюзом МДЛП Честный Знак ЦРПТ (Мандат 8e / [MDL-02]) */
export async function fetchMdlpStatus(): Promise<{
	status: "online" | "degraded" | "offline";
	mode: string;
	isConnected: boolean;
	message: string;
	registeredItemsCount: number;
	disposedItemsCount: number;
	pendingQueueCount: number;
	lastCheckAt: string;
}> {
	try {
		const res = await fetch("/api/mdlp/status", {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return {
			status: data?.status ?? "offline",
			mode: data?.mode ?? "offline_autonomous",
			isConnected: Boolean(data?.isConnected),
			message: data?.message ?? "Автономный контур клиники",
			registeredItemsCount: Number(data?.registeredItemsCount ?? 0),
			disposedItemsCount: Number(data?.disposedItemsCount ?? 0),
			pendingQueueCount: Number(data?.pendingQueueCount ?? 0),
			lastCheckAt: data?.lastCheckAt ?? new Date().toISOString(),
		};
	} catch {
		return {
			status: "offline",
			mode: "offline_autonomous",
			isConnected: false,
			message: "Автономный контур клиники (офлайн)",
			registeredItemsCount: 0,
			disposedItemsCount: 0,
			pendingQueueCount: 0,
			lastCheckAt: new Date().toISOString(),
		};
	}
}

/** Запрос реальных препаратов на балансе организации из PostgreSQL для списания смены */
export async function fetchMdlpInStockItems(limit = 10): Promise<ChestnyZnakScannedItem[]> {
	try {
		const res = await fetch(`/api/mdlp/items?status=in_stock&limit=${limit}`, {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		});
		if (!res.ok) return [];
		const data = await res.json();
		if (!Array.isArray(data?.items)) return [];

		return data.items.map((row: any) =>
			createChestnyZnakScannedItem(row.rawBarcode || row.sgtin, {
				costRub: row.costRub ? Number(row.costRub) : 450,
			}),
		);
	} catch {
		return [];
	}
}

/** Синхронизация очереди списаний МДЛП с бэкендом Fastify и БД PostgreSQL */
export async function syncMdlpQueueToBackend(
	queue: readonly MdlpOfflinePackage[],
): Promise<{ syncedCount: number; failedCount: number; updatedQueue: MdlpOfflinePackage[] }> {
	const queuedPackages = queue.filter((p) => p.status !== "synced");
	if (queuedPackages.length === 0) return { syncedCount: 0, failedCount: 0, updatedQueue: [...queue] };

	let syncedCount = 0;
	let failedCount = 0;
	const updated = queue.map((pkg) => (pkg.status === "synced" ? pkg : { ...pkg }));

	for (let i = 0; i < updated.length; i++) {
		const current = updated[i];
		if (!current || current.status === "synced") continue;
		try {
			const res = await fetch("/api/mdlp/dispose-batch", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					docNum: current.docNum,
					docDate: current.docDate,
					patientId: current.patientId ?? undefined,
					visitId: current.visitId ?? undefined,
					reason: current.reason || "Списание при оказании медпомощи",
					items: current.items.map((it) => ({
						rawBarcode: it.rawBarcode, sgtin: it.sgtin, gtin: it.gtin, serialNumber: it.serialNumber, costRub: it.costRub,
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

/** Получение активной очереди списания маркировки с сервера */
export async function fetchMdlpLiveQueue(): Promise<MdlpOfflinePackage[]> {
	try {
		const res = await fetch("/api/mdlp/queue", {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		});
		if (!res.ok) return [];
		const data = await res.json();
		if (!Array.isArray(data?.queue)) return [];

		return data.queue.map((item: any, idx: number) => ({
			id: item.id || `live-mdlp-q-${idx}`,
			createdAt: item.queuedAt || new Date().toISOString(),
			docNum: `АКТ-СЛИВ-${idx + 1}`,
			docDate: new Date().toISOString().slice(0, 10),
			mode: "care_dispense",
			itemsCount: 1,
			totalCostRub: Number(item.costRub || 0),
			items: item.rawBarcode ? [createChestnyZnakScannedItem(item.rawBarcode, { costRub: Number(item.costRub || 0) })] : [],
			status: "queued",
			reason: "Очередь списания карпул (кабинет)",
			patientId: item.patientId,
			visitId: item.visitId,
		}));
	} catch {
		return [];
	}
}
