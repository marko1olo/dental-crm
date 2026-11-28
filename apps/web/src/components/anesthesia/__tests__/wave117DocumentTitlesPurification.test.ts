import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	documentKindMetadata,
	medicalCardExtract003vuPayloadSchema,
	medicalCardExtract043uPayloadSchema,
} from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnesthesiaQuickBar, STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../AnesthesiaQuickBar";

describe("Wave 117: Document Titles & Anesthesia Clinical Standard (Live 6G SUT)", () => {
	it("6. AnesthesiaQuickBar renders chairside anesthesia preset with zero synthetic nurse leaks", () => {
		const html = renderToStaticMarkup(
			React.createElement(AnesthesiaQuickBar, {
				patientId: "pat-anesth-1",
				patientWeightKg: 72,
				targetToothNumberFdi: 36,
			}),
		);
		assert.ok(html.length > 0);
		assert.equal(html.includes("Смирнова А. В."), false, "AnesthesiaQuickBar must not leak synthetic nurse 'Смирнова А. В.'");
		assert.ok(STANDARD_ANESTHESIA_NORM_PRESET_RU.length > 10);
		assert.equal(STANDARD_ANESTHESIA_NORM_PRESET_RU.includes("Смирнова А. В."), false);
	});

	it("7. documentKindMetadata exposes semantic dental extract title without «003-В/у»", () => {
		const meta = documentKindMetadata.medical_record_extract;
		assert.ok(meta, "medical_record_extract metadata must exist");
		assert.equal(meta.label, "Выписка из карты");
		assert.equal(meta.title, "Выписка из карты");
		assert.equal(meta.label.includes("003-В/у"), false);
		assert.equal(meta.title.includes("003-В/у"), false);
	});

	it("8. forms003vu Zod schemas validate dental extract payloads cleanly and enforce strict contracts", () => {
		const validPayload = {
			clinicLegalName: "ООО «Стоматология ДЕНТЕ»",
			extractRegistrationNumber: "EXT-2026-01",
			extractIssueDate: "2026-09-15",
			medicalCardNumber: "МК-043-1",
			patientFullName: "Соколова Мария Олеговна",
			patientBirthDate: "1992-05-11",
			patientSex: "female" as const,
			treatmentPeriodStartDate: "2026-09-01",
			treatmentPeriodEndDate: "2026-09-15",
			primaryDiagnosisText: "Кариес дентина",
			primaryDiagnosisIcd10: "K02.1",
			briefAnamnesisAndClinicalCourse: "Лечение кариеса 36 зуба",
			attendingDoctorFullName: "Д-р Громов И. В.",
		};

		const parsed043 = medicalCardExtract043uPayloadSchema.safeParse(validPayload);
		assert.equal(parsed043.success, true);
		if (parsed043.success) {
			assert.equal(parsed043.data.formNumber, "043/у");
		}

		const parsed003 = medicalCardExtract003vuPayloadSchema.safeParse({
			...validPayload,
			formNumber: "003-В/у",
		});
		assert.equal(parsed003.success, true);

		const invalidStrict = medicalCardExtract003vuPayloadSchema.safeParse({
			...validPayload,
			unexpectedHospitalField: true,
		});
		assert.equal(invalidStrict.success, false, "Strict schema must reject unexpected hospital fields");
	});
});
