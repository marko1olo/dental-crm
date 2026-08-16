/**
 * PermissionPolicyService.test.ts — Тесты гранулированных прав доступа сотрудников клиники (RBAC / ACL Matrix).
 *
 * Feature #51 (FEATURES_REGISTRY.md): «Гранулированные права доступа сотрудников клиники (RBAC / ACL Matrix)».
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_ROLE_PERMISSIONS,
	GRANULAR_PERMISSIONS,
	GRANULAR_ROLES,
	PERMISSION_DESCRIPTIONS,
	PermissionPolicyService,
	ROLE_LABELS,
	getEffectivePermissions,
	getPermissionsForRole,
	hasAllPermissions,
	hasAnyPermission,
	hasPermission,
	isGranularPermission,
	isGranularRole,
	normalizeGranularRole,
	permissionPolicyService,
} from "./PermissionPolicyService.js";

describe("PermissionPolicyService — Constants & Definitions", () => {
	it("contains all 7 required granular permissions", () => {
		const expectedPermissions = [
			"clinical:sign_emr",
			"finance:view_revenue",
			"finance:refund_payments",
			"billing:view_payroll",
			"schedule:edit_others",
			"patients:export_pii",
			"settings:edit_clinic",
		] as const;

		assert.equal(GRANULAR_PERMISSIONS.length, 7);
		for (const perm of expectedPermissions) {
			assert.ok(
				GRANULAR_PERMISSIONS.includes(perm),
				`Разрешение ${perm} обязано присутствовать в GRANULAR_PERMISSIONS`,
			);
		}
	});

	it("contains all 7 core clinic staff roles", () => {
		const expectedRoles = [
			"owner",
			"admin",
			"chief_doctor",
			"doctor",
			"assistant",
			"receptionist",
			"accountant",
		] as const;

		assert.equal(GRANULAR_ROLES.length, 7);
		for (const role of expectedRoles) {
			assert.ok(
				GRANULAR_ROLES.includes(role),
				`Роль ${role} обязана присутствовать в GRANULAR_ROLES`,
			);
		}
	});

	it("provides comprehensive Russian descriptions and labels for all permissions and roles", () => {
		for (const perm of GRANULAR_PERMISSIONS) {
			const desc = PERMISSION_DESCRIPTIONS[perm];
			assert.ok(desc && desc.length > 5, `Описание для ${perm} должно быть заполнено`);
			assert.equal(PermissionPolicyService.getPermissionDescription(perm), desc);
		}

		for (const role of GRANULAR_ROLES) {
			const label = ROLE_LABELS[role];
			assert.ok(label && label.length > 2, `Метка для роли ${role} должна быть заполнена`);
			assert.equal(PermissionPolicyService.getRoleLabel(role), label);
		}
	});

	it("isGranularPermission and isGranularRole validate types correctly", () => {
		assert.equal(isGranularPermission("clinical:sign_emr"), true);
		assert.equal(isGranularPermission("settings:edit_clinic"), true);
		assert.equal(isGranularPermission("invalid:perm"), false);
		assert.equal(isGranularPermission(null), false);
		assert.equal(isGranularPermission(123), false);

		assert.equal(isGranularRole("chief_doctor"), true);
		assert.equal(isGranularRole("accountant"), true);
		assert.equal(isGranularRole("invalid_role"), false);
		assert.equal(isGranularRole(undefined), false);
	});
});

describe("PermissionPolicyService — Default Role ACL Matrix", () => {
	it("owner has all granular permissions", () => {
		const perms = getPermissionsForRole("owner");
		for (const perm of GRANULAR_PERMISSIONS) {
			assert.ok(perms.includes(perm), `owner обязан обладать ${perm}`);
			assert.equal(hasPermission("owner", null, perm), true);
		}
	});

	it("admin has all granular permissions", () => {
		const perms = getPermissionsForRole("admin");
		for (const perm of GRANULAR_PERMISSIONS) {
			assert.ok(perms.includes(perm), `admin обязан обладать ${perm}`);
			assert.equal(hasPermission("admin", null, perm), true);
		}
	});

	it("chief_doctor has clinical:sign_emr, schedule:edit_others, billing:view_payroll, patients:export_pii", () => {
		const perms = getPermissionsForRole("chief_doctor");
		assert.equal(perms.includes("clinical:sign_emr"), true);
		assert.equal(perms.includes("schedule:edit_others"), true);
		assert.equal(perms.includes("billing:view_payroll"), true);
		assert.equal(perms.includes("patients:export_pii"), true);

		// chief_doctor не имеет права менять настройки клиники по умолчанию
		assert.equal(perms.includes("settings:edit_clinic"), false);
		assert.equal(hasPermission("chief_doctor", null, "settings:edit_clinic"), false);
		assert.equal(hasPermission("chief_doctor", null, "clinical:sign_emr"), true);
	});

	it("doctor has only clinical:sign_emr by default", () => {
		const perms = getPermissionsForRole("doctor");
		assert.deepEqual(perms, ["clinical:sign_emr"]);

		assert.equal(hasPermission("doctor", null, "clinical:sign_emr"), true);
		assert.equal(hasPermission("doctor", null, "finance:view_revenue"), false);
		assert.equal(hasPermission("doctor", null, "finance:refund_payments"), false);
		assert.equal(hasPermission("doctor", null, "billing:view_payroll"), false);
		assert.equal(hasPermission("doctor", null, "schedule:edit_others"), false);
		assert.equal(hasPermission("doctor", null, "patients:export_pii"), false);
		assert.equal(hasPermission("doctor", null, "settings:edit_clinic"), false);
	});

	it("assistant has no critical permissions by default", () => {
		const perms = getPermissionsForRole("assistant");
		assert.deepEqual(perms, []);

		for (const perm of GRANULAR_PERMISSIONS) {
			assert.equal(hasPermission("assistant", null, perm), false);
		}
	});

	it("receptionist has schedule:edit_others by default", () => {
		const perms = getPermissionsForRole("receptionist");
		assert.deepEqual(perms, ["schedule:edit_others"]);

		assert.equal(hasPermission("receptionist", null, "schedule:edit_others"), true);
		assert.equal(hasPermission("receptionist", null, "clinical:sign_emr"), false);
		assert.equal(hasPermission("receptionist", null, "finance:view_revenue"), false);
		assert.equal(hasPermission("receptionist", null, "patients:export_pii"), false);
		assert.equal(hasPermission("receptionist", null, "settings:edit_clinic"), false);
	});

	it("accountant has finance:view_revenue, finance:refund_payments, billing:view_payroll", () => {
		const perms = getPermissionsForRole("accountant");
		assert.deepEqual(Array.from(perms).sort(), [
			"billing:view_payroll",
			"finance:refund_payments",
			"finance:view_revenue",
		]);

		assert.equal(hasPermission("accountant", null, "finance:view_revenue"), true);
		assert.equal(hasPermission("accountant", null, "finance:refund_payments"), true);
		assert.equal(hasPermission("accountant", null, "billing:view_payroll"), true);
		assert.equal(hasPermission("accountant", null, "clinical:sign_emr"), false);
		assert.equal(hasPermission("accountant", null, "schedule:edit_others"), false);
		assert.equal(hasPermission("accountant", null, "patients:export_pii"), false);
		assert.equal(hasPermission("accountant", null, "settings:edit_clinic"), false);
	});
});

describe("PermissionPolicyService — Custom Permissions Overrides", () => {
	it("expands permissions with array-based custom permissions", () => {
		// Врач получает дополнительное право экспорта ПДн
		const custom = ["patients:export_pii", "finance:view_revenue"];
		assert.equal(hasPermission("doctor", custom, "clinical:sign_emr"), true);
		assert.equal(hasPermission("doctor", custom, "patients:export_pii"), true);
		assert.equal(hasPermission("doctor", custom, "finance:view_revenue"), true);
		assert.equal(hasPermission("doctor", custom, "settings:edit_clinic"), false);

		// Ассистент с выданным правом редактирования расписания
		assert.equal(hasPermission("assistant", ["schedule:edit_others"], "schedule:edit_others"), true);
		assert.equal(hasPermission("assistant", ["schedule:edit_others"], "clinical:sign_emr"), false);
	});

	it("expands permissions with Set-based custom permissions", () => {
		const customSet = new Set(["settings:edit_clinic"]);
		assert.equal(hasPermission("receptionist", customSet, "settings:edit_clinic"), true);
		assert.equal(hasPermission("receptionist", customSet, "schedule:edit_others"), true);
		assert.equal(hasPermission("receptionist", customSet, "clinical:sign_emr"), false);
	});

	it("handles object map overrides (grant true, explicit revoke false)", () => {
		// Врачу разрешили просмотр выручки, но заблокировали подписание ЭМК
		const doctorOverrides = {
			"finance:view_revenue": true,
			"clinical:sign_emr": false,
		};

		assert.equal(hasPermission("doctor", doctorOverrides, "finance:view_revenue"), true);
		assert.equal(hasPermission("doctor", doctorOverrides, "clinical:sign_emr"), false); // Explicit deny
		assert.equal(hasPermission("doctor", doctorOverrides, "settings:edit_clinic"), false);

		// Владельцу отключили экспорт ПДн
		const ownerOverrides = {
			"patients:export_pii": false,
		};
		assert.equal(hasPermission("owner", ownerOverrides, "patients:export_pii"), false);
		assert.equal(hasPermission("owner", ownerOverrides, "settings:edit_clinic"), true);
	});

	it("getEffectivePermissions computes full merged set", () => {
		const effective = getEffectivePermissions("doctor", ["patients:export_pii", "finance:view_revenue"]);
		assert.deepEqual(effective.sort(), [
			"clinical:sign_emr",
			"finance:view_revenue",
			"patients:export_pii",
		]);

		const effectiveWithRevoke = getEffectivePermissions("owner", {
			"settings:edit_clinic": false,
		});
		assert.equal(effectiveWithRevoke.includes("settings:edit_clinic"), false);
		assert.equal(effectiveWithRevoke.includes("clinical:sign_emr"), true);
		assert.equal(effectiveWithRevoke.length, GRANULAR_PERMISSIONS.length - 1);
	});
});

describe("PermissionPolicyService — Security Edge Cases & Fail-Closed", () => {
	it("fails closed for unknown or empty roles when no custom permissions grant it", () => {
		assert.equal(hasPermission("guest", null, "clinical:sign_emr"), false);
		assert.equal(hasPermission("intern", null, "schedule:edit_others"), false);
		assert.equal(hasPermission("", null, "clinical:sign_emr"), false);
		assert.equal(hasPermission(null, null, "clinical:sign_emr"), false);
		assert.equal(hasPermission(undefined, null, "clinical:sign_emr"), false);
	});

	it("allows custom permission for unknown role if explicitly granted", () => {
		assert.equal(hasPermission("custom_staff", ["clinical:sign_emr"], "clinical:sign_emr"), true);
		assert.equal(hasPermission("custom_staff", ["clinical:sign_emr"], "settings:edit_clinic"), false);
	});

	it("handles case-insensitive roles and whitespace gracefully", () => {
		assert.equal(hasPermission("  DOCTOR  ", null, "clinical:sign_emr"), true);
		assert.equal(hasPermission("Chief_Doctor", null, "billing:view_payroll"), true);
		assert.equal(hasPermission("OwNeR", null, "settings:edit_clinic"), true);
		assert.equal(hasPermission("ACCOUNTANT", null, "finance:view_revenue"), true);
	});

	it("resolves role aliases properly", () => {
		assert.equal(normalizeGranularRole("administrator"), "receptionist");
		assert.equal(hasPermission("administrator", null, "schedule:edit_others"), true);

		assert.equal(normalizeGranularRole("head_doctor"), "chief_doctor");
		assert.equal(hasPermission("head_doctor", null, "billing:view_payroll"), true);

		assert.equal(normalizeGranularRole("nurse"), "assistant");
		assert.equal(normalizeGranularRole("bookkeeper"), "accountant");
		assert.equal(hasPermission("bookkeeper", null, "finance:refund_payments"), true);
	});

	it("rejects empty or invalid requiredPermission", () => {
		assert.equal(hasPermission("owner", null, ""), false);
		// @ts-expect-error test null permission
		assert.equal(hasPermission("owner", null, null), false);
		// @ts-expect-error test undefined permission
		assert.equal(hasPermission("owner", null, undefined), false);
	});
});

describe("PermissionPolicyService — Multi-Permission Check Helpers", () => {
	it("hasAnyPermission checks OR logic correctly", () => {
		assert.equal(
			hasAnyPermission("doctor", null, ["finance:view_revenue", "clinical:sign_emr"]),
			true,
		);
		assert.equal(
			hasAnyPermission("doctor", null, ["finance:view_revenue", "settings:edit_clinic"]),
			false,
		);
		assert.equal(hasAnyPermission("doctor", null, []), false);
	});

	it("hasAllPermissions checks AND logic correctly", () => {
		assert.equal(
			hasAllPermissions("owner", null, ["clinical:sign_emr", "settings:edit_clinic", "finance:view_revenue"]),
			true,
		);
		assert.equal(
			hasAllPermissions("chief_doctor", null, ["clinical:sign_emr", "settings:edit_clinic"]),
			false,
		);
		assert.equal(
			hasAllPermissions("chief_doctor", null, ["clinical:sign_emr", "schedule:edit_others"]),
			true,
		);
		assert.equal(hasAllPermissions("owner", null, []), false);
	});

	it("static and instance methods behave identically", () => {
		assert.equal(
			PermissionPolicyService.hasPermission("doctor", null, "clinical:sign_emr"),
			permissionPolicyService.hasPermission("doctor", null, "clinical:sign_emr"),
		);
		assert.deepEqual(
			PermissionPolicyService.getEffectivePermissions("accountant"),
			permissionPolicyService.getEffectivePermissions("accountant"),
		);
	});
});
