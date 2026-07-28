/**
 * Чего валидаторам и сборщикам документов не хватает в состоянии.
 *
 * ЗАЧЕМ. Нажатие «Создать выбранный документ» не работало вовсе: все валидаторы
 * достают requiredDocumentField ИЗ ОБЪЕКТА СОСТОЯНИЯ, а состояние — это
 * хранилище useDocumentStore, где таких функций нет. Две чистые функции уже
 * подставляются на входе (documentLogic.ts), но валидаторы и сборщики ждут из
 * состояния ещё и вычисляемые значения вида completedActTotalRubValue — они
 * объявлены в useAppLogic и в хранилище отсутствуют. Значит виды документов,
 * которым эти значения нужны, упрутся в ту же ошибку с другим именем.
 *
 * Скрипт считает это точно, а не на глаз: для каждого вида документа берёт имена,
 * которые его валидатор и его сборщик достают из состояния, и сверяет с полями
 * хранилища. На выходе — список видов, которые СЕЙЧАС создаться не могут, и
 * чего именно им не хватает.
 *
 * Только чтение исходников. Ничего не меняет.
 */
import { readFileSync } from "node:fs";

const WEB = "apps/web/src";
const read = (p) => readFileSync(`${WEB}/${p}`, "utf8");

const validators = read("documentValidators.ts");
const logic = read("documentLogic.ts");
const store = read("store/documentStore.ts");
const labels = read("workspaceUiLabels.ts");

/** Поля и функции, которые есть в хранилище документов. */
function storeKeys(source) {
	const keys = new Set();
	// Объявления вида `  имяПоля: значение,` внутри срезов хранилища.
	for (const match of source.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:/gm)) keys.add(match[1]);
	return keys;
}

/**
 * Имена, которые функция достаёт из состояния.
 *
 * Ищем `} = state;` и берём разобранный перед ним блок. Так надёжнее, чем читать
 * весь текст функции: имена, встречающиеся в теле, могут быть локальными.
 */
function destructuredFromState(source, fromIndex, toIndex) {
	const slice = source.slice(fromIndex, toIndex);
	const names = new Set();
	for (const match of slice.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*state\s*;/g)) {
		for (const raw of match[1].split(",")) {
			const name = raw.split(":")[0].trim().replace(/^\.\.\./, "");
			if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) names.add(name);
		}
	}
	return names;
}

/** Карта вид документа → имя функции-валидатора. */
function validatorMap(source) {
	const start = source.indexOf("export const documentPayloadValidators");
	if (start < 0) return new Map();
	const end = source.indexOf("};", start);
	const map = new Map();
	for (const match of source.slice(start, end).matchAll(/^\s+([a-z0-9_]+):\s*([A-Za-z0-9_]+),?$/gm)) {
		map.set(match[1], match[2]);
	}
	return map;
}

/**
 * Границы тела функции по её имени — по счёту фигурных скобок.
 *
 * Первая редакция брала «от объявления до следующего \nfunction» и захватывала
 * соседние функции целиком. Из-за этого каждый вид документа «требовал» от 17 до
 * 75 отсутствующих имён, включая явно чужие: у договора платных услуг в списке
 * оказывались completedActDoctorFullNameValue и treatmentEstimate*, то есть имена
 * из следующих валидаторов. Проверка, завышающая масштаб, ведёт к правке
 * работающего — это ровно то, чего нельзя.
 *
 * Живая проверка подтвердила завышение: экран отвечает «Заполните поле:
 * информированное согласие, вмешательство», то есть validateInformedConsent
 * доходит до конца и ни на каком отсутствующем имени не падает.
 */
function functionRange(source, name) {
	const declaration = source.indexOf(`function ${name}(`);
	if (declaration < 0) return null;
	const bodyStart = source.indexOf("{", declaration);
	if (bodyStart < 0) return null;
	let depth = 0;
	for (let i = bodyStart; i < source.length; i += 1) {
		const ch = source[i];
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return [declaration, i + 1];
		}
	}
	return [declaration, source.length];
}

const known = storeKeys(store);
// Две чистые функции подставляются на входе в documentLogic.ts.
for (const injected of ["requiredDocumentField", "confirmedDocumentLiteral"]) known.add(injected);

/*
 * Вычисляемые значения подставляются в состояние при создании документа.
 *
 * useAppLogic собирает их в объект documentDerivedValues и сливает с хранилищем
 * перед проверкой и сборкой. Список читается ИЗ КОДА, а не переписывается сюда
 * руками: иначе проверка начнёт расходиться с действительностью — ровно та
 * ошибка, из-за которой обход разделов сутки рапортовал «0 сломанных мест», не
 * заглянув в три раздела.
 */
const appLogic = readFileSync(`${WEB}/useAppLogic.tsx`, "utf8");
const injectedStart = appLogic.indexOf("const documentDerivedValues = {");
if (injectedStart >= 0) {
	const injectedEnd = appLogic.indexOf("\n\t\t};", injectedStart);
	const block = appLogic.slice(injectedStart, injectedEnd < 0 ? injectedStart : injectedEnd);
	let injectedCount = 0;
	for (const match of block.matchAll(/^\s+([A-Za-z][A-Za-z0-9_]*),$/gm)) {
		known.add(match[1]);
		injectedCount += 1;
	}
	console.log(`подставляется при создании документа: ${injectedCount} имён`);
} else {
	console.log("ВНИМАНИЕ: объект documentDerivedValues в useAppLogic не найден — подстановки нет");
}

const structured = new Set();
const structuredStart = labels.indexOf("structuredPayloadDocumentKinds");
if (structuredStart >= 0) {
	const end = labels.indexOf("]);", structuredStart);
	for (const match of labels.slice(structuredStart, end).matchAll(/"([a-z0-9_]+)"/g)) structured.add(match[1]);
}

const map = validatorMap(validators);
const broken = [];
const fine = [];

for (const kind of structured) {
	const fnName = map.get(kind);
	if (!fnName) {
		fine.push({ kind, note: "валидатора нет — проверка пропускается" });
		continue;
	}
	const range = functionRange(validators, fnName);
	if (!range) {
		fine.push({ kind, note: `функция ${fnName} не найдена` });
		continue;
	}
	const needed = destructuredFromState(validators, range[0], range[1]);
	const missing = [...needed].filter((n) => !known.has(n));
	if (missing.length > 0) broken.push({ kind, fn: fnName, missing });
	else fine.push({ kind, note: "все имена есть в хранилище" });
}

/* Сборщик содержимого — одна большая функция, разбирающая состояние целиком. */
const payloadRange = [
	logic.indexOf("export function documentPayloadForKind"),
	logic.length,
];
const payloadNeeded = destructuredFromState(logic, payloadRange[0], payloadRange[1]);
const payloadMissing = [...payloadNeeded].filter((n) => !known.has(n));

console.log(`видов документов со структурным содержимым: ${structured.size}`);
console.log(`из них валидатор требует то, чего нет в хранилище: ${broken.length}`);
console.log(`валидатор проходит: ${fine.length}`);

if (broken.length > 0) {
	console.log("\nНЕ СОЗДАДУТСЯ (валидатор упрётся в отсутствующее имя):");
	for (const b of broken.sort((a, z) => z.missing.length - a.missing.length)) {
		console.log(`  ${b.kind} — ${b.fn}`);
		console.log(`      не хватает ${b.missing.length}: ${b.missing.slice(0, 8).join(", ")}${b.missing.length > 8 ? " …" : ""}`);
	}
}

console.log(`\nсборщик содержимого достаёт из состояния имён: ${payloadNeeded.size}`);
console.log(`из них отсутствует в хранилище: ${payloadMissing.length}`);
if (payloadMissing.length > 0) {
	console.log("  " + payloadMissing.slice(0, 40).join(", ") + (payloadMissing.length > 40 ? " …" : ""));
}

const allMissing = new Set([...broken.flatMap((b) => b.missing), ...payloadMissing]);
console.log(`\nвсего разных отсутствующих имён: ${allMissing.size}`);

/*
 * Полный список нужен, чтобы собрать его один раз в useAppLogic и передать
 * валидаторам и сборщику. Печатаем отсортированным: так его удобно сверять с
 * тем, что объявлено в useAppLogic, и видно, чего в проекте нет вовсе.
 */
const logicSource = readFileSync(`${WEB}/useAppLogic.tsx`, "utf8");
const declaredInLogic = [];
const absentEverywhere = [];
for (const name of [...allMissing].sort()) {
	const declared =
		new RegExp(`\\bfunction ${name}\\s*\\(`).test(logicSource) ||
		new RegExp(`\\bconst ${name}\\b`).test(logicSource) ||
		new RegExp(`\\b${name}\\s*[,:]`).test(logicSource);
	(declared ? declaredInLogic : absentEverywhere).push(name);
}
console.log(`\nиз них есть в useAppLogic: ${declaredInLogic.length}`);
console.log(declaredInLogic.join(" "));
if (absentEverywhere.length > 0) {
	console.log(`\nНЕ НАЙДЕНЫ НИГДЕ (${absentEverywhere.length}) — их надо выяснять руками:`);
	console.log(absentEverywhere.join(" "));
}
