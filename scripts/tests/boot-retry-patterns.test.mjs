#!/usr/bin/env node
/**
 * Корпус форм для выражений из scripts/lib/boot-retry-patterns.mjs.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Гейт про текст точным не бывает: одно выражение
 * проверяет ровно ту форму, которую придумал его автор. Три требования из
 * scripts/smoke-app-boot-state-source.mjs уже один раз оказались проверкой
 * ОТСТУПА вместо проверки смысла — они краснели на целом продукте, потому что
 * форматтер отбил App.tsx табами и разбил длинный вызов по lineWidth 80.
 * Замена подстроки на выражение чинит это, но сама по себе создаёт вторую
 * ловушку: выражение может оказаться либо слишком узким (краснеет на честной
 * перестановке), либо слишком широким (молчит на настоящем дефекте).
 *
 * Поэтому здесь два корпуса на каждое требование:
 *  - ЭКВИВАЛЕНТНЫЕ ФОРМЫ — обязаны проходить. Это тот же смысл, записанный
 *    иначе: другой отступ, перенос в другом месте, лишняя висячая запятая.
 *  - ПОЧТИ-НАРУШЕНИЯ — обязаны краснеть. Отличаются от годной формы одной
 *    содержательной деталью: пропало действие, потерян аргумент, подменён текст.
 *
 * Тест импортирует выражения из общего модуля, а не переписывает их у себя:
 * копия проверяла бы сама себя, а в этом дереве расхождение копий одного и того
 * же обхода уже случалось (см. шапку scripts/lib/source-tree.mjs).
 *
 * Запуск:  node --test scripts/tests/boot-retry-patterns.test.mjs
 *          npm run smoke:script-guards
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	bootRetryClearsErrorPattern,
	bootRetryFailureIsOperatorReadablePattern,
	bootServerErrorDelegationPattern,
} from "../lib/boot-retry-patterns.mjs";

/** Гоняет оба корпуса и печатает, какая именно форма разошлась с ожиданием. */
function checkCorpus(pattern, { accepts, rejects }) {
	for (const [name, source] of Object.entries(accepts)) {
		assert.equal(
			pattern.test(source),
			true,
			`эквивалентная форма обязана проходить, но краснеет: ${name}`,
		);
	}
	for (const [name, source] of Object.entries(rejects)) {
		assert.equal(
			pattern.test(source),
			false,
			`почти-нарушение обязано краснеть, но проходит: ${name}`,
		);
	}
}

test("делегирование ветки отказа сервера: форма свободна, смысл закреплён", () => {
	checkCorpus(bootServerErrorDelegationPattern, {
		accepts: {
			"текущая форма продукта, отступ табами":
				'<AppLoadingState\n\t\t\t\tmessage={`Рабочий сервер недоступен: ${error}`}\n\t\t\t\tactionLabel="Повторить загрузку"\n\t\t\t/>',
			"прежняя форма, отступ восемью пробелами":
				"<AppLoadingState\n        message={`Рабочий сервер недоступен: ${error}`}",
			"схлопнуто форматтером в одну строку":
				"return <AppLoadingState message={`Рабочий сервер недоступен: ${error}`} />;",
			"перенос без отступа вовсе":
				"<AppLoadingState\nmessage={`Рабочий сервер недоступен: ${error}`}",
		},
		rejects: {
			"жаргон вместо человеческой причины":
				"<AppLoadingState\n\t\t\t\tmessage={`API недоступен: ${error}`}",
			"причина есть, текст ошибки не подставлен":
				"<AppLoadingState\n\t\t\t\tmessage={`Рабочий сервер недоступен`}",
			"текст собран конкатенацией мимо шаблона":
				'<AppLoadingState\n\t\t\t\tmessage={"Рабочий сервер недоступен: " + error}',
			"разметка вписана в App.tsx вместо делегирования":
				'<main className="boot-state">\n\t\t\t\t<p>{`Рабочий сервер недоступен: ${error}`}</p>',
			"message принадлежит соседнему тегу":
				"<SomeOtherState\n\t\t\t\tmessage={`Рабочий сервер недоступен: ${error}`}",
		},
	});
});

test("повтор загрузки: сначала снять ошибку, потом грузить", () => {
	checkCorpus(bootRetryClearsErrorPattern, {
		accepts: {
			"текущая форма продукта, отступ табами":
				"setError(null);\n\t\t\t\t\tvoid loadDashboard().catch((loadError: unknown) => {",
			"прежняя форма, отступ десятью пробелами":
				"setError(null);\n          void loadDashboard().catch",
			"без void":
				"setError(null);\n\t\t\t\t\tloadDashboard().catch((loadError: unknown) => {",
			"перенос перед .catch":
				"setError(null);\n\t\t\t\t\tvoid loadDashboard()\n\t\t\t\t\t\t.catch((loadError: unknown) => {",
			"между действиями стоит ещё одна инструкция":
				"setError(null);\n\t\t\t\t\tsetRetrying(true);\n\t\t\t\t\tvoid loadDashboard().catch(",
		},
		rejects: {
			"ошибка не снята — повтор идёт под старым сообщением":
				"void loadDashboard().catch((loadError: unknown) => {",
			"обратный порядок: сначала грузим, потом снимаем":
				"void loadDashboard().catch((loadError: unknown) => {});\n\t\t\t\t\tsetError(null);",
			"снята не ошибка, а другое состояние":
				"setNotice(null);\n\t\t\t\t\tvoid loadDashboard().catch(",
			"снято непустым значением":
				'setError("");\n\t\t\t\t\tvoid loadDashboard().catch(',
			"загрузка без обработки отказа":
				"setError(null);\n\t\t\t\t\tvoid loadDashboard();",
			"loadDashboard из другого обработчика, далеко за окном": `setError(null);\n${"\t// посторонний код\n".repeat(40)}\tvoid loadDashboard().catch(`,
		},
	});
});

test("отказ повторной загрузки остаётся читаемым сотрудником", () => {
	checkCorpus(bootRetryFailureIsOperatorReadablePattern, {
		accepts: {
			"текущая форма продукта, разбита форматтером":
				'operatorWorkflowFailureMessage(\n\t\t\t\t\t\t\t\t"Не удалось загрузить данные клиники",\n\t\t\t\t\t\t\t\tloadError,\n\t\t\t\t\t\t\t)',
			"прежняя форма, одной строкой":
				'operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError)',
			"без висячей запятой":
				'operatorWorkflowFailureMessage(\n\t"Не удалось загрузить данные клиники",\n\tloadError\n)',
		},
		rejects: {
			"пойманная ошибка потеряна — заголовок без причины":
				'operatorWorkflowFailureMessage("Не удалось загрузить данные клиники")',
			"передана не пойманная ошибка, а посторонняя":
				'operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", error)',
			"сырой отказ мимо человеческой обёртки":
				"setError(`Не удалось загрузить данные клиники: ${loadError}`)",
			"текст подменён на жаргон":
				'operatorWorkflowFailureMessage("API недоступен", loadError)',
			"аргументы переставлены местами":
				'operatorWorkflowFailureMessage(loadError, "Не удалось загрузить данные клиники")',
		},
	});
});
