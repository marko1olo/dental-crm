import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
	APP_PATH,
	namesConsumedByApp,
	producedNames,
	webSrcRoot,
} from "./utils/appLogicAstInspector";

/**
 * Страж: обработчик, которого нет в объекте общей логики, — это мёртвая кнопка.
 *
 * Множество имён, которые App.tsx достаёт из appLogicValue,
 * сверяется с множеством имён, которые её объект РЕАЛЬНО отдаёт.
 * Разбор AST вынесен в apps/web/src/tests/utils/appLogicAstInspector.ts (Мандаты 8b, 8zi).
 */

/**
 * Мёртвые имена, известные на день постановки стража, с причиной по каждому.
 * Ранее найденные 11 мёртвых имён были полностью устранены в ходе декомпозиции
 * App.tsx и доменных хуков (Мандаты 8b, 8zi). Вычеркивать по мере починки;
 * добавлять — только вместе с причиной.
 */
const DANGLING_BACKLOG: ReadonlyArray<{
	readonly name: string;
	readonly reason: string;
}> = [];

test("общая логика отдаёт каждое имя, которое достаёт App.tsx", () => {
	const consumed = namesConsumedByApp();
	const produced = producedNames();
	assert.ok(
		consumed.size >= 20,
		`Деструктуризация appLogicValue выродилась: имён ${consumed.size}`,
	);
	assert.ok(
		produced.size > 500,
		`Набор отдаваемых имён выродился: имён ${produced.size}`,
	);

	const dangling = [...consumed].filter((name) => !produced.has(name)).sort();
	const expected = DANGLING_BACKLOG.map((entry) => entry.name).sort();
	assert.deepEqual(
		dangling,
		expected,
		`Мёртвые имена в деструктуризации appLogicValue разошлись со списком долга.\n` +
			`Сейчас в дереве: ${dangling.join(", ") || "(нет)"}\n` +
			`В списке долга:  ${expected.join(", ") || "(нет)"}\n` +
			`Новое имя = кнопка, которая упадёт TypeError при нажатии. Починенное имя вычеркните из DANGLING_BACKLOG.`,
	);
	for (const entry of DANGLING_BACKLOG) {
		assert.ok(
			entry.reason.trim().length > 40,
			`Запись долга ${entry.name} без внятной причины`,
		);
	}
});

test("мастер первого запуска не зовёт ни одного мёртвого имени", () => {
	const ONBOARDING_MODAL_PATH = join(
		webSrcRoot,
		"components",
		"onboarding",
		"OnboardingWizardModal.tsx",
	);
	const source = existsSync(ONBOARDING_MODAL_PATH)
		? readFileSync(ONBOARDING_MODAL_PATH, "utf8")
		: readFileSync(APP_PATH, "utf8");
	const wizard = source.split(/\r?\n/);
	const openIndex = 0;
	const consumed = namesConsumedByApp();
	const produced = producedNames();
	const dangling = [...consumed].filter((name) => !produced.has(name));

	const hits: string[] = [];
	for (const name of dangling) {
		const called = new RegExp(`\\b${name}\\s*\\(`);
		const referenced = new RegExp(`\\b${name}\\b`);
		wizard.forEach((line, offset) => {
			if (line.trimStart().startsWith("*")) return; // строка комментария-разбора
			if (!referenced.test(line)) return;
			hits.push(
				`App.tsx:${openIndex + offset + 1} — ${name}${called.test(line) ? " (вызов)" : " (ссылка)"}: ${line.trim()}`,
			);
		});
	}
	assert.deepEqual(
		hits,
		[],
		"Первичная настройка — единственный экран, который новая клиника видит раньше всех остальных. " +
			"Мёртвое имя здесь запирает её на первом экране:\n" +
			hits.join("\n"),
	);

	for (const handler of [
		"continueOnboardingInDraftMode",
		"moveOnboardingTo",
		"addStaffMember",
		"addChair",
	]) {
		assert.ok(
			produced.has(handler),
			`Мастер первого запуска опирается на ${handler}, а общая логика его больше не отдаёт`,
		);
		assert.ok(
			wizard.some((line) => new RegExp(`\\b${handler}\\s*\\(`).test(line)),
			`${handler} больше не вызывается внутри мастера первого запуска — проверьте, чем его заменили`,
		);
	}
});
