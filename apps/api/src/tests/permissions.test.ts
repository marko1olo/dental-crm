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

/**
 * ПРАВО, РАЗДЕЛЯЮЩЕЕ ЛЮДЕЙ ВНУТРИ КЛИНИКИ, НЕЛЬЗЯ ОХРАНЯТЬ МЯГКО.
 *
 * В модуле есть два режима. requirePermission требует опознанного сотрудника и
 * отказывает, если личности нет. enforcePermissionWhenStaffKnown проверяет право
 * ТОЛЬКО когда сотрудник опознан, а при неопознанном ПРОПУСКАЕТ запрос
 * (permissions.ts, «Мягкий режим»). Мягкий режим введён осознанно и с причиной:
 * часть рабочих процессов идёт под токеном кабинета без входа конкретного
 * сотрудника, и жёсткое требование личности сразу везде их бы сломало.
 *
 * НО у мягкого режима есть граница, и она не в удобстве, а в смысле права.
 *
 * — Право ОГРАНИЧИВАЕТ ДЕЙСТВИЕ («ассистент не меняет настройки», «врач не
 *   проводит оплату»). Здесь мягкий режим безопасен: в худшем случае неопознанный
 *   оператор сделает то, что и так может сделать любой владелец токена кабинета.
 * — Право РАЗДЕЛЯЕТ ДАННЫЕ МЕЖДУ ЛЮДЬМИ одной клиники (зарплата этого врача, а не
 *   всех). Здесь мягкий режим отменяет само право: чтобы увидеть чужое, достаточно
 *   НЕ присылать токен сотрудника — личности нет, значит проверять нечего.
 *   Ограничение становится добровольным.
 *
 * Отсюда правило: право с суффиксом `.own` обязано охраняться жёстко. Маршрут
 * выплат так и сделан (routes/billing.ts, requirePayoutAccess: обязателен
 * опознанный сотрудник, иначе 401), и проверка закрепляет это на будущее — чтобы
 * следующий, кто добавит право вида `<раздел>.read.own`, не потянулся к мягкому
 * режиму по образцу соседней строки.
 *
 * Проверка читает исходники маршрутов, а не отдельный список: список разошёлся бы
 * с кодом на первой же новой строке, и тогда охранял бы себя, а не клинику.
 */
test("права с суффиксом .own не охраняются мягким режимом ни на одном маршруте", async () => {
	const { readdir, readFile } = await import("node:fs/promises");
	const path = await import("node:path");

	const ownPermissions = PERMISSIONS.filter((permission) => permission.endsWith(".own"));
	assert.ok(
		ownPermissions.length > 0,
		"В наборе прав нет ни одного `.own` — проверка потеряла смысл, а не прошла",
	);

	const routesDir = path.join(import.meta.dirname, "..", "routes");
	async function collectSources(directory: string): Promise<string[]> {
		const entries = await readdir(directory, { withFileTypes: true });
		const files: string[] = [];
		for (const entry of entries) {
			const full = path.join(directory, entry.name);
			if (entry.isDirectory()) files.push(...(await collectSources(full)));
			else if (entry.name.endsWith(".ts")) files.push(full);
		}
		return files;
	}

	const sources = await collectSources(routesDir);
	assert.ok(sources.length > 10, `Маршрутов найдено ${sources.length} — путь к каталогу неверен`);

	function scanFor(text: string, file: string, wanted: readonly string[]): string[] {
		const hits: string[] = [];
		text.split(/\r?\n/).forEach((line, index) => {
			if (!line.includes("enforcePermissionWhenStaffKnown")) return;
			for (const permission of wanted) {
				if (line.includes(`"${permission}"`) || line.includes(`'${permission}'`)) {
					hits.push(`${path.relative(routesDir, file)}:${index + 1} — ${permission}`);
				}
			}
		});
		return hits;
	}

	/*
	 * Самопроверка сканера. Без неё «нарушений нет» означало бы что угодно: и что
	 * правило соблюдено, и что сканер разучился читать строки — например после
	 * переименования функции или перехода вызовов на другую форму записи. Поэтому
	 * тем же сканером ищется право, которое в мягком режиме ТОЧНО используется
	 * (communications.read стоит так в routes/communicationsOutbox.ts), и оно
	 * обязано найтись. Не нашлось — падает сканер, а не правило, и сообщение
	 * говорит именно это. Проверка, которая не умеет покраснеть, ничего не охраняет.
	 */
	const violations: string[] = [];
	let softModeSightings = 0;
	for (const file of sources) {
		const text = await readFile(file, "utf8");
		violations.push(...scanFor(text, file, ownPermissions));
		softModeSightings += scanFor(text, file, ["communications.read"]).length;
	}
	assert.ok(
		softModeSightings > 0,
		"Сканер не нашёл ни одного заведомо существующего мягкого вызова с communications.read. " +
			"Это поломка самой проверки, а не соблюдение правила: результату «нарушений нет» верить нельзя.",
	);

	assert.deepEqual(
		violations,
		[],
		"Право вида `.own` разделяет данные между сотрудниками одной клиники, поэтому " +
			"мягкий режим его отменяет: достаточно не присылать токен сотрудника. " +
			"Используйте requirePermission или собственную жёсткую проверку. Нарушения: " +
			violations.join("; "),
	);
});
