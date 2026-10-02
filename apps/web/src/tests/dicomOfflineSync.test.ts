import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
	saveDicomFilesToOfflineSync,
	getPendingOfflineDicomRecords,
	getPendingOfflineDicomCount,
	removePendingOfflineDicom,
	clearPendingOfflineDicom,
	DICOM_OFFLINE_DB_NAME,
	DICOM_OFFLINE_STORE_NAME,
} from "../components/dicom/dicomOfflineSync";

describe("DICOM Offline IndexedDB Sync Storage Suite", () => {
	it("gracefully returns empty/0 when files array is empty", async () => {
		const saved = await saveDicomFilesToOfflineSync([]);
		assert.equal(saved, 0);
	});

	it("saves records with pending_sync status and «Ожидает синхронизации» label", async () => {
		// Mock IndexedDB in Node environment if window.indexedDB is not present
		const mockRecords = new Map<string, any>();
		const originalIndexedDB = globalThis.indexedDB;

		const mockDb = {
			objectStoreNames: {
				contains: (name: string) => name === DICOM_OFFLINE_STORE_NAME,
			},
			createObjectStore: () => ({
				createIndex: () => {},
			}),
			transaction: () => ({
				objectStore: () => ({
					put: (record: any) => mockRecords.set(record.id, record),
					getAll: () => {
						const req: any = { onsuccess: null, result: Array.from(mockRecords.values()) };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					count: () => {
						const req: any = { onsuccess: null, result: mockRecords.size };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					delete: (id: string) => {
						mockRecords.delete(id);
						const req: any = { onsuccess: null };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					clear: () => {
						mockRecords.clear();
						const req: any = { onsuccess: null };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
				}),
				oncomplete: null as any,
				onerror: null as any,
			}),
		};

		(mockDb.transaction as any) = () => {
			const tx: any = {
				objectStore: () => ({
					put: (record: any) => mockRecords.set(record.id, record),
					getAll: () => {
						const req: any = { onsuccess: null, result: Array.from(mockRecords.values()) };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					count: () => {
						const req: any = { onsuccess: null, result: mockRecords.size };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					delete: (id: string) => {
						mockRecords.delete(id);
						const req: any = { onsuccess: null };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
					clear: () => {
						mockRecords.clear();
						const req: any = { onsuccess: null };
						setTimeout(() => req.onsuccess?.(), 0);
						return req;
					},
				}),
				oncomplete: null,
				onerror: null,
			};
			setTimeout(() => tx.oncomplete?.(), 5);
			return tx;
		};

		globalThis.indexedDB = {
			open: () => {
				const req: any = {
					onsuccess: null,
					onerror: null,
					onupgradeneeded: null,
					result: mockDb,
				};
				setTimeout(() => req.onsuccess?.(), 0);
				return req;
			},
		} as unknown as IDBFactory;

		try {
			const dummySlice1 = {
				name: "slice_001.dcm",
				buffer: new Uint8Array([1, 2, 3, 4]).buffer,
			};
			const dummySlice2 = {
				name: "slice_002.dcm",
				buffer: new Uint8Array([5, 6, 7, 8]).buffer,
			};

			const count = await saveDicomFilesToOfflineSync([dummySlice1, dummySlice2]);
			assert.equal(count, 2);

			const records = await getPendingOfflineDicomRecords();
			assert.equal(records.length, 2);
			assert.equal(records[0]?.syncStatus, "pending_sync");
			assert.equal(records[0]?.syncStatusLabel, "Ожидает синхронизации");
			assert.equal(records[1]?.syncStatus, "pending_sync");
			assert.equal(records[1]?.syncStatusLabel, "Ожидает синхронизации");

			const pendingCount = await getPendingOfflineDicomCount();
			assert.equal(pendingCount, 2);

			await removePendingOfflineDicom(records[0]!.id);
			assert.equal(mockRecords.size, 1);

			await clearPendingOfflineDicom();
			assert.equal(mockRecords.size, 0);
		} finally {
			globalThis.indexedDB = originalIndexedDB;
			const { resetDicomOfflineDbForTesting } = await import("../components/dicom/dicomOfflineSync");
			resetDicomOfflineDbForTesting();
		}
	});

	it("saveLocalDicomStudy persists Tier 1 CBCT metadata and slices into IndexedDB", async () => {
		const {
			saveLocalDicomStudy,
			resetDicomOfflineDbForTesting,
			DICOM_STUDIES_STORE_NAME,
			DICOM_SLICES_STORE_NAME,
		} = await import("../components/dicom/dicomOfflineSync");
		resetDicomOfflineDbForTesting();

		const mockStudies = new Map<string, any>();
		const mockSlices = new Map<string, any>();
		const originalIndexedDB = globalThis.indexedDB;

		const mockDb = {
			objectStoreNames: {
				contains: (name: string) =>
					name === DICOM_STUDIES_STORE_NAME ||
					name === DICOM_SLICES_STORE_NAME ||
					name === "pending_studies",
			},
			transaction: () => {
				const tx: any = {
					objectStore: (storeName: string) => ({
						put: (record: any) => {
							if (storeName === DICOM_STUDIES_STORE_NAME) {
								mockStudies.set(record.studyInstanceUid, record);
							} else if (storeName === DICOM_SLICES_STORE_NAME) {
								mockSlices.set(record.id, record);
							}
						},
						get: (key: string) => {
							const req: any = {
								onsuccess: null,
								result: mockStudies.get(key),
							};
							setTimeout(() => req.onsuccess?.(), 0);
							return req;
						},
					}),
					oncomplete: null,
					onerror: null,
				};
				setTimeout(() => tx.oncomplete?.(), 5);
				return tx;
			},
		};

		globalThis.indexedDB = {
			open: () => {
				const req: any = {
					onsuccess: null,
					result: mockDb,
				};
				setTimeout(() => req.onsuccess?.(), 0);
				return req;
			},
		} as unknown as IDBFactory;

		try {
			const studyResult = await saveLocalDicomStudy({
				studyInstanceUid: "1.2.840.113619.2.1.20261002",
				seriesUid: "1.2.840.113619.2.1.20261002.1",
				patientId: "patient-cbct-001",
				title: "КТ Верхней челюсти",
				slices: [
					{
						name: "slice_001.dcm",
						buffer: new ArrayBuffer(512),
						sopInstanceUid: "sop-001",
					},
					{
						name: "slice_002.dcm",
						buffer: new ArrayBuffer(512),
						sopInstanceUid: "sop-002",
					},
				],
			});

			assert.equal(studyResult.studyInstanceUid, "1.2.840.113619.2.1.20261002");
			assert.equal(studyResult.sliceCount, 2);
			assert.equal(studyResult.syncStatus, "pending_sync");
			assert.equal(
				studyResult.syncStatusLabel,
				"Сохранено локально на этом ПК • Ожидает синхронизации",
			);
			assert.equal(mockStudies.size, 1);
			assert.equal(mockSlices.size, 2);
		} finally {
			globalThis.indexedDB = originalIndexedDB;
		}
	});
});
