/**
 * wave124PatientRelationships.test.ts
 * Unit tests for Patient Relationships & Kinship Graph Engine (Wave 124)
 *
 * Covers:
 * 1. Mutual relationship inversion matrix (parent <-> child, guardian <-> ward, spouse <-> spouse, sibling <-> sibling, other <-> other).
 * 2. Russian legal nomenclature & labels (getRelationshipLabelRu direct and inverse).
 * 3. Bidirectional pair generation with Mandate 8e auto-defaults (Doctor Autonomy).
 * 4. Self-linking prevention & validation guards (DentalPin invariant).
 * 5. Legal representative resolution for pediatric patients (< 15 years old under 323-FZ Art. 20) vs adult patients (>= 15 years old).
 * 6. Financial payer resolution for family balance billing (54-FZ).
 * 7. Emergency contact filtering.
 * 8. Printable A4 kinship protocol: strictly 0 emojis (Mandate 8d item 7).
 * 9. Re-exports integrity from clinical/index.ts and shared root index.ts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type AuthorizedSignersResolution,
	type CreateRelationshipInput,
	type PatientRelationship,
	type RelationshipType,
	type UpdateRelationshipInput,
	INVERSE_RELATIONSHIP_TYPE,
	RELATIONSHIP_LABELS_RU,
	RELATIONSHIP_TYPES,
	RF_STATUTORY_CONSENT_AGE_THRESHOLD,
	createRelationshipInputSchema,
	createRelationshipPair,
	formatKinshipSummaryA4,
	getInverseRelationship,
	getRelationshipLabelRu,
	isRelationshipType,
	patientRelationshipSchema,
	relationshipTypeSchema,
	resolveAuthorizedSigners,
	resolveEmergencyContacts,
	resolveFamilyPayers,
	updateRelationshipInputSchema,
} from "../patientRelationshipsEngine.js";
import {
	createRelationshipPair as createRelationshipPairFromClinicalIndex,
	formatKinshipSummaryA4 as formatKinshipSummaryA4FromClinicalIndex,
	getInverseRelationship as getInverseRelationshipFromClinicalIndex,
	getRelationshipLabelRu as getRelationshipLabelRuFromClinicalIndex,
	resolveAuthorizedSigners as resolveAuthorizedSignersFromClinicalIndex,
	resolveFamilyPayers as resolveFamilyPayersFromClinicalIndex,
} from "../index.js";
import {
	createRelationshipPair as createRelationshipPairFromRoot,
	formatKinshipSummaryA4 as formatKinshipSummaryA4FromRoot,
	getInverseRelationship as getInverseRelationshipFromRoot,
	getRelationshipLabelRu as getRelationshipLabelRuFromRoot,
	resolveAuthorizedSigners as resolveAuthorizedSignersFromRoot,
	resolveFamilyPayers as resolveFamilyPayersFromRoot,
} from "../../index.js";

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PATIENT_CHILD_ID = "00000000-0000-4000-8000-000000000001";
const MOCK_PATIENT_PARENT_ID = "00000000-0000-4000-8000-000000000002";
const MOCK_PATIENT_SPOUSE_ID = "00000000-0000-4000-8000-000000000003";
const MOCK_PATIENT_GUARDIAN_ID = "00000000-0000-4000-8000-000000000004";
const MOCK_PATIENT_SIBLING_ID = "00000000-0000-4000-8000-000000000005";

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe("Wave 124: Patient Relationships & Kinship Graph Engine", () => {
	it("re-exports all core engine symbols cleanly from clinical/index.ts and root index.ts", () => {
		assert.equal(typeof createRelationshipPairFromClinicalIndex, "function");
		assert.equal(typeof formatKinshipSummaryA4FromClinicalIndex, "function");
		assert.equal(typeof getInverseRelationshipFromClinicalIndex, "function");
		assert.equal(typeof getRelationshipLabelRuFromClinicalIndex, "function");
		assert.equal(typeof resolveAuthorizedSignersFromClinicalIndex, "function");
		assert.equal(typeof resolveFamilyPayersFromClinicalIndex, "function");

		assert.equal(typeof createRelationshipPairFromRoot, "function");
		assert.equal(typeof formatKinshipSummaryA4FromRoot, "function");
		assert.equal(typeof getInverseRelationshipFromRoot, "function");
		assert.equal(typeof getRelationshipLabelRuFromRoot, "function");
		assert.equal(typeof resolveAuthorizedSignersFromRoot, "function");
		assert.equal(typeof resolveFamilyPayersFromRoot, "function");
	});

	describe("1. Relationship Types & Inversion Matrix", () => {
		it("inverts parent <-> child reciprocally", () => {
			assert.equal(getInverseRelationship("parent"), "child");
			assert.equal(getInverseRelationship("child"), "parent");
		});

		it("inverts guardian <-> ward reciprocally", () => {
			assert.equal(getInverseRelationship("guardian"), "ward");
			assert.equal(getInverseRelationship("ward"), "guardian");
		});

		it("inverts symmetric relationships to themselves (spouse, sibling, other)", () => {
			assert.equal(getInverseRelationship("spouse"), "spouse");
			assert.equal(getInverseRelationship("sibling"), "sibling");
			assert.equal(getInverseRelationship("other"), "other");
		});

		it("falls back to 'other' for unrecognized relationship strings", () => {
			assert.equal(getInverseRelationship("unrecognized_type" as RelationshipType), "other");
		});

		it("validates relationship types with isRelationshipType guard", () => {
			assert.equal(isRelationshipType("parent"), true);
			assert.equal(isRelationshipType("child"), true);
			assert.equal(isRelationshipType("spouse"), true);
			assert.equal(isRelationshipType("sibling"), true);
			assert.equal(isRelationshipType("guardian"), true);
			assert.equal(isRelationshipType("ward"), true);
			assert.equal(isRelationshipType("other"), true);
			assert.equal(isRelationshipType("cousin"), false);
			assert.equal(isRelationshipType(null), false);
			assert.equal(isRelationshipType(undefined), false);
			assert.equal(isRelationshipType(123), false);
		});

		it("includes all 7 canonical types in RELATIONSHIP_TYPES", () => {
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

	describe("2. Russian Statutory Nomenclature (getRelationshipLabelRu)", () => {
		it("returns accurate direct Russian legal labels for all types", () => {
			assert.equal(getRelationshipLabelRu("parent"), "Мать / Отец");
			assert.equal(getRelationshipLabelRu("child"), "Сын / Дочь");
			assert.equal(getRelationshipLabelRu("guardian"), "Опекун (законный представитель)");
			assert.equal(getRelationshipLabelRu("ward"), "Подопечный");
			assert.equal(getRelationshipLabelRu("spouse"), "Супруг(а)");
			assert.equal(getRelationshipLabelRu("sibling"), "Брат / Сестра");
			assert.equal(getRelationshipLabelRu("other"), "Связанное лицо / Другой представитель");
		});

		it("returns accurate inverse perspective labels when isInverse is true", () => {
			assert.equal(getRelationshipLabelRu("parent", true), "Сын / Дочь");
			assert.equal(getRelationshipLabelRu("child", true), "Мать / Отец");
			assert.equal(getRelationshipLabelRu("guardian", true), "Подопечный");
			assert.equal(getRelationshipLabelRu("ward", true), "Опекун (законный представитель)");
			assert.equal(getRelationshipLabelRu("spouse", true), "Супруг(а)");
			assert.equal(getRelationshipLabelRu("sibling", true), "Брат / Сестра");
			assert.equal(getRelationshipLabelRu("other", true), "Связанное лицо / Другой представитель");
		});

		it("falls back to default label for unknown type", () => {
			assert.equal(getRelationshipLabelRu("unknown" as RelationshipType), "Связанное лицо");
		});
	});

	describe("3. createRelationshipPair (Mandate 8e Doctor Autonomy & Zero Friction)", () => {
		it("creates a bidirectional linked pair with auto-generated UUIDs and timestamps", () => {
			const { direct, inverse } = createRelationshipPair({
				patientId: MOCK_PATIENT_CHILD_ID,
				patientName: "Иванов Ваня (7 лет)",
				relatedPatientId: MOCK_PATIENT_PARENT_ID,
				relatedPatientName: "Иванова Мария Сергеевна",
				relationshipType: "parent",
			});

			// Direct assertion
			assert.equal(direct.patientId, MOCK_PATIENT_CHILD_ID);
			assert.equal(direct.relatedPatientId, MOCK_PATIENT_PARENT_ID);
			assert.equal(direct.relatedPatientName, "Иванова Мария Сергеевна");
			assert.equal(direct.relationshipType, "parent");
			assert.equal(direct.inverseType, "child");
			// Mandate 8e auto-defaults for parent
			assert.equal(direct.canSignConsent, true, "Parent defaults to canSignConsent: true");
			assert.equal(direct.isFinancialPayer, true, "Parent defaults to isFinancialPayer: true");
			assert.equal(direct.isEmergencyContact, true, "Parent defaults to isEmergencyContact: true");
			assert.ok(direct.id.length > 0);
			assert.ok(direct.createdAt.length > 0);

			// Inverse assertion
			assert.equal(inverse.patientId, MOCK_PATIENT_PARENT_ID);
			assert.equal(inverse.relatedPatientId, MOCK_PATIENT_CHILD_ID);
			assert.equal(inverse.relatedPatientName, "Иванов Ваня (7 лет)");
			assert.equal(inverse.relationshipType, "child");
			assert.equal(inverse.inverseType, "parent");
			// Child in inverse view cannot sign consent for parent
			assert.equal(inverse.canSignConsent, false, "Child defaults to canSignConsent: false");
			assert.equal(inverse.isFinancialPayer, false, "Child defaults to isFinancialPayer: false");
			assert.equal(inverse.isEmergencyContact, true);
			assert.ok(inverse.id.length > 0);
			assert.equal(inverse.createdAt, direct.createdAt);

			// Both pass schema validation
			assert.doesNotThrow(() => patientRelationshipSchema.parse(direct));
			assert.doesNotThrow(() => patientRelationshipSchema.parse(inverse));
		});

		it("sets correct defaults for spouse (financial payer=true, canSignConsent=false)", () => {
			const { direct, inverse } = createRelationshipPair({
				patientId: MOCK_PATIENT_PARENT_ID,
				patientName: "Иванова Мария Сергеевна",
				relatedPatientId: MOCK_PATIENT_SPOUSE_ID,
				relatedPatientName: "Иванов Сергей Петрович",
				relationshipType: "spouse",
			});

			assert.equal(direct.relationshipType, "spouse");
			assert.equal(direct.inverseType, "spouse");
			assert.equal(direct.canSignConsent, false);
			assert.equal(direct.isFinancialPayer, true, "Spouse defaults to family wallet payer");
			assert.equal(direct.isEmergencyContact, true);

			assert.equal(inverse.relationshipType, "spouse");
			assert.equal(inverse.inverseType, "spouse");
			assert.equal(inverse.canSignConsent, false);
			assert.equal(inverse.isFinancialPayer, true);
			assert.equal(inverse.isEmergencyContact, true);
		});

		it("sets correct defaults for legal guardian (canSignConsent=true, isFinancialPayer=true)", () => {
			const { direct, inverse } = createRelationshipPair({
				patientId: MOCK_PATIENT_CHILD_ID,
				patientName: "Сидоров Коля",
				relatedPatientId: MOCK_PATIENT_GUARDIAN_ID,
				relatedPatientName: "Петрова Анна Викторовна (Опекун)",
				relationshipType: "guardian",
				notes: "Распоряжение органа опеки № 451-р",
			});

			assert.equal(direct.canSignConsent, true);
			assert.equal(direct.isFinancialPayer, true);
			assert.equal(direct.notes, "Распоряжение органа опеки № 451-р");

			assert.equal(inverse.relationshipType, "ward");
			assert.equal(inverse.canSignConsent, false);
			assert.equal(inverse.isFinancialPayer, false);
		});

		it("respects explicit permission overrides passed by the caller", () => {
			const { direct } = createRelationshipPair({
				patientId: MOCK_PATIENT_CHILD_ID,
				relatedPatientId: MOCK_PATIENT_PARENT_ID,
				relatedPatientName: "Иванова М.С.",
				relationshipType: "parent",
				canSignConsent: false, // Explicit override
				isFinancialPayer: false, // Explicit override
				isEmergencyContact: false, // Explicit override
			});

			assert.equal(direct.canSignConsent, false);
			assert.equal(direct.isFinancialPayer, false);
			assert.equal(direct.isEmergencyContact, false);
		});

		it("rejects self-linking with explicit error (DentalPin invariant)", () => {
			assert.throws(
				() =>
					createRelationshipPair({
						patientId: MOCK_PATIENT_CHILD_ID,
						relatedPatientId: MOCK_PATIENT_CHILD_ID,
						relatedPatientName: "Иванов Ваня",
						relationshipType: "parent",
					}),
				/Пациент не может быть связан сам с собой/,
			);
		});

		it("throws when required IDs are empty or missing", () => {
			assert.throws(
				() =>
					createRelationshipPair({
						patientId: "",
						relatedPatientId: MOCK_PATIENT_PARENT_ID,
						relatedPatientName: "Иванова М.С.",
						relationshipType: "parent",
					}),
				/UUID обоих пациентов обязательны/,
			);

			assert.throws(
				() =>
					createRelationshipPair({
						patientId: MOCK_PATIENT_CHILD_ID,
						relatedPatientId: "   ",
						relatedPatientName: "Иванова М.С.",
						relationshipType: "parent",
					}),
				/UUID обоих пациентов обязательны/,
			);
		});
	});

	describe("4. resolveAuthorizedSigners (Pediatric vs Adult Autonomy under 323-FZ)", () => {
		const parentRelation: PatientRelationship = {
			id: "10000000-0000-4000-8000-000000000001",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_PARENT_ID,
			relatedPatientName: "Иванова Мария Сергеевна",
			relationshipType: "parent",
			inverseType: "child",
			canSignConsent: true,
			isFinancialPayer: true,
			isEmergencyContact: true,
			notes: "Мать",
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		const fatherRelation: PatientRelationship = {
			id: "10000000-0000-4000-8000-000000000002",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_SPOUSE_ID,
			relatedPatientName: "Иванов Сергей Петрович",
			relationshipType: "parent",
			inverseType: "child",
			canSignConsent: true,
			isFinancialPayer: true,
			isEmergencyContact: true,
			notes: "Отец",
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		const siblingRelation: PatientRelationship = {
			id: "10000000-0000-4000-8000-000000000003",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_SIBLING_ID,
			relatedPatientName: "Иванов Артем Сергеевич",
			relationshipType: "sibling",
			inverseType: "sibling",
			canSignConsent: false,
			isFinancialPayer: false,
			isEmergencyContact: true,
			notes: "Брат",
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		it("requires legal representative for 7-year-old child and picks authorized parent", () => {
			const res = resolveAuthorizedSigners(7, [parentRelation, fatherRelation, siblingRelation]);

			assert.equal(res.requiresRepresentative, true, "Minor under 15 requires representative");
			assert.equal(res.authorizedSigners.length, 2, "Only parent and father can sign");
			assert.equal(res.defaultSignerName, "Иванова Мария Сергеевна", "First authorized parent selected");
		});

		it("handles pediatric patient with no authorized relations by returning warning default name", () => {
			const res = resolveAuthorizedSigners(7, [siblingRelation]);

			assert.equal(res.requiresRepresentative, true);
			assert.equal(res.authorizedSigners.length, 0);
			assert.equal(
				res.defaultSignerName,
				"Требуется законный представитель (родитель/опекун)",
			);
		});

		it("tests statutory threshold at 14 years old (requires representative)", () => {
			const res = resolveAuthorizedSigners(14, [parentRelation]);
			assert.equal(res.requiresRepresentative, true);
		});

		it("tests statutory autonomy threshold at exactly 15 years old (323-FZ Art. 54 Part 2)", () => {
			const res = resolveAuthorizedSigners(15, [parentRelation]);
			assert.equal(res.requiresRepresentative, false, "Patient >= 15 is autonomous for medical consent");
			assert.equal(res.defaultSignerName, "Пациент (самостоятельно)");
		});

		it("grants full autonomy to 25-year-old adult patient (Mandate 8e zero friction)", () => {
			const res = resolveAuthorizedSigners(25, [parentRelation]);

			assert.equal(res.requiresRepresentative, false);
			assert.equal(res.defaultSignerName, "Пациент (самостоятельно)");
		});

		it("handles empty or corrupt relationships array gracefully", () => {
			const resChild = resolveAuthorizedSigners(5, []);
			assert.equal(resChild.requiresRepresentative, true);
			assert.equal(resChild.authorizedSigners.length, 0);

			const resAdult = resolveAuthorizedSigners(30, null as unknown as PatientRelationship[]);
			assert.equal(resAdult.requiresRepresentative, false);
			assert.equal(resAdult.defaultSignerName, "Пациент (самостоятельно)");
		});
	});

	describe("5. resolveFamilyPayers & resolveEmergencyContacts", () => {
		const r1: PatientRelationship = {
			id: "20000000-0000-4000-8000-000000000001",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_PARENT_ID,
			relatedPatientName: "Иванова М.С.",
			relationshipType: "parent",
			inverseType: "child",
			canSignConsent: true,
			isFinancialPayer: true,
			isEmergencyContact: true,
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		const r2: PatientRelationship = {
			id: "20000000-0000-4000-8000-000000000002",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_SIBLING_ID,
			relatedPatientName: "Иванов А.С.",
			relationshipType: "sibling",
			inverseType: "sibling",
			canSignConsent: false,
			isFinancialPayer: false,
			isEmergencyContact: true,
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		const r3: PatientRelationship = {
			id: "20000000-0000-4000-8000-000000000003",
			patientId: MOCK_PATIENT_CHILD_ID,
			relatedPatientId: MOCK_PATIENT_GUARDIAN_ID,
			relatedPatientName: "Соколова Е.В.",
			relationshipType: "other",
			inverseType: "other",
			canSignConsent: false,
			isFinancialPayer: true,
			isEmergencyContact: false,
			createdAt: "2026-09-10T10:00:00.000Z",
		};

		it("filters only active financial payers for family billing", () => {
			const payers = resolveFamilyPayers([r1, r2, r3]);
			assert.equal(payers.length, 2);
			assert.deepEqual(
				payers.map((p) => p.relatedPatientName),
				["Иванова М.С.", "Соколова Е.В."],
			);
		});

		it("filters designated emergency contacts", () => {
			const contacts = resolveEmergencyContacts([r1, r2, r3]);
			assert.equal(contacts.length, 2);
			assert.deepEqual(
				contacts.map((c) => c.relatedPatientName),
				["Иванова М.С.", "Иванов А.С."],
			);
		});

		it("returns empty array for invalid or empty inputs", () => {
			assert.deepEqual(resolveFamilyPayers([]), []);
			assert.deepEqual(resolveFamilyPayers(null as unknown as PatientRelationship[]), []);
			assert.deepEqual(resolveEmergencyContacts([]), []);
		});
	});

	describe("6. formatKinshipSummaryA4 (Mandate 8d Item 7: Strictly 0 Emojis)", () => {
		const relations: PatientRelationship[] = [
			{
				id: "30000000-0000-4000-8000-000000000001",
				patientId: MOCK_PATIENT_CHILD_ID,
				relatedPatientId: MOCK_PATIENT_PARENT_ID,
				relatedPatientName: "Иванова Мария Сергеевна",
				relationshipType: "parent",
				inverseType: "child",
				canSignConsent: true,
				isFinancialPayer: true,
				isEmergencyContact: true,
				notes: "Св-во о рождении VII-МЮ № 789456",
				createdAt: "2026-09-10T10:00:00.000Z",
			},
			{
				id: "30000000-0000-4000-8000-000000000002",
				patientId: MOCK_PATIENT_CHILD_ID,
				relatedPatientId: MOCK_PATIENT_SPOUSE_ID,
				relatedPatientName: "Иванов Сергей Петрович",
				relationshipType: "parent",
				inverseType: "child",
				canSignConsent: true,
				isFinancialPayer: true,
				isEmergencyContact: true,
				notes: null,
				createdAt: "2026-09-10T10:00:00.000Z",
			},
		];

		it("generates strict A4 clinical protocol with ZERO emojis", () => {
			const summary = formatKinshipSummaryA4(relations, "Иванов Ваня (7 лет)");

			// Strict Mandate 8d Item 7: No emojis in medical forms
			const emojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				emojiRegex.test(summary),
				false,
				"Document must contain strictly 0 emojis",
			);

			// Required statutory headings
			assert.ok(summary.includes("ПРОТОКОЛ СЕМЕЙНЫХ СВЯЗЕЙ И ЗАКОННЫХ ПРЕДСТАВИТЕЛЕЙ"));
			assert.ok(summary.includes("ФОРМА 043/У"));
			assert.ok(summary.includes("СТ. 20 № 323-ФЗ, 54-ФЗ"));
			assert.ok(summary.includes("Пациент: Иванов Ваня (7 лет)"));
			assert.ok(summary.includes("Всего зарегистрировано связей: 2"));

			// Individual relationship records
			assert.ok(summary.includes("[001] Связанное лицо: Иванова Мария Сергеевна"));
			assert.ok(summary.includes("Степень родства: Мать / Отец (встречный статус: Сын / Дочь)"));
			assert.ok(summary.includes("Право подписи ИДС (ст. 20 № 323-ФЗ): Да (законный представитель)"));
			assert.ok(summary.includes("Финансовый плательщик (54-ФЗ): Да (семейный счет)"));
			assert.ok(summary.includes("Экстренная связь: Да"));
			assert.ok(summary.includes("Примечания: Св-во о рождении VII-МЮ № 789456"));

			assert.ok(summary.includes("[002] Связанное лицо: Иванов Сергей Петрович"));
			assert.ok(summary.includes("Примечания: —"));

			// Official signatures & stamp line
			assert.ok(summary.includes("М.П. (Место печати медицинской организации)"));
			assert.ok(summary.includes("DENTE Dental CRM"));
		});

		it("handles empty relationship list cleanly without emojis", () => {
			const summary = formatKinshipSummaryA4([], "Смирнов Алексей");

			const emojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(emojiRegex.test(summary), false);
			assert.ok(summary.includes("Записи о родственных связях и законных представителях отсутствуют."));
		});

		it("handles undefined patient name gracefully", () => {
			const summary = formatKinshipSummaryA4(relations, "");
			assert.ok(summary.includes("Пациент: Пациент"));
		});
	});

	describe("7. Zod Schema Validation Integrity", () => {
		it("validates relationshipTypeSchema", () => {
			assert.equal(relationshipTypeSchema.parse("parent"), "parent");
			assert.equal(relationshipTypeSchema.parse("guardian"), "guardian");
			assert.throws(() => relationshipTypeSchema.parse("invalid_relation"));
		});

		it("validates createRelationshipInputSchema", () => {
			const valid = createRelationshipInputSchema.parse({
				patientId: MOCK_PATIENT_CHILD_ID,
				relatedPatientId: MOCK_PATIENT_PARENT_ID,
				relatedPatientName: "Иванова М.С.",
				relationshipType: "parent",
				canSignConsent: true,
			});
			assert.equal(valid.relationshipType, "parent");

			assert.throws(() =>
				createRelationshipInputSchema.parse({
					patientId: "not-a-uuid",
					relatedPatientId: MOCK_PATIENT_PARENT_ID,
					relatedPatientName: "Иванова М.С.",
					relationshipType: "parent",
				}),
			);
		});

		it("validates updateRelationshipInputSchema", () => {
			const valid = updateRelationshipInputSchema.parse({
				canSignConsent: true,
				isFinancialPayer: false,
				notes: "Обновлено согласие",
			});
			assert.equal(valid.canSignConsent, true);
			assert.equal(valid.isFinancialPayer, false);
			assert.equal(valid.notes, "Обновлено согласие");
		});
	});
});
