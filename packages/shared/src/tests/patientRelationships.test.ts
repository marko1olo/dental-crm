/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT RELATIONSHIPS & LEGAL GUARDIANSHIP ENGINE — UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Exhaustive unit tests for:
 * 1. 8 directed relationship kinds & Zod schema validation
 * 2. Dynamic mutual inversion algorithm (parent <-> child, guardian <-> ward, trustee -> ward, etc.)
 * 3. Russian legal representative authorization under FZ-323 & Art. 64 Family Code RF
 * 4. Family wallet spend authorization & kopeck-exact balance arithmetic
 * 5. Russian localization labels for direct and inverse perspectives
 * 6. DTO transforms & backward compatibility aliases
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	createPatientRelationshipDtoSchema,
	getRelationshipKindLabelRu,
	INVERSE_RELATIONSHIP_MAP,
	invertRelationshipKind,
	patchPatientRelationshipDtoSchema,
	PATIENT_RELATIONSHIP_KIND_LABELS_RU,
	PATIENT_RELATIONSHIP_KINDS,
	patientRelationshipItemSchema,
	patientRelationshipKindSchema,
	type PatientRelationshipKind,
	RF_MAJORITY_AGE_THRESHOLD,
	RF_PEDIATRIC_CONSENT_AGE_THRESHOLD,
	validateConsentSignatureAuthorization,
	validateFamilyWalletSpend,
} from "../patients/patientRelationshipsSchema.js";

describe("Patient Relationships Schema & Legal Engine", () => {
	const validPatientId = "00000000-0000-7000-8000-000000000001";
	const validRelatedPatientId = "00000000-0000-7000-8000-000000000002";

	describe("1. Relationship Kinds & Enums", () => {
		it("accepts all 8 canonical relationship kinds", () => {
			const expectedKinds: PatientRelationshipKind[] = [
				"parent",
				"child",
				"spouse",
				"sibling",
				"guardian",
				"ward",
				"trustee",
				"other",
			];

			assert.strictEqual(PATIENT_RELATIONSHIP_KINDS.length, 8);
			for (const kind of expectedKinds) {
				const res = patientRelationshipKindSchema.safeParse(kind);
				assert.strictEqual(res.success, true);
			}
		});

		it("rejects invalid relationship kind strings", () => {
			const invalidValues = ["grandparent", "friend", "coworker", "unknown", ""];
			for (const val of invalidValues) {
				const res = patientRelationshipKindSchema.safeParse(val);
				assert.strictEqual(res.success, false);
			}
		});
	});

	describe("2. Dynamic Mutual Inversion Algorithm", () => {
		it("inverts parent <-> child reciprocally", () => {
			assert.strictEqual(invertRelationshipKind("parent"), "child");
			assert.strictEqual(invertRelationshipKind("child"), "parent");
		});

		it("inverts guardian <-> ward reciprocally", () => {
			assert.strictEqual(invertRelationshipKind("guardian"), "ward");
			assert.strictEqual(invertRelationshipKind("ward"), "guardian");
		});

		it("inverts trustee -> ward (statutory representative to ward)", () => {
			assert.strictEqual(invertRelationshipKind("trustee"), "ward");
		});

		it("preserves symmetric relationships (spouse <-> spouse, sibling <-> sibling, other <-> other)", () => {
			assert.strictEqual(invertRelationshipKind("spouse"), "spouse");
			assert.strictEqual(invertRelationshipKind("sibling"), "sibling");
			assert.strictEqual(invertRelationshipKind("other"), "other");
		});

		it("correctly handles all keys in INVERSE_RELATIONSHIP_MAP", () => {
			for (const kind of PATIENT_RELATIONSHIP_KINDS) {
				const inverted = INVERSE_RELATIONSHIP_MAP[kind];
				assert.ok(inverted, `Missing inverse mapping for ${kind}`);
				assert.ok(
					PATIENT_RELATIONSHIP_KINDS.includes(inverted),
					`Inverted kind ${inverted} is not a valid PatientRelationshipKind`,
				);
			}
		});
	});

	describe("3. Russian Localization Labels", () => {
		it("returns accurate direct and inverse labels in Russian", () => {
			assert.strictEqual(
				getRelationshipKindLabelRu("parent", "direct"),
				"Родитель (Отец / Мать)",
			);
			assert.strictEqual(
				getRelationshipKindLabelRu("parent", "inverse"),
				"Ребёнок (Сын / Дочь)",
			);
			assert.strictEqual(
				getRelationshipKindLabelRu("guardian", "direct"),
				"Опекун (ст. 32 ГК РФ)",
			);
			assert.strictEqual(
				getRelationshipKindLabelRu("guardian", "inverse"),
				"Подопечный (Опекаемый)",
			);
			assert.strictEqual(
				getRelationshipKindLabelRu("trustee", "direct"),
				"Попечитель / Доверенное лицо (ст. 185 ГК РФ)",
			);
		});

		it("covers all 8 kinds in PATIENT_RELATIONSHIP_KIND_LABELS_RU", () => {
			for (const kind of PATIENT_RELATIONSHIP_KINDS) {
				const labelObj = PATIENT_RELATIONSHIP_KIND_LABELS_RU[kind];
				assert.ok(labelObj, `Missing Russian labels for ${kind}`);
				assert.ok(labelObj.direct.length > 0);
				assert.ok(labelObj.inverse.length > 0);
			}
		});
	});

	describe("4. DTO Validation & Transformation", () => {
		it("parses valid create DTO with RF legal fields", () => {
			const raw = {
				relatedPatientId: validRelatedPatientId,
				relationshipType: "parent",
				isLegalRepresentative: true,
				canViewMedicalRecord: true,
				canSignConsents: true,
				canSpendFamilyWallet: true,
				documentProofNumber: "Свидетельство о рождении VII-МЮ №654321",
				notes: "Мать пациента",
			};

			const parsed = createPatientRelationshipDtoSchema.parse(raw);
			assert.strictEqual(parsed.relatedPatientId, validRelatedPatientId);
			assert.strictEqual(parsed.relationshipType, "parent");
			assert.strictEqual(parsed.isLegalRepresentative, true);
			assert.strictEqual(parsed.canViewMedicalRecord, true);
			assert.strictEqual(parsed.canSignConsents, true);
			assert.strictEqual(parsed.canSpendFamilyWallet, true);
			assert.strictEqual(
				parsed.documentProofNumber,
				"Свидетельство о рождении VII-МЮ №654321",
			);
		});

		it("maps backward-compatible aliases isPrimaryPayer and canViewRecords", () => {
			const raw = {
				relatedPatientId: validRelatedPatientId,
				relationshipType: "guardian",
				isPrimaryPayer: true,
				canViewRecords: true,
			};

			const parsed = createPatientRelationshipDtoSchema.parse(raw);
			assert.strictEqual(parsed.canSpendFamilyWallet, true);
			assert.strictEqual(parsed.canViewMedicalRecord, true);
		});

		it("parses valid patch DTO with partial attributes", () => {
			const patchRaw = {
				canSpendFamilyWallet: false,
				documentProofNumber: "Доверенность 77АВ 9876543 от 01.09.2026",
			};

			const parsed = patchPatientRelationshipDtoSchema.parse(patchRaw);
			assert.strictEqual(parsed.canSpendFamilyWallet, false);
			assert.strictEqual(
				parsed.documentProofNumber,
				"Доверенность 77АВ 9876543 от 01.09.2026",
			);
			assert.strictEqual(parsed.isLegalRepresentative, undefined);
		});

		it("rejects invalid UUID in relatedPatientId", () => {
			const res = createPatientRelationshipDtoSchema.safeParse({
				relatedPatientId: "not-a-uuid",
				relationshipType: "parent",
			});
			assert.strictEqual(res.success, false);
		});
	});

	describe("5. Medical Consent Signature Authorization (FZ-323 & RF Family Code)", () => {
		const adultAge = 25;
		const consentAge = 15;
		const minorUnder15 = 12;

		it("allows adult and patient >= 15 to sign their own medical consent", () => {
			const adultRes = validateConsentSignatureAuthorization({
				patientAgeYears: adultAge,
				signerPatientId: validPatientId,
				subjectPatientId: validPatientId,
			});
			assert.strictEqual(adultRes.isAuthorized, true);
			assert.strictEqual(adultRes.requiresLegalRepresentative, false);

			const age15Res = validateConsentSignatureAuthorization({
				patientAgeYears: consentAge,
				signerPatientId: validPatientId,
				subjectPatientId: validPatientId,
			});
			assert.strictEqual(age15Res.isAuthorized, true);
			assert.strictEqual(age15Res.requiresLegalRepresentative, false);
		});

		it("prohibits minor under 15 from signing their own consent without legal representative", () => {
			const minorRes = validateConsentSignatureAuthorization({
				patientAgeYears: minorUnder15,
				signerPatientId: validPatientId,
				subjectPatientId: validPatientId,
			});
			assert.strictEqual(minorRes.isAuthorized, false);
			assert.strictEqual(minorRes.requiresLegalRepresentative, true);
			assert.match(minorRes.justificationRu, /младше 15 лет/);
		});

		it("authorizes parent or guardian to sign for minor under 15", () => {
			const parentRes = validateConsentSignatureAuthorization({
				patientAgeYears: minorUnder15,
				signerPatientId: validRelatedPatientId,
				subjectPatientId: validPatientId,
				relationship: {
					relationshipType: "parent",
					isLegalRepresentative: true,
					documentProofNumber: "Свид. о рождении 12345",
				},
			});
			assert.strictEqual(parentRes.isAuthorized, true);
			assert.strictEqual(parentRes.requiresLegalRepresentative, true);
			assert.match(parentRes.justificationRu, /Родитель/);
		});

		it("authorizes trustee with canSignConsents flag", () => {
			const trusteeRes = validateConsentSignatureAuthorization({
				patientAgeYears: minorUnder15,
				signerPatientId: validRelatedPatientId,
				subjectPatientId: validPatientId,
				relationship: {
					relationshipType: "trustee",
					canSignConsents: true,
					documentProofNumber: "Доверенность №77",
				},
			});
			assert.strictEqual(trusteeRes.isAuthorized, true);
			assert.match(trusteeRes.justificationRu, /Доверенное лицо/);
		});

		it("rejects unauthorized relationship (e.g. sibling without explicit rights)", () => {
			const siblingRes = validateConsentSignatureAuthorization({
				patientAgeYears: minorUnder15,
				signerPatientId: validRelatedPatientId,
				subjectPatientId: validPatientId,
				relationship: {
					relationshipType: "sibling",
					isLegalRepresentative: false,
					canSignConsents: false,
				},
			});
			assert.strictEqual(siblingRes.isAuthorized, false);
			assert.match(siblingRes.justificationRu, /отсутствуют полномочия/);
		});
	});

	describe("6. Family Wallet Spend Authorization", () => {
		const balance100000 = 100000; // 1,000.00 RUB in kopecks

		it("allows wallet owner to spend their own funds with sufficient balance", () => {
			const res = validateFamilyWalletSpend({
				spenderPatientId: validPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 35000,
				currentBalanceKopecks: balance100000,
			});
			assert.strictEqual(res.isAuthorized, true);
			assert.strictEqual(res.remainingBalanceKopecks, 65000);
		});

		it("rejects wallet owner if deposit balance is insufficient", () => {
			const res = validateFamilyWalletSpend({
				spenderPatientId: validPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 150000,
				currentBalanceKopecks: balance100000,
			});
			assert.strictEqual(res.isAuthorized, false);
			assert.match(res.failureReason!, /Недостаточно средств/);
		});

		it("allows authorized family member to spend from shared family wallet", () => {
			const res = validateFamilyWalletSpend({
				spenderPatientId: validRelatedPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 40000,
				currentBalanceKopecks: balance100000,
				relationship: {
					relationshipType: "parent",
					canSpendFamilyWallet: true,
				},
			});
			assert.strictEqual(res.isAuthorized, true);
			assert.strictEqual(res.remainingBalanceKopecks, 60000);
		});

		it("allows legal representative to spend from deposit even without explicit flag", () => {
			const res = validateFamilyWalletSpend({
				spenderPatientId: validRelatedPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 20000,
				currentBalanceKopecks: balance100000,
				relationship: {
					relationshipType: "guardian",
					isLegalRepresentative: true,
				},
			});
			assert.strictEqual(res.isAuthorized, true);
			assert.strictEqual(res.remainingBalanceKopecks, 80000);
		});

		it("rejects family member without spending authority", () => {
			const res = validateFamilyWalletSpend({
				spenderPatientId: validRelatedPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 10000,
				currentBalanceKopecks: balance100000,
				relationship: {
					relationshipType: "other",
					canSpendFamilyWallet: false,
					isLegalRepresentative: false,
				},
			});
			assert.strictEqual(res.isAuthorized, false);
			assert.match(res.failureReason!, /не имеет полномочий/);
		});

		it("rejects non-positive amounts (0 or negative)", () => {
			const zeroRes = validateFamilyWalletSpend({
				spenderPatientId: validPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: 0,
				currentBalanceKopecks: balance100000,
			});
			assert.strictEqual(zeroRes.isAuthorized, false);
			assert.match(zeroRes.failureReason!, /строго больше нуля/);

			const negRes = validateFamilyWalletSpend({
				spenderPatientId: validPatientId,
				walletOwnerPatientId: validPatientId,
				requiredAmountKopecks: -500,
				currentBalanceKopecks: balance100000,
			});
			assert.strictEqual(negRes.isAuthorized, false);
			assert.match(negRes.failureReason!, /строго больше нуля/);
		});
	});

	describe("7. Resolved Patient Relationship Item Schema", () => {
		it("validates full resolved relationship payload structure", () => {
			const sampleItem = {
				id: "00000000-0000-7000-8000-000000000099",
				patientId: validPatientId,
				relatedPatientId: validRelatedPatientId,
				relatedPatientName: "Иванова Анна Сергеевна",
				relatedPatientPhone: "+7 (999) 123-45-67",
				relatedPatientBirthDate: "2015-06-15",
				isMinor: true,
				relationshipType: "child",
				relationshipLabelRu: "Ребёнок (Сын / Дочь)",
				originalRelationshipType: "parent",
				isInverse: true,
				isLegalRepresentative: true,
				canViewMedicalRecord: true,
				canSignConsents: true,
				canSpendFamilyWallet: true,
				documentProofNumber: "Свид. VII-МЮ №111222",
				notes: "Дочь основного плательщика",
				createdAt: "2026-09-10T12:00:00.000Z",
			};

			const parsed = patientRelationshipItemSchema.parse(sampleItem);
			assert.strictEqual(parsed.relationshipType, "child");
			assert.strictEqual(parsed.isInverse, true);
			assert.strictEqual(parsed.isMinor, true);
			assert.strictEqual(parsed.isLegalRepresentative, true);
		});
	});
});
