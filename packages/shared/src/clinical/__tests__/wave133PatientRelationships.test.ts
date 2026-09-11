/**
 * wave133PatientRelationships.test.ts
 * Unit tests for Wave 133 Patient Relationships, Legal Guardians & Family Payment Engine.
 *
 * Reverse-engineered & adapted from DentalPin (backend/app/modules/patient_relationships):
 * 1. Mutual relationship inversion table (parent <-> child, guardian <-> ward, spouse <-> spouse, sibling <-> sibling).
 * 2. Bidirectional relationship resolution from the perspective of each participant ("этот человек приходится мне ___").
 * 3. Relationship pair validation: self-linking prevention (A -> A) and duplicate detection in both directions (A -> B and B -> A).
 * 4. Family payment authorization under Mandate 8e (friction-free payment by parents, spouses, and financial guarantors).
 * 5. Statutory legal representative consent A4 protocol under 323-FZ Art. 20 & 54 for Form 043/u: strictly 0 emojis (Mandate 8d item 7).
 * 6. Zod schema validation & export integrity from clinical/index.ts and root index.ts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type FamilyGuarantorPermission,
	type LegalGuardianConsentA4Params,
	type PatientRelationshipRecord,
	type RelationshipType,
	type ResolvedPatientRelationship,
	FAMILY_GUARANTOR_PERMISSIONS,
	FAMILY_GUARANTOR_PERMISSION_LABELS_RU,
	INVERSE_RELATIONSHIP_TYPE,
	RELATIONSHIP_LABELS_RU,
	RELATIONSHIP_TYPES,
	buildBidirectionalRelationshipList,
	evaluateFamilyPaymentAuthorization,
	familyGuarantorPermissionSchema,
	formatLegalGuardianConsentA4Protocol,
	getInverseRelationshipType,
	getRelationshipLabelRu,
	patientRelationshipRecordSchema,
	relationshipTypeSchema,
	resolvedPatientRelationshipSchema,
	validateRelationshipPair,
} from "../patientRelationshipsEngine.js";
import {
	buildBidirectionalRelationshipList as buildBidirectionalFromClinical,
	evaluateFamilyPaymentAuthorization as evaluatePaymentFromClinical,
	formatLegalGuardianConsentA4Protocol as formatConsentFromClinical,
	getInverseRelationshipType as getInverseTypeFromClinical,
	validateRelationshipPair as validatePairFromClinical,
} from "../index.js";
import {
	buildBidirectionalRelationshipList as buildBidirectionalFromRoot,
	evaluateFamilyPaymentAuthorization as evaluatePaymentFromRoot,
	formatLegalGuardianConsentA4Protocol as formatConsentFromRoot,
	getInverseRelationshipType as getInverseTypeFromRoot,
	validateRelationshipPair as validatePairFromRoot,
} from "../../index.js";

// ─────────────────────────────────────────────────────────────────────────────
// REALISTIC CLINICAL TEST FIXTURES (RUSSIAN HEALTHCARE REALISM)
// ─────────────────────────────────────────────────────────────────────────────

const CLINIC_ID = "11111111-2222-4000-8000-000000000001";
const CHILD_PATIENT_ID = "22222222-3333-4000-8000-000000000002";
const MOTHER_PATIENT_ID = "33333333-4444-4000-8000-000000000003";
const FATHER_PATIENT_ID = "44444444-5555-4000-8000-000000000004";
const SPOUSE_PATIENT_ID = "55555555-6666-4000-8000-000000000005";
const SIBLING_PATIENT_ID = "66666666-7777-4000-8000-000000000006";
const GUARDIAN_PATIENT_ID = "77777777-8888-4000-8000-000000000007";
const UNRELATED_PATIENT_ID = "88888888-9999-4000-8000-000000000008";

describe("Wave 133: Patient Relationships & Family Guarantor Engine", () => {
	it("re-exports all Wave 133 functions cleanly from clinical/index.ts and root index.ts", () => {
		assert.equal(typeof buildBidirectionalFromClinical, "function");
		assert.equal(typeof evaluatePaymentFromClinical, "function");
		assert.equal(typeof formatConsentFromClinical, "function");
		assert.equal(typeof getInverseTypeFromClinical, "function");
		assert.equal(typeof validatePairFromClinical, "function");

		assert.equal(typeof buildBidirectionalFromRoot, "function");
		assert.equal(typeof evaluatePaymentFromRoot, "function");
		assert.equal(typeof formatConsentFromRoot, "function");
		assert.equal(typeof getInverseTypeFromRoot, "function");
		assert.equal(typeof validatePairFromRoot, "function");
	});

	describe("1. Inverse Relationship Type Table", () => {
		it("inverts parent <-> child reciprocally", () => {
			assert.equal(getInverseRelationshipType("parent"), "child");
			assert.equal(getInverseRelationshipType("child"), "parent");
		});

		it("inverts guardian <-> ward reciprocally", () => {
			assert.equal(getInverseRelationshipType("guardian"), "ward");
			assert.equal(getInverseRelationshipType("ward"), "guardian");
		});

		it("inverts symmetric relationships to themselves (spouse, sibling, other)", () => {
			assert.equal(getInverseRelationshipType("spouse"), "spouse");
			assert.equal(getInverseRelationshipType("sibling"), "sibling");
			assert.equal(getInverseRelationshipType("other"), "other");
		});

		it("falls back to 'other' for unrecognized relationship string", () => {
			assert.equal(getInverseRelationshipType("unknown_relation" as RelationshipType), "other");
		});

		it("contains all 7 canonical relationship types", () => {
			assert.deepEqual(RELATIONSHIP_TYPES, [
				"parent",
				"child",
				"spouse",
				"sibling",
				"guardian",
				"ward",
				"other",
			]);
		});
	});

	describe("2. Bidirectional Relationship Resolution (buildBidirectionalRelationshipList)", () => {
		const motherChildLink: PatientRelationshipRecord = {
			id: "a0000000-0000-4000-8000-000000000001",
			clinicId: CLINIC_ID,
			patientId: CHILD_PATIENT_ID,
			relatedPatientId: MOTHER_PATIENT_ID,
			relationshipType: "parent",
			isLegalGuardian: true,
			isFinancialGuarantor: true,
			permissions: ["sign_consents", "shared_balance_payment", "view_medical_records"],
			notes: "Мать (Барабаш Елена Васильевна)",
			createdAt: "2026-09-12T00:00:00.000Z",
		};

		const fatherChildLink: PatientRelationshipRecord = {
			id: "a0000000-0000-4000-8000-000000000002",
			clinicId: CLINIC_ID,
			patientId: CHILD_PATIENT_ID,
			relatedPatientId: FATHER_PATIENT_ID,
			relationshipType: "parent",
			isLegalGuardian: true,
			isFinancialGuarantor: true,
			permissions: ["sign_consents", "shared_balance_payment", "appointment_management"],
			notes: "Отец (Барабаш Сергей Владимирович)",
			createdAt: "2026-09-12T00:00:00.000Z",
		};

		it("resolves links from perspective of child (direct links: related person is parent)", () => {
			const childView = buildBidirectionalRelationshipList(CHILD_PATIENT_ID, [
				motherChildLink,
				fatherChildLink,
			]);

			assert.equal(childView.length, 2);

			const motherItem = childView.find((r) => r.relatedPatientId === MOTHER_PATIENT_ID);
			assert.ok(motherItem);
			assert.equal(motherItem.relationshipType, "parent");
			assert.equal(motherItem.relationshipLabelRu, "Мать / Отец");
			assert.equal(motherItem.isInverse, false);
			assert.equal(motherItem.isLegalGuardian, true);
			assert.equal(motherItem.isFinancialGuarantor, true);
			assert.deepEqual(motherItem.permissions, [
				"sign_consents",
				"shared_balance_payment",
				"view_medical_records",
			]);
			assert.equal(motherItem.notes, "Мать (Барабаш Елена Васильевна)");

			const fatherItem = childView.find((r) => r.relatedPatientId === FATHER_PATIENT_ID);
			assert.ok(fatherItem);
			assert.equal(fatherItem.relationshipType, "parent");
			assert.equal(fatherItem.isInverse, false);
		});

		it("resolves links from perspective of mother (inverse link: related person is child)", () => {
			const motherView = buildBidirectionalRelationshipList(MOTHER_PATIENT_ID, [
				motherChildLink,
				fatherChildLink,
			]);

			// Mother is only part of motherChildLink
			assert.equal(motherView.length, 1);

			const childItem = motherView[0];
			assert.ok(childItem);
			assert.equal(childItem.patientId, MOTHER_PATIENT_ID);
			assert.equal(childItem.relatedPatientId, CHILD_PATIENT_ID);
			assert.equal(childItem.relationshipType, "child", "Parent inverts to child");
			assert.equal(childItem.relationshipLabelRu, "Сын / Дочь");
			assert.equal(childItem.isInverse, true, "Marked as inverse perspective");
			assert.equal(childItem.isLegalGuardian, true);
			assert.equal(childItem.isFinancialGuarantor, true);
			assert.deepEqual(childItem.permissions, [
				"sign_consents",
				"shared_balance_payment",
				"view_medical_records",
			]);
		});

		it("resolves spouse symmetric relationship from both perspectives", () => {
			const spouseLink: PatientRelationshipRecord = {
				id: "a0000000-0000-4000-8000-000000000003",
				clinicId: CLINIC_ID,
				patientId: MOTHER_PATIENT_ID,
				relatedPatientId: SPOUSE_PATIENT_ID,
				relationshipType: "spouse",
				isLegalGuardian: false,
				isFinancialGuarantor: true,
				permissions: ["shared_balance_payment"],
				notes: "Брак зарегистрирован",
			};

			const viewFromMother = buildBidirectionalRelationshipList(MOTHER_PATIENT_ID, [spouseLink]);
			assert.equal(viewFromMother.length, 1);
			assert.ok(viewFromMother[0]);
			assert.equal(viewFromMother[0].relationshipType, "spouse");
			assert.equal(viewFromMother[0].isInverse, false);

			const viewFromSpouse = buildBidirectionalRelationshipList(SPOUSE_PATIENT_ID, [spouseLink]);
			assert.equal(viewFromSpouse.length, 1);
			assert.ok(viewFromSpouse[0]);
			assert.equal(viewFromSpouse[0].relationshipType, "spouse");
			assert.equal(viewFromSpouse[0].isInverse, true);
		});

		it("returns empty array for empty inputs or invalid patientId", () => {
			assert.deepEqual(buildBidirectionalRelationshipList("", [motherChildLink]), []);
			assert.deepEqual(buildBidirectionalRelationshipList(CHILD_PATIENT_ID, []), []);
			assert.deepEqual(
				buildBidirectionalRelationshipList(CHILD_PATIENT_ID, null as unknown as PatientRelationshipRecord[]),
				[],
			);
		});
	});

	describe("3. Relationship Pair Validation (validateRelationshipPair)", () => {
		const existingLinks: PatientRelationshipRecord[] = [
			{
				id: "b0000000-0000-4000-8000-000000000001",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: MOTHER_PATIENT_ID,
				relationshipType: "parent",
				isLegalGuardian: true,
				isFinancialGuarantor: true,
				permissions: ["sign_consents"],
			},
		];

		it("rejects self-linking with explicit error reason (DentalPin invariant)", () => {
			const result = validateRelationshipPair(CHILD_PATIENT_ID, CHILD_PATIENT_ID, existingLinks);
			assert.equal(result.valid, false);
			assert.ok(result.reason?.includes("Пациент не может быть связан сам с собой"));
		});

		it("rejects empty or whitespace patient identifiers", () => {
			const res1 = validateRelationshipPair("", MOTHER_PATIENT_ID, existingLinks);
			assert.equal(res1.valid, false);
			assert.ok(res1.reason?.includes("ID обоих пациентов обязательны"));

			const res2 = validateRelationshipPair(CHILD_PATIENT_ID, "   ", existingLinks);
			assert.equal(res2.valid, false);
			assert.ok(res2.reason?.includes("ID обоих пациентов обязательны"));
		});

		it("rejects duplicate link in the same direction (A -> B)", () => {
			const result = validateRelationshipPair(CHILD_PATIENT_ID, MOTHER_PATIENT_ID, existingLinks);
			assert.equal(result.valid, false);
			assert.ok(result.reason?.includes("уже существует"));
		});

		it("rejects duplicate link in the reverse direction (B -> A)", () => {
			const result = validateRelationshipPair(MOTHER_PATIENT_ID, CHILD_PATIENT_ID, existingLinks);
			assert.equal(result.valid, false);
			assert.ok(result.reason?.includes("уже существует"));
		});

		it("accepts a distinct valid relationship pair", () => {
			const result = validateRelationshipPair(CHILD_PATIENT_ID, FATHER_PATIENT_ID, existingLinks);
			assert.equal(result.valid, true);
			assert.equal(result.reason, undefined);
		});
	});

	describe("4. Family Payment Authorization (evaluateFamilyPaymentAuthorization - Mandate 8e)", () => {
		const relationships: PatientRelationshipRecord[] = [
			{
				id: "c0000000-0000-4000-8000-000000000001",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: MOTHER_PATIENT_ID,
				relationshipType: "parent",
				isLegalGuardian: true,
				isFinancialGuarantor: true,
				permissions: ["shared_balance_payment", "sign_consents"],
				notes: "Мать",
			},
			{
				id: "c0000000-0000-4000-8000-000000000002",
				clinicId: CLINIC_ID,
				patientId: MOTHER_PATIENT_ID,
				relatedPatientId: SPOUSE_PATIENT_ID,
				relationshipType: "spouse",
				isLegalGuardian: false,
				isFinancialGuarantor: true,
				permissions: ["shared_balance_payment"],
				notes: "Супруг",
			},
			{
				id: "c0000000-0000-4000-8000-000000000003",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: SIBLING_PATIENT_ID,
				relationshipType: "sibling",
				isLegalGuardian: false,
				isFinancialGuarantor: false,
				permissions: [],
				notes: "Сестра",
			},
			{
				id: "c0000000-0000-4000-8000-000000000004",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: UNRELATED_PATIENT_ID,
				relationshipType: "other",
				isLegalGuardian: false,
				isFinancialGuarantor: false,
				permissions: [],
				notes: "Знакомый семьи",
			},
		];

		it("authorizes self-payment automatically without barrier prompts", () => {
			const res = evaluateFamilyPaymentAuthorization(MOTHER_PATIENT_ID, MOTHER_PATIENT_ID, relationships);
			assert.equal(res.authorized, true);
			assert.ok(res.relationDescription?.includes("самостоятельно"));
		});

		it("authorizes parent paying for child without barrier prompts (Mandate 8e Doctor Autonomy)", () => {
			const res = evaluateFamilyPaymentAuthorization(MOTHER_PATIENT_ID, CHILD_PATIENT_ID, relationships);
			assert.equal(res.authorized, true);
			assert.ok(res.relationDescription?.includes("Мать / Отец"));
			assert.ok(res.relationDescription?.includes("финансовый поручитель"));
		});

		it("authorizes spouse paying for spouse from family balance", () => {
			const res = evaluateFamilyPaymentAuthorization(SPOUSE_PATIENT_ID, MOTHER_PATIENT_ID, relationships);
			assert.equal(res.authorized, true);
			assert.ok(res.relationDescription?.includes("Супруг(а)"));
		});

		it("authorizes sibling paying for sibling under family care", () => {
			const res = evaluateFamilyPaymentAuthorization(SIBLING_PATIENT_ID, CHILD_PATIENT_ID, relationships);
			assert.equal(res.authorized, true);
			assert.ok(res.relationDescription?.includes("Брат / Сестра"));
		});

		it("rejects unrelated individual with no financial guarantor status", () => {
			const res = evaluateFamilyPaymentAuthorization(UNRELATED_PATIENT_ID, CHILD_PATIENT_ID, relationships);
			assert.equal(res.authorized, false);
			assert.ok(res.relationDescription?.includes("не наделено правами"));
		});

		it("rejects when no relationship exists in registry", () => {
			const res = evaluateFamilyPaymentAuthorization(
				"99999999-0000-4000-8000-000000000009",
				CHILD_PATIENT_ID,
				relationships,
			);
			assert.equal(res.authorized, false);
			assert.ok(res.relationDescription?.includes("Отсутствует подтвержденная"));
		});

		it("rejects empty payer or patient ID", () => {
			const res = evaluateFamilyPaymentAuthorization("", CHILD_PATIENT_ID, relationships);
			assert.equal(res.authorized, false);
			assert.ok(res.relationDescription?.includes("обязательны"));
		});
	});

	describe("5. Statutory Legal Guardian Consent A4 Protocol (formatLegalGuardianConsentA4Protocol)", () => {
		const consentParams: LegalGuardianConsentA4Params = {
			clinicName: "ООО Стоматологическая клиника «ДЕНТЕ ЭТАЛОН»",
			clinicAddress: "г. Москва, ул. Клиническая, д. 12, стр. 1",
			clinicLicense: "ЛО41-01137-77/00368945 от 15.02.2023",
			patientFullName: "Барабаш Иван Сергеевич",
			patientBirthDate: "14.05.2018",
			patientCardNumber: "СТ-2026/0438",
			guardianFullName: "Барабаш Елена Васильевна",
			guardianBirthDate: "22.08.1988",
			guardianPassport: "Паспорт РФ 45 12 № 894512 выдан ОВД Пресненского р-на г. Москвы",
			guardianPhone: "+7 (999) 123-45-67",
			relationshipType: "parent",
			documentGrounds: "Свидетельство о рождении серия VII-МЮ № 451892",
			scopeOfTreatment: "Терапевтическое лечение кариеса и пульпита временных зубов, аппликационная и инфильтрационная анестезия",
			doctorFullName: "Барабаш С.В.",
			consentDateIso: "2026-09-12T10:00:00.000Z",
			notes: "Аллергических реакций на местные анестетики артикаинового ряда в анамнезе не отмечено.",
		};

		it("generates statutory protocol containing 0 emojis verified via Unicode Regex (Mandate 8d Item 7)", () => {
			const protocol = formatLegalGuardianConsentA4Protocol(consentParams);

			// Strict Mandate 8d item 7 check: ZERO emojis
			const emojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				emojiRegex.test(protocol),
				false,
				"A4 clinical consent protocol must contain strictly 0 emojis",
			);
		});

		it("includes mandatory statutory references to FZ-323 Art. 20 & 54 and Form 043/u", () => {
			const protocol = formatLegalGuardianConsentA4Protocol(consentParams);

			assert.ok(protocol.includes("ПРОТОКОЛ ИНФОРМИРОВАННОГО ДОБРОВОЛЬНОГО СОГЛАСИЯ"));
			assert.ok(protocol.includes("ФОРМА 043/У"));
			assert.ok(protocol.includes("СТ. 20 И СТ. 54 ФЗ № 323-ФЗ"));
			assert.ok(protocol.includes("ООО Стоматологическая клиника «ДЕНТЕ ЭТАЛОН»"));
			assert.ok(protocol.includes("Барабаш Иван Сергеевич"));
			assert.ok(protocol.includes("Барабаш Елена Васильевна"));
			assert.ok(protocol.includes("Свидетельство о рождении серия VII-МЮ № 451892"));
			assert.ok(protocol.includes("Барабаш С.В."));
			assert.ok(protocol.includes("М.П. (Место печати медицинской организации)"));
		});

		it("includes Mandate 8e financial obligations section", () => {
			const protocol = formatLegalGuardianConsentA4Protocol(consentParams);

			assert.ok(protocol.includes("МАНДАТ 8E, 54-ФЗ"));
			assert.ok(protocol.includes("семейного"));
		});

		it("formats guardian status accurately based on relationshipType", () => {
			const guardianParams: LegalGuardianConsentA4Params = {
				...consentParams,
				relationshipType: "guardian",
				documentGrounds: "Распоряжение органа опеки и попечительства № 112-р от 10.01.2024",
			};

			const protocol = formatLegalGuardianConsentA4Protocol(guardianParams);
			assert.ok(protocol.includes("Опекун (законный представитель)"));
			assert.ok(protocol.includes("Распоряжение органа опеки и попечительства"));
		});
	});

	describe("6. Zod Schemas Validation & Integrity", () => {
		it("validates familyGuarantorPermissionSchema", () => {
			assert.equal(familyGuarantorPermissionSchema.parse("view_medical_records"), "view_medical_records");
			assert.equal(familyGuarantorPermissionSchema.parse("sign_consents"), "sign_consents");
			assert.equal(familyGuarantorPermissionSchema.parse("shared_balance_payment"), "shared_balance_payment");
			assert.equal(familyGuarantorPermissionSchema.parse("appointment_management"), "appointment_management");
			assert.throws(() => familyGuarantorPermissionSchema.parse("invalid_permission"));
		});

		it("has Russian labels for all 4 permissions", () => {
			for (const perm of FAMILY_GUARANTOR_PERMISSIONS) {
				assert.ok(FAMILY_GUARANTOR_PERMISSION_LABELS_RU[perm]);
				assert.ok(FAMILY_GUARANTOR_PERMISSION_LABELS_RU[perm].length > 0);
			}
		});

		it("validates patientRelationshipRecordSchema", () => {
			const validRecord: PatientRelationshipRecord = {
				id: "d0000000-0000-4000-8000-000000000001",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: MOTHER_PATIENT_ID,
				relationshipType: "parent",
				isLegalGuardian: true,
				isFinancialGuarantor: true,
				permissions: ["sign_consents", "shared_balance_payment"],
				notes: "Законный представитель",
			};

			const parsed = patientRelationshipRecordSchema.parse(validRecord);
			assert.equal(parsed.relationshipType, "parent");
			assert.equal(parsed.isLegalGuardian, true);
		});

		it("validates resolvedPatientRelationshipSchema", () => {
			const resolved: ResolvedPatientRelationship = {
				id: "e0000000-0000-4000-8000-000000000001",
				clinicId: CLINIC_ID,
				patientId: CHILD_PATIENT_ID,
				relatedPatientId: MOTHER_PATIENT_ID,
				relationshipType: "parent",
				relationshipLabelRu: "Мать / Отец",
				isLegalGuardian: true,
				isFinancialGuarantor: true,
				permissions: ["sign_consents"],
				notes: null,
				isInverse: false,
			};

			const parsed = resolvedPatientRelationshipSchema.parse(resolved);
			assert.equal(parsed.relationshipType, "parent");
			assert.equal(parsed.isInverse, false);
		});
	});
});
