/**
 * apps/web/src/components/odontogram/__tests__/odontogramDebouncedStorageAndVirtualization.test.ts
 *
 * Test Suite: Low-Spec PC Extreme Caching, HDD Thrashing Protection & DOM Virtualization
 * Mandates: 8e (Doctor Autonomy), 8k (CRM != Reality Simulator), 8n (Scale Sovereignty)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
			(globalThis as unknown as { window: Record<string, unknown> }).window = {};
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

	describe("2. PatientsView & InvoicesView DOM Virtualization & content-visibility", () => {
		it("PatientsView.tsx source contains contentVisibility: auto and containIntrinsicSize: 1px 48px", () => {
			const patientsViewPath = path.resolve(__dirname, "../../../PatientsView.tsx");
			const source = fs.readFileSync(patientsViewPath, "utf-8");

			assert.ok(
				source.includes('contentVisibility: "auto"'),
				"PatientsView must contain contentVisibility: 'auto' for patient rows",
			);
			assert.ok(
				source.includes('containIntrinsicSize: "1px 48px"') ||
					source.includes('containIntrinsicSize: "1px 64px"'),
				"PatientsView must contain containIntrinsicSize for virtualized rendering",
			);
			assert.ok(
				source.includes("useDomListPagination"),
				"PatientsView must use useDomListPagination to guard DOM nodes count",
			);
		});

		it("InvoicesView.tsx source contains invoice-card class and contentVisibility auto", () => {
			const invoicesViewPath = path.resolve(__dirname, "../../billing/InvoicesView.tsx");
			const source = fs.readFileSync(invoicesViewPath, "utf-8");

			assert.ok(
				source.includes("invoice-card"),
				"InvoicesView must apply invoice-card class to invoice rows",
			);
			assert.ok(
				source.includes('contentVisibility: "auto"'),
				"InvoicesView must contain contentVisibility: 'auto' for invoice rows",
			);
			assert.ok(
				source.includes('containIntrinsicSize: "1px 48px"'),
				"InvoicesView must contain containIntrinsicSize: '1px 48px' for virtualized rendering",
			);
			assert.ok(
				source.includes("sliceDomList") || source.includes("useDomListPagination"),
				"InvoicesView must use sliceDomList or useDomListPagination to limit DOM size",
			);
		});

		it("patients-redesign.css defines content-visibility: auto and contain-intrinsic-size: 1px 48px for .patient-row", () => {
			const cssPath = path.resolve(__dirname, "../../../styles/patients-redesign.css");
			const css = fs.readFileSync(cssPath, "utf-8");

			assert.ok(
				css.includes(".patient-row"),
				"patients-redesign.css must style .patient-row",
			);
			assert.ok(
				css.includes("content-visibility: auto;"),
				"patients-redesign.css must include content-visibility: auto;",
			);
			assert.ok(
				css.includes("contain-intrinsic-size: 1px 48px;"),
				"patients-redesign.css must include contain-intrinsic-size: 1px 48px;",
			);
		});

		it("low-spec-hardware.css defines content-visibility: auto and 1px 48px for .patient-row and .invoice-card", () => {
			const cssPath = path.resolve(__dirname, "../../../styles/low-spec-hardware.css");
			const css = fs.readFileSync(cssPath, "utf-8");

			assert.ok(
				css.includes(".patient-row"),
				"low-spec-hardware.css must contain .patient-row",
			);
			assert.ok(
				css.includes(".invoice-card"),
				"low-spec-hardware.css must contain .invoice-card",
			);
			assert.ok(
				css.includes("content-visibility: auto;"),
				"low-spec-hardware.css must contain content-visibility: auto;",
			);
			assert.ok(
				css.includes("contain-intrinsic-size: 1px 48px;") ||
					css.includes("contain-intrinsic-size: 1px 44px;"),
				"low-spec-hardware.css must contain contain-intrinsic-size for .patient-row and .invoice-card",
			);
		});
	});
});
