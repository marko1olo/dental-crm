import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { setupMockDom } from "../../documents/__tests__/documentLegalAuditMockDom.js";
import { ChairsideSurgeryHubModal } from "../ChairsideSurgeryHubModal.js";
import { buildImplantBatchPayload } from "../surgeryHubApi.js";
import { calculateSurgeryFinancials, SURGERY_SCENARIOS } from "../surgeryCatalogData.js";
import { useSurgeryHubState } from "../useSurgeryHubState.js";

describe("Surgery Hub Inline & Clinical Contracts (Zero-Bloat, Graft/Price Honesty)", () => {
	let origFetch: typeof globalThis.fetch;

	beforeEach(() => {
		origFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = origFetch;
	});

	it("1. ChairsideSurgeryHubModal renders implant workstation cleanly with unlocked Primary CTA", () => {
		assert.equal(Object.keys(SURGERY_SCENARIOS).length, 4);
		const html = renderToString(
			React.createElement(ChairsideSurgeryHubModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "11111111-1111-4111-8111-111111111111",
				patientName: "Тестовый Пациент",
				initialScenario: "implant",
				initialTooth: 46,
			}),
		);
		assert.ok(html.includes("Хирургический хаб"), "Must render Surgery Hub heading");
		assert.ok(html.includes("Паспорт имплантации"), "Must render Implant Passport subtitle");
		assert.ok(html.includes("Тестовый Пациент"), "Must render patient name");
		assert.ok(!html.includes('disabled=""'), "Primary CTA must remain unlocked");
	});

	it("2. Default implant state leaves boneGraft, membrane & suture empty ('') and batch payload never multiplies op-level consumables", async () => {
		const { doc } = setupMockDom();
		globalThis.fetch = (async () => new Response(JSON.stringify({ success: true, items: [] }), { status: 200 })) as typeof fetch;

		let latestState: ReturnType<typeof useSurgeryHubState> | null = null;
		function Harness() {
			latestState = useSurgeryHubState({
				isOpen: true,
				onClose: () => {},
				patientId: "11111111-1111-4111-8111-111111111111",
				patientName: "Пациент Имплант",
				initialScenario: "implant",
				initialTooth: 46,
			});
			return React.createElement("div", null, latestState.activeScenario);
		}

		const container = doc.createElement("div");
		doc.body.appendChild(container);
		const root = createRoot(container);
		await act(async () => { root.render(React.createElement(Harness)); });

		assert.equal(latestState!.selectedGraft, "", "Implant scenario must NOT preselect bone graft by default");
		assert.equal(latestState!.selectedMembrane, "", "Implant scenario must NOT preselect membrane by default");
		assert.equal(latestState!.selectedSuture, "", "Implant scenario must NOT preselect suture by default");

		const batchPayload = buildImplantBatchPayload({
			patientId: "11111111-1111-4111-8111-111111111111",
			teethToProcess: [36, 46, 47],
			getToothSpec: latestState!.getToothSpec,
			implantBrand: "Osstem",
			inventoryItemId: undefined,
			boneDensity: "D2",
			isGuidedSurgery: false,
			guidedSleeveDiameterMm: 5,
			guidedSleeveOffsetMm: 2,
			surgicalGuideTemplateId: "",
			selectedGraft: "",
			selectedMembrane: "",
			selectedSuture: "",
			diaryText: "Протокол",
			idempotencyKey: "22222222-2222-4222-8222-222222222222",
			dateIso: "2026-05-01T10:00:00.000Z",
		});

		assert.equal(batchPayload.boneGraftMaterial, null);
		assert.equal(batchPayload.membraneUsed, null);
		assert.equal(batchPayload.sutureMaterial, null);
		assert.equal(batchPayload.installations.length, 3);
		for (const item of batchPayload.installations) {
			assert.equal("boneGraftMaterial" in item, false, "Batch items must not blindly clone root consumables");
			assert.equal("membraneUsed" in item, false);
		}
		await act(async () => { root.unmount(); });
	});

	it("3. calculateSurgeryFinancials prioritizes live pricelist price over hardcoded default and ignores empty suture/graft", () => {
		const fin = calculateSurgeryFinancials({
			scenario: "implant",
			implantBrand: "Osstem",
			graftName: "",
			membraneName: "",
			sutureName: "",
			overrideOperationPriceRub: 61500,
		});
		assert.equal(fin.operationPriceRub, 61500);
		assert.equal(fin.operationPriceKopecks, 6150000);
		assert.equal(fin.consumablesCostRub, 1550, "Unselected suture/graft/membrane must add 0 ₽ beyond base sterile kit");
	});
});
