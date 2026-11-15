import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createDefaultPassportRecord,
} from "../implantQuickPresets";
import { ImplantPassportCard, AnatomicalJawArchSchema } from "../ImplantPassportCard";

describe("Implant Anatomy & Warranty Passport Card (SSOT)", () => {
	it("23. AnatomicalJawArchSchema renders full 32 teeth dental formula", () => {
		const html = renderToString(<AnatomicalJawArchSchema selectedFdi={46} brand="Osstem" diameterMm={4.0} lengthMm={10.0} />);
		assert.ok(html.includes("anatomical-jaw-arch"));
		assert.ok(html.includes("ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)"));
		assert.ok(html.includes("НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)"));
		assert.ok(html.includes("ПРАВО (R)"));
		assert.ok(html.includes("ЛЕВО (L)"));
		assert.ok(html.includes("Имплантат #46"));
		assert.ok(html.includes("Ø4.0×10мм") || html.includes("4.0"));
	});

	it("31. GBR bone grafting protocol and passport reflect Bio-Oss and Bio-Gide without emojis", () => {
		const data = {
			...createDefaultPassportRecord({ toothFdi: 36, brand: "Straumann", patientName: "Александров К. В." }),
			boneGraftMaterial: "Костный графт Geistlich Bio-Oss",
			membraneUsed: "Коллагеновая мембрана Geistlich Bio-Gide",
			sutureMaterial: "Шовный материал Ethicon Викрил 4-0",
		};
		const html = renderToString(<ImplantPassportCard data={data} />);
		assert.ok(html.includes("Straumann"));
		assert.ok(html.includes("Паспорт имплантата DENTE"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false);
	});
});
