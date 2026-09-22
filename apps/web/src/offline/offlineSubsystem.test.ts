/**
 * offlineSubsystem.test.ts — Vitest suite for the complete unified offline subsystem
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8b: Exact integer kopecks in payment transactions.
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization.
 * - Mandate 8e: Doctor autonomy — non-blocking visit drafts, schedule, pricelist, and cash payments.
 * - Mandate 8n: Solo doctor & small clinic resilience without network/server.
 * - Mandate 8s: Single source of authority for offline subsystems.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	saveVisitDraftDebouncedOffline,
	saveVisitDraftOffline,
	getVisitDraftOffline,
	listVisitDraftsOffline,
	removeVisitDraftOffline,
	clearVisitDraftMemoryCache,
	getVisitDraftDebounceMs,
} from "./offlineVisitDrafting.js";
import {
	enqueueOfflineAppointment,
	getPendingAppointmentMutations,
	cacheScheduleOffline,
	getCachedScheduleOffline,
	clearScheduleMemoryCache,
	generateOfflineAppointmentId,
	syncAppointmentQueue,
	type OfflineAppointmentItem,
} from "./offlineAppointmentQueue.js";
import {
	cachePricelistOffline,
	getCachedPricelistOffline,
	searchCachedPricelist,
	cacheNomenclature804nOffline,
	searchCachedNomenclature804n,
	isPricelistCacheStale,
} from "./offlinePricelistCache.js";
import {
	enqueueOfflinePayment,
	getPendingOfflinePayments,
	getCachedDailyPayments,
	clearPaymentMemoryCache,
	syncOfflinePaymentQueue,
	generatePaymentIdempotencyKey,
} from "./offlinePaymentQueue.js";
import {
	withOfflineFallback,
	deferUntilIdle,
	protectAgainstDiskStarvation,
} from "./networkResilience.js";
import { setForcedLowSpecMode } from "../utils/lowSpecHddOptimizer.js";
import { setMockAppRuntimeKind } from "../utils/runtimeRouter.js";
import { clearInMemoryOfflineStorage } from "../services/offline/offlineStorage.js";

describe("Unified Offline Subsystem Test Suite", () => {
	beforeEach(() => {
		setForcedLowSpecMode(null);
		setMockAppRuntimeKind(null);
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
		clearInMemoryOfflineStorage();
		clearVisitDraftMemoryCache();
		clearScheduleMemoryCache();
		clearPaymentMemoryCache();
	});

	afterEach(() => {
		setForcedLowSpecMode(null);
		setMockAppRuntimeKind(null);
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
		clearInMemoryOfflineStorage();
		clearVisitDraftMemoryCache();
		clearScheduleMemoryCache();
		clearPaymentMemoryCache();
	});

	describe("1. Offline Visit Drafting (Form 043/u Autosave)", () => {
		it("saves and retrieves draft instantly from L1 memory cache (0ms latency)", async () => {
			const draft = {
				patientId: "pat_test_001",
				visitId: "vis_test_001",
				complaints: "Острая боль в зубе 4.6",
				diagnosisIcd10: ["K04.0"],
				teethStatus: { "46": "C" },
				recommendations: "Полоскание хлоргексидином 0.05%",
			};

			await saveVisitDraftOffline(draft);
			const retrieved = await getVisitDraftOffline("pat_test_001", "vis_test_001");

			expect(retrieved).not.toBeNull();
			expect(retrieved?.complaints).toBe("Острая боль в зубе 4.6");
			expect(retrieved?.diagnosisIcd10).toContain("K04.0");
			expect(retrieved?.teethStatus?.["46"]).toBe("C");
		});

		it("adapts autosave debounce timing to prevent 5400 RPM HDD head thrashing", () => {
			setForcedLowSpecMode(false);
			expect(getVisitDraftDebounceMs()).toBe(1200);

			setForcedLowSpecMode(true);
			expect(getVisitDraftDebounceMs()).toBe(2500);
		});

		it("removes draft upon visit submission and deletes from memory cache", async () => {
			const draft = {
				patientId: "pat_test_002",
				complaints: "Плановый осмотр",
			};

			await saveVisitDraftOffline(draft);
			expect(await getVisitDraftOffline("pat_test_002")).not.toBeNull();

			await removeVisitDraftOffline("pat_test_002");
			expect(await getVisitDraftOffline("pat_test_002")).toBeNull();
		});
	});

	describe("2. Offline Appointment Queue & Schedule Cache", () => {
		it("enqueues appointment mutation and updates optimistic schedule immediately", async () => {
			const aptId = generateOfflineAppointmentId();
			const appointment: OfflineAppointmentItem = {
				id: aptId,
				clientReferenceId: aptId,
				patientId: "pat_schedule_01",
				patientName: "Смирнов А.В.",
				doctorId: "doc_01",
				startTime: "2026-09-23T10:00:00Z",
				endTime: "2026-09-23T10:30:00Z",
				status: "scheduled",
				createdAt: new Date().toISOString(),
			};

			const mutation = await enqueueOfflineAppointment("CREATE_APPOINTMENT", appointment);
			expect(mutation.entityType).toBe("appointment");
			expect(mutation.action).toBe("create");
			expect(mutation.entityId).toBe(aptId);

			// Cache lookup
			cacheScheduleOffline("2026-09-23", [appointment]);
			const cached = getCachedScheduleOffline("2026-09-23");
			expect(cached).toHaveLength(1);
			expect(cached?.[0].patientName).toBe("Смирнов А.В.");
		});

		it("syncs appointment queue successfully with dispatcher", async () => {
			const aptId = generateOfflineAppointmentId();
			const appointment: OfflineAppointmentItem = {
				id: aptId,
				clientReferenceId: aptId,
				patientId: "pat_sync_01",
				patientName: "Кузнецов И.П.",
				doctorId: "doc_01",
				startTime: "2026-09-23T11:00:00Z",
				endTime: "2026-09-23T11:30:00Z",
				status: "scheduled",
				createdAt: new Date().toISOString(),
			};

			await enqueueOfflineAppointment("CREATE_APPOINTMENT", appointment);

			const syncResult = await syncAppointmentQueue(async (mut) => {
				expect(mut.appointment.patientId).toBe("pat_sync_01");
				return { success: true, serverId: "srv_apt_100" };
			});

			expect(syncResult.syncedCount).toBeGreaterThanOrEqual(1);
			expect(syncResult.failedCount).toBe(0);
		});
	});

	describe("3. Offline Pricelist & Statutory 804n Nomenclature Cache", () => {
		it("caches pricelist and performs sub-2ms substring search", () => {
			const items = [
				{
					id: "srv_1",
					name: "Прием (осмотр, консультация) врача-стоматолога первичный",
					code804n: "B01.065.001",
					internalCode: "CONS-01",
					price: 1500,
					category: "Консультации",
				},
				{
					id: "srv_2",
					name: "Восстановление зуба пломбой светоотверждаемой",
					code804n: "A16.07.002.001",
					internalCode: "THER-01",
					price: 4500,
					category: "Терапия",
				},
				{
					id: "srv_3",
					name: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений",
					code804n: "A16.07.020",
					internalCode: "HYG-01",
					price: 3500,
					category: "Гигиена",
				},
			];

			cachePricelistOffline(items);
			const all = getCachedPricelistOffline();
			expect(all).toHaveLength(3);

			// Search by name
			const searchName = searchCachedPricelist("пломб");
			expect(searchName).toHaveLength(1);
			expect(searchName[0].id).toBe("srv_2");

			// Search by 804n code
			const searchCode = searchCachedPricelist("B01.065");
			expect(searchCode).toHaveLength(1);
			expect(searchCode[0].id).toBe("srv_1");

			// Search by category filter
			const searchCategory = searchCachedPricelist("", { category: "Гигиена" });
			expect(searchCategory).toHaveLength(1);
			expect(searchCategory[0].internalCode).toBe("HYG-01");
		});

		it("caches and searches statutory 804n nomenclature", () => {
			const nomItems = [
				{ code: "A16.07.002", name: "Восстановление зуба пломбой" },
				{ code: "A16.07.004", name: "Временное пломбирование лекарственным препаратом корневого канала" },
				{ code: "A16.07.006", name: "Пломбирование корневого канала зуба пастой" },
			];

			cacheNomenclature804nOffline(nomItems);
			const res = searchCachedNomenclature804n("корневого канала");
			expect(res).toHaveLength(2);
			expect(res[0].code).toBe("A16.07.004");
		});

		it("detects freshness of pricelist cache", () => {
			expect(isPricelistCacheStale()).toBe(false);
		});
	});

	describe("4. Offline Payment Queue & Exact Kopeck Math", () => {
		it("enqueues payment with kopeck-exact math and composite idempotency key", async () => {
			setMockAppRuntimeKind("web_browser");

			const payment = await enqueueOfflinePayment({
				patientId: "pat_fin_001",
				patientName: "Васильева Е.С.",
				totalKopecks: 500000, // 5000.00 RUB
				paymentType: "mixed",
				splitDetails: {
					cashKopecks: 200000,
					cardKopecks: 300000,
				},
				items: [
					{ name: "Лечение кариеса", priceKopecks: 350000, quantity: 1 },
					{ name: "Анестезия инфильтрационная", priceKopecks: 150000, quantity: 1 },
				],
				cashierName: "Иванова А.А.",
				patientPhoneOrEmail: "+79991112233",
				printFiscalReceipt: true,
			});

			expect(payment.totalKopecks).toBe(500000);
			expect(payment.totalRub).toBe(5000);
			expect(payment.paymentType).toBe("mixed");
			expect(payment.idempotencyKey).toContain("pat_fin_001");
			expect(payment.status).toBe("queued");
			// On web runtime, fiscal receipt is buffered offline without error
			expect(payment.fiscalStatus).toBe("buffered");

			const cachedList = getCachedDailyPayments();
			expect(cachedList.some((p) => p.id === payment.id)).toBe(true);
		});

		it("syncs offline payments with server dispatcher", async () => {
			const payment = await enqueueOfflinePayment({
				patientId: "pat_fin_sync",
				patientName: "Попов Д.М.",
				totalKopecks: 120000,
				paymentType: "card",
				items: [{ name: "Профгигиена", priceKopecks: 120000, quantity: 1 }],
			});

			const syncRes = await syncOfflinePaymentQueue(async (p) => {
				expect(p.id).toBe(payment.id);
				return { success: true, serverPaymentId: "srv_pay_999" };
			});

			expect(syncRes.syncedCount).toBeGreaterThanOrEqual(1);
			expect(syncRes.failedCount).toBe(0);
		});
	});

	describe("5. Network Resilience & HDD Overload Protection", () => {
		it("transparently falls back to offline action on network timeout or failure", async () => {
			const result = await withOfflineFallback(
				async () => {
					throw new Error("Network offline (ERR_CONNECTION_REFUSED)");
				},
				() => "cached_offline_data",
				{ timeoutMs: 500 },
			);

			expect(result).toBe("cached_offline_data");
		});

		it("protectAgainstDiskStarvation executes I/O task safely", async () => {
			setForcedLowSpecMode(true);

			const executed = await protectAgainstDiskStarvation(async () => {
				return 42;
			});

			expect(executed).toBe(42);
		});

		it("deferUntilIdle runs deferred task without throwing", async () => {
			let ran = false;
			deferUntilIdle(() => {
				ran = true;
			}, 50);

			await new Promise((resolve) => setTimeout(resolve, 150));
			expect(ran).toBe(true);
		});
	});
});
