/**
 * Роль в приглашении обязана быть настоящей ролью, иначе новый сотрудник
 * получает НЕ те права.
 *
 * Проверяется то, что было сломано: список ролей в форме приглашения был набран
 * руками и предлагал значение «admin», которого нет в `staffRoleSchema`. Сервер
 * роль не проверяет, а фильтр разделов по неизвестной роли отдаёт все разделы —
 * приглашённый администратор получал права владельца.
 */

import { staffRoleSchema } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getFilteredAppViews } from "../../workspaceShell";
import { staffRoleLabels } from "../../workspaceUiLabels";
import {
	CREATABLE_STAFF_ROLES,
	INVITABLE_STAFF_ROLES,
	inviteLinkForClipboard,
	inviteRoleTitle,
	parseInviteCreationPayload,
	parseStaffMutationPayload,
	staffRoleTitle,
} from "./settingsInviteRoles";

describe("роли, на которые можно пригласить", () => {
	test("каждая роль есть в схеме ролей", () => {
		for (const role of INVITABLE_STAFF_ROLES) {
			assert.doesNotThrow(
				() => staffRoleSchema.parse(role),
				`«${role}» не роль: сервер запишет её в учётную запись как есть`,
			);
		}
	});

	test("«admin» больше не предлагается: такой роли не существует", () => {
		assert.ok(!(INVITABLE_STAFF_ROLES as readonly string[]).includes("admin"));
		assert.throws(() => staffRoleSchema.parse("admin"));
	});

	test("ни одна роль системы не пропущена — иначе её нельзя пригласить", () => {
		const invitable = new Set<string>(INVITABLE_STAFF_ROLES);
		for (const role of staffRoleSchema.options) {
			assert.ok(invitable.has(role), `роль «${role}» пригласить нельзя`);
		}
	});

	test("у каждой роли есть подпись по-русски, без латиницы", () => {
		for (const role of INVITABLE_STAFF_ROLES) {
			const title = inviteRoleTitle(role);
			assert.ok(title && title.length > 0, `у «${role}» нет подписи`);
			assert.doesNotMatch(title, /[A-Za-z]/, `латиница в подписи «${title}»`);
			assert.equal(title, staffRoleLabels[role]);
		}
	});

	/**
	 * Тот самый шаг, который превращал опечатку в лишние права: фильтр разделов
	 * по неизвестной роли доходит до `return Array.from(appViews)`.
	 */
	test("роль вне схемы дала бы больше разделов, чем администратору", () => {
		const asAdministrator = getFilteredAppViews("administrator");
		const asUnknownRole = getFilteredAppViews("admin" as never);
		assert.ok(
			asUnknownRole.length > asAdministrator.length,
			"если это перестанет быть верным, объяснение в settingsInviteRoles.ts надо переписать, а не удалять проверку",
		);
		assert.ok(!asAdministrator.includes("visit"));
		assert.ok(asUnknownRole.includes("visit"));
	});
});

describe("роли, которые можно завести карточкой сотрудника", () => {
	test("каждая роль есть в схеме ролей", () => {
		for (const role of CREATABLE_STAFF_ROLES) {
			assert.doesNotThrow(() => staffRoleSchema.parse(role));
		}
	});

	test("владельца карточкой не заводят — только приглашением", () => {
		assert.ok(!(CREATABLE_STAFF_ROLES as readonly string[]).includes("owner"));
		assert.ok((INVITABLE_STAFF_ROLES as readonly string[]).includes("owner"));
	});

	test("остальные роли на месте: врач, ассистент, администратор, управляющий", () => {
		assert.deepEqual([...CREATABLE_STAFF_ROLES].sort(), [
			"administrator",
			"assistant",
			"doctor",
			"manager",
		]);
	});
});

describe("подпись должности сотрудника", () => {
	test("известная роль подписана по-русски", () => {
		assert.equal(staffRoleTitle("administrator"), "Администратор");
	});

	test("роль вне схемы не оставляет место должности пустым", () => {
		// Такие роли в базе есть: их создала форма приглашения, пока слала «admin».
		const title = staffRoleTitle("admin");
		assert.ok(title.length > 0);
		assert.match(title, /^Должность не распознана/);
		assert.ok(title.includes("admin"));
	});

	test("пустая роль тоже подписана", () => {
		assert.equal(staffRoleTitle(""), "Должность не указана");
	});
});

describe("ответ на изменение сотрудника", () => {
	test("успех без тела — успех", () => {
		assert.deepEqual(parseStaffMutationPayload(200, ""), { ok: true });
	});

	test("русский текст сервера сохраняется", () => {
		const outcome = parseStaffMutationPayload(
			500,
			'{"error":"InternalError","message":"Не удалось обновить доступы."}',
		);
		assert.equal(outcome.ok, false);
		assert.equal(
			outcome.ok === false && outcome.message,
			"Не удалось обновить доступы.",
		);
	});

	test("HTML от прокси не даёт английского исключения", () => {
		const outcome = parseStaffMutationPayload(502, "<html>Bad Gateway</html>");
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.message, null);
	});

	test("машинный код error наружу не берётся", () => {
		const outcome = parseStaffMutationPayload(400, '{"error":"SettingsValidationError"}');
		assert.equal(outcome.ok === false && outcome.message, null);
	});
});

describe("ответ на создание приглашения", () => {
	test("403 — отказ, и текст сервера сохраняется", () => {
		const outcome = parseInviteCreationPayload(
			403,
			'{"error":"Forbidden","message":"Нет прав на приглашение сотрудников."}',
		);
		assert.equal(outcome.ok, false);
		assert.equal(
			outcome.ok === false && outcome.message,
			"Нет прав на приглашение сотрудников.",
		);
	});

	test("HTML от прокси не роняет разбор и не даёт английского текста", () => {
		const outcome = parseInviteCreationPayload(502, "<html>Bad Gateway</html>");
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.message, null);
	});

	test("пустое тело на отказе — отказ без придуманной причины", () => {
		const outcome = parseInviteCreationPayload(500, "");
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.message, null);
	});

	test("успех без inviteLink — тоже отказ, иначе скопируют .../undefined", () => {
		const outcome = parseInviteCreationPayload(200, '{"ok":true}');
		assert.equal(outcome.ok, false);
	});

	test("успех с ссылкой разобран", () => {
		const outcome = parseInviteCreationPayload(
			200,
			'{"ok":true,"inviteLink":"/#/auth/accept-invite?token=abc"}',
		);
		assert.equal(outcome.ok, true);
		assert.equal(
			outcome.ok === true && outcome.inviteLink,
			"/#/auth/accept-invite?token=abc",
		);
	});

	test("полный адрес собирается из адреса клиники и пути сервера", () => {
		assert.equal(
			inviteLinkForClipboard(
				"https://clinic.example",
				"/#/auth/accept-invite?token=abc",
			),
			"https://clinic.example/#/auth/accept-invite?token=abc",
		);
	});
});
