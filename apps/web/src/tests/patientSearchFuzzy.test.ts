import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import {
	convertKeyboardMistype,
	fuzzyMatchToken,
	isFuzzyNameMatch,
	matchesPatientSearch,
	mergePatientRecordsNonDestructive,
	normalizeCyrillicText,
	normalizePhoneE164,
	normalizePhoneToNational,
	scorePatientSearch,
	transliterateLatinToCyrillic,
	type PatientSearchableFields,
} from "../components/patients/patientSearchFuzzy";
import {
	findPotentialDuplicates,
	highlightSearchMatches,
	searchPatientsQuick,
} from "../components/patients/patientSearchFuzzy";

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

	describe("6. Multi-Field Duplicate Prevention & Fuzzy Highlighting", () => {
		it("detects duplicates across different phone formats ('8 (999) 123-45-67' vs '+79991234567')", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				phone: "8 (999) 123-45-67",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-ivanov");
			assert.equal(dups[0]?.duplicateReason, "phone");
			assert.equal(dups[0]?.score >= 90, true);
		});

		it("detects swapped token order with high duplicate score and highlights", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Алексей Смирнов",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-smirnov");
			assert.equal(dups[0]?.score >= 90, true);
			assert.equal(dups[0]?.fullNameHighlights.some((h) => h.isMatch), true);
		});

		it("detects duplicates when typo in name is paired with matching phone", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Кузницоф Дмитрий",
				phone: "+7 925 444-55-66",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-kuznetsov");
			assert.equal(dups[0]?.duplicateReason, "both");
			assert.equal(dups[0]?.score, 100);
			assert.equal(dups[0]?.phoneHighlights.some((h) => h.isMatch), true);
		});

		it("detects child patient duplicates via representative phone", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Кузнецова Анна",
				phone: "999-44-33",
			});
			assert.equal(dups.some((d) => d.patient.id === "pat-child"), true);
		});
	});

	describe("7. Transliteration & Keyboard Layout Mistype Tolerance", () => {
		it("transliterates Latin surnames to Cyrillic accurately", () => {
			assert.equal(transliterateLatinToCyrillic("Ivanov"), "иванов");
			assert.equal(transliterateLatinToCyrillic("Shcherbakov"), "щербаков");
			assert.equal(transliterateLatinToCyrillic("Kuznetsov"), "кузнецов");
			assert.equal(transliterateLatinToCyrillic("Tsoy"), "цой");
		});

		it("converts wrong keyboard layout typing (QWERTY to JCUKEN)", () => {
			assert.equal(convertKeyboardMistype("Bdfyjd"), "иванов");
			assert.equal(convertKeyboardMistype("Cvbhyjd"), "смирнов");
		});

		it("finds patient when search query is entered in Latin ('Ivanov' -> 'Иванов')", () => {
			const res = searchPatientsQuick(samplePatients, "Ivanov");
			assert.equal(res.length >= 1, true);
			assert.equal(res[0]?.patient.id, "pat-ivanov");
		});

		it("finds patient when search query is typed in wrong layout ('Bdfyjd' -> 'Иванов')", () => {
			const res = searchPatientsQuick(samplePatients, "Bdfyjd");
			assert.equal(res.length >= 1, true);
			assert.equal(res[0]?.patient.id, "pat-ivanov");
		});
	});

	describe("8. E.164 and Multi-format Phone Normalization", () => {
		it("normalizes diverse phone string formats to canonical E.164", () => {
			assert.equal(normalizePhoneE164("+7 (999) 123-45-67"), "+79991234567");
			assert.equal(normalizePhoneE164("89991234567"), "+79991234567");
			assert.equal(normalizePhoneE164("9991234567"), "+79991234567");
			assert.equal(normalizePhoneE164("+79991234567"), "+79991234567");
		});

		it("detects duplicates across E.164 format and last 4 digits", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				phone: "+79991234567",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-ivanov");
			assert.equal(dups[0]?.score >= 90, true);
		});
	});

	describe("9. Birth Date + Fuzzy FIO Duplicate Detection", () => {
		it("detects duplicate when birth date matches and FIO has 1-2 typos", () => {
			// 'Ивонов Иван' with birth date '1988-03-15' vs 'Иванов Иван Иванович' (1988-03-15)
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Ивонов Иван",
				birthDate: "1988-03-15",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-ivanov");
			assert.equal(dups[0]?.duplicateReason, "birth_date_and_name");
			assert.equal(dups[0]?.score >= 90, true);
		});

		it("detects duplicate when birth date matches and word order is swapped", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Алексей Смирнов",
				birthDate: "1992-07-20",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-smirnov");
			assert.equal(dups[0]?.score >= 95, true);
		});
	});

	describe("10. Non-Destructive Patient Merge (Kopeck-exact Balance & Strict UNION)", () => {
		it("sums deposit and family balances with exact kopeck precision", () => {
			const primary = {
				id: "prim-1",
				fullName: "Иванов Иван Иванович",
				balanceRub: 1500.5,
				phone: "+79991234567",
				status: "active",
			} as unknown as Patient;

			const duplicate = {
				id: "dup-1",
				fullName: "Иванов И.И.",
				balanceRub: 2499.5,
				phone: "+79991234567",
				status: "active",
			} as unknown as Patient;

			const result = mergePatientRecordsNonDestructive(primary, duplicate);
			assert.equal(result.combinedBalanceRub, 4000.0);
			assert.equal(result.primaryPatient.balanceRub, 4000.0);
			assert.equal(result.archivedDuplicatePatient.status, "archived");
			assert.equal(result.archivedDuplicatePatient.mergedIntoPatientId, "prim-1");
		});

		it("performs STRICT UNION of allergies and somatic safety flags without data loss", () => {
			const primary = {
				id: "prim-2",
				fullName: "Петров Петр Петрович",
				allergies: "Аллергия на пенициллины",
				clinicalSafetyProfile: {
					hasHypertension: true,
					hasLidocaineAllergy: false,
				},
				status: "active",
			} as unknown as Patient;

			const duplicate = {
				id: "dup-2",
				fullName: "Петров П.",
				allergies: "Аллергия на лидокаин, аспирин",
				clinicalSafetyProfile: {
					hasPacemakerExs: true,
					hasLidocaineAllergy: true,
				},
				status: "active",
			} as unknown as Patient;

			const result = mergePatientRecordsNonDestructive(primary, duplicate);

			// Check allergies union
			assert.equal(result.unitedAllergies.includes("Аллергия на пенициллины"), true);
			assert.equal(result.unitedAllergies.includes("Аллергия на лидокаин"), true);
			assert.equal(result.unitedAllergies.includes("аспирин"), true);

			// Check somatic safety flags union (BOTH hypertension and pacemaker must be true)
			const mergedSafety = (result.primaryPatient as any).clinicalSafetyProfile;
			assert.equal(mergedSafety.hasHypertension, true);
			assert.equal(mergedSafety.hasPacemakerExs, true);
			assert.equal(mergedSafety.hasLidocaineAllergy, true);

			assert.equal(result.unitedSafetyFlags.includes("Кардиостимулятор (ЭКС)"), true);
			assert.equal(result.unitedSafetyFlags.includes("Гипертония"), true);
			assert.equal(result.unitedSafetyFlags.includes("Аллергия на лидокаин"), true);
		});
	});

	describe("11. PatientWorkspaceModals & Transliterated/Mistype Duplicate Matching", () => {
		it("detects duplicates when search or incoming candidate uses Latin transliteration ('Ivanov')", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Ivanov Ivan",
				phone: "+79991234567",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-ivanov");
			assert.equal(dups[0]?.score >= 90, true);
		});

		it("detects duplicates when incoming candidate is typed in wrong keyboard layout ('Bdfyjd')", () => {
			const dups = findPotentialDuplicates(samplePatients, {
				fullName: "Bdfyjd Bdfy",
				phone: "+79991234567",
			});
			assert.equal(dups.length >= 1, true);
			assert.equal(dups[0]?.patient.id, "pat-ivanov");
			assert.equal(dups[0]?.score >= 90, true);
		});

		it("exports PatientWorkspaceModals and PatientDuplicateMergeModal components", async () => {
			const modalsModule = await import("../components/patients/PatientWorkspaceModals");
			assert.equal(typeof modalsModule.PatientWorkspaceModals, "object"); // React.memo is object
			assert.equal(typeof modalsModule.PatientDuplicateMergeModal, "object");
		});
	});

	describe("12. Outpatient Card 043/у & Multi-Field Search (chartNumber, mobilePhone)", () => {
		it("finds patient when query contains 043/у prefix ('043/у-1001', 'карта 1001', '043-1001')", () => {
			const res1 = searchPatientsQuick(samplePatients, "043/у-1001");
			assert.equal(res1.length >= 1, true);
			assert.equal(res1[0]?.patient.id, "pat-ivanov");
			assert.equal(res1[0]?.matchedBy, "card");

			const res2 = searchPatientsQuick(samplePatients, "карта 1002");
			assert.equal(res2.length >= 1, true);
			assert.equal(res2[0]?.patient.id, "pat-smirnov");
			assert.equal(res2[0]?.matchedBy, "card");

			const res3 = searchPatientsQuick(samplePatients, "043 1003");
			assert.equal(res3.length >= 1, true);
			assert.equal(res3[0]?.patient.id, "pat-kuznetsov");
			assert.equal(res3[0]?.matchedBy, "card");
		});

		it("finds patient when card number is stored in chartNumber or medicalCardNumber", () => {
			const customPatients = [
				{
					id: "pat-chart",
					fullName: "Белов Сергей Николаевич",
					phone: "+7 (911) 222-33-44",
					chartNumber: "043-7788",
				} as unknown as Patient,
				{
					id: "pat-medcard",
					fullName: "Соколова Елена Игоревна",
					phone: "+7 (921) 333-44-55",
					medicalCardNumber: "МК-9900",
				} as unknown as Patient,
			];

			const resChart = searchPatientsQuick(customPatients, "7788");
			assert.equal(resChart.length, 1);
			assert.equal(resChart[0]?.patient.id, "pat-chart");
			assert.equal(resChart[0]?.matchedBy, "card");

			const resMedcard = searchPatientsQuick(customPatients, "043/у-9900");
			assert.equal(resMedcard.length, 1);
			assert.equal(resMedcard[0]?.patient.id, "pat-medcard");
			assert.equal(resMedcard[0]?.matchedBy, "card");
		});

		it("finds patient when phone is stored in mobilePhone or administrativeProfile", () => {
			const altPhonePatients = [
				{
					id: "pat-alt-mobile",
					fullName: "Новиков Денис Андреевич",
					mobilePhone: "+7 (905) 555-88-11",
				} as unknown as Patient,
				{
					id: "pat-admin-phone",
					fullName: "Федорова Ольга Михайловна",
					administrativeProfile: {
						patientPhone: "+7 (909) 444-22-33",
					},
				} as unknown as Patient,
			];

			const resMobile = searchPatientsQuick(altPhonePatients, "8811");
			assert.equal(resMobile.length, 1);
			assert.equal(resMobile[0]?.patient.id, "pat-alt-mobile");
			assert.equal(resMobile[0]?.matchedBy, "phone");

			const resAdmin = searchPatientsQuick(altPhonePatients, "2233");
			assert.equal(resAdmin.length, 1);
			assert.equal(resAdmin[0]?.patient.id, "pat-admin-phone");
			assert.equal(resAdmin[0]?.matchedBy, "phone");
		});
	});
});
