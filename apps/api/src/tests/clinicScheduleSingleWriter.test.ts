import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { clinicModeSchema, clinicScheduleDefaultsSchema } from "@dental/shared";

/**
 * Страж: у графика клиники и у режима клиники — по одному писателю и по одному
 * формату.
 *
 * ЧТО СЛУЧИЛОСЬ. У колонки organizations.clinic_schedule было ДВА писателя с
 * несовместимыми раскладками:
 *   db/settingsQuery.ts — Настройки → «Клиника», формат
 *     { workdayStart, workdayEnd, workingDays, appointmentBufferMinutes };
 *   routes/workspaceProfile.ts — маршрут онбординга, формат
 *     { workHours: [9, 18], specs: [...] }, и он ЗАМЕНЯЛ колонку целиком.
 * Второй писатель звался только из недостижимого мастера первого запуска, но был
 * зарегистрирован и доступен по токену кабинета. Его вызов стирал график,
 * заданный клиникой, а чтение настроек старую раскладку не разбирает вовсе
 * (clinicScheduleDefaultsSchema) — клиника с графиком 8–20 молча возвращалась к
 * запасу 09:00–18:00 и теряла утренние и вечерние слоты в публичной записи, а по
 * закрытым дням принимала записи. Маршрут удалён; этот страж не даёт вернуть
 * второго писателя.
 *
 * ТА ЖЕ ИСТОРИЯ У РЕЖИМА. По колонке organizations.clinic_mode в проекте жили
 * три несовпадающих словаря, и маршрут онбординга писал 'single'/'network' —
 * значения, которых нет в перечислении. Разбор при чтении подменял их молча,
 * поэтому у всех клиник получалось одинаковое меню. Проверка вывода режима из
 * ответов мастера снята вместе с самим маршрутом (см.
 * tests/clinicModeOneVocabulary.test.ts), и её место занимает утверждение
 * посильнее: писатель у колонки один, и словарь проверяется у него.
 *
 * ПОЧЕМУ ПРОВЕРКА ПО ИСХОДНИКАМ, А НЕ ПО БАЗЕ. Дефект — это НАЛИЧИЕ второго
 * писателя, а не текущее содержимое колонки. Запрос к базе показал бы одну
 * строку и прошёл бы зелёным ровно до того дня, когда второй писатель кого-то
 * перезапишет. Пересчитывать писателей приходится по дереву.
 *
 * ПОЧЕМУ СПИСОК ТОЧНЫЙ, А НЕ «НЕ БОЛЬШЕ ДВУХ». Каждое место названо и объяснено.
 * Новое обращение к колонке — падение с требованием объяснить его здесь; исчезло
 * названное — тоже падение, чтобы список не описывал дерево, которого нет.
 */

const apiSrcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Разрешённые обращения к колонке: путь от apps/api/src, код и его роль. */
interface AllowedSite {
	readonly file: string;
	readonly code: string;
	readonly role: "объявление колонки" | "чтение" | "писатель";
	readonly why: string;
	/**
	 * Сколько раз этот же код встречается в файле. Считается, а не «хотя бы
	 * один»: одинаковая выборка стоит у двух разных обработчиков публичной
	 * записи, и если одна из них исчезнет, страж обязан это заметить.
	 */
	readonly count?: number;
}

const CLINIC_SCHEDULE_SITES: readonly AllowedSite[] = [
	{
		file: "db/schema.ts",
		code: 'clinicSchedule: jsonb("clinic_schedule"),',
		role: "объявление колонки",
		why: "объявление самой колонки в схеме drizzle — не чтение и не запись",
	},
	{
		file: "db/settingsQuery.ts",
		code: "if (input.scheduleDefaults !== undefined) updateData.clinicSchedule = input.scheduleDefaults;",
		role: "писатель",
		why: "ЕДИНСТВЕННЫЙ писатель: Настройки → «Клиника», формат clinicScheduleDefaultsSchema",
	},
	{
		file: "routes/publicBooking.ts",
		code: "clinicSchedule: unknown,",
		role: "чтение",
		why: "параметр resolveDaySchedule: разбирает формат настроек, а старый — ради строк, записанных раньше",
	},
	{
		file: "routes/publicBooking.ts",
		code: 'clinicSchedule && typeof clinicSchedule === "object"',
		role: "чтение",
		why: "проверка того же параметра",
	},
	{
		file: "routes/publicBooking.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "выборка графика для публичного виджета записи — свободные слоты и создание записи",
		count: 2,
	},
];

const CLINIC_MODE_SITES: readonly AllowedSite[] = [
	{
		file: "db/schema.ts",
		code: 'clinicMode: text("clinic_mode").notNull().default(DEFAULT_CLINIC_MODE),',
		role: "объявление колонки",
		why: "сама колонка, умолчание проверяет tests/clinicModeOneVocabulary.test.ts",
	},
	{
		file: "db/settingsQuery.ts",
		code: "await db.update(schema.organizations).set({ clinicMode: mode }).where(eq(schema.organizations.id, organizationId));",
		role: "писатель",
		why: "ЕДИНСТВЕННЫЙ писатель: updateClinicModeInDb, принимает ClinicMode, то есть значение из словаря",
	},
];

/** Все .ts дерева apps/api/src, кроме тестов и сборки. */
function apiSourceFiles(): readonly string[] {
	const found: string[] = [];
	const skip = new Set(["tests", "dist", "node_modules", "drizzle"]);
	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				if (!skip.has(entry)) walk(full);
				continue;
			}
			if (extname(entry) === ".ts") found.push(full);
		}
	};
	walk(apiSrcRoot);
	assert.ok(
		found.length > 100,
		`перепись исходников apps/api выродилась: файлов ${found.length}`,
	);
	return found;
}

interface FoundSite {
	readonly file: string;
	readonly line: number;
	readonly code: string;
}

/**
 * Обращения к полю по имени. `\b` с двух сторон намеренно: без него
 * `clinicScheduleCheck` в sampleData.ts дал бы десятки ложных срабатываний, а с
 * ним — ни одного, потому что после `Schedule` там стоит словесный символ.
 */
function sitesOf(field: "clinicSchedule" | "clinicMode"): readonly FoundSite[] {
	const pattern = new RegExp(`\\b${field}\\b`);
	const sites: FoundSite[] = [];
	for (const file of apiSourceFiles()) {
		const lines = readFileSync(file, "utf8").split(/\r?\n/);
		lines.forEach((line, index) => {
			const code = line.trim();
			// Комментарий — это разбор, а не обращение к колонке.
			if (
				code.startsWith("*") ||
				code.startsWith("//") ||
				code.startsWith("/*")
			)
				return;
			// Обращение к свойству прочитанной строки (`org.clinicSchedule`) —
			// чтение по определению и в список не заводится.
			if (!pattern.test(code)) return;
			if (
				new RegExp(`\\.${field}\\b`).test(code) &&
				!new RegExp(`${field}\\s*[:=]`).test(code)
			)
				return;
			if (!new RegExp(`${field}\\s*[:=]`).test(code)) return;
			sites.push({
				file: relative(apiSrcRoot, file).split(sep).join("/"),
				line: index + 1,
				code,
			});
		});
	}
	return sites;
}

function assertSitesMatch(
	field: "clinicSchedule" | "clinicMode",
	allowed: readonly AllowedSite[],
): void {
	const found = sitesOf(field);
	const foundKeys = found.map((site) => `${site.file} :: ${site.code}`).sort();
	const allowedKeys = allowed
		.flatMap((site) =>
			Array.from(
				{ length: site.count ?? 1 },
				() => `${site.file} :: ${site.code}`,
			),
		)
		.sort();
	assert.deepEqual(
		foundKeys,
		allowedKeys,
		`Обращения к колонке ${field} разошлись со списком.\n` +
			`В дереве:\n  ${found.map((s) => `${s.file}:${s.line} — ${s.code}`).join("\n  ") || "(нет)"}\n` +
			`В списке:\n  ${allowedKeys.join("\n  ") || "(нет)"}\n` +
			"Новый писатель этой колонки — это второй формат и стёртая настройка клиники. " +
			"Если обращение законно, впишите его сюда вместе с ролью и причиной.",
	);
	const writers = allowed.filter((site) => site.role === "писатель");
	assert.equal(
		writers.length,
		1,
		`У колонки ${field} должен быть РОВНО ОДИН писатель, в списке их ${writers.length}: ` +
			writers.map((w) => w.file).join(", "),
	);
	for (const site of allowed) {
		assert.ok(
			site.why.trim().length > 20,
			`Запись «${site.code}» без внятной причины`,
		);
	}
}

test("у графика клиники ровно один писатель и ни одного второго формата", () => {
	assertSitesMatch("clinicSchedule", CLINIC_SCHEDULE_SITES);
});

test("у режима клиники ровно один писатель", () => {
	assertSitesMatch("clinicMode", CLINIC_MODE_SITES);
});

test("формат единственного писателя графика — тот, который читают настройки", () => {
	/*
	 * Писатель кладёт в колонку `input.scheduleDefaults`, а он разобран
	 * clinicScheduleDefaultsSchema. Здесь проверяется само это соответствие: набор
	 * ключей схемы и то, что старая раскладка мастера ({ workHours, specs }) через
	 * неё НЕ проходит. Именно непроходимость и делала перезапись разрушительной —
	 * значение доходило до базы, а чтение настроек его не понимало.
	 */
	const settingsShape = {
		workdayStart: "08:00",
		workdayEnd: "20:00",
		workingDays: [1, 2, 3, 4, 5],
		appointmentBufferMinutes: 15,
	};
	assert.equal(
		clinicScheduleDefaultsSchema.safeParse(settingsShape).success,
		true,
		"формат экрана настроек перестал проходить разбор графика — значит настройка клиники снова невидима на чтении",
	);
	assert.equal(
		clinicScheduleDefaultsSchema.safeParse({
			workHours: [9, 18],
			specs: ["therapy"],
		}).success,
		false,
		"старая раскладка мастера первого запуска снова проходит разбор — тогда два формата опять неразличимы",
	);
});

test("словарь режимов не пуст и писатель принимает только его значения", () => {
	assert.ok(
		clinicModeSchema.options.length >= 2,
		"перечисление режимов выродилось",
	);
	assert.equal(
		clinicModeSchema.safeParse("single").success,
		false,
		"значение 'single' снова внутри словаря",
	);
	assert.equal(
		clinicModeSchema.safeParse("network").success,
		false,
		"значение 'network' снова внутри словаря",
	);
	assert.equal(
		clinicModeSchema.safeParse("demo").success,
		false,
		"значение 'demo' снова внутри словаря",
	);
});
