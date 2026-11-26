import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { ROLE_PERMISSIONS } from "../security/permissionsModules/permissionMatrix.js";
import { requireExecutiveAccess } from "../routes/analytics/executiveAccessGuard.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("API 12-role Permission Matrix & Executive Access Guard", () => {
	it("grants analytics.read to accountant and denies analytics.read for reception roles", () => {
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
});
