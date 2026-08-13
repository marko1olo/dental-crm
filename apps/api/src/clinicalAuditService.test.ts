import assert from "node:assert";
import { describe, test, beforeEach, afterEach } from "node:test";
import type { FastifyRequest } from "fastify";
import { auditFromRequest } from "./clinicalAuditService.js";
import { db } from "./db/client.js";
import { clinicalAuditLogs, organizations, users } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./tests/support/fixtureOrganizations.js";
import { withSuperuserBypass } from "./db/rls.js";

const RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let testIndex = 0;
let orgId: string;

describe("auditFromRequest", () => {
	beforeEach(async () => {
		testIndex++;
		orgId = fixtureUuid(`clinical-audit-${RUN_ID}`, testIndex);
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async () => {
			await db
				.insert(organizations)
				.values([
					{ id: orgId, name: "Clinical Audit Test Org", schemaVersion: 1 },
				])
				.onConflictDoNothing();
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("extracts ip and user-agent from fastify request when both headers are present", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const mockRequest = {
				headers: {
					"x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
					"user-agent": "Mozilla/5.0",
				},
				ip: "127.0.0.1",
			} as unknown as FastifyRequest;

			const payload = {
				organizationId: orgId,
				action: "VIEW_PATIENT" as const,
				entityType: "patient",
				entityId: "pat-1",
			};

			await auditFromRequest(mockRequest, payload);

			const events = await db
				.select()
				.from(clinicalAuditLogs)
				.where(eq(clinicalAuditLogs.organizationId, orgId))
				.orderBy(desc(clinicalAuditLogs.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].organizationId, orgId);
			assert.strictEqual(events[0].action, "VIEW_PATIENT");
			assert.strictEqual(events[0].entityType, "patient");
			assert.strictEqual(events[0].entityId, "pat-1");
			assert.strictEqual(events[0].ipAddress, "203.0.113.195");
			assert.strictEqual(events[0].userAgent, "Mozilla/5.0");
		});
	});

	test("uses request.ip when x-forwarded-for is missing", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const mockRequest = {
				headers: {
					"user-agent": "CustomApp/1.0",
				},
				ip: "10.0.0.5",
			} as unknown as FastifyRequest;

			const payload = {
				organizationId: orgId,
				action: "VIEW_CBCT" as const,
				entityType: "imaging",
				entityId: "img-1",
			};

			await auditFromRequest(mockRequest, payload);

			const events = await db
				.select()
				.from(clinicalAuditLogs)
				.where(eq(clinicalAuditLogs.organizationId, orgId))
				.orderBy(desc(clinicalAuditLogs.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].ipAddress, "10.0.0.5");
			assert.strictEqual(events[0].userAgent, "CustomApp/1.0");
		});
	});

	test("handles missing ip and user-agent", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const mockRequest = {
				headers: {},
			} as unknown as FastifyRequest;

			const payload = {
				organizationId: orgId,
				action: "GENERATE_PLAN_PDF" as const,
				entityType: "plan",
				entityId: "plan-1",
			};

			await auditFromRequest(mockRequest, payload);

			const events = await db
				.select()
				.from(clinicalAuditLogs)
				.where(eq(clinicalAuditLogs.organizationId, orgId))
				.orderBy(desc(clinicalAuditLogs.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].ipAddress, null);
			assert.strictEqual(events[0].userAgent, null);
		});
	});

	test("handles single ip in x-forwarded-for header without spaces", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const mockRequest = {
				headers: {
					"x-forwarded-for": "192.168.1.100",
				},
			} as unknown as FastifyRequest;

			const payload = {
				organizationId: orgId,
				action: "VIEW_AUDIT_LOG" as const,
				entityType: "audit",
				entityId: "audit-1",
			};

			await auditFromRequest(mockRequest, payload);

			const events = await db
				.select()
				.from(clinicalAuditLogs)
				.where(eq(clinicalAuditLogs.organizationId, orgId))
				.orderBy(desc(clinicalAuditLogs.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].ipAddress, "192.168.1.100");
		});
	});
});
