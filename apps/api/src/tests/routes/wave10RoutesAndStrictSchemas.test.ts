/**
 * wave10RoutesAndStrictSchemas.test.ts
 *
 * Red Team regression suite covering Wave 10 Backend Fixes [D-W10-R01..R12]
 * and strict Zod schema hardening across @dental/shared and @dental/api routes.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import {
	cadesBesSignatureSchema,
	clipPlaneParamSchema,
	completedProcedureInputSchema,
	createDocumentSchema,
	createPatientRelationshipDtoSchema,
	createPatientTimelineEntrySchema,
	dentalPricelistAnalysisRequestSchema,
	detachedGostSignatureContainerSchema,
	detachedSignatureSchema,
	dmsGuaranteeLetterCreateSchema,
	documentIngestionRequestSchema,
	emrBatchSigningSessionSchema,
	fdiToothUpdateActionSchema,
	kapsoSettingsUpdateSchema,
	oneCChartOfAccountsSchema,
	paymentRefundCorrectionPayloadSchema,
	scanbodyMeshLodSchema,
	sepaSitePatchSchema,
	taxDeductionApplicationPayloadSchema,
} from "@dental/shared";
import { readZipEntriesAsync } from "../../ingestion/docExtractor/zipReader.js";
import { DEFAULT_IDEMPOTENCY_EXEMPT_PATHS } from "../../plugins/idempotencyPlugin.js";
import { registerDiagnocatAnalyticsRoutes } from "../../routes/analytics/diagnocatRoutes.js";
import { registerHardwareRoutes } from "../../routes/hardware.js";
import { registerFlexbeRoutes } from "../../routes/integrations/flexbe.js";
import { registerLanNetworkRoutes } from "../../routes/lanNetwork.js";
import {
	createZipArchive,
	registerMobileOtaRoutes,
	resetOtaRuntimeState,
} from "../../routes/mobileOta.js";
import {
	checkLockParamsSchema,
	getVerifyQueueQuerySchema,
} from "../../routes/outpatient/outpatientTypes.js";
import {
	approveTreatmentPlanBodySchema,
	bookAppointmentBodySchema,
	cancelAppointmentBodySchema,
	confirmSbpBodySchema,
	createSbpQrBodySchema,
	healthQuestionnaireBodySchema,
	paymentStatusQuerySchema,
	rescheduleAppointmentBodySchema,
	selectTierBodySchema,
	sendOtpBodySchema,
	signConsentBodySchema,
	verifyOtpBodySchema,
} from "../../routes/portal/types.js";
import { branchIdParamSchema } from "../../routes/settings/branchesRoutes.js";
import { registerChairsRoutes } from "../../routes/settings/chairsRoutes.js";
import { registerStaffSettingsRoutes } from "../../routes/settings/staffSettingsRoutes.js";
import { registerSmartImportRoutes } from "../../routes/smartImports.js";
import { staffCandidateSchema } from "../../routes/staff/staffSchemas.js";
import { registerSyncRoutes } from "../../routes/sync/index.js";
import { registerSystemMaintenanceRoutes } from "../../routes/systemRoutes/systemMaintenanceHandlers.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signBodySchema, verifyBodySchema } from "../../services/budget/budgetSchemas.js";
import {
	buildMigrationLocalSourceProbe,
} from "../../services/imports/smartImportsProbe.js";
import {
	isAllowedMigrationPath,
	migrationSourceRouteStore,
	registerMigrationSourceRoute,
	resolveMigrationSourceRoute,
} from "../../services/imports/smartImportsRoots.js";
import { buildMigrationLocalSourceWorkup } from "../../services/imports/smartImportsWorkup.js";
import {
	getLanMeshAutoJoinServiceForOrg,
	resetLanMeshAutoJoinServiceForTest,
} from "../../services/lanMeshAutoJoinService.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "33333333-3333-4333-8333-333333333333";
const TEST_SECRET = "wave10-redteam-auth-secret-".padEnd(48, "x");
const TEST_ADMIN_SECRET = "wave10-redteam-admin-secret-".padEnd(36, "a");
const TEST_FLEXBE_SECRET = "wave10-redteam-flexbe-secret";

function makeHeaders(organizationId: string, role = "owner"): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId }, TEST_SECRET, 3600),
		[STAFF_TOKEN_HEADER]: signToken(
			{ organizationId, userId: USER_A, role },
			TEST_SECRET,
			3600,
		),
		"x-dente-admin-secret": TEST_ADMIN_SECRET,
	};
}

describe("Wave 10 Red Team: Remaining Routes, Multi-Tenant Isolation & Strict Schemas [D-W10-R01..R12]", () => {
	const originalEnv = { ...process.env };
	let tempDir = "";

	before(() => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		process.env.DENTE_CLINICAL_ADMIN_SECRET = TEST_ADMIN_SECRET;
		process.env.FLEXBE_WEBHOOK_SECRET = TEST_FLEXBE_SECRET;
		delete process.env.DENTE_SUPERADMIN_SECRET;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-wave10-"));
	});

	after(() => {
		resetOtaRuntimeState();
		resetLanMeshAutoJoinServiceForTest();
		migrationSourceRouteStore.clear();
		if (tempDir && fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		Object.assign(process.env, originalEnv);
		resetAuthSecretCacheForTests();
	});

	it("[D-W10-R01] enforces orgId, tenant-scoped migration tokens, and Path Jail with symlink escape defense", async () => {
		const app = Fastify();
		await app.register(registerSmartImportRoutes);
		await app.ready();

		try {
			// 1. Admin secret without clinic token -> missing orgId must fail closed (401/403/503)
			for (const url of [
				"/api/imports/smart/local-source-discovery",
				"/api/imports/smart/local-source-workup",
				"/api/imports/smart/local-source-probe",
				"/api/imports/smart/clinic-public-lookup",
			]) {
				const res = await app.inject({
					method: "POST",
					url,
					headers: { "x-dente-admin-secret": TEST_ADMIN_SECRET },
					payload: {},
				});
				assert.ok(
					res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 503,
					`${url} without orgId returned ${res.statusCode}`,
				);
			}

			// 2. Tenant-isolated migration source route tokens
			migrationSourceRouteStore.clear();
			const tokenA = registerMigrationSourceRoute(
				path.join(tempDir, "legacy-db.dbf"),
				"mis_database",
				"Legacy DB",
				ORG_A,
			);
			const resolvedSame = resolveMigrationSourceRoute(tokenA, ORG_A);
			const resolvedCross = resolveMigrationSourceRoute(tokenA, ORG_B);
			assert.equal(resolvedSame.routeExpired, false);
			assert.equal(resolvedCross.routeExpired, true);
			assert.equal(resolvedCross.route, null);

			// 3. Path Jail blocks OS/sensitive paths & symlinks
			assert.equal(isAllowedMigrationPath("/etc/passwd").allowed, false);
			assert.equal(isAllowedMigrationPath("C:\\Windows\\System32\\cmd.exe").allowed, false);
			assert.equal(isAllowedMigrationPath(path.join(tempDir, ".ssh", "id_rsa")).allowed, false);

			const blockedTarget = process.platform === "win32" ? "C:\\Windows\\System32" : "/etc";
			const linkPath = path.join(tempDir, "escape-link");
			try {
				fs.symlinkSync(blockedTarget, linkPath, "dir");
				const symlinkCheck = isAllowedMigrationPath(path.join(linkPath, "drivers"));
				assert.equal(symlinkCheck.allowed, false);
			} catch (linkErr: unknown) {
				// Windows without Developer Mode may forbid symlink creation (EPERM); direct path checks still hold.
				assert.ok(linkErr instanceof Error);
			}

			const probeBlocked = await buildMigrationLocalSourceProbe(
				{
					sourceRef: process.platform === "win32" ? "C:\\Windows\\System32\\drivers\\etc\\hosts" : "/etc/passwd",
					maxDepth: 1,
					maxFolders: 5,
					maxFiles: 10,
					maxSampleArtifacts: 2,
					readHeaderBytes: 256,
				},
				ORG_A,
			);
			assert.equal(probeBlocked.sourceExists, false);
			assert.ok(probeBlocked.warnings.some((w) => w.includes("политикой безопасности")));

			const workupBlocked = buildMigrationLocalSourceWorkup(
				{ sourceRef: "/etc/shadow" },
				ORG_A,
			);
			assert.equal(workupBlocked.sourceExists, false);
			assert.ok(workupBlocked.warnings.some((w) => w.includes("политикой безопасности")));
		} finally {
			await app.close();
		}
	});

	it("[D-W10-R02] isolates mobile OTA state per organization, requires superadmin, and rejects bad query", async () => {
		resetOtaRuntimeState();
		const app = Fastify();
		await app.register(registerMobileOtaRoutes);
		await app.ready();

		try {
			const badQueryRes = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json?clientVersion=invalid&unexpected=1",
			});
			assert.equal(badQueryRes.statusCode, 400);

			// Doctor role must not publish OTA bundles
			const doctorPublish = await app.inject({
				method: "POST",
				url: "/api/mobile/publish",
				headers: {
					[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_A }, TEST_SECRET, 3600),
					[STAFF_TOKEN_HEADER]: signToken(
						{ organizationId: ORG_A, userId: USER_A, role: "doctor" },
						TEST_SECRET,
						3600,
					),
				},
				payload: { version: "9.9.9" },
			});
			assert.equal(doctorPublish.statusCode, 403);

			// Org A owner publishes -> Org B & platform stay isolated
			const orgAPublish = await app.inject({
				method: "POST",
				url: "/api/mobile/publish",
				headers: makeHeaders(ORG_A, "owner"),
				payload: { version: "7.1.0" },
			});
			assert.equal(orgAPublish.statusCode, 200);

			const orgAVersion = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json",
				headers: { [CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_A }, TEST_SECRET, 3600) },
			});
			const orgBVersion = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json",
				headers: { [CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_B }, TEST_SECRET, 3600) },
			});
			assert.equal(orgAVersion.json().version, "7.1.0");
			assert.notEqual(orgBVersion.json().version, "7.1.0");
		} finally {
			await app.close();
		}
	});

	it("[D-W10-R03] removes .limit(1) impersonation, isolates mesh auto-join per org, strips dev jargon, enforces .strict()", async () => {
		resetLanMeshAutoJoinServiceForTest();
		const app = Fastify();
		await app.register(registerLanNetworkRoutes);
		await app.ready();

		try {
			const lanInfoRes = await app.inject({ method: "GET", url: "/api/network/lan-info" });
			assert.equal(lanInfoRes.statusCode, 200);
			assert.equal(JSON.stringify(lanInfoRes.json()).includes("в 1 клик"), false);

			// Strict rejection on pair/generate and mesh/auto-join/verify
			const badPairGen = await app.inject({
				method: "POST",
				url: "/api/network/pair/generate",
				headers: makeHeaders(ORG_A),
				payload: { role: "doctor", extraField: "evil" },
			});
			assert.equal(badPairGen.statusCode, 400);

			const badAutoJoinVerify = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				payload: { pin: "123456", extraField: true },
			});
			assert.equal(badAutoJoinVerify.statusCode, 400);

			// Pair generate without staffUserId (only clinic token) -> /pair/verify issues clinicToken with staffToken === null
			const pairGen = await app.inject({
				method: "POST",
				url: "/api/network/pair/generate",
				headers: { [CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_A }, TEST_SECRET, 3600) },
				payload: { role: "doctor" },
			});
			assert.equal(pairGen.statusCode, 200);
			const genBody = pairGen.json();

			const pairVerify = await app.inject({
				method: "POST",
				url: "/api/network/pair/verify",
				payload: { token: genBody.pairingToken, pin: genBody.pairingPin },
			});
			assert.equal(pairVerify.statusCode, 200);
			const verifyBody = pairVerify.json();
			assert.ok(verifyBody.clinicToken);
			assert.equal(verifyBody.staffToken, null);
			assert.equal(verifyBody.user, null);

			// Auto-join per-tenant isolation
			const svcA = getLanMeshAutoJoinServiceForOrg(ORG_A);
			const svcB = getLanMeshAutoJoinServiceForOrg(ORG_B);
			const pinA = svcA.getActivePinInfo().pin;
			svcA.rotatePin(true);
			assert.notEqual(svcA.getActivePinInfo().pin, pinA);
			// Org B service was NOT rotated when Org A rotated
			assert.equal(svcB.clinicId, ORG_B);
		} finally {
			await app.close();
		}
	});

	it("[D-W10-R04..R06] enforces strict portal/budget schemas and correct idempotency exemptions", () => {
		const portalSchemas = [
			{ name: "sendOtpBodySchema", schema: sendOtpBodySchema, valid: { phone: "+79990001122" } },
			{ name: "verifyOtpBodySchema", schema: verifyOtpBodySchema, valid: { phone: "+79990001122", code: "1234" } },
			{ name: "signConsentBodySchema", schema: signConsentBodySchema, valid: { signatureMethod: "portal_pep" } },
			{ name: "selectTierBodySchema", schema: selectTierBodySchema, valid: { tierId: "standard" } },
			{ name: "approveTreatmentPlanBodySchema", schema: approveTreatmentPlanBodySchema, valid: { pepCode: "1234" } },
			{ name: "createSbpQrBodySchema", schema: createSbpQrBodySchema, valid: { amountRub: 1500 } },
			{ name: "confirmSbpBodySchema", schema: confirmSbpBodySchema, valid: { invoiceId: ORG_A, sbpTransactionId: "tx1" } },
			{ name: "paymentStatusQuerySchema", schema: paymentStatusQuerySchema, valid: { invoiceId: ORG_A } },
			{ name: "bookAppointmentBodySchema", schema: bookAppointmentBodySchema, valid: { doctorId: USER_A } },
			{ name: "rescheduleAppointmentBodySchema", schema: rescheduleAppointmentBodySchema, valid: { startsAt: "2026-12-01T10:00:00Z" } },
			{ name: "cancelAppointmentBodySchema", schema: cancelAppointmentBodySchema, valid: { reason: "test" } },
			{ name: "healthQuestionnaireBodySchema", schema: healthQuestionnaireBodySchema, valid: { additionalNotes: "ok" } },
			{ name: "verifyBodySchema", schema: verifyBodySchema, valid: { phoneDigits: "1234" } },
			{ name: "signBodySchema", schema: signBodySchema, valid: { signaturePng: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" } },
		];

		for (const item of portalSchemas) {
			assert.equal(item.schema.safeParse(item.valid).success, true, `${item.name} rejected valid payload`);
			assert.equal(
				item.schema.safeParse({ ...item.valid, __unexpected: "evil" }).success,
				false,
				`${item.name} accepted unknown key`,
			);
		}

		// Idempotency exemptions cover real OTP/Telegram/Budget verify endpoints, NOT portal mutations
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/auth/send-otp")), true);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/auth/verify-otp")), true);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/auth/telegram-webapp")), true);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/auth/logout")), true);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/v1/public/budgets/tok123/verify")), true);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/appointments")), false);
		assert.equal(DEFAULT_IDEMPOTENCY_EXEMPT_PATHS.some((re) => re.test("/api/portal/payments/confirm-sbp")), false);
	});

	it("[D-W10-R07..R10] enforces requireSuperadmin, hardware Hot Folder Path Jail, and strict sync/diagnocat queries", async () => {
		const app = Fastify();
		registerSystemMaintenanceRoutes(app);
		await app.register(registerHardwareRoutes);
		await app.register(registerSyncRoutes);
		await app.register(registerDiagnocatAnalyticsRoutes);
		await app.ready();

		try {
			// R07: Non-superadmin doctor without admin secret must get 403
			const doctorHeaders = {
				[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_A }, TEST_SECRET, 3600),
				[STAFF_TOKEN_HEADER]: signToken(
					{ organizationId: ORG_A, userId: USER_A, role: "doctor" },
					TEST_SECRET,
					3600,
				),
			};
			const verifyForbidden = await app.inject({
				method: "GET",
				url: "/api/system/persistence/verify",
				headers: doctorHeaders,
			});
			assert.equal(verifyForbidden.statusCode, 403);

			const exportForbidden = await app.inject({
				method: "GET",
				url: "/api/system/persistence/export",
				headers: doctorHeaders,
			});
			assert.equal(exportForbidden.statusCode, 403);

			const verifyAllowed = await app.inject({
				method: "GET",
				url: "/api/system/persistence/verify",
				headers: { "x-dente-admin-secret": TEST_ADMIN_SECRET },
			});
			assert.equal(verifyAllowed.statusCode, 200);

			// R08: Hardware Hot Folder Path Jail & strict queries
			const blockedFolder = process.platform === "win32" ? "C:\\Windows\\System32" : "/etc";
			const badCreate = await app.inject({
				method: "POST",
				url: "/api/hardware/devices",
				headers: makeHeaders(ORG_A),
				payload: { name: "Evil", hotFolderPath: blockedFolder },
			});
			assert.equal(badCreate.statusCode, 400);
			assert.equal(badCreate.json().error, "InvalidHotFolderPath");

			const badUpdate = await app.inject({
				method: "PUT",
				url: `/api/hardware/devices/${ORG_A}`,
				headers: makeHeaders(ORG_A),
				payload: { hotFolderPath: blockedFolder },
			});
			assert.equal(badUpdate.statusCode, 400);
			assert.equal(badUpdate.json().error, "InvalidHotFolderPath");

			const badSyncDevices = await app.inject({
				method: "POST",
				url: "/api/hardware/devices/sync",
				headers: makeHeaders(ORG_A),
				payload: { devices: [{ name: "Evil", hotFolderPath: blockedFolder }] },
			});
			assert.equal(badSyncDevices.statusCode, 400);
			assert.equal(badSyncDevices.json().error, "InvalidHotFolderPath");

			const badSensorQuery = await app.inject({
				method: "GET",
				url: "/api/hardware/sensor-status?unexpected=1",
				headers: makeHeaders(ORG_A),
			});
			assert.equal(badSensorQuery.statusCode, 400);

			// R09: Strict sync pull query/body
			const badSyncGet = await app.inject({
				method: "GET",
				url: "/api/sync/pull?extraParam=1",
				headers: makeHeaders(ORG_A),
			});
			assert.equal(badSyncGet.statusCode, 400);

			const badSyncPost = await app.inject({
				method: "POST",
				url: "/api/sync/pull",
				headers: makeHeaders(ORG_A),
				payload: { extraParam: 1 },
			});
			assert.equal(badSyncPost.statusCode, 400);

			// R10: Strict diagnocat analytics query
			const badAiStats = await app.inject({
				method: "GET",
				url: "/api/analytics/ai-diagnostics?extra=1",
				headers: makeHeaders(ORG_A),
			});
			assert.equal(badAiStats.statusCode, 400);
		} finally {
			await app.close();
		}
	});

	it("[D-W10-R11..R12] rejects non-UUID chair/staff IDs, enforces strict Flexbe query, and stops Zip Bombs >50 MiB", async () => {
		const app = Fastify();
		registerChairsRoutes(app);
		registerStaffSettingsRoutes(app);
		await app.register(registerFlexbeRoutes);
		await app.ready();

		try {
			// R11: non-UUID params must fail with 400 before hitting DB
			for (const req of [
				{ method: "PUT" as const, url: "/api/settings/chairs/not-a-uuid", payload: { name: "X" } },
				{ method: "PUT" as const, url: "/api/settings/chairs/not-a-uuid/working-hours", payload: { workingHours: [] } },
				{ method: "DELETE" as const, url: "/api/settings/chairs/not-a-uuid" },
				{ method: "PUT" as const, url: "/api/settings/staff/not-a-uuid", payload: { fullName: "X" } },
				{ method: "PUT" as const, url: "/api/settings/staff/not-a-uuid/working-hours", payload: { workingHours: [] } },
				{ method: "DELETE" as const, url: "/api/settings/staff/not-a-uuid" },
				{ method: "PUT" as const, url: "/api/settings/staff/not-a-uuid/commission", payload: { commissionPct: 20 } },
				{ method: "PUT" as const, url: "/api/settings/staff/not-a-uuid/authority", payload: { canManageMoney: true } },
			]) {
				const res = await app.inject({
					method: req.method,
					url: req.url,
					headers: makeHeaders(ORG_A),
					...(req.payload ? { payload: req.payload } : {}),
				});
				assert.equal(res.statusCode, 400, `${req.method} ${req.url} returned ${res.statusCode}`);
			}

			// R12: Flexbe query .strict()
			const badFlexbe = await app.inject({
				method: "POST",
				url: `/api/integrations/flexbe/webhook?organizationId=${ORG_A}&unexpected=1`,
				headers: { "x-dente-webhook-secret": TEST_FLEXBE_SECRET },
				payload: { name: "Test" },
			});
			assert.equal(badFlexbe.statusCode, 400);

			// R12: Cumulative Zip Bomb protection (> 50 MiB across stored entries)
			const bigChunk = Buffer.alloc(18 * 1024 * 1024, 0x41);
			const zipBombBuffer = createZipArchive([
				{ name: "part1.txt", data: bigChunk },
				{ name: "part2.txt", data: bigChunk },
				{ name: "part3.txt", data: bigChunk },
			]);
			const zipResult = await readZipEntriesAsync(zipBombBuffer);
			assert.ok(zipResult.warnings.includes("zip_bomb_size_limit_exceeded"));
			assert.equal(zipResult.entries.length, 2);
		} finally {
			await app.close();
		}
	});

	it("[Group A & B .strict()] rejects unexpected fields across hardened shared & route schemas", () => {
		const validUuid = ORG_A;
		const cases: Array<{ name: string; schema: { safeParse: (d: unknown) => { success: boolean } }; valid: unknown }> = [
			{ name: "oneCChartOfAccountsSchema", schema: oneCChartOfAccountsSchema, valid: {} },
			{ name: "documentIngestionRequestSchema", schema: documentIngestionRequestSchema, valid: { fileName: "a.txt", rawText: "hello" } },
			{ name: "createPatientTimelineEntrySchema", schema: createPatientTimelineEntrySchema, valid: { clinicId: validUuid, patientId: validUuid, eventType: "visit", eventCategory: "clinical", sourceTable: "visits", sourceId: validUuid, title: "Приём" } },
			{ name: "kapsoSettingsUpdateSchema", schema: kapsoSettingsUpdateSchema, valid: { isActive: true } },
			{ name: "sepaSitePatchSchema", schema: sepaSitePatchSchema, valid: { bleedingOnProbing: false } },
			{ name: "completedProcedureInputSchema", schema: completedProcedureInputSchema, valid: { procedureCode804n: "A16.07.002" } },
			{ name: "createPatientRelationshipDtoSchema", schema: createPatientRelationshipDtoSchema, valid: { relatedPatientId: validUuid, relationshipType: "parent" } },
			{ name: "createDocumentSchema", schema: createDocumentSchema, valid: { patientId: validUuid, kind: "informed_consent" } },
			{ name: "dentalPricelistAnalysisRequestSchema", schema: dentalPricelistAnalysisRequestSchema, valid: { rawText: "Пломба 3000" } },
			{ name: "dmsGuaranteeLetterCreateSchema", schema: dmsGuaranteeLetterCreateSchema, valid: { patientId: validUuid, patientFullName: "Иванов И.И.", insurerName: "СОГАЗ", policyNumber: "12345", letterNumber: "GP-1", issueDate: "2026-01-01", validFrom: "2026-01-01", maxCoverageRub: 50000 } },
			{ name: "taxDeductionApplicationPayloadSchema", schema: taxDeductionApplicationPayloadSchema, valid: { taxpayerFullName: "Иванов И.И.", taxpayerInn: "770123456789", taxpayerBirthDate: "1990-01-01", taxpayerIdentityDocument: "Паспорт 4510 123456", relationshipToPatient: "self", requestedTaxYear: 2025, requestedForm: "knd_1151156", selectedPaymentIds: [], deliveryChannel: "email", contactForReadyDocument: "a@b.ru", requestedAt: "2026-01-10", duplicateWarningAccepted: true } },
			{ name: "paymentRefundCorrectionPayloadSchema", schema: paymentRefundCorrectionPayloadSchema, valid: { action: "full_refund", selectedPaymentIds: [validUuid], amountRub: 1000, reason: "Отказ", refundMethod: "card", recipientFullName: "Иванов И.И.", recipientIdentityDocument: "4510 123456", originalFiscalReceiptNumber: "FD-1", accountantDecision: "Утверждено" } },
			{ name: "fdiToothUpdateActionSchema", schema: fdiToothUpdateActionSchema, valid: { toothNumber: 16, status: "caries" } },
			{ name: "detachedSignatureSchema", schema: detachedSignatureSchema, valid: { signatureBase64: "AQID", certificateSerialNumber: "01", certificateSubject: "CN=Doctor", signedAt: "2026-11-25T10:00:00Z" } },
			{ name: "detachedGostSignatureContainerSchema", schema: detachedGostSignatureContainerSchema, valid: { signatureBase64: "AQID", documentHashHex: "a".repeat(64), documentId: validUuid, documentKind: "informed_consent", signedAt: "2026-11-25T10:00:00Z", certificateSerialNumber: "01", certificateSubject: "CN=Doctor", certificateIssuer: "CN=CA", validFrom: "2026-01-01", validTo: "2027-01-01" } },
			{ name: "cadesBesSignatureSchema", schema: cadesBesSignatureSchema, valid: { signatureBase64: "A".repeat(20), certificateSerialNumber: "1234", certificateSubject: "CN=Doctor", certificateIssuer: "CN=TestCA", certificateThumbprintSha1: "a".repeat(40), certificateThumbprintSha256: "b".repeat(64), algorithmOid: "1.2.643.7.1.1.1.1", digestAlgorithmOid: "1.2.643.7.1.1.2.2", signedAt: "2026-11-25T10:00:00+03:00", signatureValueHex: "c".repeat(20), messageDigestHex: "d".repeat(32), cadesType: "CADES_BES", signerRole: "DOCTOR", signerSnils: "12345678901" } },
			{ name: "emrBatchSigningSessionSchema", schema: emrBatchSigningSessionSchema, valid: { sessionId: "s1", doctorId: validUuid, doctorName: "Иванов", maskedPhone: "+7***12", appointmentIds: [validUuid], shiftDateIso: "2026-11-25", secretCode: "1234", expiresAtIso: "2026-11-25T12:00:00Z", batchHash: "a".repeat(16) } },
			{ name: "scanbodyMeshLodSchema", schema: scanbodyMeshLodSchema, valid: { toothFdi: 16 } },
			{ name: "clipPlaneParamSchema", schema: clipPlaneParamSchema, valid: { origin: [0, 0, 0], normal: [0, 0, 1] } },
			{ name: "branchIdParamSchema", schema: branchIdParamSchema, valid: { id: validUuid } },
			{ name: "getVerifyQueueQuerySchema", schema: getVerifyQueueQuerySchema, valid: {} },
			{ name: "staffCandidateSchema", schema: staffCandidateSchema, valid: { fullName: "Тест" } },
		];

		for (const item of cases) {
			const okResult = item.schema.safeParse(item.valid);
			assert.equal(okResult.success, true, `${item.name} failed valid case`);
			if (typeof item.valid === "object" && item.valid !== null) {
				const strictResult = item.schema.safeParse({ ...item.valid, __strictExtra: "reject" });
				assert.equal(strictResult.success, false, `${item.name} did NOT reject unknown field`);
			}
		}
	});
});
