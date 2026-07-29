import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { requireNonDoctorAccess } from "../../accessGuard.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	enforcePermissionWhenStaffKnown,
	PERMISSIONS,
	type Permission,
	permissionRefusalMessage,
	ROLES_IN_MATRIX,
	requirePermission,
	roleHasPermission,
	roleLabelsWithPermission,
} from "../../security/permissions.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ОТКАЗ ПО РОЛИ — САМАЯ ЧАСТАЯ НАДПИСЬ ОТКАЗА В ПРОДУКТЕ, И ОНА НЕ ДОХОДИЛА ДО
 * ЭКРАНА ВОВСЕ.
 *
 * ЧТО БЫЛО. `security/permissions.ts` отвечал
 * `Роль «doctor» не имеет права «finance.write».`, а `accessGuard.ts` —
 * `Доктора не могут выполнять это действие: non-doctor mutation`. Оба текста
 * называют внутренние идентификаторы (`users.role`, ключ права, машинную метку
 * участка) вместо причины и следующего шага.
 *
 * Хуже другое. В клиенте стоит фильтр `technicalWorkflowFailurePattern`
 * (`apps/web/src/AppHelpers.tsx`) с правилом `[A-Z][A-Z0-9_]{5,}` под флагом
 * `/i` — то есть «любое латинское слово из шести и более букв». `doctor`,
 * `finance`, `assistant`, `mutation` попадают под него, и фильтр гасит фразу
 * ЦЕЛИКОМ. Человек получал подсказку по коду 403: «войдите в смену заново».
 * Повторный вход роли не меняет и прав не добавляет — это ложное указание, а не
 * безликий текст. Замерено запросом в процессе до правки: `ФИЛЬТР ПРОПУСТИЛ:
 * null` во всех семи проверенных сценариях.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. В тексте отказа нет ни одной латинской буквы — значит правило фильтра на
 *     латинские идентификаторы его не убьёт, и ключ базы на экран не вернётся.
 *  2. Текст проходит НАСТОЯЩИЙ фильтр клиента. Регулярка не скопирована сюда, а
 *     прочитана из `AppHelpers.tsx` на прогоне: копия разошлась бы с оригиналом
 *     и охраняла бы себя, а не клинику.
 *  3. Подсказка «кого просить» выведена из матрицы прав, а не написана рядом с
 *     ней вторым списком.
 *  4. У каждой роли матрицы есть русская подпись, у каждого права — русское
 *     название действия.
 *  5. Тело ответа 403 действительно несёт этот текст — на всех трёх охранах.
 */

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

/** Любая латиница. Именно она гасит фразу фильтром клиента. */
const LATIN = /[A-Za-z]/;

/**
 * Живой фильтр клиента, прочитанный из его файла.
 *
 * Если объявление переехало или переименовано, тест ПАДАЕТ с этой причиной, а не
 * пропускает проверку молча: «фильтр не найден» и «фильтр пропустил текст» —
 * разные исходы, и путать их нельзя.
 */
function loadClientFailurePattern(): RegExp {
	const file = path.resolve(
		import.meta.dirname,
		"..",
		"..",
		"..",
		"..",
		"web",
		"src",
		"AppHelpers.tsx",
	);
	const source = readFileSync(file, "utf8");
	const declaration =
		/export const technicalWorkflowFailurePattern\s*=\s*(\/.*\/[a-z]*);/s.exec(
			source,
		);
	assert.ok(
		declaration?.[1],
		`В ${file} не найдено объявление technicalWorkflowFailurePattern. ` +
			"Тест не имеет права угадывать фильтр клиента: обновите разбор объявления.",
	);
	const literal = declaration[1] as string;
	const lastSlash = literal.lastIndexOf("/");
	return new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));
}

/** Дословный клиентский отбор из AppHelpers.tsx (operatorReadableErrorDetail). */
function clientKeepsMessage(pattern: RegExp, message: string): boolean {
	if (!message.trim()) return false;
	if (!/[А-Яа-яЁё]/.test(message)) return false;
	return !pattern.test(message);
}

function missingPermissionsFor(role: string): Permission[] {
	return PERMISSIONS.filter(
		(permission) => !roleHasPermission(role, permission),
	);
}

describe("текст отказа по роли доходит до человека и называет следующий шаг", () => {
	test("самопроверка: фильтр клиента найден и он ДЕЙСТВИТЕЛЬНО гасит старый текст", () => {
		const pattern = loadClientFailurePattern();
		assert.equal(
			clientKeepsMessage(
				pattern,
				"Роль «doctor» не имеет права «finance.write».",
			),
			false,
			"Фильтр клиента пропустил прежний текст с ключами базы. Значит прочитанная регулярка " +
				"не та, что стоит в AppHelpers.tsx, и проверки ниже ничего не доказывают.",
		);
		assert.equal(
			clientKeepsMessage(
				pattern,
				"Доктора не могут выполнять это действие: non-doctor mutation",
			),
			false,
			"Фильтр клиента пропустил прежний текст accessGuard с машинной меткой участка — разбор регулярки сломан.",
		);
		assert.equal(
			clientKeepsMessage(pattern, "Врач не может проводить оплаты и возвраты."),
			true,
			"Фильтр гасит даже чистую русскую фразу — правило фильтра ужесточили, и ни один серверный текст до экрана больше не дойдёт.",
		);
	});

	test("ни в одном отказе нет латиницы, ключа роли и ключа права", () => {
		const pattern = loadClientFailurePattern();
		let checked = 0;
		for (const role of ROLES_IN_MATRIX) {
			for (const permission of missingPermissionsFor(role)) {
				const message = permissionRefusalMessage(role, permission);
				checked += 1;
				assert.ok(
					!LATIN.test(message),
					`Отказ роли «${role}» на праве «${permission}» содержит латиницу: ${message}`,
				);
				assert.ok(
					!message.includes(role) && !message.includes(permission),
					`Отказ называет внутренний идентификатор вместо причины: ${message}`,
				);
				assert.ok(
					clientKeepsMessage(pattern, message),
					`Фильтр клиента гасит отказ роли «${role}» на праве «${permission}» — до экрана он не дойдёт: ${message}`,
				);
			}
		}
		assert.ok(
			checked > 20,
			`Проверено всего ${checked} отказов: матрица прав или список ролей опустели, и тест охраняет пустоту`,
		);
	});

	test("отказ называет причину и следующий шаг, а не только факт", () => {
		const message = permissionRefusalMessage("assistant", "finance.write");
		assert.match(
			message,
			/^Ассистент не может проводить оплаты и возвраты\./,
			`причина не названа первой: ${message}`,
		);
		assert.match(
			message,
			/Это могут /,
			`в отказе нет ни слова о том, кого просить: ${message}`,
		);
		assert.match(
			message,
			/Попросите/,
			`в отказе нет следующего шага: ${message}`,
		);
	});

	test("у каждой роли матрицы есть русская подпись, у каждого права — русское действие", () => {
		for (const role of ROLES_IN_MATRIX) {
			const missing = missingPermissionsFor(role);
			if (missing.length === 0) continue; // owner и admin: отказывать нечем.
			const message = permissionRefusalMessage(role, missing[0] as Permission);
			assert.ok(
				!/роль в клинике не настроена/.test(message),
				`Роль «${role}» есть в матрице, но подписи у неё нет — отказ выдаёт её за ненастроенную: ${message}`,
			);
		}
		for (const permission of PERMISSIONS) {
			// Ассистент — самая ограниченная роль; для прав, которые у него есть,
			// берём врача. Одна из двух ролей обязана права не иметь, иначе право
			// выдано всем и отказа по нему не бывает.
			const role = roleHasPermission("assistant", permission)
				? "doctor"
				: "assistant";
			if (roleHasPermission(role, permission)) continue;
			const message = permissionRefusalMessage(role, permission);
			assert.ok(
				!/undefined/.test(message),
				`У права «${permission}» нет русского названия действия: ${message}`,
			);
		}
	});

	test("подсказка «кого просить» выведена из матрицы, а не написана рядом с ней", () => {
		/*
		 * Проверка независима от реализации: список ролей, которым право выдано,
		 * собирается здесь заново через roleHasPermission, и его РАЗМЕР обязан
		 * совпасть с числом подписей. Захардкоженный список разойдётся на первом
		 * же изменении матрицы, и тест это увидит.
		 *
		 * Легаси-написание `admin` в подсказку не попадает намеренно: такой
		 * должности нет в staffRoleSchema, экран приглашения её не предлагает
		 * (routes/auth.ts, tests/routes/inviteRoleGuard.test.ts), и отправлять
		 * человека к сотруднику, которого в его клинике не бывает, нельзя.
		 */
		const assignable = ROLES_IN_MATRIX.filter((role) => role !== "admin");
		for (const permission of PERMISSIONS) {
			const expected = assignable.filter((role) =>
				roleHasPermission(role, permission),
			);
			const labels = roleLabelsWithPermission(permission);
			assert.equal(
				labels.length,
				expected.length,
				`У права «${permission}» подписей ${labels.length}, а в матрице его имеют ${expected.length} назначаемых ролей: ${labels.join(", ")}`,
			);
			assert.ok(
				!labels.some((label) => LATIN.test(label)),
				`Среди подписей ролей есть латиница: ${labels.join(", ")}`,
			);
		}
	});

	test("роль вне матрицы получает СВОЙ отказ: её нужно настроить, а не искать коллегу", () => {
		const message = permissionRefusalMessage("curator", "finance.write");
		assert.match(
			message,
			/роль в клинике не настроена/,
			`отказ не отличает ненастроенную роль: ${message}`,
		);
		assert.ok(
			!LATIN.test(message),
			`отказ ненастроенной роли протащил её ключ на экран: ${message}`,
		);
		assert.match(
			message,
			/Попросите владельца клиники выбрать вам роль/,
			`нет следующего шага: ${message}`,
		);
	});
});

/**
 * ЧЕТВЁРТОЙ КОПИИ БЫТЬ НЕ ДОЛЖНО.
 *
 * Дефект жил в трёх местах сразу: две охраны в `security/permissions.ts` и своя
 * формулировка в `routes/billing.ts`. Копия появляется одинаково — кто-то пишет
 * `message: \`Роль «${identity.role}» …\`` рядом с проверкой права, потому что так
 * короче. Проверка читает исходники, а не список файлов: список разошёлся бы с
 * кодом на первом же новом маршруте.
 */
describe("ключ роли и ключ права не подставляются в текст для человека", () => {
	const OFFENDING_MESSAGE = /message[^\n]*\$\{[^}]*\b(role|permission)\b/;

	function scanLines(lines: readonly string[]): number[] {
		const hits: number[] = [];
		lines.forEach((line, index) => {
			const trimmed = line.trim();
			// Комментарии описывают дефект намеренно — они не отправляются клиенту.
			if (
				trimmed.startsWith("*") ||
				trimmed.startsWith("//") ||
				trimmed.startsWith("/*")
			)
				return;
			if (OFFENDING_MESSAGE.test(line)) hits.push(index + 1);
		});
		return hits;
	}

	test("самопроверка сканера: прежние строки он находит", () => {
		/*
		 * Образцы прежнего дефекта — ОБЫЧНЫЕ строки, а не шаблонные, и это не
		 * оплошность: сканеру подаётся исходный текст, каким он лежит в файле.
		 * Подстановка здесь превратила бы образец в пустое место и проверка
		 * перестала бы что-либо доказывать.
		 */
		const hits = scanLines([
			// biome-ignore lint/suspicious/noTemplateCurlyInString: образец исходного текста, подстановка здесь недопустима
			"			message: `Роль «${identity.role}» не имеет права «${permission}».`,",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: образец исходного текста, подстановка здесь недопустима
			"    message: `Роль «${identity.role}» не видит выплаты врачам.`",
			"			message: permissionRefusalMessage(identity.role, permission),",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: образец исходного текста, подстановка здесь недопустима
			"	 * message: `Роль «${identity.role}» …` — так было раньше",
		]);
		assert.deepEqual(
			hits,
			[1, 2],
			"Сканер должен находить обе прежние формулировки и не трогать ни вызов построителя, ни комментарий. " +
				`Найдено: ${hits.join(", ")}`,
		);
	});

	test("в живом дереве таких подстановок нет", async () => {
		const { readdir, readFile } = await import("node:fs/promises");
		const roots = [
			path.join(import.meta.dirname, "..", "..", "routes"),
			path.join(import.meta.dirname, "..", "..", "security"),
		];

		async function collect(directory: string): Promise<string[]> {
			const entries = await readdir(directory, { withFileTypes: true });
			const files: string[] = [];
			for (const entry of entries) {
				const full = path.join(directory, entry.name);
				if (entry.isDirectory()) files.push(...(await collect(full)));
				else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
					files.push(full);
			}
			return files;
		}

		const files = (await Promise.all(roots.map(collect))).flat();
		assert.ok(
			files.length > 30,
			`Файлов найдено ${files.length} — путь к каталогам неверен, сканер смотрит в пустоту`,
		);

		const violations: string[] = [];
		for (const file of files) {
			const text = await readFile(file, "utf8");
			for (const line of scanLines(text.split(/\r?\n/))) {
				violations.push(`${path.basename(file)}:${line}`);
			}
		}
		assert.deepEqual(
			violations,
			[],
			"Ключ роли или ключ права снова подставлен в текст для человека. Такой текст фильтр клиента " +
				"гасит целиком, и человек получает подсказку по коду ответа вместо причины. " +
				`Используйте permissionRefusalMessage. Места: ${violations.join(", ")}`,
		);
	});
});

describe("тело ответа 403 действительно несёт этот текст", () => {
	async function refusalBody(
		mount: (app: FastifyInstance) => void,
		role: string,
	): Promise<{ statusCode: number; body: Record<string, unknown> }> {
		const app = Fastify({ logger: false });
		mount(app);
		const secret = authTokenSecret();
		const response = await app.inject({
			method: "POST",
			url: "/probe",
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: ORG }, secret),
				"x-dente-staff-token": signToken(
					{ organizationId: ORG, userId: USER, role },
					secret,
				),
				"content-type": "application/json",
			},
			payload: {},
		});
		await app.close();
		return {
			statusCode: response.statusCode,
			body: response.json() as Record<string, unknown>,
		};
	}

	test("жёсткий режим requirePermission", async () => {
		const { statusCode, body } = await refusalBody((app) => {
			app.post("/probe", async (request, reply) => {
				const context = await requirePermission(request, reply, "payroll.read");
				if (!context) return reply;
				return { unreachable: true };
			});
		}, "doctor");
		assert.equal(statusCode, 403);
		assert.equal(
			body.message,
			permissionRefusalMessage("doctor", "payroll.read"),
		);
		// Машинные поля остаются: ими клиент различает состояния, и ломать их нельзя.
		assert.equal(body.error, "PermissionDenied");
		assert.equal(body.permission, "payroll.read");
		assert.equal(body.role, "doctor");
	});

	test("мягкий режим enforcePermissionWhenStaffKnown", async () => {
		const { statusCode, body } = await refusalBody((app) => {
			app.post("/probe", async (request, reply) => {
				if (!enforcePermissionWhenStaffKnown(request, reply, "settings.write"))
					return reply;
				return { unreachable: true };
			});
		}, "assistant");
		assert.equal(statusCode, 403);
		assert.equal(
			body.message,
			permissionRefusalMessage("assistant", "settings.write"),
		);
	});

	test("охрана «кроме врача» из accessGuard", async () => {
		const { statusCode, body } = await refusalBody((app) => {
			app.post("/probe", async (request, reply) => {
				if (!(await requireNonDoctorAccess(request, reply))) return reply;
				return { unreachable: true };
			});
		}, "doctor");
		assert.equal(statusCode, 403);
		const message = String(body.message);
		assert.ok(
			!LATIN.test(message),
			`отказ врачу содержит латиницу: ${message}`,
		);
		assert.match(
			message,
			/Попросите/,
			`отказ врачу не называет следующий шаг: ${message}`,
		);
		// Машинная метка участка не выброшена, а вынесена из текста в своё поле.
		assert.equal(body.protectedArea, "non-doctor mutation");
		assert.equal(body.error, "DoctorsNotAllowed");
	});
});
