/**
 * DENTE CRM — Patient PWA Offline Storage & Background Sync Engine
 * (DOMAIN: PATIENT PORTAL AUTONOMY, METRO OFFLINE UPCOMING VISIT, OFFLINE BOOKINGS QUEUE)
 */

import { useEffect, useState, useCallback } from "react";
import { showToast } from "../components/GlobalToast";
import { logger } from "../utils/logger";

export interface UpcomingVisit {
	id: string;
	patientId: string;
	patientFullName: string;
	dateIso: string; // e.g. "2026-09-02"
	timeRu: string; // e.g. "14:30"
	doctorId: string;
	doctorName: string;
	doctorSpecialty: string;
	doctorAvatarUrl?: string;
	clinicName: string;
	clinicAddress: string;
	metroStationRu: string;
	metroLineColor: string; // e.g. "#10b981", "#3b82f6", "#ef4444"
	clinicPhone: string;
	cabinetNumber: string;
	procedureTitle: string;
	directionsRu?: string;
	parkingInfoRu?: string;
	preparationInstructionsRu?: string;
	cachedAtIso: string;
}

export interface OfflinePatientBookingRequest {
	id: string;
	patientId?: string | undefined;
	patientFullName: string;
	patientPhone: string;
	patientBirthDate?: string | undefined;
	branchId: string;
	branchName?: string | undefined;
	doctorId: string;
	doctorName: string;
	serviceId: string;
	serviceTitle: string;
	dateIso: string;
	slotId: string;
	timeRu: string;
	patientComment?: string | undefined;
	consentPersonalData152Fz: boolean;
	createdAtIso: string;
	status: "queued" | "syncing" | "synced" | "failed";
	retryCount: number;
	lastError?: string | undefined;
}

export const PATIENT_OFFLINE_DB_NAME = "dente-patient-pwa-storage";
export const PATIENT_OFFLINE_DB_VERSION = 2;
export const UPCOMING_VISIT_STORE = "upcoming_visit";
export const BOOKINGS_QUEUE_STORE = "bookings_queue";
export const LEGACY_BOOKINGS_QUEUE_STORE = "offline_booking_queue";

export const LOCAL_STORAGE_UPCOMING_VISIT_KEY = "dente_pwa_cached_upcoming_visit_v1";
export const LOCAL_STORAGE_BOOKING_QUEUE_KEY = "dente_pwa_offline_booking_queue_v1";

let dbInstancePromise: Promise<IDBDatabase> | null = null;

function isIndexedDbSupported(): boolean {
	return typeof window !== "undefined" && Boolean(window.indexedDB) && typeof window.indexedDB.open === "function";
}

function openPatientOfflineDb(): Promise<IDBDatabase> {
	if (dbInstancePromise) return dbInstancePromise;

	dbInstancePromise = new Promise<IDBDatabase>((resolve, reject) => {
		if (!isIndexedDbSupported()) {
			return reject(new Error("IndexedDB is not supported in this environment"));
		}

		try {
			const request = window.indexedDB.open(PATIENT_OFFLINE_DB_NAME, PATIENT_OFFLINE_DB_VERSION);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(UPCOMING_VISIT_STORE)) {
					db.createObjectStore(UPCOMING_VISIT_STORE, { keyPath: "id" });
				}
				if (!db.objectStoreNames.contains(BOOKINGS_QUEUE_STORE)) {
					const queueStore = db.createObjectStore(BOOKINGS_QUEUE_STORE, { keyPath: "id" });
					queueStore.createIndex("status", "status", { unique: false });
					queueStore.createIndex("createdAtIso", "createdAtIso", { unique: false });
				}
				if (!db.objectStoreNames.contains(LEGACY_BOOKINGS_QUEUE_STORE)) {
					const queueStore = db.createObjectStore(LEGACY_BOOKINGS_QUEUE_STORE, { keyPath: "id" });
					queueStore.createIndex("status", "status", { unique: false });
					queueStore.createIndex("createdAtIso", "createdAtIso", { unique: false });
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					dbInstancePromise = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				dbInstancePromise = null;
				reject(request.error || new Error("Failed to open IndexedDB"));
			};

			request.onblocked = () => {
				logger.warn("IndexedDB blocked by another open tab");
			};
		} catch (err) {
			dbInstancePromise = null;
			reject(err);
		}
	});

	return dbInstancePromise;
}

function getFallbackStorage(): Storage | null {
	if (typeof window !== "undefined" && window.localStorage) {
		return window.localStorage;
	}
	if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
		return (globalThis as any).localStorage;
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming Visit Caching (Offline Subway Invariant)
// ─────────────────────────────────────────────────────────────────────────────

export async function cacheUpcomingVisit(visit: UpcomingVisit): Promise<void> {
	const enrichedVisit: UpcomingVisit = {
		...visit,
		cachedAtIso: new Date().toISOString(),
	};

	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(UPCOMING_VISIT_STORE, "readwrite");
				const store = tx.objectStore(UPCOMING_VISIT_STORE);
				const req = store.put(enrichedVisit);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}
	} catch (err) {
		logger.warn("IndexedDB cacheUpcomingVisit fallback to localStorage", err);
	}

	// Always update localStorage as immediate synchronous fallback
	try {
		const storage = getFallbackStorage();
		if (storage) {
			storage.setItem(LOCAL_STORAGE_UPCOMING_VISIT_KEY, JSON.stringify(enrichedVisit));
		}
	} catch {
		// quota exceeded or private mode ignore
	}
}

export async function getCachedUpcomingVisit(): Promise<UpcomingVisit | null> {
	// Try IndexedDB first
	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			const result = await new Promise<UpcomingVisit | null>((resolve, reject) => {
				const tx = db.transaction(UPCOMING_VISIT_STORE, "readonly");
				const store = tx.objectStore(UPCOMING_VISIT_STORE);
				const req = store.getAll();
				req.onsuccess = () => {
					const visits = req.result as UpcomingVisit[];
					if (visits && visits.length > 0) {
						// Return latest or first active visit
						resolve(visits[0] || null);
					} else {
						resolve(null);
					}
				};
				req.onerror = () => reject(req.error);
			});

			if (result) return result;
		}
	} catch (err) {
		logger.warn("IndexedDB getCachedUpcomingVisit error, checking localStorage", err);
	}

	// Fallback to localStorage
	try {
		const storage = getFallbackStorage();
		if (storage) {
			const raw = storage.getItem(LOCAL_STORAGE_UPCOMING_VISIT_KEY);
			if (raw) {
				return JSON.parse(raw) as UpcomingVisit;
			}
		}
	} catch {
		// parse error
	}

	return null;
}

export async function clearCachedUpcomingVisit(): Promise<void> {
	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(UPCOMING_VISIT_STORE, "readwrite");
				const store = tx.objectStore(UPCOMING_VISIT_STORE);
				const req = store.clear();
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}
	} catch (err) {
		logger.warn("IndexedDB clearCachedUpcomingVisit error", err);
	}

	try {
		const storage = getFallbackStorage();
		if (storage) {
			storage.removeItem(LOCAL_STORAGE_UPCOMING_VISIT_KEY);
		}
	} catch {
		// ignore
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Booking Queue (Background Sync)
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueOfflinePatientBooking(
	bookingInput: Omit<OfflinePatientBookingRequest, "id" | "createdAtIso" | "status" | "retryCount"> & { id?: string; createdAtIso?: string },
): Promise<OfflinePatientBookingRequest> {
	const booking: OfflinePatientBookingRequest = {
		...bookingInput,
		id: bookingInput.id || `offline-book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		createdAtIso: bookingInput.createdAtIso || new Date().toISOString(),
		status: "queued",
		retryCount: 0,
	};

	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(BOOKINGS_QUEUE_STORE, "readwrite");
				const store = tx.objectStore(BOOKINGS_QUEUE_STORE);
				const req = store.put(booking);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}
	} catch (err) {
		logger.warn("IndexedDB enqueueOfflinePatientBooking error, using localStorage fallback", err);
	}

	// Always sync to localStorage
	try {
		const storage = getFallbackStorage();
		if (storage) {
			const raw = storage.getItem(LOCAL_STORAGE_BOOKING_QUEUE_KEY);
			const queue: OfflinePatientBookingRequest[] = raw ? JSON.parse(raw) : [];
			queue.push(booking);
			storage.setItem(LOCAL_STORAGE_BOOKING_QUEUE_KEY, JSON.stringify(queue));
		}
	} catch {
		// ignore
	}

	// Request Background Sync if Service Worker SyncManager is available
	requestServiceWorkerBackgroundSync();

	return booking;
}

export async function getQueuedOfflinePatientBookings(): Promise<OfflinePatientBookingRequest[]> {
	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			const result = await new Promise<OfflinePatientBookingRequest[]>((resolve, reject) => {
				const tx = db.transaction(BOOKINGS_QUEUE_STORE, "readonly");
				const store = tx.objectStore(BOOKINGS_QUEUE_STORE);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as OfflinePatientBookingRequest[]) || []);
				req.onerror = () => reject(req.error);
			});

			if (result && result.length > 0) return result;
		}
	} catch (err) {
		logger.warn("IndexedDB getQueuedOfflinePatientBookings error, checking localStorage", err);
	}

	// Fallback to localStorage
	try {
		const storage = getFallbackStorage();
		if (storage) {
			const raw = storage.getItem(LOCAL_STORAGE_BOOKING_QUEUE_KEY);
			if (raw) {
				return JSON.parse(raw) as OfflinePatientBookingRequest[];
			}
		}
	} catch {
		// ignore
	}

	return [];
}

export async function removeQueuedOfflinePatientBooking(id: string): Promise<void> {
	try {
		if (isIndexedDbSupported()) {
			const db = await openPatientOfflineDb();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(BOOKINGS_QUEUE_STORE, "readwrite");
				const store = tx.objectStore(BOOKINGS_QUEUE_STORE);
				const req = store.delete(id);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}
	} catch (err) {
		logger.warn("IndexedDB removeQueuedOfflinePatientBooking error", err);
	}

	try {
		const storage = getFallbackStorage();
		if (storage) {
			const raw = storage.getItem(LOCAL_STORAGE_BOOKING_QUEUE_KEY);
			if (raw) {
				const queue: OfflinePatientBookingRequest[] = JSON.parse(raw);
				const filtered = queue.filter((item) => item.id !== id);
				storage.setItem(LOCAL_STORAGE_BOOKING_QUEUE_KEY, JSON.stringify(filtered));
			}
		}
	} catch {
		// ignore
	}
}

/**
 * Dispatches all queued offline patient bookings when network connectivity is restored
 */
export async function flushOfflinePatientBookings(
	syncFn?: (booking: OfflinePatientBookingRequest) => Promise<boolean>,
): Promise<{ successCount: number; failedCount: number }> {
	const queue = await getQueuedOfflinePatientBookings();
	if (queue.length === 0) return { successCount: 0, failedCount: 0 };

	let successCount = 0;
	let failedCount = 0;

	for (const booking of queue) {
		let isSuccess = false;

		if (syncFn) {
			try {
				isSuccess = await syncFn(booking);
			} catch (err) {
				logger.warn(`Failed to dispatch offline booking ${booking.id}`, err);
				isSuccess = false;
			}
		} else {
			// Real API fetch attempt: send to /api/portal/booking with /api/public-booking/book fallback
			try {
				const bookingPayload = {
					branchId: booking.branchId,
					doctorId: booking.doctorId,
					serviceId: booking.serviceId,
					dateIso: booking.dateIso,
					slotId: booking.slotId,
					timeRu: booking.timeRu,
					patientFullName: booking.patientFullName,
					patientPhone: booking.patientPhone,
					patientComment: booking.patientComment,
					consentPersonalData152Fz: booking.consentPersonalData152Fz,
				};

				let response = await fetch("/api/portal/booking", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(bookingPayload),
				});

				if (!response.ok && response.status === 404) {
					response = await fetch("/api/public-booking/book", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(bookingPayload),
					});
				}

				isSuccess = response.ok;
			} catch (err) {
				logger.warn(`Network error dispatching booking ${booking.id}`, err);
				isSuccess = false;
			}
		}

		if (isSuccess) {
			await removeQueuedOfflinePatientBooking(booking.id);
			successCount++;
		} else {
			failedCount++;
		}
	}

	if (successCount > 0) {
		showToast("Заявка синхронизирована", "success");
	}

	return { successCount, failedCount };
}

export const syncOfflineBookingsWithServer = flushOfflinePatientBookings;

function requestServiceWorkerBackgroundSync(): void {
	if (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"SyncManager" in window
	) {
		navigator.serviceWorker.ready
			.then((reg) => {
				// @ts-expect-error - SyncManager types extension
				return reg.sync?.register?.("dente-offline-sync");
			})
			.catch(() => {
				// Background sync registration not supported or denied
			});
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook for Patient Offline Status & Synchronization
// ─────────────────────────────────────────────────────────────────────────────

export interface UseOfflinePatientSyncResult {
	isOnline: boolean;
	queuedBookingsCount: number;
	isSyncing: boolean;
	flushNow: () => Promise<void>;
}

export function useOfflinePatientSync(
	onSyncCompleted?: (successCount: number) => void,
): UseOfflinePatientSyncResult {
	const [isOnline, setIsOnline] = useState<boolean>(() =>
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [queuedCount, setQueuedCount] = useState<number>(0);
	const [isSyncing, setIsSyncing] = useState<boolean>(false);

	const refreshQueueCount = useCallback(async () => {
		try {
			const queue = await getQueuedOfflinePatientBookings();
			setQueuedCount(queue.length);
		} catch {
			setQueuedCount(0);
		}
	}, []);

	const triggerFlush = useCallback(async () => {
		if (isSyncing || !navigator.onLine) return;
		setIsSyncing(true);
		try {
			const { successCount } = await flushOfflinePatientBookings();
			await refreshQueueCount();
			if (successCount > 0 && onSyncCompleted) {
				onSyncCompleted(successCount);
			}
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing, onSyncCompleted, refreshQueueCount]);

	useEffect(() => {
		void refreshQueueCount();

		const handleOnline = () => {
			setIsOnline(true);
			void triggerFlush();
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		const handleSwMessage = (event: MessageEvent) => {
			if (event.data?.type === "DENTE_BACKGROUND_SYNC_TRIGGER") {
				void triggerFlush();
			}
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.addEventListener("message", handleSwMessage);
		}

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			if ("serviceWorker" in navigator) {
				navigator.serviceWorker.removeEventListener("message", handleSwMessage);
			}
		};
	}, [refreshQueueCount, triggerFlush]);

	return {
		isOnline,
		queuedBookingsCount: queuedCount,
		isSyncing,
		flushNow: triggerFlush,
	};
}
