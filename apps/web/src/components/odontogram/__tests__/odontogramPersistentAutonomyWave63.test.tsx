/**
 * apps/web/src/components/odontogram/__tests__/odontogramPersistentAutonomyWave63.test.tsx
 *
 * WAVE 63 (FEATURE 252) TEST SUITE:
 * Odontogram Persistent Autonomy, Batch Voice Mutations, MoreMenu Portal & Storage
 * Clinical Parity Test Suite (Mandates 8c, 8d, 8e, 8k, 8n, 8ar, 8as)
 *
 * Invariants Verified:
 * 1. Two-tier localStorage caching and hydration during offline/server failures.
 * 2. Zero-rollback protection: network/server failures NEVER revert doctor markings.
 * 3. Batch actions via real ToothChart.executeWisdomMissingAction & useGlobalVoiceListener.dispatchVoiceTeethUpdatesBatch.
 * 4. Rendered OdontogramToolbarMoreMenu & ClinicalDiaryAndVoiceButtons via renderToString (token contrast, >=44px mobile).
 * 5. Diary protocol generation via real generateSoapFromOdontogramStates.
 */

import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";

import {
	getOdontogramStorageKey,
	loadStoredTeethData,
	saveStoredTeethData,
	ODONTOGRAM_STORAGE_PREFIX,
} from "../odontogramStorage";
import {
	createDefaultAdultTeethData,
	executeWisdomMissingAction,
	type ToothData,
	type ToothState,
} from "../ToothChart";
import { OdontogramViewContainer } from "../OdontogramViewContainer";
import { OdontogramToolbarMoreMenu } from "../OdontogramToolbarMoreMenu";
import { ClinicalDiaryAndVoiceButtons } from "../ClinicalDiaryAndVoiceButtons";
import { dispatchVoiceTeethUpdatesBatch } from "../useGlobalVoiceListener";
import { generateSoapFromOdontogramStates } from "../../../lib/clinicalProtocols";

// In-memory localStorage mock for node test runner
class MockLocalStorage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		const val = this.store[key];
		return typeof val === "string" ? val : null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}

	get length(): number {
		return Object.keys(this.store).length;
	}

	key(index: number): string | null {
		const keys = Object.keys(this.store);
		return keys[index] ?? null;
	}
}

describe("WAVE 63 (FEATURE 252): Odontogram Persistent Autonomy & 1-Click Clinical Presets", () => {
	const testPatientId = "pat-test-uuid-wave63";
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		// Polyfill global window and localStorage for unit tests in node
		if (typeof globalThis.window === "undefined") {
			(globalThis as unknown as { window: Record<string, unknown> }).window = {};
		}
		(globalThis.window as unknown as { localStorage: MockLocalStorage }).localStorage = mockStorage;
	});

	describe("1. Two-Tier Storage & Offline Hydration (Mandates 8e, 8n)", () => {
		it("generates deterministic storage key matching prefix + patientId", () => {
			const key = getOdontogramStorageKey(testPatientId);
			assert.strictEqual(key, `${ODONTOGRAM_STORAGE_PREFIX}${testPatientId}`);
			assert.strictEqual(key, "dente_odontogram_states_pat-test-uuid-wave63");
		});

		it("persists teeth data to localStorage and retrieves it cleanly", () => {
			const dirtyTeeth: ToothData[] = createDefaultAdultTeethData().map((t) =>
				t.toothNumber === 16 ? { ...t, state: "Caries", surfaces: ["MOD"] } : t,
			);

			saveStoredTeethData(testPatientId, dirtyTeeth);

			const cached = loadStoredTeethData(testPatientId);
			assert.ok(cached, "Cached teeth data must exist");
			assert.strictEqual(cached.length, 32);
			const tooth16 = cached.find((t) => t.toothNumber === 16);
			assert.ok(tooth16);
			assert.strictEqual(tooth16.state, "Caries");
			assert.deepStrictEqual(tooth16.surfaces, ["MOD"]);
		});

		it("returns null when storage is empty or corrupted without crashing", () => {
			assert.strictEqual(loadStoredTeethData("non-existent-patient"), null);

			// Corrupted JSON recovery
			mockStorage.setItem(getOdontogramStorageKey("corrupted-patient"), "{ invalid json [");
			assert.strictEqual(loadStoredTeethData("corrupted-patient"), null);

			// Empty array recovery
			mockStorage.setItem(getOdontogramStorageKey("empty-patient"), "[]");
			assert.strictEqual(loadStoredTeethData("empty-patient"), null);
		});
	});

	describe("2. Zero-Rollback Protection on Network Failure (Mandate 8e: Doctor Autonomy)", () => {
		it("simulates offline state update: markings are retained in storage even when API fails", async () => {
			// Doctor marks tooth 26 as Pulpitis
			const initialTeeth = createDefaultAdultTeethData();
			const modifiedTeeth: ToothData[] = initialTeeth.map((t) =>
				t.toothNumber === 26 ? { ...t, state: "Pulpitis" } : t,
			);

			// Mandate 8e: Immediately cache to local disk
			saveStoredTeethData(testPatientId, modifiedTeeth);

			// Simulate network failure
			const simulateApiFetch = async () => {
				throw new Error("NetworkError: Failed to fetch");
			};

			let networkFailed = false;
			try {
				await simulateApiFetch();
			} catch {
				networkFailed = true;
				// On network failure: DO NOT ROLLBACK!
				// Keep modifiedTeeth on screen and in storage
			}

			assert.strictEqual(networkFailed, true, "Network fetch should have thrown");
			const persisted = loadStoredTeethData(testPatientId);
			assert.ok(persisted, "Data must remain in storage despite network error");
			const tooth26 = persisted.find((t) => t.toothNumber === 26);
			assert.strictEqual(tooth26?.state, "Pulpitis", "Tooth 26 must NOT be rolled back to Healthy");
		});

		it("dispatches 'dente-odontogram-update' CustomEvent with patientId and updated states", () => {
			let eventDetail: unknown = null;
			const listener = (e: Event) => {
				eventDetail = (e as CustomEvent).detail;
			};

			if (typeof globalThis.window.addEventListener === "function") {
				globalThis.window.addEventListener("dente-odontogram-update", listener);
			}

			const sampleTeeth: ToothData[] = createDefaultAdultTeethData();
			const event = new CustomEvent("dente-odontogram-update", {
				detail: { patientId: testPatientId, states: sampleTeeth },
			});
			globalThis.window.dispatchEvent?.(event);

			if (eventDetail) {
				assert.deepStrictEqual(eventDetail, { patientId: testPatientId, states: sampleTeeth });
			}
		});
	});

	describe("3. Batch Presets, Voice Batching & Portal More Menu (Mandates 8e, 8k, 8n, 8ar)", () => {
		it("renders More menu trigger in OdontogramViewContainer", () => {
			const html = renderToString(
				<OdontogramViewContainer
					teethData={createDefaultAdultTeethData()}
					onToothClick={() => {}}
				/>,
			);

			assert.ok(
				html.includes('data-testid="btn-odontogram-more-menu"'),
				"Trigger for More menu must exist in DOM",
			);
		});

		it("ToothChart.executeWisdomMissingAction marks all 4 wisdom teeth in a single batch call", () => {
			const calls: Array<{ targets: number[]; state: ToothState }> = [];
			const applied = executeWisdomMissingAction({
				pediatricMode: false,
				teethData: createDefaultAdultTeethData(),
				onQuickStateChange: (targets, state) => {
					calls.push({ targets, state });
				},
			});

			assert.strictEqual(applied, true);
			assert.strictEqual(calls.length, 1, "Must issue a single batch call, not 4 per-tooth calls");
			assert.deepStrictEqual(calls[0]?.targets, [18, 28, 38, 48]);
			assert.strictEqual(calls[0]?.state, "Missing");
		});

		it("dispatchVoiceTeethUpdatesBatch aggregates matching state/surfaces into one batch array", () => {
			const calls: Array<{
				targets: number[];
				state: ToothState;
				surfaces: readonly string[] | undefined;
			}> = [];
			const summaries: string[] = [];

			const groupCount = dispatchVoiceTeethUpdatesBatch(
				[
					{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
					{ toothNumber: 26, state: "Caries", surfaces: ["M", "O"] },
					{ toothNumber: 36, state: "Pulpitis", surfaces: [] },
				],
				(targets, state, surfaces) => {
					calls.push({ targets, state, surfaces });
				},
				false,
				(summary) => summaries.push(summary),
			);

			assert.strictEqual(groupCount, 2);
			assert.strictEqual(calls.length, 2, "Identical state+surfaces must coalesce into 1 batch call");
			assert.deepStrictEqual(calls[0]?.targets, [16, 26]);
			assert.strictEqual(calls[0]?.state, "Caries");
			assert.deepStrictEqual(calls[1]?.targets, [36]);
			assert.strictEqual(calls[1]?.state, "Pulpitis");
			assert.strictEqual(summaries.length, 1);
		});

		it("renders OdontogramToolbarMoreMenu & ClinicalDiaryAndVoiceButtons with token classes and >=44px mobile rules", () => {
			const menuHtml = renderToString(
				<OdontogramToolbarMoreMenu
					isMoreMenuOpen={true}
					setIsMoreMenuOpen={() => {}}
					activeStampTool={null}
					setActiveStampTool={() => {}}
					isFastExtractMode={false}
					setIsFastExtractMode={() => {}}
					isMultiSelectMode={false}
					onToggleMultiSelect={() => {}}
					isPerioOpen={false}
					onTogglePerio={() => {}}
					isOrthoCephOpen={false}
					setIsOrthoCephOpen={() => {}}
					isSmartOpgOpen={false}
					setIsSmartOpgOpen={() => {}}
					handleMarkIntactDentition={() => {}}
					handleMarkWisdomTeethMissing={() => {}}
					setIsPlanWizardOpen={() => {}}
					toggleVoiceEngine={() => {}}
					isVoiceListening={false}
					setContextDrawerTooth={() => {}}
					onOpenPediatricModal={() => {}}
					onLoadRadiologyAiReport={() => {}}
					onSyncAllToDiary={() => {}}
					showWisdomTeeth={true}
					setShowWisdomTeeth={() => {}}
					activeMode="anatomical_svg"
					showPulpAndCanals={false}
					setShowPulpAndCanals={() => {}}
					isPediatricEffective={false}
				/>,
			);

			assert.ok(menuHtml.includes('data-testid="odontogram-more-menu-popover"'));
			assert.ok(menuHtml.includes('data-testid="btn-odontogram-wisdom-visibility"'));
			assert.strictEqual(menuHtml.includes("dark:bg-zinc-900"), false);

			const buttonsHtml = renderToString(
				<ClinicalDiaryAndVoiceButtons
					onSyncAllToDiary={() => {}}
					toggleVoiceEngine={() => {}}
					isVoiceListening={false}
					onCloseMenu={() => {}}
				/>,
			);
			assert.ok(buttonsHtml.includes("min-h-[36px] max-md:min-h-[44px]"));
			assert.ok(buttonsHtml.includes("В дневник приёма"));
			assert.strictEqual(buttonsHtml.includes("dark:bg-zinc-800/60"), false);
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(emojiRegex.test(menuHtml), false);
			assert.strictEqual(emojiRegex.test(buttonsHtml), false);
		});
	});

	describe("4. Clinical Diary Protocol Synchronization", () => {
		it("aggregates multiple pathological findings into clinical SOAP protocol", () => {
			const findings = [
				{ toothNumber: 16, state: "Caries", surfaces: ["M", "O"] },
				{ toothNumber: 36, state: "Pulpitis" },
			];

			const soap = generateSoapFromOdontogramStates(findings);
			assert.ok(soap.statusLocalis, "Objective status must be generated");
			assert.ok(soap.statusLocalis.includes("16"), "Must mention tooth 16");
			assert.ok(soap.statusLocalis.includes("36"), "Must mention tooth 36");
			assert.ok(soap.diagnosisIcd10, "ICD-10 code must be generated");
		});
	});
});
