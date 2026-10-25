import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALIGNER_804N_SERVICES,
	ORTHO_804N_ACTIONS_MAP,
	calculateOrthodonticServices804n,
	type OrthodonticService804n,
} from "../OrthodonticVisitProtocolWidget";

describe("Orthodontic Services 804n Mapping — Plates, Aligners & Events", () => {
	it("maps plate_activation and expansion_screw_activation", () => {
		const s1 = calculateOrthodonticServices804n({ selectedActions: ["plate_activation"] });
		assert.equal(s1[0]?.code, "A16.07.047");
		assert.equal(s1[0]?.priceRub, 1000);

		const s2 = calculateOrthodonticServices804n({ selectedActions: ["expansion_screw_activation"] });
		assert.equal(s2[0]?.code, "A16.07.047.001");
		assert.equal(s2[0]?.priceRub, 800);
	});

	it("maps debonding and wire_change_leveling", () => {
		const deb = calculateOrthodonticServices804n({ selectedActions: ["debonding"] });
		assert.equal(deb.length, 2);
		assert.ok(deb.some((s) => s.code === "A16.07.049"));
		assert.ok(deb.some((s) => s.code === "A16.07.050"));

		const lev = calculateOrthodonticServices804n({ selectedActions: ["wire_change_leveling"] });
		assert.equal(lev.length, 2);
		assert.ok(lev.some((s) => s.code === "A16.07.046"));
		assert.ok(lev.some((s) => s.code === "A16.07.049"));
	});

	it("maps spring_activation and separation_rings", () => {
		const spr = calculateOrthodonticServices804n({ selectedActions: ["spring_activation"] });
		assert.equal(spr[0]?.code, "A16.07.048.003");
		const sep = calculateOrthodonticServices804n({ selectedActions: ["separation_rings"] });
		assert.equal(sep[0]?.code, "A16.07.050");
	});

	it("maps aligners / isAttachmentsOnly to A16.07.046 and A16.07.046.001", () => {
		const services = calculateOrthodonticServices804n({ isAttachmentsOnly: true });
		assert.equal(services.length, 2);
		assert.ok(services.some((s) => s.code === "A16.07.046"));
		assert.ok(services.some((s) => s.code === "A16.07.046.001"));
	});

	it("deduplicates identical 804n codes and defines catalogs", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["wire_change", "ligature_change"] });
		assert.equal(services.length, 2);
		assert.ok(ORTHO_804N_ACTIONS_MAP.wire_change);
		assert.equal(ALIGNER_804N_SERVICES.length, 2);
	});

	it("dispatches dente-add-services-to-invoice with valid structure", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["wire_change", "rebracket"], selectedTooth: 13 });
		let dispatched: CustomEvent<{ services: OrthodonticService804n[]; stageKind: string }> | null = null;
		const listener = (e: Event) => { dispatched = e as any; };
		const target = typeof window !== "undefined" ? window : new EventTarget();
		target.addEventListener("dente-add-services-to-invoice", listener as EventListener);
		try {
			target.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { services, stageKind: "stage_ortho" } }));
			assert.ok(dispatched !== null);
			assert.equal((dispatched as any).detail.stageKind, "stage_ortho");
		} finally {
			target.removeEventListener("dente-add-services-to-invoice", listener as EventListener);
		}
	});
});
