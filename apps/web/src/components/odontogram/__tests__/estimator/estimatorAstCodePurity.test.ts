import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "@babel/parser";
import { INVENTED_SERVICE_IDS } from "./estimatorTestHelpers";

function* astNodes(node: unknown): Generator<Record<string, unknown>> {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) yield* astNodes(child);
		return;
	}
	const record = node as Record<string, unknown>;
	if (typeof record.type === "string") yield record;
	for (const [key, value] of Object.entries(record)) {
		if (key === "loc" || key === "comments" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") {
			continue;
		}
		yield* astNodes(value);
	}
}

function componentAstNodes(): Record<string, unknown>[] {
	const source = readFileSync(new URL("../../TreatmentEstimator.tsx", import.meta.url), "utf8");
	const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
	return [...astNodes(ast)];
}

test("в коде сметы не осталось ни одного выдуманного идентификатора услуги", () => {
	const strings = componentAstNodes()
		.filter((node) => node.type === "StringLiteral")
		.map((node) => String(node.value));
	for (const id of INVENTED_SERVICE_IDS) {
		assert.ok(!strings.includes(id), `в коде компонента остался «${id}»`);
	}
	for (const invented of ["Коронка из диоксида циркония", "Коронка детская стандартная", "Эндодонтическое лечение (Пульпит)"]) {
		assert.ok(!strings.includes(invented), `в коде осталось «${invented}»`);
	}
});

test("в коде сметы ни одному денежному полю не присвоено число", () => {
	const moneyProperties = new Set(["price", "priceRub", "basePriceRub"]);
	const offenders: string[] = [];
	for (const node of componentAstNodes()) {
		if (node.type !== "ObjectProperty") continue;
		const key = node.key as Record<string, unknown> | null;
		const name = key && typeof key.name === "string" ? key.name : null;
		if (!name) continue;
		if (name === "priceRub") offenders.push("priceRub");
		if (!moneyProperties.has(name)) continue;
		const value = node.value as Record<string, unknown> | null;
		if (value && value.type === "NumericLiteral") {
			offenders.push(`${name}: ${String(value.value)}`);
		}
	}
	assert.deepEqual(offenders, [], `в коде зашиты деньги: ${offenders.join(", ")}`);
});

test("декомпозиция сметчика на модули: каждый файл строго <= 800 строк (Мандат 8b)", () => {
	const filesToCheck = [
		"../../treatmentEstimatorPricing.ts",
		"../../treatmentEstimatorRules.ts",
		"../../treatmentEstimatorCatalogMatching.ts",
		"../../treatmentEstimatorMoney.ts",
		"../../treatmentEstimatorValidation.ts",
		"../../treatmentEstimatorStagesAndConflicts.ts",
		"../../treatmentEstimatorBundles.ts",
		"../../treatmentEstimatorReconciler.ts",
	];
	for (const relPath of filesToCheck) {
		const source = readFileSync(new URL(relPath, import.meta.url), "utf8");
		const lineCount = source.split("\n").length;
		assert.ok(lineCount <= 800, `Файл ${relPath} разросся до ${lineCount} строк (Мандат 8b)`);
	}
});
