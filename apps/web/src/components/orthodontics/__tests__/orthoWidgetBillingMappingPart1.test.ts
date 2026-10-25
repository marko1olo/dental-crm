import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOrthodonticServices804n } from "../OrthodonticVisitProtocolWidget";

describe("Orthodontic Services 804n Mapping — Archwires & Adjustments", () => {
	it("maps wire_change to A16.07.048.002 (2500 rub) + A16.07.048 (1500 rub)", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["wire_change"] });
		assert.equal(services.length, 2);

		const wireChange = services.find((s) => s.code === "A16.07.048.002");
		assert.ok(wireChange);
		assert.equal(wireChange?.priceRub, 2500);

		const correction = services.find((s) => s.code === "A16.07.048");
		assert.ok(correction);
		assert.equal(correction?.priceRub, 1500);
	});

	it("bills 2 archwires (5000 rub) + activation when changing wires on both jaws", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["wire_change"], targetArch: "both" });
		assert.equal(services.length, 3);
		const upperWire = services.find((s) => s.code === "A16.07.048.002" && s.arch === "upper");
		const lowerWire = services.find((s) => s.code === "A16.07.048.002" && s.arch === "lower");
		assert.ok(upperWire);
		assert.ok(lowerWire);
		const total = services.reduce((acc, s) => acc + s.priceRub, 0);
		assert.equal(total, 6500);
	});

	it("bills 1 archwire with correct label when targetArch is 'upper'", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["wire_change"], targetArch: "upper" });
		assert.equal(services.length, 2);
		const upperWire = services.find((s) => s.code === "A16.07.048.002");
		assert.ok(upperWire);
		assert.equal(upperWire?.arch, "upper");
	});

	it("maps ligature_change to A16.07.048 (1500 rub)", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["ligature_change"] });
		assert.equal(services.length, 1);
		assert.equal(services[0]?.code, "A16.07.048");
		assert.equal(services[0]?.priceRub, 1500);
	});

	it("maps rebracket to A16.07.048.001 (1200 rub) and binds toothNumber if selected", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["rebracket"], selectedTooth: 24 });
		assert.equal(services.length, 1);
		assert.equal(services[0]?.code, "A16.07.048.001");
		assert.equal(services[0]?.toothNumber, 24);
	});

	it("maps ipr to A16.07.048.003 (800 rub)", () => {
		const services = calculateOrthodonticServices804n({ selectedActions: ["ipr"] });
		assert.equal(services.length, 1);
		assert.equal(services[0]?.code, "A16.07.048.003");
		assert.equal(services[0]?.priceRub, 800);
	});
});
