import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	calculateBusinessDaysDueDate,
	CANONICAL_DENTAL_LAB_PRESETS,
	checkPlanContinuitySchema,
} from "../../routes/lab/index.js";
import { labOrderPatchSchema } from "../../routes/lab/patchModules/labOrderPatchSchema.js";
import { handleCheckPlanContinuity } from "../../routes/lab/ordersCrudModules/labPresetsHandlers.js";
import { warrantyCertificateItemSchema } from "../../routes/warranty/types.js";
import {
	getLabScanDownloadPresignedUrl,
	getLabScanUploadPresignedUrl,
	validateScanFileMeta,
} from "../../services/labScanDirectUpload.js";

describe("Dental Lab Express Presets & Mandate 8e Invariants", () => {
	it("contains standard 1-click preset for ZrO2 crown (5 business days, A2, anatomical shape)", () => {
		const stdPreset = CANONICAL_DENTAL_LAB_PRESETS.find((p) => p.id === "zirconia_a2_std");
		assert.ok(stdPreset, "Expected standard zirconia preset to exist");
		assert.equal(stdPreset.isDefaultPreset, true);
		assert.equal(stdPreset.turnaroundBusinessDays, 5);
		assert.equal(stdPreset.colorVita, "A2");
		assert.equal(stdPreset.constructionType, "crown_zirconia");
		assert.ok(
			stdPreset.nameRu.includes("Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"),
			"Expected canonical 1-click preset nameRu from Mandate 8e",
		);
	});

	it("contains all 4 canonical 3-click construction presets (ZrO2, E.max, Metal-ceramic, Removable)", () => {
		const types = CANONICAL_DENTAL_LAB_PRESETS.map((p) => p.constructionType);
		assert.ok(types.includes("crown_zirconia"), "Should contain ZrO2 crown");
		assert.ok(types.includes("crown_emax"), "Should contain E.max crown");
		assert.ok(types.includes("metal_ceramic"), "Should contain Metal-ceramic");
		assert.ok(types.includes("clasp_denture"), "Should contain Clasp denture");
		assert.ok(types.includes("aligners"), "Should contain Aligners/Splints");
	});

	it("calculateBusinessDaysDueDate correctly advances dates skipping Saturday and Sunday", () => {
		// Friday Oct 2, 2026 -> +5 business days -> Friday Oct 9, 2026
		const friday = new Date(2026, 9, 2, 10, 0, 0); // Friday (month index 9 is October)
		assert.equal(friday.getDay(), 5, "Should be Friday");

		const due = calculateBusinessDaysDueDate(friday, 5);
		// 5 business days: Mon Oct 5 (1), Tue Oct 6 (2), Wed Oct 7 (3), Thu Oct 8 (4), Fri Oct 9 (5)
		assert.equal(due.getDay(), 5, "Due date should fall on Friday");
		assert.equal(due.getDate(), 9, "Due date should be the 9th");
	});

	it("verifies Mandate 8e logic: handleCheckPlanContinuity validates schema and executes without blocking doctor", async () => {
		const validPayload = {
			patientId: "0192e2b0-8451-789a-bcde-000000000001",
			planAgeDays: 45,
		};
		const parsed = checkPlanContinuitySchema.safeParse(validPayload);
		assert.equal(parsed.success, true);

		const replyState: { statusCode: number; body: Record<string, unknown> | null } = {
			statusCode: 200,
			body: null,
		};

		const testOrgId = "0192e2b0-8451-789a-bcde-000000000001";
		const token = signToken(
			{
				organizationId: testOrgId,
				userId: "0192e2b0-8451-789a-bcde-000000000002",
				role: "doctor",
			},
			authTokenSecret(),
		);

		const mockReq = {
			headers: {
				"x-organization-id": testOrgId,
				"x-dente-staff-token": token,
			},
			user: { organizationId: testOrgId, role: "doctor" },
			body: validPayload,
			log: { error: () => {}, info: () => {} },
		} as unknown as FastifyRequest;

		const mockReply = {
			status(code: number) {
				replyState.statusCode = code;
				return this;
			},
			code(code: number) {
				replyState.statusCode = code;
				return this;
			},
			send(payload: Record<string, unknown>) {
				replyState.body = payload;
				return this;
			},
		} as unknown as FastifyReply;

		await handleCheckPlanContinuity(mockReq, mockReply);

		assert.equal(replyState.statusCode, 200);
		assert.ok(replyState.body, "Expected response body");
		assert.equal(replyState.body.canProceed, true, "Mandate 8e: Doctor autonomy must not be blocked");
		assert.equal(replyState.body.blocked, false, "Mandate 8e: blocked must be false");
		assert.equal(replyState.body.isPlanExpired, true, "Plan > 30 days is marked as expired");
		assert.equal(replyState.body.planAgeDays, 45);
		assert.equal(replyState.body.requiresChiefPhysicianApproval, false, "No chief physician bureaucracy");
		assert.equal(replyState.body.requiresSeniorTechnicianApproval, false);
		assert.equal(replyState.body.autonomyCompliant, true);
		assert.ok(
			typeof replyState.body.noticeRu === "string" && replyState.body.noticeRu.includes("без блокировок"),
			"Notice informs doctor about autonomous continuation",
		);
	});

	it("handleCheckPlanContinuity returns 404 if treatmentPlanId does not exist for tenant", async () => {
		const testOrgId = "0192e2b0-8451-789a-bcde-000000000001";
		const token = signToken(
			{
				organizationId: testOrgId,
				userId: "0192e2b0-8451-789a-bcde-000000000002",
				role: "doctor",
			},
			authTokenSecret(),
		);

		const replyState: { statusCode: number; body: Record<string, unknown> | null } = {
			statusCode: 200,
			body: null,
		};

		const mockReq = {
			headers: {
				"x-organization-id": testOrgId,
				"x-dente-staff-token": token,
			},
			user: { organizationId: testOrgId, role: "doctor" },
			body: {
				patientId: "0192e2b0-8451-789a-bcde-000000000001",
				treatmentPlanId: "0192e2b0-8451-789a-bcde-999999999999",
			},
			log: { error: () => {}, info: () => {} },
		} as unknown as FastifyRequest;

		const mockReply = {
			status(code: number) {
				replyState.statusCode = code;
				return this;
			},
			code(code: number) {
				replyState.statusCode = code;
				return this;
			},
			send(payload: Record<string, unknown>) {
				replyState.body = payload;
				return this;
			},
		} as unknown as FastifyReply;

		await handleCheckPlanContinuity(mockReq, mockReply);
		assert.equal(replyState.statusCode, 404);
		assert.equal(replyState.body?.error, "TreatmentPlanNotFound");
	});
});

describe("Lab 3D Scans Direct Upload & Tenant Protection (Mandate 8c & 8s)", () => {
	it("validates 3D scan filenames and extensions strictly", () => {
		const validStl = validateScanFileMeta("upper_jaw_scan.stl", 1024 * 1024);
		assert.equal(validStl.isValid, true);
		assert.equal(validStl.extension, "stl");
		assert.equal(validStl.mimeType, "model/stl");

		const validPly = validateScanFileMeta("lower_jaw.PLY", 5 * 1024 * 1024);
		assert.equal(validPly.isValid, true);
		assert.equal(validPly.extension, "ply");

		const maliciousExe = validateScanFileMeta("trojan.exe", 100);
		assert.equal(maliciousExe.isValid, false);
		assert.ok(maliciousExe.error?.includes("Недопустимый формат файла"));

		const oversized = validateScanFileMeta("huge.stl", 600 * 1024 * 1024);
		assert.equal(oversized.isValid, false);
		assert.ok(oversized.error?.includes("превышает допустимый лимит 500 МБ"));
	});

	it("generates presigned upload URL with strict tenant prefix", () => {
		const orgId = "0192e2b0-8451-789a-bcde-000000000001";
		const labOrderId = "0192e2b0-8451-789a-bcde-000000000002";
		const result = getLabScanUploadPresignedUrl({
			organizationId: orgId,
			labOrderId,
			fileName: "mandible_scan.stl",
			fileSizeBytes: 2048,
		});

		assert.ok(result.uploadUrl, "Upload URL should be present");
		assert.ok(result.storageKey, "Storage key should be present");
		const expectedPrefix = `org_${orgId.replace(/[^a-zA-Z0-9_-]/g, "")}/lab_orders/${labOrderId.replace(/[^a-zA-Z0-9_-]/g, "")}/`;
		assert.ok(
			result.storageKey.startsWith(expectedPrefix),
			`Storage key ${result.storageKey} should start with ${expectedPrefix}`,
		);
	});

	it("generates presigned download URL and guards against missing key", () => {
		const storageKey = "org_123/lab_orders/456/test_scan.stl";
		const result = getLabScanDownloadPresignedUrl({ storageKey });
		assert.ok(result.downloadUrl);
		assert.equal(result.storageKey, storageKey);

		assert.throws(() => {
			getLabScanDownloadPresignedUrl({ storageKey: "" });
		}, /storageKey обязателен/);
	});

	it("batch-status route definition and handler exist in orderStatusPatchRoutes", async () => {
		const { batchPatchLabOrdersHandler } = await import("../../routes/lab/patchModules/labOrderBatchPatchHandler.js");
		assert.equal(typeof batchPatchLabOrdersHandler, "function");
	});
});

describe("Dental Lab Warranty Passport & Circuit Integration (Mandates 8e, 8k)", () => {
	it("handleGetWarrantyPassport validates UUID and guards access for non-existent orders", async () => {
		const { handleGetWarrantyPassport } = await import("../../routes/lab/pipelineModules/warrantyPassportHandler.js");
		const testOrgId = "0192e2b0-8451-789a-bcde-000000000001";
		const token = signToken(
			{
				organizationId: testOrgId,
				userId: "0192e2b0-8451-789a-bcde-000000000002",
				role: "doctor",
			},
			authTokenSecret(),
		);

		const replyState: { statusCode: number; body: Record<string, unknown> | null } = {
			statusCode: 200,
			body: null,
		};

		const mockReq = {
			headers: {
				"x-organization-id": testOrgId,
				"x-dente-staff-token": token,
			},
			user: { organizationId: testOrgId, role: "doctor" },
			params: { id: "0192e2b0-8451-789a-bcde-000000000999" },
			log: { error: () => {}, info: () => {} },
		} as unknown as FastifyRequest<{ Params: { id: string } }>;

		const mockReply = {
			status(code: number) {
				replyState.statusCode = code;
				return this;
			},
			code(code: number) {
				replyState.statusCode = code;
				return this;
			},
			send(payload: Record<string, unknown>) {
				replyState.body = payload;
				return this;
			},
		} as unknown as FastifyReply;

		await handleGetWarrantyPassport(mockReq, mockReply);
		assert.equal(replyState.statusCode, 404);
		assert.equal(replyState.body?.error, "LabOrderNotFound");
	});
});

describe("Dental Lab & Warranty Contract & Patch Invariants (Red Team Fixes)", () => {
	it("warrantyCertificateItemSchema accepts clinicalWorkTitle and aliases to name", () => {
		const parsed = warrantyCertificateItemSchema.parse({
			clinicalWorkTitle: "Коронка из диоксида циркония",
			tooth: 16,
			material: "ZrO2",
			shade: "A2",
			batchCode: "LOT-9988",
		});
		assert.equal(parsed.name, "Коронка из диоксида циркония");
		assert.equal(parsed.clinicalWorkTitle, "Коронка из диоксида циркония");
		assert.equal(parsed.toothNumber, 16);
		assert.equal(parsed.materialName, "ZrO2");
		assert.equal(parsed.color, "A2");
		assert.equal(parsed.lot, "LOT-9988");
	});

	it("labOrderPatchSchema validates trial dates and delivery date without stripping", () => {
		const parsed = labOrderPatchSchema.parse({
			frameworkTrialDate: "2026-10-15T10:00:00.000Z",
			ceramicTrialDate: "2026-10-20T11:00:00.000Z",
			deliveryDate: "2026-10-25T12:00:00.000Z",
			stage: "fitting_ready",
		});
		assert.equal(parsed.frameworkTrialDate, "2026-10-15T10:00:00.000Z");
		assert.equal(parsed.ceramicTrialDate, "2026-10-20T11:00:00.000Z");
		assert.equal(parsed.deliveryDate, "2026-10-25T12:00:00.000Z");
		assert.equal(parsed.stage, "fitting_ready");
	});
});

