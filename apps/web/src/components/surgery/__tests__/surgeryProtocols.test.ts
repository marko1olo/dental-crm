/**
 * surgeryProtocols.test.ts — Интеграционные тесты контура хирургии и автономии врача (Мандаты 8e, 8n, 8x).
 * Автономия хирурга, целочисленный торк 35 Н·см, SOAP дневник без номеров приказов, гарантийные обязательства.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildSurgicalDiaryEntry,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
} from "../surgeryProtocols";
import {
	createDefaultPassportRecord,
	FAST_IMPLANT_SYSTEM_PRESETS,
} from "../../implants/implantQuickPresets";

describe("Surgeon Autonomy & Clinical Operation Protocols (Mandates 8e, 8n, 8x)", () => {
	it("1. Surgeon autonomy: operations and saves are NEVER blocked by warehouse or minor fields", () => {
		const materials = [
			{ name: "Имплантат титановый", isWarehouseCritical: true },
			{ name: "Шовный материал", isWarehouseCritical: false },
		];
		const delayedStatus = evaluateWarehouseOverdraft(materials, true);
		assert.equal(delayedStatus.canProceed, true, "Surgeon MUST never be blocked (disabled: 0)");
		assert.equal(delayedStatus.hasOverdraft, true);
		assert.ok(delayedStatus.detailsRu.includes("Операция не блокируется"));
	});

	it("2. 1-click implant passport generation with integer torque parameters (35 N·cm)", () => {
		const passport = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Сидоров А. В.",
			patientId: "PAT-001",
			doctorName: "Др. Громов",
		});

		assert.equal(passport.toothFdi, 46);
		assert.equal(passport.brand, "Osstem");
		assert.equal(passport.torqueNcm, 35, "Default torque must be integer 35 N·cm");
		assert.equal(Number.isInteger(passport.torqueNcm), true, "Torque must be an integer");
		assert.equal(passport.capType, "fdm");
		assert.ok(passport.lotNumber.length > 0);
		assert.ok(passport.serialNumber.length > 0);
	});

	it("3. Clean clinical language of surgical protocols: SOAP diary without Soviet order numbers", () => {
		const diary = buildSurgicalDiaryEntry({
			patientName: "Смирнов А. В.",
			patientId: "PAT-2026-99",
			doctorName: "Др. Харитонов",
			toothFdi: 46,
			protocolText: DENTAL_IMPLANTATION_NORM_TEXT,
			recommendations: "Холод 15 минут, Нимесил при болях.",
			implantDetails: {
				brand: "Osstem TS III",
				diameterMm: 4.0,
				lengthMm: 10.0,
				torqueNcm: 35,
				lot: "LOT-88124",
			},
		});

		assert.ok(diary.includes("ХОД ОПЕРАЦИИ:"));
		assert.ok(diary.includes("Зуб FDI #46"));
		assert.ok(diary.includes("35 Н·см"));
		assert.ok(diary.includes("Холод 15 минут"));

		// Strict absence of Soviet order numbers in user-facing medical diary
		assert.equal(diary.includes("043/у"), false, "Must NOT contain Soviet Form 043/u order number");
		assert.equal(diary.includes("804н"), false, "Must NOT contain 804n order number in diary text");
	});

	it("4. Correct preservation of clinic warranty obligations in implant passport", () => {
		const passport = createDefaultPassportRecord({
			toothFdi: 36,
			brand: "Straumann",
			patientName: "Алексеев Д. М.",
		});

		assert.ok(passport.osteointegrationExpectedDate, "дата остеоинтеграции должна быть заполнена");
		assert.ok(passport.expirationDate, "срок действия паспорта должен быть заполнен");
		assert.ok(passport.catalogArticle.length > 0);
		assert.ok(passport.passportId.startsWith("IMP-PASSPORT-36-"));

		// Fast implant presets must all define canonical 35 N·cm torque
		for (const preset of FAST_IMPLANT_SYSTEM_PRESETS) {
			assert.equal(preset.defaultTorqueNcm, 35);
			assert.ok(preset.brand.length > 0);
		}
	});
});
