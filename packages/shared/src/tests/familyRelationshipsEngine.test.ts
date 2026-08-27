/**
 * familyRelationshipsEngine.test.ts — Unit tests for family relationships,
 * payer resolution, and deposit deduction authorization engine.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	authorizeFamilyDepositDeduction,
	createRelationshipInputSchema,
	PATIENT_INVERSE_RELATIONSHIP_TYPE,
	PATIENT_RELATIONSHIP_LABELS_RU,
	resolveFamilyPrimaryPayer,
	validateRelationshipLink,
} from "../patients/familyRelationshipsEngine.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const MOTHER_ID = "00000000-0000-7000-8000-000000000010";
const CHILD_ID = "00000000-0000-7000-8000-000000000020";
const FATHER_ID = "00000000-0000-7000-8000-000000000030";
const GRANDMA_ID = "00000000-0000-7000-8000-000000000040";

describe("Patient Family Relationships Engine", () => {
	it("validates Zod input schemas for creating relationships", () => {
		const valid = createRelationshipInputSchema.parse({
			relatedPatientId: MOTHER_ID,
			relationshipType: "parent",
			isPrimaryPayer: true,
			canViewRecords: true,
			canSignConsents: true,
			notes: "Мать, законный представитель",
		});

		assert.strictEqual(valid.relatedPatientId, MOTHER_ID);
		assert.strictEqual(valid.relationshipType, "parent");
		assert.strictEqual(valid.isPrimaryPayer, true);
		assert.strictEqual(valid.canSignConsents, true);

		assert.throws(() => {
			createRelationshipInputSchema.parse({
				relatedPatientId: "not-a-uuid",
				relationshipType: "invalid_type",
			});
		});
	});

	it("has reciprocal relationship maps and Russian labels", () => {
		assert.strictEqual(PATIENT_INVERSE_RELATIONSHIP_TYPE.parent, "child");
		assert.strictEqual(PATIENT_INVERSE_RELATIONSHIP_TYPE.child, "parent");
		assert.strictEqual(PATIENT_INVERSE_RELATIONSHIP_TYPE.spouse, "spouse");
		assert.strictEqual(PATIENT_INVERSE_RELATIONSHIP_TYPE.guardian, "child");

		assert.strictEqual(PATIENT_RELATIONSHIP_LABELS_RU.parent, "Родитель");
		assert.strictEqual(PATIENT_RELATIONSHIP_LABELS_RU.child, "Ребенок");
		assert.strictEqual(PATIENT_RELATIONSHIP_LABELS_RU.spouse, "Супруг / Супруга");
		assert.strictEqual(PATIENT_RELATIONSHIP_LABELS_RU.guardian, "Опекун / Законный представитель");
		assert.strictEqual(PATIENT_RELATIONSHIP_LABELS_RU.payer, "Основной плательщик / Спонсор лечения");
	});

	it("prevents self-linking and duplicate reciprocal relationships", () => {
		// Self link
		const selfRes = validateRelationshipLink(CHILD_ID, CHILD_ID, []);
		assert.strictEqual(selfRes.isValid, false);
		assert.match(String(selfRes.error), /Пациент не может быть связан сам с собой/);

		// Existing link
		const existing = [
			{ patientId: CHILD_ID, relatedPatientId: MOTHER_ID, relationshipType: "parent" as const },
		];

		const dup1 = validateRelationshipLink(CHILD_ID, MOTHER_ID, existing, "parent");
		assert.strictEqual(dup1.isValid, false);
		assert.match(String(dup1.error), /Связь между этими пациентами уже существует/);

		const dup2 = validateRelationshipLink(MOTHER_ID, CHILD_ID, existing, "child");
		assert.strictEqual(dup2.isValid, false);
		assert.match(String(dup2.error), /Связь между этими пациентами уже существует/);

		// Valid new link
		const validRes = validateRelationshipLink(CHILD_ID, FATHER_ID, existing, "parent");
		assert.strictEqual(validRes.isValid, true);
	});

	it("detects and rejects circular hierarchical ancestry loops", () => {
		// Tree: Mother is parent of Child, Grandma is parent of Mother
		const tree = [
			{ patientId: CHILD_ID, relatedPatientId: MOTHER_ID, relationshipType: "parent" as const },
			{ patientId: MOTHER_ID, relatedPatientId: GRANDMA_ID, relationshipType: "parent" as const },
		];

		// Attempt to make Child parent of Grandma (creating cycle: Child -> Mother -> Grandma -> Child)
		const cycleRes = validateRelationshipLink(GRANDMA_ID, CHILD_ID, tree, "parent");
		assert.strictEqual(cycleRes.isValid, false);
		assert.match(String(cycleRes.error), /циклический конфликт/);
	});

	it("resolves designated primary payer for dependents", () => {
		// Minor with mother designated as primary payer
		const minorRelations = [
			{
				patientId: CHILD_ID,
				relatedPatientId: MOTHER_ID,
				relationshipType: "parent" as const,
				isPrimaryPayer: true,
			},
			{
				patientId: CHILD_ID,
				relatedPatientId: FATHER_ID,
				relationshipType: "parent" as const,
				isPrimaryPayer: false,
			},
		];

		const res1 = resolveFamilyPrimaryPayer(CHILD_ID, minorRelations);
		assert.strictEqual(res1.isSelfPaying, false);
		assert.strictEqual(res1.payerPatientId, MOTHER_ID);
		assert.strictEqual(res1.payerRelationshipType, "parent");

		// Minor without explicit isPrimaryPayer flag falls back to parent or familyHead
		const noFlagRelations = [
			{
				patientId: CHILD_ID,
				relatedPatientId: FATHER_ID,
				relationshipType: "parent" as const,
				isPrimaryPayer: false,
			},
		];

		const res2 = resolveFamilyPrimaryPayer(CHILD_ID, noFlagRelations, FATHER_ID);
		assert.strictEqual(res2.isSelfPaying, false);
		assert.strictEqual(res2.payerPatientId, FATHER_ID);

		// Independent self-paying adult with no payer relations
		const adultRes = resolveFamilyPrimaryPayer(FATHER_ID, []);
		assert.strictEqual(adultRes.isSelfPaying, true);
		assert.strictEqual(adultRes.payerPatientId, FATHER_ID);
	});

	it("authorizes family deposit deduction and validates balance thresholds", () => {
		const depositBalanceKopecks = 5000000; // 50,000.00 RUB

		// 1. Self-spending with sufficient balance
		const selfOk = authorizeFamilyDepositDeduction({
			spenderPatientId: MOTHER_ID,
			accountOwnerPatientId: MOTHER_ID,
			requiredAmountKopecks: 1500000, // 15,000.00 RUB
			currentDepositBalanceKopecks: depositBalanceKopecks,
		});
		assert.strictEqual(selfOk.isAuthorized, true);
		assert.strictEqual(selfOk.remainingBalanceKopecks, 3500000);

		// 2. Child spending from Mother's account (Authorized as parent)
		const childOk = authorizeFamilyDepositDeduction({
			spenderPatientId: CHILD_ID,
			accountOwnerPatientId: MOTHER_ID,
			requiredAmountKopecks: 2000000, // 20,000.00 RUB
			currentDepositBalanceKopecks: depositBalanceKopecks,
			relationship: {
				relationshipType: "parent",
				isPrimaryPayer: true,
			},
		});
		assert.strictEqual(childOk.isAuthorized, true);
		assert.strictEqual(childOk.remainingBalanceKopecks, 3000000);

		// 3. Unauthorized relation (e.g. non-guarantor 'other')
		const unauth = authorizeFamilyDepositDeduction({
			spenderPatientId: "random-id",
			accountOwnerPatientId: MOTHER_ID,
			requiredAmountKopecks: 100000,
			currentDepositBalanceKopecks: depositBalanceKopecks,
			relationship: {
				relationshipType: "other",
				isPrimaryPayer: false,
			},
		});
		assert.strictEqual(unauth.isAuthorized, false);
		assert.match(String(unauth.failureReason), /не имеет полномочий плательщика/);

		// 4. Insufficient balance rejection
		const insufficient = authorizeFamilyDepositDeduction({
			spenderPatientId: CHILD_ID,
			accountOwnerPatientId: MOTHER_ID,
			requiredAmountKopecks: 9000000, // 90,000.00 RUB (exceeds 50,000 RUB)
			currentDepositBalanceKopecks: depositBalanceKopecks,
			relationship: {
				relationshipType: "parent",
				isPrimaryPayer: true,
			},
		});
		assert.strictEqual(insufficient.isAuthorized, false);
		assert.match(String(insufficient.failureReason), /Недостаточно средств/);
	});
});
