import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import {
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
});
