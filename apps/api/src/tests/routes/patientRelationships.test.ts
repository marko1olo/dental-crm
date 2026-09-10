/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT RELATIONSHIPS & LEGAL REPRESENTATION HTTP ROUTES TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tests:
 * - GET    /api/patients/:patientId/relationships (UUID check, dynamic inversion contract)
 * - POST   /api/patients/:patientId/relationships (self-link rejection, RF legal fields validation)
 * - PATCH  /api/patients/:patientId/relationships/:id (permissions update, validation)
 * - DELETE /api/patients/:patientId/relationships/:id (UUID check, deletion validation)
 * - Dynamic reciprocal inversion assertions (parent <-> child, guardian <-> ward, trustee -> ward)
 * - Family wallet & legal representative rights checks
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	getRelationshipKindLabelRu,
	invertRelationshipKind,
	type PatientRelationshipKind,
	validateConsentSignatureAuthorization,
	validateFamilyWalletSpend,
} from "@dental/shared";
import Fastify from "fastify";
import { registerPatientRelationshipsRoutes } from "../../routes/patientRelationships.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("Patient Relationships Canonical Routes & Legal Engine (/api/patients/...)", () => {
	const orgId = "00000000-0000-7000-8000-000000000001";
	const patientId = "00000000-0000-7000-8000-000000000010";
	const relatedPatientId = "00000000-0000-7000-8000-000000000020";
	const relationId = "00000000-0000-7000-8000-000000000030";

	let staffToken: string;

	async function buildTestApp() {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		staffToken = signToken(
			{
				organizationId: orgId,
				userId: "00000000-0000-7000-8000-000000000099",
				role: "admin",
			},
			authTokenSecret(),
		);

		const app = Fastify();
		await registerPatientRelationshipsRoutes(app);
		await app.ready();
		return app;
	}

	describe("GET /api/patients/:patientId/relationships", () => {
		it("rejects non-UUID patient ID with 400 Bad Request", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "GET",
					url: "/api/patients/invalid-patient-uuid/relationships",
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
					},
				});

				assert.strictEqual(res.statusCode, 400);
				const json = JSON.parse(res.body);
				assert.strictEqual(json.error, "Bad Request");
				assert.match(json.message, /Некорректный ID пациента/);
			} finally {
				await app.close();
			}
		});

		it("requires authentication token (401 without staff token)", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "GET",
					url: `/api/patients/${patientId}/relationships`,
				});

				assert.strictEqual(res.statusCode, 401);
			} finally {
				await app.close();
			}
		});
	});

	describe("POST /api/patients/:patientId/relationships", () => {
		it("rejects self-linking with 400 Bad Request", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "POST",
					url: `/api/patients/${patientId}/relationships`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
						"content-type": "application/json",
					},
					payload: {
						relatedPatientId: patientId,
						relationshipType: "parent",
					},
				});

				assert.strictEqual(res.statusCode, 400);
				const json = JSON.parse(res.body);
				assert.match(json.message, /Пациент не может быть связан сам с собой/);
			} finally {
				await app.close();
			}
		});

		it("rejects invalid relationship type enum with 400 Validation Error", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "POST",
					url: `/api/patients/${patientId}/relationships`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
						"content-type": "application/json",
					},
					payload: {
						relatedPatientId,
						relationshipType: "alien_relative",
					},
				});

				assert.strictEqual(res.statusCode, 400);
				const json = JSON.parse(res.body);
				assert.strictEqual(json.error, "Validation Error");
			} finally {
				await app.close();
			}
		});

		it("rejects invalid UUID in relatedPatientId with 400 Validation Error", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "POST",
					url: `/api/patients/${patientId}/relationships`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
						"content-type": "application/json",
					},
					payload: {
						relatedPatientId: "malformed-uuid",
						relationshipType: "parent",
					},
				});

				assert.strictEqual(res.statusCode, 400);
				const json = JSON.parse(res.body);
				assert.strictEqual(json.error, "Validation Error");
			} finally {
				await app.close();
			}
		});
	});

	describe("PATCH /api/patients/:patientId/relationships/:id", () => {
		it("validates UUID parameters format", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "PATCH",
					url: `/api/patients/${patientId}/relationships/not-a-valid-uuid`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
						"content-type": "application/json",
					},
					payload: {
						isLegalRepresentative: true,
					},
				});

				assert.strictEqual(res.statusCode, 400);
			} finally {
				await app.close();
			}
		});

		it("rejects invalid schema payload with 400 Validation Error", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "PATCH",
					url: `/api/patients/${patientId}/relationships/${relationId}`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
						"content-type": "application/json",
					},
					payload: {
						relationshipType: "invalid_type",
					},
				});

				assert.strictEqual(res.statusCode, 400);
				const json = JSON.parse(res.body);
				assert.strictEqual(json.error, "Validation Error");
			} finally {
				await app.close();
			}
		});
	});

	describe("DELETE /api/patients/:patientId/relationships/:id", () => {
		it("validates relationId UUID parameter format", async () => {
			const app = await buildTestApp();
			try {
				const res = await app.inject({
					method: "DELETE",
					url: `/api/patients/${patientId}/relationships/not-a-uuid`,
					headers: {
						"x-dente-staff-token": staffToken,
						"x-organization-id": orgId,
					},
				});

				assert.strictEqual(res.statusCode, 400);
			} finally {
				await app.close();
			}
		});
	});

	describe("Domain Logic Verification: Dynamic Inversion & Legal Rights", () => {
		it("proves dynamic reciprocal inversion for all statutory roles", () => {
			const cases: [PatientRelationshipKind, PatientRelationshipKind][] = [
				["parent", "child"],
				["child", "parent"],
				["guardian", "ward"],
				["ward", "guardian"],
				["trustee", "ward"],
				["spouse", "spouse"],
				["sibling", "sibling"],
				["other", "other"],
			];

			for (const [direct, expectedInverse] of cases) {
				const calculated = invertRelationshipKind(direct);
				assert.strictEqual(
					calculated,
					expectedInverse,
					`Failed inversion for ${direct} -> expected ${expectedInverse}, got ${calculated}`,
				);
			}
		});

		it("proves RF legal representative consent rights under FZ-323 Art. 20 & 54", () => {
			const minorChildAge = 8;
			const adolescentAge = 16;

			// Minor child under 15 cannot sign alone
			const minorSelf = validateConsentSignatureAuthorization({
				patientAgeYears: minorChildAge,
				signerPatientId: "child-id",
				subjectPatientId: "child-id",
			});
			assert.strictEqual(minorSelf.isAuthorized, false);
			assert.strictEqual(minorSelf.requiresLegalRepresentative, true);

			// Legal representative (Mother/Parent) signs with proof document
			const motherSigning = validateConsentSignatureAuthorization({
				patientAgeYears: minorChildAge,
				signerPatientId: "mother-id",
				subjectPatientId: "child-id",
				relationship: {
					relationshipType: "parent",
					isLegalRepresentative: true,
					documentProofNumber: "Свид. о рождении VII-МЮ 123456",
				},
			});
			assert.strictEqual(motherSigning.isAuthorized, true);
			assert.match(motherSigning.justificationRu, /VII-МЮ 123456/);

			// Adolescent (16 y.o.) can sign consent autonomously
			const adolescentSelf = validateConsentSignatureAuthorization({
				patientAgeYears: adolescentAge,
				signerPatientId: "ado-id",
				subjectPatientId: "ado-id",
			});
			assert.strictEqual(adolescentSelf.isAuthorized, true);
			assert.strictEqual(adolescentSelf.requiresLegalRepresentative, false);
		});

		it("proves family wallet spend permission and balance authorization", () => {
			const depositBalance = 75000; // 750.00 RUB in kopecks
			const procedureCost = 45000; // 450.00 RUB in kopecks

			// Parent authorized to pay for child from shared deposit
			const parentSpend = validateFamilyWalletSpend({
				spenderPatientId: "parent-id",
				walletOwnerPatientId: "parent-id",
				requiredAmountKopecks: procedureCost,
				currentBalanceKopecks: depositBalance,
			});
			assert.strictEqual(parentSpend.isAuthorized, true);
			assert.strictEqual(parentSpend.remainingBalanceKopecks, 30000);

			// Family member with canSpendFamilyWallet = true
			const spouseSpend = validateFamilyWalletSpend({
				spenderPatientId: "spouse-id",
				walletOwnerPatientId: "head-id",
				requiredAmountKopecks: procedureCost,
				currentBalanceKopecks: depositBalance,
				relationship: {
					relationshipType: "spouse",
					canSpendFamilyWallet: true,
				},
			});
			assert.strictEqual(spouseSpend.isAuthorized, true);
			assert.strictEqual(spouseSpend.remainingBalanceKopecks, 30000);

			// Sibling without spend authority rejected
			const unauthorizedSpend = validateFamilyWalletSpend({
				spenderPatientId: "sibling-id",
				walletOwnerPatientId: "head-id",
				requiredAmountKopecks: procedureCost,
				currentBalanceKopecks: depositBalance,
				relationship: {
					relationshipType: "sibling",
					canSpendFamilyWallet: false,
					isLegalRepresentative: false,
				},
			});
			assert.strictEqual(unauthorizedSpend.isAuthorized, false);
			assert.match(unauthorizedSpend.failureReason!, /не имеет полномочий/);
		});
	});
});
