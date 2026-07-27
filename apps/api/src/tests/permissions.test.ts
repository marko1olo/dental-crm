import assert from "node:assert/strict";
import test from "node:test";
import {
	PERMISSIONS,
	permissionsForRole,
	roleHasPermission,
} from "../security/permissions.js";

/**
 * До появления этого модуля чтение и запись охранялись ОДНИМ статическим
 * секретом (accessGuard.ts: configuredClinicalMutationSecret просто вызывает
 * configuredClinicalAccessSecret). Кто мог посмотреть расписание, тот мог
 * провести оплату и переписать историю болезни. Тесты закрепляют разделение.
 */

test("неизвестная роль не получает прав (fail closed)", () => {
	assert.deepEqual(permissionsForRole("hacker"), []);
	assert.deepEqual(permissionsForRole(null), []);
	assert.deepEqual(permissionsForRole(undefined), []);
	assert.deepEqual(permissionsForRole(""), []);
});

test("владелец клиники может всё", () => {
	for (const permission of PERMISSIONS) {
		assert.equal(
			roleHasPermission("owner", permission),
			true,
			`owner должен иметь ${permission}`,
		);
	}
});

test("врач не допущен к кассе и настройкам", () => {
	assert.equal(roleHasPermission("doctor", "clinical.write"), true);
	assert.equal(roleHasPermission("doctor", "finance.write"), false);
	assert.equal(roleHasPermission("doctor", "finance.read"), false);
	assert.equal(roleHasPermission("doctor", "settings.write"), false);
});

test("администратор ресепшена не правит медицинскую документацию", () => {
	assert.equal(roleHasPermission("administrator", "clinical.read"), true);
	assert.equal(roleHasPermission("administrator", "clinical.write"), false);
	assert.equal(roleHasPermission("administrator", "finance.write"), true);
	assert.equal(roleHasPermission("administrator", "settings.write"), false);
});

test("ассистент ничего не решает", () => {
	assert.equal(roleHasPermission("assistant", "inventory.write"), true);
	assert.equal(roleHasPermission("assistant", "schedule.write"), false);
	assert.equal(roleHasPermission("assistant", "clinical.write"), false);
	assert.equal(roleHasPermission("assistant", "finance.write"), false);
});

test("в ЕГИСЗ отправляет врач и владелец, но не ресепшен", () => {
	assert.equal(roleHasPermission("doctor", "egisz.submit"), true);
	assert.equal(roleHasPermission("owner", "egisz.submit"), true);
	assert.equal(roleHasPermission("administrator", "egisz.submit"), false);
	assert.equal(roleHasPermission("assistant", "egisz.submit"), false);
});

test("регистр роли не влияет на решение", () => {
	assert.equal(roleHasPermission("OWNER", "finance.write"), true);
	assert.equal(roleHasPermission("Doctor", "clinical.write"), true);
});

test("ни одна роль кроме владельца и админа не пишет настройки", () => {
	const writers = ["owner", "admin", "manager", "administrator", "doctor", "assistant"].filter(
		(role) => roleHasPermission(role, "settings.write"),
	);
	assert.deepEqual(writers, ["owner", "admin"]);
});

test("право на запись всегда подразумевает право на чтение того же раздела", () => {
	const roles = ["owner", "admin", "manager", "administrator", "doctor", "assistant"];
	for (const role of roles) {
		for (const permission of permissionsForRole(role)) {
			if (!permission.endsWith(".write")) continue;
			const readPermission = permission.replace(/\.write$/, ".read");
			assert.equal(
				roleHasPermission(role, readPermission as (typeof PERMISSIONS)[number]),
				true,
				`${role} имеет ${permission}, но не ${readPermission} — редактировать вслепую нельзя`,
			);
		}
	}
});
