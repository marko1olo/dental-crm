import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { migrationTimeZoneFrom } from "./loader.js";
import { storedDateTimeToUtc } from "./valueNormalize.js";

/**
 * ЗАМОК НА ПОДСТАВНОЙ ЧАСОВОЙ ПОЯС ПЕРЕНОСА.
 *
 * ЧТО БЫЛО СЛОМАНО. В `migration/loader.ts` жила ТРЕТЬЯ копия `clinicTimeZone`, и
 * она была хуже двух других сразу по двум причинам.
 *
 * Первая: тип возврата `Promise<string>` вместо `Promise<string | null>`. На
 * отсутствие значения копия ПОДСТАВЛЯЛА `DEFAULT_CLINIC_TIME_ZONE` =
 * `Europe/Moscow`. «Пояс клиники неизвестен» превращалось в «клиника в Москве», и
 * перенос чужой базы сдвигал весь график на разницу поясов у той клиники, про
 * которую мы как раз ничего не знаем. Сдвиг тихий: даты на месте, строки
 * загружены, сверка сошлась — врач просто видит приёмы не в те часы.
 *
 * Вторая: копия читала `communicationSettings.timezone`, а канон читает
 * `clinics.timezone`. Это разные источники с разными значениями по умолчанию —
 * `Europe/Samara` против `Europe/Moscow`, — поэтому перенос и отчёты руководителя
 * расходились на час даже там, где обе строки существуют.
 *
 * ЗАМЕР НА ЖИВОЙ БАЗЕ, которым это доказано: организаций 4, строк `clinics` 1,
 * строк `communication_settings` НОЛЬ. То есть ветка с подстановкой Москвы была не
 * редким краем, а единственной рабочей ветвью для КАЖДОГО переноса, включая
 * организацию, которой в базе нет вовсе.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ. Дефект такого рода возвращается тихо: достаточно кому-то
 * дописать `?? "Europe/Moscow"`, чтобы «неизвестно» снова стало конкретным поясом,
 * и ни компилятор, ни существующие тесты этого не заметят. Здесь заперты обе
 * половины: политика («нет пояса» не становится поясом) и источник (пояс читается
 * из канона, а не из своей копии).
 */

/** Приём в 14:30 местного времени клиники — типичная строка выгрузки. */
const SOURCE_ROW = "2019-03-12T14:30:00";
const APPOINTMENT_DEFAULT_MINUTES = 9 * 60;

/**
 * Пояс, который прежняя копия подставляла на пустом значении. Держится здесь
 * литералом намеренно: замок обязан краснеть, даже если константу переименуют.
 */
const SUBSTITUTED_ZONE = "Europe/Moscow";
/** Значение по умолчанию у `clinics.timezone` — второй «правдоподобный» кандидат. */
const SCHEMA_DEFAULT_ZONE = "Europe/Samara";

function instantOf(zone: string): string {
	const parsed = storedDateTimeToUtc(
		SOURCE_ROW,
		zone,
		APPOINTMENT_DEFAULT_MINUTES,
	);
	assert.ok(
		parsed,
		`строка «${SOURCE_ROW}» обязана разбираться в поясе ${zone}`,
	);
	return parsed.toISOString();
}

test("«пояса нет» не превращается в конкретный часовой пояс", () => {
	for (const absent of [null, undefined, "", "   ", "\t"]) {
		const resolved = migrationTimeZoneFrom(absent);

		assert.equal(
			resolved.known,
			false,
			`значение ${JSON.stringify(absent)} — это отсутствие пояса, и перенос обязан знать, что пояс неизвестен`,
		);
		assert.notEqual(
			resolved.readingZone,
			SUBSTITUTED_ZONE,
			`вернулась подстановка ${SUBSTITUTED_ZONE}: «пояс неизвестен» снова превратилось в «клиника в Москве», ` +
				"и перенос чужой базы опять сдвигает весь график на разницу поясов",
		);
		assert.notEqual(
			resolved.readingZone,
			SCHEMA_DEFAULT_ZONE,
			`вернулась подстановка ${SCHEMA_DEFAULT_ZONE}: умолчание схемы — тоже выдуманный за клинику факт`,
		);
	}
});

/**
 * Смысл «неизвестного» пояса — НЕ применять сдвиг. Проверяется не по имени зоны, а
 * по результату: время суток из выгрузки обязано сохраниться как написано.
 * Проверка по имени пропустила бы любой пояс с нулевым смещением, названный иначе,
 * и наоборот — покраснела бы на верном переименовании.
 */
test("при неизвестном поясе время суток из выгрузки не сдвигается", () => {
	const unknown = migrationTimeZoneFrom(null);

	// То, что делала прежняя копия. Считается ЗДЕСЬ, чтобы разница была видна в
	// самом тесте, а не в чьём-то пересказе.
	const substituted = instantOf(SUBSTITUTED_ZONE);
	assert.equal(
		substituted,
		"2019-03-12T11:30:00.000Z",
		"контрольное значение прежней подстановки посчитано неверно",
	);

	assert.equal(
		instantOf(unknown.readingZone),
		"2019-03-12T14:30:00.000Z",
		"при неизвестном поясе «14:30» из выгрузки обязано остаться 14:30, а не получить чужое смещение",
	);
	assert.notEqual(
		instantOf(unknown.readingZone),
		substituted,
		"момент совпал с московской подстановкой: подстановка вернулась",
	);
});

test("известный пояс клиники проходит без изменений и по-прежнему применяется", () => {
	for (const zone of [
		"Europe/Moscow",
		"Europe/Samara",
		"Asia/Kamchatka",
		"Asia/Yekaterinburg",
	]) {
		const resolved = migrationTimeZoneFrom(zone);
		assert.equal(
			resolved.known,
			true,
			`пояс ${zone} задан, перенос обязан считать его известным`,
		);
		assert.equal(
			resolved.readingZone,
			zone,
			`пояс ${zone} обязан доезжать до разбора без подмены`,
		);
	}

	// Известный пояс продолжает СДВИГАТЬ время: правка снимала подстановку, а не
	// перевод местного времени в абсолютное.
	assert.equal(
		instantOf(migrationTimeZoneFrom("Europe/Samara").readingZone),
		"2019-03-12T10:30:00.000Z",
	);
	assert.equal(
		instantOf(migrationTimeZoneFrom("Asia/Kamchatka").readingZone),
		"2019-03-12T02:30:00.000Z",
	);
});

test("пояс с пробелами по краям — это заданный пояс, а не отсутствие", () => {
	const resolved = migrationTimeZoneFrom("  Europe/Samara  ");
	assert.equal(resolved.known, true);
	assert.equal(
		resolved.readingZone,
		"Europe/Samara",
		"пробелы обязаны сниматься, а не превращать пояс в неизвестный",
	);
});

/**
 * ЗАМОК НА ИСТОЧНИК, И ОН РАЗБИРАЕТ ДЕРЕВО TypeScript, А НЕ ТЕКСТ.
 *
 * Это не вкус. В `loader.ts` теперь СТОИТ разбор удалённой копии, и в нём по делу
 * упомянуты и `DEFAULT_CLINIC_TIME_ZONE`, и `communicationSettings.timezone`.
 * Текстовый поиск принял бы объяснение дефекта за сам дефект и покраснел бы на
 * верном коде — ровно та ошибка измерения, из-за которой «объявлен и не вызван»
 * держался в этом дереве годами: имя находилось поиском, потому что про него было
 * написано. Для парсера комментарий — trivia, физически не ссылка.
 */
function loaderSourceTree(): {
	tree: ts.SourceFile;
	identifiers: Set<string>;
	propertyPaths: Set<string>;
} {
	const path = fileURLToPath(new URL("./loader.ts", import.meta.url));
	const source = readFileSync(path, "utf8");
	const tree = ts.createSourceFile(
		path,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);

	const identifiers = new Set<string>();
	const propertyPaths = new Set<string>();
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node)) identifiers.add(node.text);
		if (
			ts.isPropertyAccessExpression(node) &&
			ts.isIdentifier(node.expression)
		) {
			propertyPaths.add(`${node.expression.text}.${node.name.text}`);
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(tree, visit);
	return { tree, identifiers, propertyPaths };
}

test("загрузчик переноса не держит своей копии clinicTimeZone", () => {
	const { tree } = loaderSourceTree();

	const declaredLocally: string[] = [];
	for (const statement of tree.statements) {
		if (
			ts.isFunctionDeclaration(statement) &&
			statement.name?.text === "clinicTimeZone"
		) {
			declaredLocally.push("function clinicTimeZone");
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (
					ts.isIdentifier(declaration.name) &&
					declaration.name.text === "clinicTimeZone"
				) {
					declaredLocally.push("const clinicTimeZone");
				}
			}
		}
	}

	assert.deepEqual(
		declaredLocally,
		[],
		"в loader.ts снова объявлена своя clinicTimeZone — это третий источник истины о поясе клиники; " +
			"канон живёт в services/reports/managerReports.ts и обязан импортироваться оттуда",
	);
});

test("пояс клиники импортируется из канона", () => {
	const { tree } = loaderSourceTree();

	const canonImports: string[] = [];
	for (const statement of tree.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
		const bindings = statement.importClause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		for (const element of bindings.elements) {
			const imported = element.propertyName?.text ?? element.name.text;
			if (imported === "clinicTimeZone")
				canonImports.push(statement.moduleSpecifier.text);
		}
	}

	assert.deepEqual(
		canonImports,
		["../services/reports/managerReports.js"],
		"clinicTimeZone обязана приходить из канона ровно один раз: " +
			`получено ${JSON.stringify(canonImports)}`,
	);
});

test("перенос не читает пояс из настроек рассылки и не подставляет умолчание", () => {
	const { identifiers, propertyPaths } = loaderSourceTree();

	assert.equal(
		propertyPaths.has("communicationSettings.timezone"),
		false,
		"перенос снова читает communicationSettings.timezone — это пояс тихих часов рассылки, " +
			"а не пояс, в котором клиника принимает пациентов; канон — clinics.timezone",
	);
	assert.equal(
		identifiers.has("DEFAULT_CLINIC_TIME_ZONE"),
		false,
		"в код переноса вернулась подстановка пояса по умолчанию: «пояс неизвестен» снова становится конкретным",
	);
});
