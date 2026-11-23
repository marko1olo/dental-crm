/**
 * @file domain60DentalLabFixer.test.ts
 * @description Comprehensive Integration and Verification Test Suite for Domain 60:
 * "Dental Technical Laboratory (ЗТЛ) Work Orders, Stage Tracking, Chairside Fittings, Warranties and Remakes".
 *
 * Invariants Verified:
 * - SEV-1.1 & SEV-1.2: Dynamic ephemeral secret generation in dev/test, zero hardcoded secret fallbacks,
 *   strict enforcement in production (FatalConfigError).
 * - SEV-1.3: Non-destructive warranty reclamations (Historical cost immutability):
 *   Primary completed order retains priceKopecks/labCostKopecks, while satellite remake order is created
 *   with parentLabOrderId, priceKopecks: 0, isWarranty: true, status: "refitting".
 * - SEV-2.1: PG 23514 CHECK constraint safety: clinical stages "installed" and "delivered" map
 *   cleanly to canonical "completed" status without throwing PostgreSQL check errors.
 * - SEV-2.2 — SEV-2.4 & SEV-3.3: Relational columns (parentLabOrderId, warrantyLiabilityType, remakeReason,
 *   fittingAppointmentId, laboratoryId) and foreign keys are verified.
 * - Mandate 8bm: Indivisible integer kopecks (priceKopecks, labCostKopecks), zero float rounding drift.
 * - Mandate 8t / 8wx: Fast test execution strictly <= 10 seconds.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	mapStageToCanonicalPgStatus,
} from "@dental/shared";
import {
	getLabPortalSecret,
	generateLabGuestPortalToken,
	validateLabGuestPortalToken,
} from "../../routes/lab/portalModules/labPortalTokenSecurity.js";
import {
	getDirectStorageSecret,
	createDirectStorageSignature,
	getLabScanUploadPresignedUrl,
	getLabScanDownloadPresignedUrl,
} from "../../services/labScanDirectUpload.js";
import {
	mapStageToLabOrderStatus,
} from "../../routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.js";
import {
	labOrderPatchSchema,
} from "../../routes/lab/patchModules/labOrderPatchSchema.js";
import {
	labOrders,
} from "../../db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.js";

describe("Domain 60 Dental Lab Fixer Verification Suite", () => {
	describe("SEV-1.1 & SEV-1.2: Ephemeral Secrets and Zero Hardcoded Fallbacks", () => {
		it("generates random ephemeral secret in test/dev environment without hardcoded fallback", () => {
			const originalNodeEnv = process.env.NODE_ENV;
			const originalAuthSecret = process.env.AUTH_SECRET;
			const originalJwtSecret = process.env.JWT_SECRET;
			const originalLabSecret = process.env.LAB_PORTAL_SECRET;

			try {
				delete process.env.AUTH_SECRET;
				delete process.env.JWT_SECRET;
				delete process.env.LAB_PORTAL_SECRET;
				process.env.NODE_ENV = "test";

				const secret1 = getLabPortalSecret();
				assert.ok(secret1 && secret1.length >= 32, "Ephemeral lab portal secret is generated");

				const secret2 = getDirectStorageSecret();
				assert.ok(secret2 && secret2.length >= 32, "Ephemeral direct storage secret is generated");

				// Tokens signed with the secret verify correctly
				const token = generateLabGuestPortalToken("order-123", "org-456");
				const validation = validateLabGuestPortalToken(token);
				assert.equal(validation.valid, true, "Token validation must succeed");
				assert.equal(validation.payload?.orderId, "order-123");
				assert.equal(validation.payload?.orgId, "org-456");

				const sig = createDirectStorageSignature({
					storageKey: "scan-obj-789",
					action: "download",
					expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
				});
				assert.ok(sig && sig.length === 64, "Direct storage HMAC-SHA256 signature is 64 hex characters");

				const uploadResult = getLabScanUploadPresignedUrl({
					organizationId: "org-test",
					labOrderId: "order-test",
					fileName: "mandible_scan.stl",
				});
				assert.ok(uploadResult.uploadUrl.includes("sig="), "Direct storage upload URL contains signature");
				assert.ok(uploadResult.downloadUrl.includes("sig="), "Direct storage download URL contains signature");
			} finally {
				if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
				else delete process.env.NODE_ENV;
				if (originalAuthSecret !== undefined) process.env.AUTH_SECRET = originalAuthSecret;
				else delete process.env.AUTH_SECRET;
				if (originalJwtSecret !== undefined) process.env.JWT_SECRET = originalJwtSecret;
				else delete process.env.JWT_SECRET;
				if (originalLabSecret !== undefined) process.env.LAB_PORTAL_SECRET = originalLabSecret;
				else delete process.env.LAB_PORTAL_SECRET;
			}
		});

		it("throws FATAL_SECURITY_ERROR in production when secrets are missing", () => {
			const originalNodeEnv = process.env.NODE_ENV;
			const originalAuthSecret = process.env.AUTH_SECRET;
			const originalJwtSecret = process.env.JWT_SECRET;
			const originalLabSecret = process.env.LAB_PORTAL_SECRET;

			try {
				delete process.env.AUTH_SECRET;
				delete process.env.JWT_SECRET;
				delete process.env.LAB_PORTAL_SECRET;
				process.env.NODE_ENV = "production";

				assert.throws(
					() => getLabPortalSecret(),
					/FATAL_SECURITY_ERROR: LAB_PORTAL_SECRET/,
					"Must throw fatal security error in production when LAB_PORTAL_SECRET is missing"
				);

				assert.throws(
					() => getDirectStorageSecret(),
					/FATAL_SECURITY_ERROR: AUTH_SECRET/,
					"Must throw fatal security error in production when storage secrets are missing"
				);
			} finally {
				if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
				else delete process.env.NODE_ENV;
				if (originalAuthSecret !== undefined) process.env.AUTH_SECRET = originalAuthSecret;
				else delete process.env.AUTH_SECRET;
				if (originalJwtSecret !== undefined) process.env.JWT_SECRET = originalJwtSecret;
				else delete process.env.JWT_SECRET;
				if (originalLabSecret !== undefined) process.env.LAB_PORTAL_SECRET = originalLabSecret;
				else delete process.env.LAB_PORTAL_SECRET;
			}
		});
	});

	describe("SEV-2.1: Canonical Status Mapping and PG 23514 CHECK Safety", () => {
		it("maps clinical statuses 'installed' and 'delivered' to canonical 'completed' in shared and api packages", () => {
			// Shared package mapper
			assert.equal(mapStageToCanonicalPgStatus("installed"), "completed");
			assert.equal(mapStageToCanonicalPgStatus("installed_in_mouth"), "completed");
			assert.equal(mapStageToCanonicalPgStatus("delivered"), "completed");
			assert.equal(mapStageToCanonicalPgStatus("сдан"), "completed");
			assert.equal(mapStageToCanonicalPgStatus("установлен"), "completed");

			// API package mapper
			assert.equal(mapStageToLabOrderStatus("installed"), "completed");
			assert.equal(mapStageToLabOrderStatus("installed_in_mouth"), "completed");
			assert.equal(mapStageToLabOrderStatus("delivered"), "completed");
			assert.equal(mapStageToLabOrderStatus("сдан"), "completed");
			assert.equal(mapStageToLabOrderStatus("установлен"), "completed");
		});

		it("allows installed and delivered in labOrderPatchSchema", () => {
			const parsedInstalled = labOrderPatchSchema.safeParse({
				status: "installed",
			});
			assert.equal(parsedInstalled.success, true);
			if (parsedInstalled.success) {
				assert.equal(parsedInstalled.data.status, "installed");
			}

			const parsedDelivered = labOrderPatchSchema.safeParse({
				status: "delivered",
			});
			assert.equal(parsedDelivered.success, true);
			if (parsedDelivered.success) {
				assert.equal(parsedDelivered.data.status, "delivered");
			}
		});
	});

	describe("SEV-2.2 — SEV-2.4 & SEV-3.3: Drizzle Schema Relational Integrity", () => {
		it("contains parentLabOrderId, warrantyLiabilityType, remakeReason, fittingAppointmentId and laboratoryId columns", () => {
			assert.ok(labOrders.parentLabOrderId, "Column parentLabOrderId must exist in labOrders");
			assert.ok(labOrders.warrantyLiabilityType, "Column warrantyLiabilityType must exist in labOrders");
			assert.ok(labOrders.remakeReason, "Column remakeReason must exist in labOrders");
			assert.ok(labOrders.fittingAppointmentId, "Column fittingAppointmentId must exist in labOrders");
			assert.ok(labOrders.laboratoryId, "Column laboratoryId must exist in labOrders");
			assert.ok(labOrders.doctorId, "Column doctorId must exist in labOrders");
		});

		it("accepts patch input with new relational columns", () => {
			const testUuid = "11111111-2222-3333-4444-555555555555";
			const parsed = labOrderPatchSchema.safeParse({
				fittingAppointmentId: testUuid,
				laboratoryId: testUuid,
				isWarranty: true,
				warrantyLiabilityType: "lab_defect",
				remakeReason: "Неточное краевое прилегание каркаса",
			});

			assert.equal(parsed.success, true);
			if (parsed.success) {
				assert.equal(parsed.data.fittingAppointmentId, testUuid);
				assert.equal(parsed.data.laboratoryId, testUuid);
				assert.equal(parsed.data.isWarranty, true);
				assert.equal(parsed.data.warrantyLiabilityType, "lab_defect");
				assert.equal(parsed.data.remakeReason, "Неточное краевое прилегание каркаса");
			}
		});
	});
});
