import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { defineTenantQuery } from "../core/routeFactories.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	PERMISSIONS,
	ROLES_IN_MATRIX,
	ROLE_PERMISSIONS,
	enforcePermissionWhenStaffKnown,
	permissionsForRole,
	roleHasPermission,
	roleHasPermissionWithOverrides,
} from "../security/permissions.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_ID = "01950000-0000-7000-8000-000000000101";
const USER_ID = "01950000-0000-7000-8000-000000000202";

describe("RBAC 12-Role Permission Matrix & Runtime .own Guard (6Г)", () => {
	it("covers all 12 canonical staff roles with explicit permissions and keeps owner omnipotent", () => {
		assert.equal(ROLES_IN_MATRIX.length >= 12, true, "Matrix must cover >=12 clinic roles");
		for (const role of ROLES_IN_MATRIX) {
			const perms = permissionsForRole(role);
			assert.ok(perms.length > 0, `Role ${role} must have defined permissions`);
		}
		for (const perm of PERMISSIONS) {
			assert.equal(roleHasPermission("owner", perm), true, `Owner must hold ${perm}`);
			assert.equal(
				roleHasPermissionWithOverrides("owner", perm, { owner: { [perm]: "none" } }),
				true,
				"Owner remains immune to restrictive roleMatrixOverrides",
			);
		}
	});

	it("withholds analytics.read (P&L) from admin by default while keeping schedule/patients access", () => {
		const adminPerms = ROLE_PERMISSIONS.admin ?? [];
		assert.equal(adminPerms.includes("analytics.read"), false, "admin must NOT have analytics.read by default");
		assert.equal(roleHasPermission("admin", "analytics.read"), false);
		assert.equal(roleHasPermission("administrator", "analytics.read"), false);
		assert.equal(roleHasPermission("registrar", "analytics.read"), false);
		assert.equal(roleHasPermission("admin", "schedule.write"), true);
		assert.equal(roleHasPermission("admin", "patients.write"), true);
	});

	it("resolves aliases and isolates payroll.read.own from full clinic payroll.read", () => {
		assert.equal(roleHasPermission("doctor", "payroll.read.own"), true);
		assert.equal(roleHasPermission("doctor", "payroll.read"), false);
		assert.equal(roleHasPermission("accountant", "payroll.read"), true);
		assert.equal(roleHasPermission("assistant", "schedule.write"), false);
		assert.equal(permissionsForRole("unknown_role_xyz").length, 0);
	});

	it("runtime route guard blocks unauthenticated or clinic-token-only requests on .own routes even with bypass flag", async () => {
		const prevBypass = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		const prevNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		const app = Fastify();
		app.get("/api/test/enforce-own", async (request, reply) => {
			if (!enforcePermissionWhenStaffKnown(request, reply, "payroll.read.own")) {
				return;
			}
			return reply.send({ ok: true });
		});

		try {
			const secret = authTokenSecret();
			const clinicToken = signToken({ role: "clinic", organizationId: ORG_ID }, secret);
			const doctorToken = signToken({ role: "doctor", organizationId: ORG_ID, userId: USER_ID }, secret);
			const registrarToken = signToken({ role: "registrar", organizationId: ORG_ID, userId: USER_ID }, secret);

			// 1. Clinic token WITHOUT staff token must be rejected 401 (never treated as staff on .own)
			const resClinicOnly = await app.inject({
				method: "GET",
				url: "/api/test/enforce-own",
				headers: { "x-dente-clinic-token": clinicToken },
			});
			assert.equal(resClinicOnly.statusCode, 401);

			// 2. Registrar lacks payroll.read.own -> 403 PermissionDenied
			const resRegistrar = await app.inject({
				method: "GET",
				url: "/api/test/enforce-own",
				headers: { "x-dente-clinic-token": clinicToken, "x-dente-staff-token": registrarToken },
			});
			assert.equal(resRegistrar.statusCode, 403);

			// 3. Doctor holds payroll.read.own -> 200 OK
			const resDoctor = await app.inject({
				method: "GET",
				url: "/api/test/enforce-own",
				headers: { "x-dente-clinic-token": clinicToken, "x-dente-staff-token": doctorToken },
			});
			assert.equal(resDoctor.statusCode, 200);
		} finally {
			await app.close();
			if (prevBypass === undefined) delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			else process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevBypass;
			if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = prevNodeEnv;
		}
	});
});
