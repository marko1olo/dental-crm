import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { organizations } from "../db/schema/auth.js";
import { ROLE_PERMISSIONS } from "../security/permissionsModules/permissionMatrix.js";
import { requireExecutiveAccess } from "../routes/analytics/executiveAccessGuard.js";
import { registerRevenueAndDebtReportsRoutes } from "../routes/reports/revenueAndDebtReportsRoutes.js";
import { cacheHeadersPlugin, clearAllCache } from "../plugins/cacheHeaders.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

describe("API 12-role Permission Matrix & Executive Access Guard", () => {
	it("grants analytics.read to accountant and denies analytics.read for reception roles", () => {
		assert.ok(ROLE_PERMISSIONS.accountant);
		assert.ok(ROLE_PERMISSIONS.senior_admin);
		assert.ok(ROLE_PERMISSIONS.administrator);
		assert.ok(ROLE_PERMISSIONS.registrar);
		assert.ok(ROLE_PERMISSIONS.accountant.includes("analytics.read"));
		assert.ok(!ROLE_PERMISSIONS.senior_admin.includes("analytics.read"));
		assert.ok(!ROLE_PERMISSIONS.administrator.includes("analytics.read"));
		assert.ok(!ROLE_PERMISSIONS.registrar.includes("analytics.read"));
	});

	it("allows accountant and rejects reception roles with 403 in requireExecutiveAccess", async () => {
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "test-only-synthetic-secret-32chars-min";
		const secret = authTokenSecret();
		const orgId = "01900000-0000-7000-8000-000000000001";
		const clinicToken = signToken({ organizationId: orgId, kind: "clinic" }, secret);

		const app = Fastify();
		app.get("/test-exec", async (request, reply) => {
			const ok = await requireExecutiveAccess(request, reply);
			if (!ok) return;
			return reply.send({ ok: true, organizationId: ok });
		});

		try {
			const accountantToken = signToken(
				{
					userId: "01900000-0000-7000-8000-000000000010",
					organizationId: orgId,
					role: "accountant",
					fullName: "Волкова Н. И.",
					kind: "staff",
				},
				secret,
			);
			const accountantRes = await app.inject({
				method: "GET",
				url: "/test-exec",
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: accountantToken,
				},
			});
			assert.equal(accountantRes.statusCode, 200);

			for (const receptionRole of ["administrator", "senior_admin", "registrar"]) {
				const receptionToken = signToken(
					{
						userId: "01900000-0000-7000-8000-000000000020",
						organizationId: orgId,
						role: receptionRole,
						fullName: "Смирнова А. П.",
						kind: "staff",
					},
					secret,
				);
				const deniedRes = await app.inject({
					method: "GET",
					url: "/test-exec",
					headers: {
						[CLINIC_TOKEN_HEADER]: clinicToken,
						[STAFF_TOKEN_HEADER]: receptionToken,
					},
				});
				assert.equal(deniedRes.statusCode, 403, `Expected 403 for role ${receptionRole}`);
			}
		} finally {
			await app.close();
		}
	});

	it("blocks admin and curator from executive financial reports (8n) while allowing doctor only in solo_doctor mode", async () => {
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "test-only-synthetic-secret-32chars-min";
		const secret = authTokenSecret();
		const orgId = fixtureUuid("execGuardSolo", 1);
		const multiOrgId = fixtureUuid("execGuardMulti", 2);
		const clinicToken = signToken({ organizationId: orgId, kind: "clinic" }, secret);
		const multiClinicToken = signToken({ organizationId: multiOrgId, kind: "clinic" }, secret);

		const app = Fastify();
		app.get("/test-exec", async (request, reply) => {
			const ok = await requireExecutiveAccess(request, reply);
			if (!ok) return;
			return reply.send({ ok: true, organizationId: ok });
		});
		await registerRevenueAndDebtReportsRoutes(app);

		let dbUp = true;
		try {
			await purgeFixtureOrganizations([orgId, multiOrgId]);
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Соло Клиника Тест",
					clinicMode: "solo_doctor",
				});
			});
			await withFixtureTenant(multiOrgId, async (tx) => {
				await tx.insert(organizations).values({
					id: multiOrgId,
					name: "Сеть Клиник Тест",
					clinicMode: "small_clinic",
				});
			});
		} catch (err) {
			if (!isDatabaseUnavailable(err)) throw err;
			dbUp = false;
		}

		try {
			for (const deniedRole of ["admin", "curator"]) {
				const token = signToken(
					{
						userId: "01900000-0000-7000-8000-000000000030",
						organizationId: orgId,
						role: deniedRole,
						fullName: "Тест Ограничения Прав",
						kind: "staff",
					},
					secret,
				);
				for (const path of ["/api/reports/revenue", "/api/reports/receivables"]) {
					const res = await app.inject({
						method: "GET",
						url: path,
						headers: {
							[CLINIC_TOKEN_HEADER]: clinicToken,
							[STAFF_TOKEN_HEADER]: token,
						},
					});
					assert.equal(res.statusCode, 403, `Expected 403 for ${deniedRole} on ${path}`);
				}
			}

			if (dbUp) {
				const soloDoctorToken = signToken(
					{
						userId: "01900000-0000-7000-8000-000000000040",
						organizationId: orgId,
						role: "doctor",
						fullName: "Соло Врач И. И.",
						kind: "staff",
					},
					secret,
				);
				const soloRes = await app.inject({
					method: "GET",
					url: "/test-exec",
					headers: {
						[CLINIC_TOKEN_HEADER]: clinicToken,
						[STAFF_TOKEN_HEADER]: soloDoctorToken,
					},
				});
				assert.equal(soloRes.statusCode, 200, "Expected 200 for doctor in solo_doctor clinicMode");

				const multiDoctorToken = signToken(
					{
						userId: "01900000-0000-7000-8000-000000000041",
						organizationId: multiOrgId,
						role: "doctor",
						fullName: "Врач Сети И. И.",
						kind: "staff",
					},
					secret,
				);
				const multiRes = await app.inject({
					method: "GET",
					url: "/test-exec",
					headers: {
						[CLINIC_TOKEN_HEADER]: multiClinicToken,
						[STAFF_TOKEN_HEADER]: multiDoctorToken,
					},
				});
				assert.equal(multiRes.statusCode, 403, "Expected 403 for doctor in small_clinic clinicMode");
			}
		} finally {
			if (dbUp) {
				try {
					await purgeFixtureOrganizations([orgId, multiOrgId]);
				} catch {
					// ignore cleanup errors if connection closed
				}
			}
			await app.close();
		}
	});

	it("isolates cacheHeadersPlugin ETag cache by user.role so owner never gets doctor cached entry", async () => {
		clearAllCache();
		const app = Fastify();
		app.addHook("onRequest", async (request) => {
			const role = request.headers["x-test-role"];
			if (typeof role === "string" && role.length > 0) {
				(request as typeof request & {
					user?: { userId: string; organizationId: string; role: string };
				}).user = {
					userId: "01900000-0000-7000-8000-000000000055",
					organizationId: "01900000-0000-7000-8000-000000000099",
					role,
				};
			}
		});
		await app.register(cacheHeadersPlugin);
		app.get("/api/nomenclature", async (request) => {
			const user = (request as typeof request & { user?: { role?: string } }).user;
			return { role: user?.role ?? "anon" };
		});

		try {
			const docRes = await app.inject({
				method: "GET",
				url: "/api/nomenclature",
				headers: {
					"x-organization-id": "01900000-0000-7000-8000-000000000099",
					"x-test-role": "doctor",
				},
			});
			assert.equal(docRes.statusCode, 200);
			assert.deepEqual(docRes.json(), { role: "doctor" });
			const docEtag = docRes.headers.etag;
			assert.equal(typeof docEtag, "string");

			const ownerRes = await app.inject({
				method: "GET",
				url: "/api/nomenclature",
				headers: {
					"x-organization-id": "01900000-0000-7000-8000-000000000099",
					"x-test-role": "owner",
					"if-none-match": String(docEtag),
				},
			});
			assert.equal(ownerRes.statusCode, 200);
			assert.deepEqual(ownerRes.json(), { role: "owner" });
		} finally {
			clearAllCache();
			await app.close();
		}
	});
});
