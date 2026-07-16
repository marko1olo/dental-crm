import { create } from "zustand";

// DEV-only sync engine trace (stripped in production builds)
const _devLog = import.meta.env.DEV ? console.log.bind(console) : () => {};

// --- ZUSTAND SYNC STORE ---
export interface SyncState {
	queueCount: number;
	isOnline: boolean;
	topology: "local" | "cloud" | "sandbox";
	hasConflict: boolean;
	conflictingRecord: {
		id: string;
		table: string;
		local: any;
		remote: any;
	} | null;
	setQueueCount: (count: number) => void;
	setIsOnline: (online: boolean) => void;
	setTopology: (topology: "local" | "cloud" | "sandbox") => void;
	setHasConflict: (conflict: boolean, record?: any) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
	queueCount: 0,
	isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
	topology: "cloud",
	hasConflict: false,
	conflictingRecord: null,
	setQueueCount: (queueCount) => set({ queueCount }),
	setIsOnline: (isOnline) => set({ isOnline }),
	setTopology: (topology) => set({ topology }),
	setHasConflict: (hasConflict, record = null) =>
		set({ hasConflict, conflictingRecord: record }),
}));

// --- NATIVE INDEXEDDB PROMISE WRAPPER ---
const DB_NAME = "dente_offline_db";
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = (event: any) => {
			const db = request.result;
			const tables = [
				"patients",
				"visit_diaries",
				"tooth_states",
				"treatment_plans",
				"patient_invoices",
				"sync_queue",
			];
			tables.forEach((table) => {
				if (!db.objectStoreNames.contains(table)) {
					db.createObjectStore(table, { keyPath: "id" });
				}
			});
		};
	});
}

// Helper methods for IndexedDB mutations
export async function idbGet(table: string, id: string): Promise<any> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(table, "readonly");
		const store = tx.objectStore(table);
		const request = store.get(id);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function idbGetAll(table: string): Promise<any[]> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(table, "readonly");
		const store = tx.objectStore(table);
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result || []);
		request.onerror = () => reject(request.error);
	});
}

export async function idbPut(table: string, data: any): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(table, "readwrite");
		const store = tx.objectStore(table);
		const request = store.put(data);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function idbDelete(table: string, id: string): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(table, "readwrite");
		const store = tx.objectStore(table);
		const request = store.delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// --- GLOBAL FETCH HIJACKING & SIMULATOR ---
let originalFetch: typeof fetch;
let offlineMode = false;
let syncInProgress = false;

// Mock defaults when local database has no record yet
const DEFAULT_PATIENTS = [
	{
		id: "00000000-0000-0000-0000-000000000001",
		fullName: "Смирнов Алексей Васильевич",
		birthDate: "1988-05-12",
		phone: "+7 (999) 123-45-67",
		notes: "Хронический пульпит 36 зуба.",
		isSynced: true,
		version: 1,
		updatedAt: new Date().toISOString(),
	},
];

function offlineSandboxEnabled(): boolean {
	return (
		import.meta.env.VITE_DENTE_ENABLE_OFFLINE_SANDBOX === "1" ||
		import.meta.env.VITE_DENTE_ENABLE_OFFLINE_SANDBOX === "true"
	);
}

export function initAntifragility(options: { enabled?: boolean } = {}) {
	if (typeof window === "undefined") return;
	const enabled = options.enabled ?? offlineSandboxEnabled();
	if (!enabled) return;
	if ((window as any).__denteAntifragilityInitialized) return;
	(window as any).__denteAntifragilityInitialized = true;

	_devLog("[Antifragility] Activating explicit offline sandbox engine...");

	originalFetch = window.fetch;

	// Intercept global fetch
	window.fetch = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;

		// Only intercept local CRM API endpoints
		if (url.includes("/api/")) {
			const isMutating = !!(
				init?.method &&
				["POST", "PUT", "DELETE", "PATCH"].includes(init.method.toUpperCase())
			);

			// If network is offline or backend failed previously, route to IndexedDB Simulator
			if (offlineMode) {
				try {
					return await handleSimulatedApiRequest(url, init, isMutating);
				} catch (err: any) {
					console.error(
						"[Antifragility Simulator] Failed to handle mock request:",
						err,
					);
				}
			}

			// Online route check
			try {
				const response = await originalFetch(input, init);

				// If server returns 503/502/504, gracefully degrade to offline simulator
				if (response.status >= 502 && response.status <= 504) {
					console.warn(
						`[Antifragility] Server returned ${response.status}. Switching to Fully Offline Sandbox mode...`,
					);
					setOfflineMode(true);
					return await handleSimulatedApiRequest(url, init, isMutating);
				}

				return response;
			} catch (networkError: any) {
				console.warn(
					"[Antifragility] Network request failed. Switching to Fully Offline Sandbox mode...",
					networkError.message,
				);
				setOfflineMode(true);
				return await handleSimulatedApiRequest(url, init, isMutating);
			}
		}

		return originalFetch(input, init);
	};

	// Listen to browser network changes
	window.addEventListener("online", () => {
		_devLog("[Antifragility] Browser reports ONLINE.");
		void verifyBackendConnectivity();
	});

	window.addEventListener("offline", () => {
		_devLog("[Antifragility] Browser reports OFFLINE.");
		setOfflineMode(true);
	});

	// Start background sync loop
	startBackgroundSyncDaemon();
	void verifyBackendConnectivity();

	// Periodically ping backend every 15 seconds for automated self-healing
	setInterval(() => {
		void verifyBackendConnectivity();
	}, 15000);
}

export function setOfflineMode(offline: boolean) {
	offlineMode = offline;
	useSyncStore.getState().setIsOnline(!offline);
	useSyncStore.getState().setTopology(offline ? "sandbox" : "cloud");
	_devLog(
		`[Antifragility] Topology updated: offlineMode=${offlineMode}, mode=${useSyncStore.getState().topology}`,
	);
}

async function verifyBackendConnectivity() {
	try {
		const res = await originalFetch("/api/auth/user/me", { method: "GET" });
		if (res.status === 200) {
			setOfflineMode(false);
			_devLog(
				"[Antifragility] Connected to backend server successfully. Triggering sync...",
			);
			void runOfflineQueueSync();
		} else {
			setOfflineMode(true);
		}
	} catch {
		setOfflineMode(true);
	}
}

// --- INDEXEDDB API SIMULATOR ---
async function handleSimulatedApiRequest(
	url: string,
	init: any,
	isMutating: boolean,
): Promise<Response> {
	_devLog(
		`[Antifragility Simulator] Intercepted ${init?.method || "GET"} -> ${url}`,
	);

	// Route: /api/auth/user/me or /api/system/persistence/verify
	if (
		url.includes("/api/auth/user/me") ||
		url.includes("/api/system/persistence/verify")
	) {
		return mockJsonResponse({
			id: "demo-user",
			role: "admin",
			name: "Демо Врач",
		});
	}

	// Route: /api/dashboard
	if (url.includes("/api/dashboard")) {
		return mockJsonResponse({
			clinicName: "DENTE Offline Sandbox",
			todayVisitsCount: 2,
			activeDoctorsCount: 1,
			occupancyRate: 85,
		});
	}

	// Route: /api/patients
	if (url.includes("/api/patients")) {
		if (isMutating) {
			const payload = JSON.parse(init.body);
			const record = {
				id:
					payload.id ||
					Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295,
				...payload,
				isSynced: false,
				version: (payload.version || 0) + 1,
				updatedAt: new Date().toISOString(),
			};
			await idbPut("patients", record);
			await enqueueSyncTransaction("patients", record.id, "PUT", record);
			return mockJsonResponse(record);
		} else {
			let local = await idbGetAll("patients");
			if (local.length === 0) {
				for (const p of DEFAULT_PATIENTS) {
					await idbPut("patients", p);
				}
				local = DEFAULT_PATIENTS;
			}
			return mockJsonResponse(local);
		}
	}

	// Route: /api/diaries/visit/ or /api/diaries
	if (url.includes("/api/diaries")) {
		if (isMutating) {
			const payload = JSON.parse(init.body);
			const record = {
				id:
					payload.id ||
					Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295,
				...payload,
				isSynced: false,
				version: (payload.version || 0) + 1,
				updatedAt: new Date().toISOString(),
			};
			await idbPut("visit_diaries", record);
			await enqueueSyncTransaction("visit_diaries", record.id, "PUT", record);
			return mockJsonResponse(record);
		} else {
			const match = url.match(/\/api\/diaries\/visit\/([a-fA-F0-9-]+)/);
			if (match) {
				const visitId = match[1];
				const diaries = await idbGetAll("visit_diaries");
				const found = diaries.find((d) => d.visitId === visitId);
				if (found) return mockJsonResponse(found);
				return mockJsonResponse({
					id:
						Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295,
					visitId,
					patientId: "00000000-0000-0000-0000-000000000001",
					anamnesis: "Жалоб нет",
					statusLocalis: "Слизистая розовая, без изменений",
					treatmentDescription: "Профилактический осмотр",
					isLocked: false,
					isSynced: true,
					version: 1,
					updatedAt: new Date().toISOString(),
				});
			}
			const local = await idbGetAll("visit_diaries");
			return mockJsonResponse(local);
		}
	}

	// Route: /api/odontogram
	if (url.includes("/api/odontogram") || url.includes("/api/xray/scans")) {
		if (isMutating) {
			const payload = JSON.parse(init.body);
			const record = {
				id:
					payload.id ||
					Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295,
				...payload,
				isSynced: false,
				version: (payload.version || 0) + 1,
				updatedAt: new Date().toISOString(),
			};
			await idbPut("tooth_states", record);
			await enqueueSyncTransaction("tooth_states", record.id, "PUT", record);
			return mockJsonResponse(record);
		} else {
			const local = await idbGetAll("tooth_states");
			return mockJsonResponse(local);
		}
	}

	// Default fallback for any unhandled GET/POST
	return mockJsonResponse({
		success: true,
		message: "Sandbox Offline Simulator fallback",
	});
}

function mockJsonResponse(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

// --- SYNC QUEUE ENQUEUER ---
async function enqueueSyncTransaction(
	table: string,
	recordId: string,
	method: string,
	payload: any,
) {
	const transactionId =
		Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295;
	const tx = {
		id: transactionId,
		table,
		recordId,
		method,
		payload,
		timestamp: new Date().toISOString(),
	};
	await idbPut("sync_queue", tx);
	const queue = await idbGetAll("sync_queue");
	useSyncStore.getState().setQueueCount(queue.length);
	_devLog(
		`[Antifragility Queue] Transaction enqueued: id=${transactionId}, queueCount=${queue.length}`,
	);
}

// --- BACKGROUND SYNC DAEMON ---
let syncDaemonInterval: NodeJS.Timeout | null = null;
let syncAttempts = 0;

export async function runOfflineQueueSync() {
	if (syncInProgress) return;

	const queue = await idbGetAll("sync_queue");
	if (queue.length === 0) {
		useSyncStore.getState().setQueueCount(0);
		return;
	}

	syncInProgress = true;
	_devLog(
		`[Background Sync] Attempting to sync ${queue.length} transactions...`,
	);

	let backoffDelay = 0;
	if (syncAttempts > 0) {
		// Exponential backoff with jitter: min 1s, max 30s
		const base = 1000;
		const max = 30000;
		const exponential = base * 2 ** syncAttempts;
		const jitter =
			(Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295) *
			1000;
		backoffDelay = Math.min(max, exponential) + jitter;
		_devLog(
			`[Background Sync] Exponential backoff delay active: ${Math.round(backoffDelay)}ms`,
		);
		await new Promise((r) => setTimeout(r, backoffDelay));
	}

	try {
		for (const tx of queue) {
			// Skip syncing if this entity has an unresolved conflict
			const conflictState = useSyncStore.getState().conflictingRecord;
			if (conflictState && conflictState.id === tx.recordId) {
				console.warn(
					`[Background Sync] Skipping conflict-locked record: ${tx.recordId}`,
				);
				continue;
			}

			// Try pushing mutation to server
			const res = await originalFetch(`/api/system/sync/push`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					table: tx.table,
					method: tx.method,
					payload: tx.payload,
				}),
			});

			if (res.status === 409) {
				// Conflict detected!
				const remoteData = await res.json();
				console.warn(
					`[Background Sync] 3-Way Merge conflict detected on record: ${tx.recordId}`,
				);
				useSyncStore.getState().setHasConflict(true, {
					id: tx.recordId,
					table: tx.table,
					local: tx.payload,
					remote: remoteData.remoteRecord,
				});
				break; // Stop sync queue processing until conflict is resolved
			}

			if (res.ok) {
				// Success -> delete from queue
				await idbDelete("sync_queue", tx.id);
				_devLog(
					`[Background Sync] Successfully synced transaction: id=${tx.id}`,
				);
			} else {
				throw new Error(`Server returned status ${res.status}`);
			}
		}

		// Sync completed without errors -> reset attempts
		syncAttempts = 0;
		const updatedQueue = await idbGetAll("sync_queue");
		useSyncStore.getState().setQueueCount(updatedQueue.length);
	} catch (err: any) {
		syncAttempts++;
		console.warn(
			`[Background Sync] Batch sync error: ${err.message}. Sync attempt ${syncAttempts} failed.`,
		);
	} finally {
		syncInProgress = false;
	}
}

function startBackgroundSyncDaemon() {
	if (syncDaemonInterval) return;

	// Attach force sync trigger to window for E2E tests
	if (typeof window !== "undefined") {
		(window as any).triggerForceSync = runOfflineQueueSync;
	}

	syncDaemonInterval = setInterval(async () => {
		if (offlineMode) return;
		await runOfflineQueueSync();
	}, 8000);
}

// --- CONFLICT RESOLUTION HANDLERS ---
export async function resolveConflictLWW(localWin: boolean) {
	const conflict = useSyncStore.getState().conflictingRecord;
	if (!conflict) return;

	const targetTable = conflict.table;
	const targetId = conflict.id;

	if (localWin) {
		// Local wins -> increment local version and set isSynced=false to force push
		const record = conflict.local;
		record.version = (record.version || 1) + 1;
		record.isSynced = false;
		record.updatedAt = new Date().toISOString();

		await idbPut(targetTable, record);
		// Replace conflict payload in sync queue to trigger fresh sync
		const queue = await idbGetAll("sync_queue");
		const tx = queue.find((q) => q.recordId === targetId);
		if (tx) {
			tx.payload = record;
			await idbPut("sync_queue", tx);
		}
	} else {
		// Remote wins -> apply remote data locally and mark synced
		const record = {
			...conflict.remote,
			isSynced: true,
		};
		await idbPut(targetTable, record);

		// Delete corresponding tx from sync queue since remote won
		const queue = await idbGetAll("sync_queue");
		const tx = queue.find((q) => q.recordId === targetId);
		if (tx) {
			await idbDelete("sync_queue", tx.id);
		}
	}

	// Clear conflict state
	useSyncStore.getState().setHasConflict(false);
	const updatedQueue = await idbGetAll("sync_queue");
	useSyncStore.getState().setQueueCount(updatedQueue.length);
	_devLog(
		`[Antifragility Conflict] Conflict resolved. localWin=${localWin}, remainingQueue=${updatedQueue.length}`,
	);
}
