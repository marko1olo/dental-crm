import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import {
	fuzzyMatchToken,
	isFuzzyNameMatch,
	matchesPatientSearch,
	normalizeCyrillicText,
	normalizePhoneToNational,
	scorePatientSearch,
	type PatientSearchableFields,
} from "../utils/patientSearchUtils";
import {
	highlightSearchMatches,
	searchPatientsQuick,
} from "../components/schedule/patientSearchEngine";

describe("Fuzzy Levenshtein Patient Search & Duplication Guard Suite", () => {
	const samplePatients: Patient[] = [
		{
			id: "pat-ivanov",
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 123-45-67",
			birthDate: "1988-03-15",
			cardNumber: "К-1001",
		} as unknown as Patient,
		{
			id: "pat-smirnov",
			fullName: "Смирнов Алексей Викторович",
			phone: "+7 (916) 777-88-99",
			birthDate: "1992-07-20",
			cardNumber: "К-1002",
		} as unknown as Patient,
		{
			id: "pat-kuznetsov",
			fullName: "Кузнецов Дмитрий Сергеевич",
			phone: "+7 (925) 444-55-66",
			birthDate: "1985-11-10",
			cardNumber: "К-1003",
		} as unknown as Patient,
		{
			id: "pat-popov",
			fullName: "Попов Павел Петрович",
			phone: "+7 (903) 222-33-44",
			birthDate: "1979-01-25",
			cardNumber: "К-1004",
		} as unknown as Patient,
		{
			id: "pat-li",
			fullName: "Ли Владимир Сунович",
			phone: "+7 (999) 555-00-11",
			birthDate: "1995-09-05",
			cardNumber: "К-1005",
		} as unknown as Patient,
		{
			id: "pat-kim",
			fullName: "Ким Артур Брониславович",
			phone: "+7 (999) 666-00-22",
			birthDate: "1990-12-12",
			cardNumber: "К-1006",
		} as unknown as Patient,
		{
			id: "pat-pak",
			fullName: "Пак Надежда Романовна",
			phone: "+7 (999) 777-00-33",
			birthDate: "1987-04-18",
			cardNumber: "К-1007",
		} as unknown as Patient,
		{
			id: "pat-tsoy",
			fullName: "Цой Виктор Робертович",
			phone: "+7 (999) 888-00-44",
			birthDate: "1962-06-21",
			cardNumber: "К-1008",
		} as unknown as Patient,
		{
			id: "pat-larionov",
			fullName: "Ларионов Леонид Львович",
			phone: "+7 (916) 111-22-33",
			birthDate: "1980-08-08",
			cardNumber: "К-1009",
		} as unknown as Patient,
		{
			id: "pat-komarov",
			fullName: "Комаров Константин Кириллович",
			phone: "+7 (916) 222-33-44",
			birthDate: "1983-05-05",
			cardNumber: "К-1010",
		} as unknown as Patient,
		{
			id: "pat-child",
			fullName: "Кузнецова Анна Дмитриевна",
			phone: null,
			birthDate: "2019-02-14",
			cardNumber: "Д-2001",
			administrativeProfile: {
				legalRepresentativeFullName: "Кузнецова Марина Олеговна",
				legalRepresentativePhone: "+7 (925) 999-44-33",
			},
		} as unknown as Patient,
	];

	describe("1. fuzzyMatchToken Typo Tolerance Rules", () => {
		it("allows 1 typo for short words (length 4..5)", () => {
			// 'ивон' vs 'иван' (length 4, dist 1) -> match
			const res1 = fuzzyMatchToken("ивон", "иван");
			assert.equal(res1.isMatch, true);
			assert.equal(res1.distance, 1);
			assert.equal(res1.isExact, false);

			// 'папов' vs 'попов' (length 5, dist 1) -> match
			const res2 = fuzzyMatchToken("папов", "попов");
			assert.equal(res2.isMatch, true);
			assert.equal(res2.distance, 1);

			// 'папочкин' vs 'попов' (length 8 vs 5, dist > 1) -> no match
			const res3 = fuzzyMatchToken("папочкин", "попов");
			assert.equal(res3.isMatch, false);
		});

		it("allows up to 2 typos for long words (length > 5)", () => {
			// 'ивонов' vs 'иванов' (length 6, dist 1) -> match
			const res1 = fuzzyMatchToken("ивонов", "иванов");
			assert.equal(res1.isMatch, true);
			assert.equal(res1.distance, 1);

			// 'смиронов' vs 'смирнов' (length 8, dist 1) -> match
			const res2 = fuzzyMatchToken("смиронов", "смирнов");
			assert.equal(res2.isMatch, true);
			assert.equal(res2.distance, 1);

			// 'кузницоф' vs 'кузнецов' (length 8, dist 2) -> match
			const res3 = fuzzyMatchToken("кузницоф", "кузнецов");
			assert.equal(res3.isMatch, true);
			assert.equal(res3.distance, 2);

			// 'кузницоффф' vs 'кузнецов' (dist 3 > 2) -> no match
			const res4 = fuzzyMatchToken("кузницоффф", "кузнецов");
			assert.equal(res4.isMatch, false);
		});
	});

	describe("2. Strict Short-Surname Defense (Ли, Ким, Пак, Цой, Хан, Али)", () => {
		it("does NOT produce false positives for 'Ли'", () => {
			// 'Ли' must NOT match 'Ларионов', 'Лебедев', 'Логинов'
			assert.equal(fuzzyMatchToken("ли", "ларионов").isMatch, false);
			assert.equal(fuzzyMatchToken("ли", "лебедев").isMatch, false);
			assert.equal(fuzzyMatchToken("ли", "логинов").isMatch, false);
			assert.equal(fuzzyMatchToken("ли", "тимофеев").isMatch, false);

			const res = searchPatientsQuick(samplePatients, "Ли");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-li");
		});

		it("does NOT produce false positives for 'Ким'", () => {
			// 'Ким' must NOT match 'Комаров', 'Котов', 'Китов', 'Римский'
			assert.equal(fuzzyMatchToken("ким", "комаров").isMatch, false);
			assert.equal(fuzzyMatchToken("ким", "котов").isMatch, false);
			assert.equal(fuzzyMatchToken("ким", "римский").isMatch, false);

			const res = searchPatientsQuick(samplePatients, "Ким");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-kim");
		});

		it("does NOT produce false positives for 'Пак'", () => {
			// 'Пак' must NOT match 'Попов', 'Павлов', 'Панин', 'Пахомов'
			assert.equal(fuzzyMatchToken("пак", "попов").isMatch, false);
			assert.equal(fuzzyMatchToken("пак", "павлов").isMatch, false);
			assert.equal(fuzzyMatchToken("пак", "пахомов").isMatch, false);

			const res = searchPatientsQuick(samplePatients, "Пак");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-pak");
		});

		it("does NOT produce false positives for 'Цой'", () => {
			assert.equal(fuzzyMatchToken("цой", "боев").isMatch, false);
			assert.equal(fuzzyMatchToken("цой", "зоя").isMatch, false);

			const res = searchPatientsQuick(samplePatients, "Цой");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-tsoy");
		});
	});

	describe("3. Multi-word Token Permutations and Typo Tolerance", () => {
		it("matches direct order with typo 'ивонов иван'", () => {
			const res = searchPatientsQuick(samplePatients, "ивонов иван");
			assert.equal(res.length >= 1, true);
			assert.equal(res[0]?.patient.id, "pat-ivanov");
			assert.equal(res[0]?.isFuzzy, true);
			assert.equal(res[0]?.suggestedName, "Иванов Иван Иванович");
		});

		it("matches inverted order with typo 'иван ивонов'", () => {
			const res = searchPatientsQuick(samplePatients, "иван ивонов");
			assert.equal(res.length >= 1, true);
			assert.equal(res[0]?.patient.id, "pat-ivanov");
			assert.equal(res[0]?.isFuzzy, true);
		});

		it("matches surname with typo 'смиронов'", () => {
			const res = searchPatientsQuick(samplePatients, "смиронов");
			assert.equal(res.length >= 1, true);
			assert.equal(res[0]?.patient.id, "pat-smirnov");
			assert.equal(res[0]?.isFuzzy, true);
			assert.equal(res[0]?.suggestedName, "Смирнов Алексей Викторович");
		});

		it("matches child patient via representative name with typo", () => {
			const res = searchPatientsQuick(samplePatients, "кузницова марина");
			assert.equal(res.some((r) => r.patient.id === "pat-child"), true);
		});
	});

	describe("4. Scored Results and Ranking Priority", () => {
		it("ranks exact matches above fuzzy matches", () => {
			// Ivanov (exact phone 4567, exact name) vs potential fuzzy
			const scoredExact = scorePatientSearch(samplePatients[0], "Иванов Иван");
			const scoredFuzzy = scorePatientSearch(samplePatients[0], "Ивонов Иван");

			assert.equal(scoredExact.score >= 90, true);
			assert.equal(scoredExact.isExact, true);
			assert.equal(scoredExact.isFuzzy, false);

			assert.equal(scoredFuzzy.score <= 45, true);
			assert.equal(scoredFuzzy.isExact, false);
			assert.equal(scoredFuzzy.isFuzzy, true);
		});

		it("ranks last 4 digits phone match (score 85) at the top", () => {
			const res = searchPatientsQuick(samplePatients, "4567");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-ivanov");
			assert.equal(res[0]?.score, 85);
			assert.equal(res[0]?.matchedBy, "phone");
		});

		it("ranks medical card match (score 80) at the top", () => {
			const res = searchPatientsQuick(samplePatients, "К-1003");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.patient.id, "pat-kuznetsov");
			assert.equal(res[0]?.score, 80);
			assert.equal(res[0]?.matchedBy, "card");
		});
	});

	describe("5. Visual Highlighting with Typo Tolerance", () => {
		it("highlights exact matching chunks in name", () => {
			const parts = highlightSearchMatches("Иванов Иван Иванович", "Иван");
			assert.equal(parts.length >= 2, true);
			assert.equal(parts[0]?.text, "Иван");
			assert.equal(parts[0]?.isMatch, true);
		});

		it("highlights fuzzy matched words in name", () => {
			const parts = highlightSearchMatches("Иванов Иван Иванович", "ивонов");
			assert.equal(parts.some((p) => p.text === "Иванов" && p.isMatch), true);
		});

		it("highlights phone digits in formatted phone string", () => {
			const parts = highlightSearchMatches("+7 (999) 123-45-67", "123");
			assert.equal(parts.some((p) => p.text === "123" && p.isMatch), true);
		});
	});
});
