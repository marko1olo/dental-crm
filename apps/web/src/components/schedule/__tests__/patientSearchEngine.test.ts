import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import {
	findPotentialDuplicates,
	highlightSearchMatches,
	searchPatientsQuick,
} from "../patientSearchEngine";

describe("Patient Quick Search & Highlighting Engine", () => {
	const samplePatients: Patient[] = [
		{
			id: "pat-1",
			fullName: "Иванов Иван Иванович",
			phone: "+7 (916) 123-45-67",
			birthDate: "1985-04-12",
			cardNumber: "10042",
			balanceRub: -4500,
		} as unknown as Patient,
		{
			id: "pat-2",
			fullName: "Смирнова Елена Сергеевна",
			phone: "+7 925 999-88-77",
			birthDate: "1992-11-23",
			cardNumber: "10043",
			balanceRub: 12000,
		} as unknown as Patient,
		{
			id: "pat-3",
			fullName: "Фёдоров Артём Павлович",
			phone: "+7 (903) 555-44-33",
			birthDate: "2015-06-18",
			cardNumber: "10044",
			balanceRub: 0,
			administrativeProfile: {
				legalRepresentativeFullName: "Фёдорова Ольга Викторовна",
				legalRepresentativePhone: "+7 (916) 777-11-22",
			},
		} as unknown as Patient,
	];

	it("1.1 searchPatientsQuick — Phone fragment search ('916', '925', '4567')", () => {
		// Search by "916" -> Ivanov + Child (represented by mother with 916)
		const res916 = searchPatientsQuick(samplePatients, "916");
		assert.equal(res916.length >= 2, true);
		assert.equal(res916[0]?.patient.id, "pat-1");

		// Search by last 4 digits "4567"
		const res4567 = searchPatientsQuick(samplePatients, "4567");
		assert.equal(res4567.length, 1);
		assert.equal(res4567[0]?.patient.id, "pat-1");
		assert.equal(res4567[0]?.matchedBy, "phone");

		// Search by formatted phone "+7 925"
		const res925 = searchPatientsQuick(samplePatients, "+7 925");
		assert.equal(res925.length, 1);
		assert.equal(res925[0]?.patient.id, "pat-2");
	});

	it("1.2 searchPatientsQuick — Surname and Name tokenized search ('Иван', 'Смир', 'Федор')", () => {
		// "Иван"
		const resIvan = searchPatientsQuick(samplePatients, "Иван");
		assert.equal(resIvan.length, 1);
		assert.equal(resIvan[0]?.patient.id, "pat-1");

		// "Смир"
		const resSmir = searchPatientsQuick(samplePatients, "Смир");
		assert.equal(resSmir.length, 1);
		assert.equal(resSmir[0]?.patient.id, "pat-2");

		// "Федор" handles 'ё' vs 'е' normalization
		const resFedor = searchPatientsQuick(samplePatients, "Федор");
		assert.equal(resFedor.length, 1);
		assert.equal(resFedor[0]?.patient.id, "pat-3");
	});

	it("1.3 searchPatientsQuick — Card number search ('10043')", () => {
		const resCard = searchPatientsQuick(samplePatients, "10043");
		assert.equal(resCard.length, 1);
		assert.equal(resCard[0]?.patient.id, "pat-2");
		assert.equal(resCard[0]?.matchedBy, "card");
	});

	it("1.4 highlightSearchMatches — Correctly marks matching substring chunks", () => {
		// Substring in name
		const nameParts = highlightSearchMatches("Иванов Иван Иванович", "Иван");
		assert.equal(nameParts.length, 2);
		assert.equal(nameParts[0]?.text, "Иван");
		assert.equal(nameParts[0]?.isMatch, true);
		assert.equal(nameParts[1]?.text, "ов Иван Иванович");
		assert.equal(nameParts[1]?.isMatch, false);

		// Phone digits matching in formatted phone
		const phoneParts = highlightSearchMatches("+7 (916) 123-45-67", "916");
		assert.equal(phoneParts.some((p) => p.text === "916" && p.isMatch), true);
	});

	it("1.5 searchPatientsQuick — Empty query returns slice with score 0", () => {
		const emptyRes = searchPatientsQuick(samplePatients, "");
		assert.equal(emptyRes.length, 3);
		assert.equal(emptyRes[0]?.score, 0);
	});

	it("1.6 findPotentialDuplicates — Name duplicate detection (exact and fuzzy typo)", () => {
		// Exact name
		const exactDups = findPotentialDuplicates(samplePatients, {
			fullName: "Иванов Иван",
		});
		assert.equal(exactDups.length >= 1, true);
		assert.equal(exactDups[0]?.patient.id, "pat-1");
		assert.equal(exactDups[0]?.score >= 90, true);
		assert.equal(exactDups[0]?.duplicateReason, "name");
		assert.equal(exactDups[0]?.fullNameHighlights.some((h) => h.isMatch), true);

		// Fuzzy typo name («Ивонов»)
		const fuzzyDups = findPotentialDuplicates(samplePatients, {
			fullName: "Ивонов Иван",
		});
		assert.equal(fuzzyDups.length >= 1, true);
		assert.equal(fuzzyDups[0]?.patient.id, "pat-1");
		assert.equal(fuzzyDups[0]?.duplicateReason, "fuzzy_name");
		assert.equal(fuzzyDups[0]?.score >= 60, true);
	});

	it("1.7 findPotentialDuplicates — Phone duplicate detection (exact national digits and format invariant)", () => {
		// Phone match with 8 instead of +7
		const phoneDups = findPotentialDuplicates(samplePatients, {
			phone: "89259998877",
		});
		assert.equal(phoneDups.length, 1);
		assert.equal(phoneDups[0]?.patient.id, "pat-2");
		assert.equal(phoneDups[0]?.duplicateReason, "phone");
		assert.equal(phoneDups[0]?.score >= 90, true);
		assert.equal(phoneDups[0]?.phoneHighlights.some((h) => h.isMatch), true);

		// Last 4 digits match ("4567")
		const last4Dups = findPotentialDuplicates(samplePatients, {
			phone: "4567",
		});
		assert.equal(last4Dups.length, 1);
		assert.equal(last4Dups[0]?.patient.id, "pat-1");
		assert.equal(last4Dups[0]?.score >= 80, true);
		assert.equal(last4Dups[0]?.duplicateReason, "phone");
	});

	it("1.8 findPotentialDuplicates — Combined name and phone detection with reason 'both'", () => {
		const bothDups = findPotentialDuplicates(samplePatients, {
			fullName: "Иванов Иван",
			phone: "+7 916 123-45-67",
		});
		assert.equal(bothDups.length, 1);
		assert.equal(bothDups[0]?.patient.id, "pat-1");
		assert.equal(bothDups[0]?.duplicateReason, "both");
		assert.equal(bothDups[0]?.score, 100);
	});

	it("1.9 findPotentialDuplicates — Token order swap ('Иван Иванов' vs 'Иванов Иван Иванович')", () => {
		const swappedDups = findPotentialDuplicates(samplePatients, {
			fullName: "Иван Иванов",
		});
		assert.equal(swappedDups.length >= 1, true);
		assert.equal(swappedDups[0]?.patient.id, "pat-1");
		assert.equal(swappedDups[0]?.score >= 90, true);
	});

	it("1.10 findPotentialDuplicates — Short inputs or non-matches return empty array", () => {
		// Short name (<3 chars) and no phone
		const shortRes = findPotentialDuplicates(samplePatients, {
			fullName: "Ив",
		});
		assert.equal(shortRes.length, 0);

		// Short phone (<4 digits)
		const shortPhone = findPotentialDuplicates(samplePatients, {
			phone: "12",
		});
		assert.equal(shortPhone.length, 0);

		// Completely different patient
		const noMatch = findPotentialDuplicates(samplePatients, {
			fullName: "Совершенно Другой Пациент",
			phone: "+7 (999) 000-11-22",
		});
		assert.equal(noMatch.length, 0);
	});
});
