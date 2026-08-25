import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	matchesPatientSearch,
	normalizeCyrillicText,
	normalizePhoneToNational,
	type PatientSearchableFields,
} from "./patientSearchUtils";

describe("patientSearchUtils Suite", () => {
	const samplePatient: PatientSearchableFields = {
		fullName: "Иванов Иван Иванович",
		phone: "+7 (999) 123-99-12",
		birthDate: "1990-05-15",
		cardNumber: "К-9912",
	};

	const childPatient: PatientSearchableFields = {
		fullName: "Смирнова София Алексеевна",
		phone: null,
		birthDate: "2018-10-25",
		cardNumber: "Д-4050",
		administrativeProfile: {
			legalRepresentativeFullName: "Смирнов Алексей Викторович",
			legalRepresentativePhone: "+7 (916) 777-88-99",
		},
	};

	describe("1. normalizePhoneToNational", () => {
		it("normalizes 11-digit numbers starting with 7 or 8", () => {
			assert.equal(normalizePhoneToNational("+79991239912"), "9991239912");
			assert.equal(normalizePhoneToNational("89991239912"), "9991239912");
			assert.equal(normalizePhoneToNational("+7 (999) 123-99-12"), "9991239912");
		});

		it("normalizes 10-digit numbers directly", () => {
			assert.equal(normalizePhoneToNational("9991239912"), "9991239912");
		});

		it("handles null and empty input safely", () => {
			assert.equal(normalizePhoneToNational(null), "");
			assert.equal(normalizePhoneToNational(""), "");
		});
	});

	describe("2. normalizeCyrillicText", () => {
		it("lowercases and replaces 'ё' with 'е'", () => {
			assert.equal(normalizeCyrillicText("Фёдорова Алёна"), "федорова алена");
		});

		it("removes punctuation and extra whitespaces", () => {
			assert.equal(normalizeCyrillicText("  Иванов,   Иван!  "), "иванов иван");
		});
	});

	describe("3. matchesPatientSearch by Phone Number (Last 4 Digits & Formats)", () => {
		it("matches patient instantly by last 4 digits '9912'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "9912"), true);
		});

		it("matches patient by 3 digits '912'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "912"), true);
		});

		it("matches patient by formatted phone with hyphens '99-12'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "99-12"), true);
		});

		it("matches patient by full national number '9991239912'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "9991239912"), true);
		});

		it("matches patient by full 8-prefixed number '89991239912'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "89991239912"), true);
		});

		it("does not match non-matching phone digits '1111'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "1111"), false);
		});
	});

	describe("4. matchesPatientSearch by Legal Representative Phone", () => {
		it("matches child patient when searching representative phone digits '8899'", () => {
			assert.equal(matchesPatientSearch(childPatient, "8899"), true);
		});

		it("matches child patient when searching representative full name 'Смирнов Алексей'", () => {
			assert.equal(matchesPatientSearch(childPatient, "Смирнов Алексей"), true);
		});
	});

	describe("5. matchesPatientSearch by Card Number and Birth Date", () => {
		it("matches by card number 'К-9912' or digits '9912'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "К-9912"), true);
			assert.equal(matchesPatientSearch(samplePatient, "9912"), true);
		});

		it("matches by birth year '1990'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "1990"), true);
		});

		it("matches by formatted birth date '15.05.1990'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "15.05.1990"), true);
		});
	});

	describe("6. matchesPatientSearch by Full Name with Token Permutations", () => {
		it("matches name in direct order 'Иванов Иван'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "Иванов Иван"), true);
		});

		it("matches name in inverted order 'Иван Иванов'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "Иван Иванов"), true);
		});

		it("matches name by partial prefix 'Иван Ив'", () => {
			assert.equal(matchesPatientSearch(samplePatient, "Иван Ив"), true);
		});

		it("matches with 'ё' letter normalization", () => {
			const fedorPatient = { fullName: "Фёдоров Артём" };
			assert.equal(matchesPatientSearch(fedorPatient, "Федоров Артем"), true);
		});
	});
});
