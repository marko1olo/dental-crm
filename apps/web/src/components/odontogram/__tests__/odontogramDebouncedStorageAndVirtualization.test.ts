/**
 * apps/web/src/components/odontogram/__tests__/odontogramDebouncedStorageAndVirtualization.test.ts
 *
 * Test Suite: Low-Spec PC Extreme Caching, HDD Thrashing Protection & DOM Virtualization
 * Mandates: 8e (Doctor Autonomy), 8k (CRM != Reality Simulator), 8n (Scale Sovereignty)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	clearStoredTeethData,
	flushStoredTeethData,
	getOdontogramStorageKey,
	loadStoredTeethData,
	ODONTOGRAM_STORAGE_DEBOUNCE_MS,
	saveStoredTeethData,
} from "../odontogramStorage";
import {
	createDefaultAdultTeethData,
	type ToothData,
} from "../ToothChart";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

class MockLocalStorage {
	private store: Record<string, string> = {};
	public setItemCalls: { key: string; value: string }[] = [];

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
		this.setItemCalls.push({ key, value: String(value) });
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
		this.setItemCalls = [];
	}
}

describe("Low-Spec Caching & DOM Virtualizer Invariants", () => {
	const testPatientId = "pat-lowspec-test-01";
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		if (typeof globalThis.window === "undefined") {
			(globalThis as unknown as { window: Record<string, unknown> }).window = {
				location: { hash: "", hostname: "127.0.0.1" },
				addEventListener: () => {},
			};
		}
		(globalThis.window as unknown as { localStorage: MockLocalStorage }).localStorage = mockStorage;
		clearInMemoryStorageCache();
		clearStoredTeethData();
	});

	describe("1. Odontogram Debounced Writes & In-Memory 0ms Cache", () => {
		it("provides instantaneous in-memory retrieval without waiting for disk I/O", () => {
			const teeth: ToothData[] = createDefaultAdultTeethData().map((t) =>
				t.toothNumber === 11 ? { ...t, state: "Caries" } : t,
			);

			// Save into storage
			saveStoredTeethData(testPatientId, teeth);

			// Immediate read must resolve from in-memory cache in 0ms
			const cached = loadStoredTeethData(testPatientId);
			assert.ok(cached, "Must load cached teeth");
			assert.equal(cached.length, 32);
			const t11 = cached.find((t) => t.toothNumber === 11);
			assert.equal(t11?.state, "Caries");
		});

		it("exposes debounce constant between 200ms and 300ms", () => {
			assert.ok(
				ODONTOGRAM_STORAGE_DEBOUNCE_MS >= 200 && ODONTOGRAM_STORAGE_DEBOUNCE_MS <= 300,
				`Debounce interval (${ODONTOGRAM_STORAGE_DEBOUNCE_MS}ms) must be within 200-300ms range`,
			);
		});

		it("synchronizes pending writes immediately when flushStoredTeethData is called", () => {
			const teeth: ToothData[] = createDefaultAdultTeethData().map((t) =>
				t.toothNumber === 21 ? { ...t, state: "Pulpitis" } : t,
			);

			saveStoredTeethData(testPatientId, teeth);
			flushStoredTeethData(testPatientId);

			// Must be written into storage
			const key = getOdontogramStorageKey(testPatientId);
			const storedRaw = mockStorage.getItem(key);
			assert.ok(storedRaw, "Storage must contain flushed odontogram data");
			const parsed = JSON.parse(storedRaw) as ToothData[];
			const t21 = parsed.find((t) => t.toothNumber === 21);
			assert.equal(t21?.state, "Pulpitis");
		});

		it("cancels pending writes and resets in-memory cache when clearStoredTeethData is called", () => {
			const teeth: ToothData[] = createDefaultAdultTeethData().map((t) =>
				t.toothNumber === 36 ? { ...t, state: "Periodontitis" } : t,
			);

			saveStoredTeethData(testPatientId, teeth);
			clearStoredTeethData(testPatientId);

			// Memory cache cleared, storage untouched if not flushed
			mockStorage.clear();
			const cached = loadStoredTeethData(testPatientId);
			assert.equal(cached, null, "Cache must be cleared after clearStoredTeethData");
		});
	});

	describe("2. PatientsMasterRow & DOM List Slicing Virtualization", () => {
		it("renders PatientMasterRow with contentVisibility: auto & containIntrinsicSize: 1px 64px", async () => {
			const React = await import("react");
			const { renderToStaticMarkup } = await import("react-dom/server");
			const { PatientMasterRow } = await import("../../patients/masterListModules/PatientMasterRow");

			const html = renderToStaticMarkup(
				React.createElement(PatientMasterRow, {
					patient: {
						id: "pat-virt-1",
						organizationId: "org-1",
						fullName: "Волкова Елена Сергеевна",
						phone: "+79001234567",
						birthDate: "1991-04-12",
						status: "active",
						balanceRub: 1500,
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-01T00:00:00.000Z",
					},
					isSelected: false,
					riskDistinguishes: false,
					nextActionDistinguishes: false,
					money: (v: number) => `${v} ₽`,
					isRowMenuOpen: false,
					rowMenuRef: { current: null },
					onToggleRowMenu: () => {},
					onCloseRowMenu: () => {},
					onSelectPatient: () => {},
					onOpenVisit: () => {},
					onBookAppointment: () => {},
					onOpenPatientCard: () => {},
				}),
			);

			assert.ok(html.includes("patient-row"), "Must render .patient-row class");
			assert.ok(
				html.includes("content-visibility:auto") || html.includes("content-visibility: auto"),
				"PatientMasterRow must style content-visibility: auto",
			);
			assert.ok(
				html.includes("contain-intrinsic-size:1px 64px") || html.includes("contain-intrinsic-size: 1px 64px"),
				"PatientMasterRow must style contain-intrinsic-size: 1px 64px",
			);
		});

		it("sliceDomList caps rendered DOM nodes to <= 40 items on a 200-patient dataset", async () => {
			const { sliceDomList } = await import("../../../utils/domVirtualizationHelper");
			const rows = Array.from({ length: 200 }, (_, i) => ({ id: `pat-${i}`, fullName: `Пациент ${i}` }));
			const firstPage = sliceDomList(rows, 40, 0);
			assert.equal(firstPage.displayedCount, 40);
			assert.equal(firstPage.visibleItems.length, 40);
			assert.equal(firstPage.remainingCount, 160);
			assert.equal(firstPage.hasMore, true);

			const secondPage = sliceDomList(rows, 40, 160);
			assert.equal(secondPage.displayedCount, 40);
			assert.equal(secondPage.remainingCount, 0);
			assert.equal(secondPage.hasMore, false);
		});
	});
});
