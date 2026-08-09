#!/usr/bin/env node
/**
 * ГЕЙТ: ответ `fetch` обязан быть проверен до разбора тела.
 *
 * ЗАЧЕМ. Промис `fetch` отклоняется ТОЛЬКО на сетевом отказе. Ответы 403, 404,
 * 500 приходят как обычное разрешение промиса, поэтому `catch` на них НЕ
 * срабатывает. Код вида
 *
 *     const res = await fetch(url);
 *     const data = await res.json();
 *     setResult(data);
 *
 * при отказе кладёт тело ошибки (`{ error, message }`) туда, где ожидались
 * данные. Дальше отрисовка читает несуществующие поля и показывает пустоту.
 *
 * ЭТО НЕ УМОЗРИТЕЛЬНО. Замер 2026-08-08 по apps/web дал три настоящих дефекта:
 *   - NdflCalculatorModal.tsx — тело 403 попадало в результат расчёта НДФЛ,
 *     врач видел нулевые суммы вместо «нет доступа». В том же файле стоял
 *     комментарий, предупреждавший, что клиника получает именно 403.
 *   - SberbankTerminalPaymentModal.tsx — опрос состояния платежа не проверял
 *     ответ; `data.status` выходил undefined, ни ветка успеха, ни ветка отказа
 *     не срабатывали, и опрос шёл бесконечно.
 *   - UrgentScheduleRequestsWidget.tsx — тело отказа уходило в состояние
 *     списка, а отрисовка вызывала на нём `.map`.
 *
 * ОТРАСЛЕВОГО ПРАВИЛА ЛИНТЕРА НА ЭТОТ КЛАСС НЕТ. Проверено поиском: у ESLint
 * есть `unicorn/no-invalid-fetch-options` (про несовместимые параметры), но
 * проверки `response.ok` не делает ни одно распространённое правило. Поэтому
 * гейт свой.
 *
 * КАК ПРОВЕРЯЕТСЯ. Разбор идёт по дереву (TypeScript AST), не регулярками.
 * Для каждого вызова `fetch` берётся ИМЯ переменной ответа и ищется обращение
 * `<имя>.ok` или `<имя>.status` в теле объемлющей функции.
 *
 * ПОЧЕМУ ИМЕННО ИМЯ, А НЕ ПОДСТРОКА. Первая версия искала подстроку `.status`
 * по всему телу функции — и засчитывала `data.status` (поле ответа сервера) как
 * проверку HTTP-статуса. На реальном коде это дало ЛОЖНЫЙ НОЛЬ: файл с
 * непроверенным ответом считался чистым. Сверка по имени переменной эту дыру
 * закрывает.
 *
 * ГРАНИЦА ПРИМЕНИМОСТИ, названная честно:
 *   - вызовы вида `fetch(...).then(res => ...)` проверяются слабее: там имени
 *     переменной нет, и гейт довольствуется наличием `.ok`/`.status` в теле;
 *   - если ответ передаётся в другую функцию, которая проверяет его там, гейт
 *     этого не увидит и даст ложную находку. Такие места вносите в СПИСОК
 *     ИСКЛЮЧЕНИЙ ниже с обоснованием, а не отключайте гейт.
 */

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");

const ROOTS = ["apps/web/src", "apps/api/src"];

/**
 * СПИСОК ИСКЛЮЧЕНИЙ. Формат: "путь/файл.ts:строка" -> причина.
 * Список закрыт на пополнение без обоснования: каждая запись обязана объяснять,
 * ГДЕ проверяется ответ, если не на месте вызова.
 */
const ALLOWED = new Map([
	[
		"apps/api/src/smsTransport.ts:539",
		"Проверка баланса шлюза: тело разбирается через .catch(() => ({})), затем " +
			"проверяется payload.status_code !== 100 и возвращается структурированный " +
			"отказ с errorClass. HTTP-отказ деградирует в тот же путь.",
	],
	[
		"apps/api/src/smsTransport.ts:571",
		"То же для второго провайдера (smsc): форма ответа проверяется явно, " +
			"недостающий баланс даёт ok:false с классом ошибки.",
	],
]);

function collectFiles(dir, out) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!/node_modules|__tests__|dist|build/.test(entry.name))
				collectFiles(full, out);
		} else if (
			/[.]tsx?$/.test(entry.name) &&
			!/[.](test|spec)[.]/.test(entry.name)
		) {
			out.push(full);
		}
	}
	return out;
}

function enclosingFunction(node) {
	let current = node.parent;
	while (
		current &&
		!ts.isFunctionDeclaration(current) &&
		!ts.isArrowFunction(current) &&
		!ts.isFunctionExpression(current) &&
		!ts.isMethodDeclaration(current)
	) {
		current = current.parent;
	}
	return current;
}

/*
 * ПРОВЕРКА ИДЁТ ПО ДЕРЕВУ, А НЕ ПО ТЕКСТУ. Первая версия сверяла регулярку с
 * `fn.body.getText()` — а этот текст содержит КОММЕНТАРИИ. Мутация показала
 * дыру: удаление настоящей строки `if (!res.ok) throw ...` гейт не заметил,
 * потому что двадцатью строками выше в пояснении было написано «`res.ok`
 * проверяется отдельно». Любой файл с упоминанием `res.ok` в комментарии
 * проходил гейт независимо от кода.
 *
 * Комментарии не являются узлами AST, поэтому обход дерева эту дыру закрывает
 * структурно, а не срезанием комментариев регуляркой.
 */
function walk(node, visit) {
	visit(node);
	node.forEachChild((child) => walk(child, visit));
}

/** Разбирается ли тело ответа: `<что-то>.json()` встречается как ВЫЗОВ. */
function bodyParsesJson(body) {
	let found = false;
	walk(body, (node) => {
		if (
			!found &&
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "json"
		) {
			found = true;
		}
	});
	return found;
}

/** Читается ли `<responseName>.ok` или `<responseName>.status` — узлом дерева. */
function readsGuardProperty(body, responseName) {
	let found = false;
	walk(body, (node) => {
		if (
			!found &&
			ts.isPropertyAccessExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === responseName &&
			(node.name.text === "ok" || node.name.text === "status")
		) {
			found = true;
		}
	});
	return found;
}

/**
 * Запасной случай: имя ответа не извлеклось (цепочка `.then`, немедленный
 * `(await fetch(...)).json()`). Тогда принимаем любое обращение к `.ok`, но
 * НЕ к `.status`: `data.status` — поле тела ответа сервера, а не HTTP-статус,
 * и засчитывать его нельзя. На этом первая версия давала ложный ноль.
 */
function readsAnyGuardProperty(body) {
	let found = false;
	walk(body, (node) => {
		if (
			!found &&
			ts.isPropertyAccessExpression(node) &&
			node.name.text === "ok"
		) {
			found = true;
		}
	});
	return found;
}

const findings = [];
const files = [];
for (const root of ROOTS) collectFiles(root, files);

for (const file of files) {
	const source = ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const lineOf = (node) =>
		source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === "fetch"
		) {
			let responseName = null;
			let viaThen = false;
			const parent = node.parent;
			if (
				ts.isAwaitExpression(parent) &&
				ts.isVariableDeclaration(parent.parent) &&
				ts.isIdentifier(parent.parent.name)
			) {
				responseName = parent.parent.name.text;
			} else if (
				ts.isPropertyAccessExpression(parent) &&
				parent.name.text === "then"
			) {
				viaThen = true;
			}

			const fn = enclosingFunction(node);
			if (fn?.body) {
				// Тело не разбирается — проверять нечего.
				if (bodyParsesJson(fn.body)) {
					const checked = responseName
						? readsGuardProperty(fn.body, responseName)
						: readsAnyGuardProperty(fn.body);
					if (!checked) {
						const key = `${file.replaceAll("\\", "/")}:${lineOf(node)}`;
						if (!ALLOWED.has(key)) {
							findings.push({
								key,
								responseName,
								viaThen,
							});
						}
					}
				}
			}
		}
		node.forEachChild(visit);
	};
	visit(source);
}

if (findings.length > 0) {
	console.error(
		`Ответ fetch не проверен до разбора тела: ${findings.length} мест.\n`,
	);
	for (const finding of findings) {
		const how = finding.responseName
			? `ответ в переменной "${finding.responseName}" — нет обращения к .ok или .status`
			: finding.viaThen
				? "цепочка .then без проверки ответа"
				: "ответ не именован и не проверен";
		console.error(`  ${finding.key}\n      ${how}`);
	}
	console.error(
		"\nПочему это ломает клинику: fetch не отклоняется на 403/404/500, " +
			"поэтому тело ошибки попадает туда, где ожидались данные, и экран " +
			"показывает пустоту вместо причины отказа.\n" +
			"Починка: проверьте res.ok (и форму тела) ДО использования данных.\n" +
			"Если ответ проверяется в другом месте — внесите запись в ALLOWED " +
			"в этом файле с указанием, где именно.",
	);
	process.exit(1);
}

console.log(
	`Ответ fetch проверяется везде: разобрано ${files.length} файлов, ` +
		`исключений в списке ${ALLOWED.size}.`,
);
