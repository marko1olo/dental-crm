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
	readonly role: "объявление колонки" | "чтение" | "писатель" | "инициализация";
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
		file: "ai/dentalTools/databaseModules/configureClinicSetupTool.ts",
		code: "clinicSchedule: toCanonicalClinicSchedule(parsedArgs.schedule),",
		role: "инициализация",
		why: "экспресс-настройка клиники при старте переводит вход в канонический clinicScheduleDefaultsSchema",
	},
	{
		file: "db/schema/auth.ts",
		code: 'clinicSchedule: jsonb("clinic_schedule"),',
		role: "объявление колонки",
		why: "объявление самой колонки в схеме drizzle — не чтение и не запись",
	},
	{
		file: "db/settings/clinicProfileQueries.ts",
		code: "updateData.clinicSchedule = input.scheduleDefaults;",
		role: "писатель",
		why: "ЕДИНСТВЕННЫЙ писатель: Настройки → «Клиника», формат clinicScheduleDefaultsSchema",
	},
	{
		file: "db/settings/clinicScalePresetQueries.ts",
		code: "clinicSchedule: spec.schedule,",
		role: "инициализация",
		why: "переключение пресета масштаба клиники в каноническом формате clinicScheduleDefaultsSchema",
	},
	{
		file: "routes/analytics/executiveDoctorsQuery.ts",
		code: "clinicSchedule: organizations.clinicSchedule,",
		role: "чтение",
		why: "чтение рабочего графика клиники для расчёта загрузки врачей",
	},
	{
		file: "routes/analytics/utilizationRoutes.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "чтение рабочего графика клиники для расчёта утилизации кресел",
	},
	{
		file: "routes/appointmentErrors.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "чтение рабочего графика клиники при проверке доступности слотов",
	},
	{
		file: "routes/portal/portalAppointmentsRoutes.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "чтение графика клиники для записи пациента через портал",
	},
	{
		file: "routes/portal/portalAppointmentsRoutes.ts",
		code: "clinicSchedule: organizations.clinicSchedule,",
		role: "чтение",
		why: "выборка поля графика клиники в запросе доступных слотов портала",
	},
	{
		file: "routes/publicBooking/bookingModules/publicBookingMutations.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "выборка графика для проверки рабочего времени при создании публичной записи",
	},
	{
		file: "routes/publicBooking/bookingModules/publicBookingSlotEngine.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "выборка графика для расчёта свободных слотов публичного виджета записи",
	},
	{
		file: "routes/publicBooking/slotAvailabilityEngine.ts",
		code: "clinicSchedule: unknown,",
		role: "чтение",
		why: "параметр resolveDaySchedule: разбирает формат настроек, а старый — ради строк, записанных раньше",
	},
	{
		file: "routes/publicBooking/slotAvailabilityEngine.ts",
		code: 'clinicSchedule && typeof clinicSchedule === "object"',
		role: "чтение",
		why: "проверка того же параметра в resolveDaySchedule",
	},
	{
		file: "routes/publicBooking/slotAvailabilityEngine.ts",
		code: "clinicSchedule: DaySchedule,",
		role: "чтение",
		why: "типизация аргумента функции resolveSlotWindows",
	},
	{
		file: "services/reports/managerReports/chairLoadService.ts",
		code: ".select({ clinicSchedule: organizations.clinicSchedule })",
		role: "чтение",
		why: "чтение графика клиники для отчёта загрузки кресел",
	},
];

const CLINIC_MODE_SITES: readonly AllowedSite[] = [
	{
		file: "ai/dentalTools/databaseModules/clinicSetupTypes.ts",
		code: 'clinicMode: z.enum(["solo_doctor", "one_chair", "small_clinic", "network_clinic"]).optional().describe("Масштаб клиники"),',
		role: "чтение",
		why: "Zod-схема входа AI-инструмента строго совпадает с каноническим словарём clinicModeSchema",
	},
	{
		file: "ai/dentalTools/databaseModules/configureClinicSetupTool.ts",
		code: "clinicMode: calculatedMode,",
		role: "инициализация",
		why: "сохранение и возврат вычисленного режима клиники при автономной настройке",
		count: 2,
	},
	{
		file: "db/appointmentsQueryModules/appointmentsCreateQuery.ts",
		code: ".select({ clinicMode: schema.organizations.clinicMode })",
		role: "чтение",
		why: "чтение режима клиники для автономии соло-врача без обязательного ассистента",
	},
	{
		file: "db/appointmentsQueryModules/appointmentsCreateQuery.ts",
		code: 'orgRecord?.clinicMode === "one_chair"',
		role: "чтение",
		why: "проверка режима одного кресла при создании приёма",
	},
	{
		file: "db/appointmentsQueryModules/appointmentsCreateQuery.ts",
		code: 'orgRecord?.clinicMode === "solo_doctor" ||',
		role: "чтение",
		why: "проверка режима соло-врача при создании приёма",
	},
	{
		file: "db/schema/auth.ts",
		code: 'clinicMode: text("clinic_mode").notNull().default(DEFAULT_CLINIC_MODE),',
		role: "объявление колонки",
		why: "сама колонка, умолчание проверяет tests/clinicModeOneVocabulary.test.ts",
	},
	{
		file: "db/settings/clinicProfileQueries.ts",
		code: ".set({ clinicMode: mode })",
		role: "писатель",
		why: "ЕДИНСТВЕННЫЙ писатель: updateClinicModeInDb, принимает ClinicMode, то есть значение из словаря",
	},
	{
		file: "db/settings/clinicScalePresetQueries.ts",
		code: "clinicMode: spec.mode,",
		role: "инициализация",
		why: "применение пресета масштаба клиники с каноническими значениями ClinicMode",
	},
	{
		file: "routes/analytics/executiveAccessGuard.ts",
		code: ".select({ clinicMode: organizations.clinicMode })",
		role: "чтение",
		why: "чтение режима клиники для допуска соло-врача к собственной аналитике",
	},
	{
		file: "routes/analytics/executiveAccessGuard.ts",
		code: 'if (clinicMode === "solo_doctor" || clinicMode === "one_chair") {',
		role: "чтение",
		why: "проверка соло-режима в охраннике аналитики",
	},
	{
		file: "routes/analytics/executiveAccessGuard.ts",
		code: "return { overrides: loadedOverrides, clinicMode: mode };",
		role: "чтение",
		why: "возврат прочитанного режима клиники из охранника аналитики",
	},
	{
		file: "routes/analytics/rebookingRoutes.ts",
		code: ".select({ clinicMode: organizations.clinicMode })",
		role: "чтение",
		why: "выборка режима клиники для отчётов и списков возвращаемости",
		count: 2,
	},
	{
		file: "routes/analytics/rebookingRoutes.ts",
		code: 'orgRecord?.clinicMode === "one_chair"',
		role: "чтение",
		why: "проверка режима одного кресла в маршрутах возвращаемости",
		count: 2,
	},
	{
		file: "routes/analytics/rebookingRoutes.ts",
		code: 'orgRecord?.clinicMode === "solo_doctor" ||',
		role: "чтение",
		why: "проверка режима соло-врача в маршрутах возвращаемости",
		count: 2,
	},
	{
		file: "routes/auth/registrationRoutes.ts",
		code: 'const clinicMode = isSolo ? "solo_doctor" : "small_clinic";',
		role: "инициализация",
		why: "стартовый режим при регистрации новой организации из канонического словаря",
	},
	{
		file: "routes/marketingModules/marketingAccessGuard.ts",
		code: ".select({ clinicMode: organizations.clinicMode })",
		role: "чтение",
		why: "выборка режима клиники в охраннике маркетинга для соло-практики",
	},
	{
		file: "routes/marketingModules/marketingAccessGuard.ts",
		code: 'if (role === "doctor" && (clinicMode === "solo_doctor" || clinicMode === "one_chair")) {',
		role: "чтение",
		why: "проверка соло-режима врача в охраннике маркетинга",
	},
	{
		file: "routes/marketingModules/marketingAccessGuard.ts",
		code: "return { overrides: loadedOverrides, clinicMode: mode };",
		role: "чтение",
		why: "возврат режима клиники из охранника маркетинга",
	},
	{
		file: "routes/onboarding/index.ts",
		code: "clinicMode: mode,",
		role: "инициализация",
		why: "установка канонического режима при прохождении быстрого запуска клиники",
	},
	{
		file: "services/demo/deepSeeder/coreModules/demoStaffAndChairsSeeder.ts",
		code: 'clinicMode: "small_clinic",',
		role: "инициализация",
		why: "создание демонстрационной клиники с каноническим значением small_clinic",
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
