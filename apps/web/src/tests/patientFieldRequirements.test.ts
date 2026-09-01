/**
 * patientFieldRequirements.test.ts — Unit tests for Feature #35 (Настраиваемая обязательность полей карточки).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	DENTAL_ADVERTISING_SOURCES,
	type PatientFieldRequirements,
	validatePatientDraftWithRequirements,
} from "../components/patients/patientFieldRequirementsConfig.js";

describe("Patient Field Requirements & Validation Engine (Feature #35)", () => {
	it("1. Default configuration enforces phone, but leaves advertising source and SNILS optional", () => {
		assert.equal(DEFAULT_PATIENT_FIELD_REQUIREMENTS.requirePhone, true);
		assert.equal(DEFAULT_PATIENT_FIELD_REQUIREMENTS.requireAdvertisingSource, false);
		assert.equal(DEFAULT_PATIENT_FIELD_REQUIREMENTS.requireSnils, false);
		assert.equal(DEFAULT_PATIENT_FIELD_REQUIREMENTS.requireBirthDate, false);
	});

	it("2. Validates missing full name as critical blocker under any configuration", () => {
		const res = validatePatientDraftWithRequirements({
			fullName: "   ",
			phone: "+7 (999) 123-45-67",
		});
		assert.equal(res.isValid, false);
		assert.ok(res.errors.fullName);
		assert.ok(res.missingRequiredLabels.includes("ФИО"));
	});

	it("3. Enforces phone requirement and length check when requirePhone is true", () => {
		// Missing phone
		const missingPhoneRes = validatePatientDraftWithRequirements(
			{ fullName: "Иванов Иван Иванович", phone: "" },
			{ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS, requirePhone: true },
		);
		assert.equal(missingPhoneRes.isValid, false);
		assert.ok(missingPhoneRes.errors.phone);

		// Too short phone (less than 10 digits)
		const shortPhoneRes = validatePatientDraftWithRequirements(
			{ fullName: "Иванов Иван Иванович", phone: "12345" },
			{ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS, requirePhone: true },
		);
		assert.equal(shortPhoneRes.isValid, false);
		assert.ok(shortPhoneRes.errors.phone);

		// Valid phone
		const validPhoneRes = validatePatientDraftWithRequirements(
			{ fullName: "Иванов Иван Иванович", phone: "+7 (999) 123-45-67" },
			{ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS, requirePhone: true },
		);
		assert.equal(validPhoneRes.isValid, true);
	});

	it("4. Enforces advertising source requirement for marketing attribution when enabled", () => {
		const strictReqs: PatientFieldRequirements = {
			...DEFAULT_PATIENT_FIELD_REQUIREMENTS,
			requireAdvertisingSource: true,
		};

		// Missing source
		const missingRes = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Елена Васильевна",
				phone: "+7 (916) 555-44-33",
				advertisingSource: "",
			},
			strictReqs,
		);
		assert.equal(missingRes.isValid, false);
		assert.ok(missingRes.errors.advertisingSource);
		assert.ok(missingRes.missingRequiredLabels.includes("Рекламный источник"));

		// Filled source
		const validRes = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Елена Васильевна",
				phone: "+7 (916) 555-44-33",
				advertisingSource: "yandex_maps",
			},
			strictReqs,
		);
		assert.equal(validRes.isValid, true);
	});

	it("5. Enforces SNILS format (11 digits) for EGISZ compliance when requireSnils is true", () => {
		const egiszReqs: PatientFieldRequirements = {
			...DEFAULT_PATIENT_FIELD_REQUIREMENTS,
			requireSnils: true,
		};

		// Missing SNILS
		const missingRes = validatePatientDraftWithRequirements(
			{
				fullName: "Кузнецов Петр Сергеевич",
				phone: "+7 (903) 111-22-33",
				snils: "",
			},
			egiszReqs,
		);
		assert.equal(missingRes.isValid, false);
		assert.ok(missingRes.errors.snils);

		// Invalid SNILS format (less than 11 digits)
		const invalidRes = validatePatientDraftWithRequirements(
			{
				fullName: "Кузнецов Петр Сергеевич",
				phone: "+7 (903) 111-22-33",
				snils: "123-456",
			},
			egiszReqs,
		);
		assert.equal(invalidRes.isValid, false);
		assert.ok(invalidRes.errors.snils);

		// Valid 11-digit SNILS
		const validRes = validatePatientDraftWithRequirements(
			{
				fullName: "Кузнецов Петр Сергеевич",
				phone: "+7 (903) 111-22-33",
				snils: "123-456-789 01",
			},
			egiszReqs,
		);
		assert.equal(validRes.isValid, true);
	});

	it("6. DENTAL_ADVERTISING_SOURCES catalog classifies channels into online self-booking and offline/telephony", () => {
		assert.ok(DENTAL_ADVERTISING_SOURCES.length >= 10);

		const onlineChannels = DENTAL_ADVERTISING_SOURCES.filter((s) => s.isOnlineSelfBooking);
		const offlineChannels = DENTAL_ADVERTISING_SOURCES.filter((s) => !s.isOnlineSelfBooking);

		assert.ok(onlineChannels.some((c) => c.key === "website_online"));
		assert.ok(onlineChannels.some((c) => c.key === "yandex_maps"));
		assert.ok(onlineChannels.some((c) => c.key === "gis_2"));
		assert.ok(onlineChannels.some((c) => c.key === "prodoctorov"));
		assert.ok(onlineChannels.some((c) => c.key === "tg_bot"));
		assert.ok(onlineChannels.some((c) => c.key === "wa_bot"));

		assert.ok(offlineChannels.some((c) => c.key === "phone_call_admin"));
		assert.ok(offlineChannels.some((c) => c.key === "recommendation"));
		assert.ok(offlineChannels.some((c) => c.key === "walk_in"));
	});
});
