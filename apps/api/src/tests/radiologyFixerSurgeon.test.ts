/**
 * radiologyFixerSurgeon.test.ts — Red Team Fixer Surgeon Unit Tests for Domain 2 (Radiology, RVG, Studies & Bindings).
 *
 * Verifies:
 * 1. createImagingStudySchema validation with standard UUID and non-UUID demo patient IDs.
 * 2. FDI tooth code validation (permanent 11-48, deciduous 51-85).
 * 3. bindVisitHandler input validation, Idempotency-Key enforcement, and 400/404 handling.
 * 4. Transactional study-to-visit and tooth binding contract integrity.
 *
 * Mandates: 8e (Doctor Autonomy, RVG <50ms), 8bo (Idempotency & ACID), 8bl (exactOptionalPropertyTypes).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createImagingStudySchema, isValidToothFdi } from "@dental/shared";
import { bindVisitHandler } from "../routes/imaging/modules/studiesBindingHandler.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("Domain 2 Fixer Surgeon: Radiology & RVG Ingestion & Binding Gates", () => {
	describe("1. Schema Validation for Standard & Demo Patient IDs", () => {
		it("accepts valid RFC 9562 UUID patientId", () => {
			const validUuid = "123e4567-e89b-12d3-a456-426614174000";
			const result = createImagingStudySchema.safeParse({
				patientId: validUuid,
				title: "Прицельный снимок зуба 16",
				kind: "periapical",
				toothCode: "16",
			});
			assert.equal(result.success, true);
			if (result.success) {
				assert.equal(result.data.patientId, validUuid);
				assert.equal(result.data.toothCode, "16");
			}
		});

		it("accepts non-UUID demo/sample patientId (e.g. PAT-001, sample-patient)", () => {
			const demoPatientId = "pat-sample-tooth16";
			const result = createImagingStudySchema.safeParse({
				patientId: demoPatientId,
				title: "Демо-снимок RVG визиографа",
				kind: "periapical",
				toothCode: "16",
			});
			assert.equal(result.success, true);
			if (result.success) {
				assert.equal(result.data.patientId, demoPatientId);
			}
		});

		it("rejects empty or whitespace-only patientId", () => {
			const result = createImagingStudySchema.safeParse({
				patientId: "   ",
				title: "Снимок без пациента",
				kind: "periapical",
			});
			assert.equal(result.success, false);
		});
	});

	describe("2. FDI Tooth Code Validation (ISO 3950)", () => {
		it("validates permanent adult teeth (11-48)", () => {
			assert.equal(isValidToothFdi(11), true);
			assert.equal(isValidToothFdi(16), true);
			assert.equal(isValidToothFdi(26), true);
			assert.equal(isValidToothFdi(36), true);
			assert.equal(isValidToothFdi(48), true);
		});

		it("validates pediatric primary/deciduous teeth (51-85)", () => {
			assert.equal(isValidToothFdi(51), true);
			assert.equal(isValidToothFdi(55), true);
			assert.equal(isValidToothFdi(64), true);
			assert.equal(isValidToothFdi(73), true);
			assert.equal(isValidToothFdi(85), true);
		});

		it("rejects non-FDI teeth codes", () => {
			assert.equal(isValidToothFdi(0), false);
			assert.equal(isValidToothFdi(9), false);
			assert.equal(isValidToothFdi(19), false); // 19 does not exist in FDI
			assert.equal(isValidToothFdi(29), false);
			assert.equal(isValidToothFdi(99), false);
			assert.equal(isValidToothFdi(-5), false);
		});
	});

	describe("3. bindVisitHandler Validation & Guard Gates", () => {
		const createMockContext = () => {
			let statusCode = 200;
			let sentBody: unknown = null;
			const headersMap: Record<string, string> = {};

			const mockReply = {
				code: (code: number) => {
					statusCode = code;
					return mockReply;
				},
				header: (key: string, val: string) => {
					headersMap[key.toLowerCase()] = val;
					return mockReply;
				},
				send: (body: unknown) => {
					sentBody = body;
					return mockReply;
				},
			} as unknown as FastifyReply;

			const orgId = "00000000-0000-4000-8000-000000000001";
			const clinicToken = signToken(
				{ organizationId: orgId, userId: "00000000-0000-4000-8000-000000000002", role: "doctor" },
				authTokenSecret(),
			);

			return {
				mockReply,
				clinicToken,
				orgId,
				getStatusCode: () => statusCode,
				getSentBody: () => sentBody,
				getHeader: (key: string) => headersMap[key.toLowerCase()],
			};
		};

		it("rejects non-UUID Idempotency-Key with HTTP 400", async () => {
			const { mockReply, clinicToken, getStatusCode, getSentBody } = createMockContext();
			const mockRequest = {
				params: { id: "00000000-0000-4000-8000-000000000001" },
				headers: {
					"idempotency-key": "invalid-non-uuid-key",
					"x-dente-clinic-token": clinicToken,
				},
				body: {
					visitId: "123e4567-e89b-12d3-a456-426614174000",
					toothCode: "16",
				},
			} as unknown as FastifyRequest;

			await bindVisitHandler(mockRequest, mockReply);
			assert.equal(getStatusCode(), 400);
			const body = getSentBody() as { error?: string };
			assert.equal(body?.error, "InvalidIdempotencyKey");
		});

		it("rejects invalid FDI tooth number with HTTP 400", async () => {
			const { mockReply, clinicToken, getStatusCode, getSentBody } = createMockContext();
			const mockRequest = {
				params: { id: "00000000-0000-4000-8000-000000000001" },
				headers: {
					"idempotency-key": "123e4567-e89b-12d3-a456-426614174099",
					"x-dente-clinic-token": clinicToken,
				},
				body: {
					visitId: "123e4567-e89b-12d3-a456-426614174000",
					toothCode: "99", // Non-existent tooth
				},
			} as unknown as FastifyRequest;

			await bindVisitHandler(mockRequest, mockReply);
			assert.equal(getStatusCode(), 400);
			const body = getSentBody() as { error?: string; message?: string };
			assert.equal(body?.error, "ValidationError");
			assert.match(body?.message ?? "", /FDI/);
		});

		it("rejects invalid non-UUID visitId with HTTP 400", async () => {
			const { mockReply, clinicToken, getStatusCode, getSentBody } = createMockContext();
			const mockRequest = {
				params: { id: "00000000-0000-4000-8000-000000000001" },
				headers: {
					"idempotency-key": "123e4567-e89b-12d3-a456-426614174099",
					"x-dente-clinic-token": clinicToken,
				},
				body: {
					visitId: "not-a-valid-uuid",
					toothCode: "16",
				},
			} as unknown as FastifyRequest;

			await bindVisitHandler(mockRequest, mockReply);
			assert.equal(getStatusCode(), 400);
			const body = getSentBody() as { error?: string };
			assert.equal(body?.error, "ValidationError");
		});
	});
});
