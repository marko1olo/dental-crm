import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	ALL_VITA_SHADES,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	getVitaShadeByCode,
	normalizeVitaShadeCode,
	calculateShadeDelta,
	colorDistanceDeltaE2000,
	colorDistanceDeltaE76,
	rgbToLab,
	labToRgb,
} from "../vitaShadesCatalog";
import {
	getStratificationPreset,
	STUMP_NATURAL_DIE_SHADES,
	SHADE_SWATCH_MAP,
	VITA_BLEACH_SHADES_CLASSIFIED,
} from "../../lab/labShadesData";
import { ClinicalPhotoProtocolModal } from "../ClinicalPhotoProtocolModal";
import { BeforeAfterComparisonView } from "../BeforeAfterComparisonView";
import { VitaShadeSelector } from "../VitaShadeSelector";
import { PhotoSlotCard } from "../PhotoSlotCard";
import { PHOTO_PROTOCOL_PRESETS } from "../photoGridPresets";
import { resolveClinicRoute } from "../../../router/routeResolver";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1FA00}-\u{1FAFF}]/u;

describe("Red Team Inquisition: Dental Photography, VITA Scale SSOT & Live UI (6G Live SUT)", () => {
	it("1. VITA Scale Catalog Completeness & Homoglyph Normalization SSOT", () => {
		assert.strictEqual(VITA_CLASSICAL_SHADES.length, 20, "VITA Classical must contain 20 shades");
		assert.strictEqual(VITA_3D_MASTER_SHADES.length, 29, "VITA 3D-Master must contain 29 shades");
		assert.strictEqual(ALL_VITA_SHADES.length, 49, "Total catalog must contain 49 calibrated physical shades");
		assert.ok(VITA_BLEACH_SHADES_CLASSIFIED.length >= 4);

		assert.strictEqual(normalizeVitaShadeCode("А2"), "A2", "Russian 'А' must normalize to Latin 'A'");
		assert.strictEqual(normalizeVitaShadeCode("В1"), "B1", "Russian 'В' must normalize to Latin 'B'");
		assert.strictEqual(normalizeVitaShadeCode("С3"), "C3", "Russian 'С' must normalize to Latin 'C'");
		assert.strictEqual(normalizeVitaShadeCode("Д2"), "D2", "Russian 'Д' must normalize to Latin 'D'");
		assert.strictEqual(normalizeVitaShadeCode("ОМ2"), "0M2", "Bleach alias OM2 must normalize to 0M2");
		assert.strictEqual(normalizeVitaShadeCode("vita  a-3.5 "), "A3.5", "Prefix and whitespace must normalize cleanly");
		assert.strictEqual(normalizeVitaShadeCode("3D-2М2"), "2M2", "Russian 'М' in 3D group must normalize to Latin 'M'");

		const resolvedRussianA2 = getVitaShadeByCode("А2");
		assert.ok(resolvedRussianA2, "Russian 'А2' must resolve to VITA shade object");
		assert.strictEqual(resolvedRussianA2?.code, "A2");

		const resolvedRussianOM1 = getVitaShadeByCode("ОМ1");
		assert.ok(resolvedRussianOM1, "Russian 'ОМ1' must resolve to 0M1");
		assert.strictEqual(resolvedRussianOM1?.code, "0M1");
	});

	it("2. Colorimetry & CIEDE2000 / CIE76 Invariants (Zero NaN, Deterministic Metrics)", () => {
		const a3 = getVitaShadeByCode("A3");
		const bl2 = getVitaShadeByCode("BL2");
		assert.ok(a3 && bl2);

		const delta = calculateShadeDelta(a3, bl2);
		assert.ok(Number.isFinite(delta.deltaE00), "CIEDE2000 must be a finite number");
		assert.ok(Number.isFinite(delta.deltaL), "Delta L must be a finite number");
		assert.ok(delta.deltaL > 0, "Bleach BL2 must have higher lightness than A3");
		assert.strictEqual(delta.isLighter, true, "isLighter must be true when whitening");

		const zeroDelta = calculateShadeDelta(a3, a3);
		assert.strictEqual(zeroDelta.deltaE00, 0, "Self Delta E must be 0");
		assert.strictEqual(zeroDelta.deltaL, 0, "Self Delta L must be 0");

		const lab1 = rgbToLab({ r: 234, g: 218, b: 192 });
		const lab2 = rgbToLab({ r: 248, g: 245, b: 238 });
		assert.ok(colorDistanceDeltaE2000(lab1, lab2) > 0);
		assert.ok(colorDistanceDeltaE76(lab1, lab2) > 0);
		assert.strictEqual(colorDistanceDeltaE2000(lab1, lab1), 0);

		const sampleRgb = { r: 234, g: 218, b: 192 };
		const roundtripRgb = labToRgb(lab1);
		assert.ok(Math.abs(roundtripRgb.r - sampleRgb.r) <= 1, "R channel roundtrip tolerance <= 1");
		assert.ok(Math.abs(roundtripRgb.g - sampleRgb.g) <= 1, "G channel roundtrip tolerance <= 1");
		assert.ok(Math.abs(roundtripRgb.b - sampleRgb.b) <= 1, "B channel roundtrip tolerance <= 1");
	});

	it("3. 3-Zone Stratification Presets & IPS Natural Die Stump Scale SSOT", () => {
		const stratA2 = getStratificationPreset("A2", "natural");
		assert.strictEqual(stratA2.cervical, "A3", "A2 natural cervical must be A3 (warmer)");
		assert.strictEqual(stratA2.body, "A2", "A2 body must be primary shade A2");
		assert.strictEqual(stratA2.incisal, "A1", "A2 natural incisal must be A1 (lighter)");

		const monoA3 = getStratificationPreset("A3", "monochrome");
		assert.strictEqual(monoA3.cervical, "A3");
		assert.strictEqual(monoA3.body, "A3");
		assert.strictEqual(monoA3.incisal, "A3");

		const youthA2 = getStratificationPreset("A2", "youth_translucent");
		assert.strictEqual(youthA2.cervical, "A2");
		assert.strictEqual(youthA2.body, "A2");
		assert.strictEqual(youthA2.incisal, "A1");

		assert.strictEqual(STUMP_NATURAL_DIE_SHADES.length, 9, "Stump scale must have 9 ND shades (ND1-ND9)");
		assert.ok(SHADE_SWATCH_MAP["ND1"], "ND1 swatch must exist");
		assert.ok(SHADE_SWATCH_MAP["ND9"], "ND9 swatch must exist");
	});

	it("4. Doctor Autonomy & Zero Cartoon Emojis in live rendered ClinicalPhotoProtocolModal & BeforeAfterComparisonView", () => {
		const preset = PHOTO_PROTOCOL_PRESETS[0];
		assert.ok(preset);

		const modalHtml = renderToStaticMarkup(
			React.createElement(ClinicalPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-photo-1",
				patientName: "Смирнова Анна",
			}),
		);
		assert.ok(modalHtml.includes('data-testid="clinical-photo-protocol-modal"'));
		assert.strictEqual(modalHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(modalHtml), false);

		const compHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterComparisonView, {
				preset,
				slotsData: {},
				beforeSlotId: preset.slots[0]?.id ?? "slot_1",
				afterSlotId: preset.slots[1]?.id ?? "slot_2",
			}),
		);
		assert.ok(compHtml.includes('data-testid="btn-patient-presentation-popout"'));
		assert.strictEqual(compHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(compHtml), false);
	});

	it("5. VitaShadeSelector & PhotoSlotCard render with unlocked actions and zero emojis", () => {
		const vitaHtml = renderToStaticMarkup(
			React.createElement(VitaShadeSelector, {
				beforeShadeCode: "A3",
				afterShadeCode: "BL2",
				onBeforeShadeChange: () => {},
				onAfterShadeChange: () => {},
			}),
		);
		assert.ok(vitaHtml.includes('data-testid="btn-transfer-vita-to-lab"'));
		assert.strictEqual(vitaHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(vitaHtml), false);

		const preset = PHOTO_PROTOCOL_PRESETS[0];
		const slotDef = preset?.slots[0];
		assert.ok(slotDef);
		const slotHtml = renderToStaticMarkup(
			React.createElement(PhotoSlotCard, {
				slotDef,
				record: { slotId: slotDef.id, detectedVitaShade: "A2" },
				isDragActive: false,
				onUploadClick: () => {},
				onEditClick: () => {},
				onDeleteClick: () => {},
				onDragOver: () => {},
				onDragLeave: () => {},
				onDrop: () => {},
			}),
		);
		assert.ok(slotHtml.includes(slotDef.shortLabelRu));
		assert.strictEqual(slotHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(slotHtml), false);
	});

	it("6. Photo Protocol Studio resolves canonically via 3-Shell routeResolver", () => {
		const route = resolveClinicRoute("", "#photo-protocol?patientId=pat-photo-1");
		assert.strictEqual(route.studio?.kind, "photo_protocol");
	});
});
