/**
 * Проверка того, что текст исключения не попадает на экран администратора клиники.
 *
 * Ошибка, из-за которой появился этот файл: `components/ErrorBoundary.tsx`
 * безусловно рисовал `{this.state.error?.message}` в панели отказа — без единой
 * проверки режима сборки. Граница смонтирована в SettingsView трижды, и любое
 * исключение внутри тяжёлых вкладок настроек выдавало администратору клиники
 * сырой текст: путь внутри бандла, имя таблицы, фрагмент SQL, тело ответа
 * сервера. Ни типы, ни сборка такого не видят: `error.message` — обычная строка,
 * typecheck на неё зелёный. Поймать это можно только проверкой самого решения
 * «показывать технический текст или нет», поэтому оно вынесено в чистую функцию.
 *
 * Файл-образец и источник устройства проверок — tests/workspaceRouteErrorBoundary.test.ts.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	moduleErrorDetail,
	moduleErrorPresentation,
} from "../components/ErrorBoundary";

function errorWithStack(): Error {
	const error = new Error(
		"Cannot read properties of undefined (reading 'organizationId')",
	);
	error.stack =
		"Error: Cannot read properties of undefined (reading 'organizationId')\n" +
		"    at SettingsRulesTab (/assets/SettingsRulesTab-Bq3xK1.js:1:24177)\n" +
		"    at renderWithHooks (/assets/vendor-react-9f21.js:2:41883)";
	return error;
}

describe("вид сбоя блока настроек для сотрудника клиники", () => {
	test("в production технического текста нет ни в одном поле", () => {
		const presentation = moduleErrorPresentation(errorWithStack(), {
			includeDiagnostics: false,
		});

		assert.equal(presentation.diagnostics, "");

		const everythingShown = `${presentation.detail}\n${presentation.diagnostics}`;
		// Ни стека, ни путей внутри бандла, ни англоязычного текста исключения.
		assert.doesNotMatch(everythingShown, /at SettingsRulesTab/);
		assert.doesNotMatch(everythingShown, /\/assets\//);
		assert.doesNotMatch(everythingShown, /renderWithHooks/);
		assert.doesNotMatch(everythingShown, /organizationId/);
		assert.doesNotMatch(everythingShown, /\[Error\]/);
	});

	test("в разработке стек виден целиком", () => {
		const presentation = moduleErrorPresentation(errorWithStack(), {
			includeDiagnostics: true,
		});

		assert.match(
			presentation.diagnostics,
			/^\[Error\] Cannot read properties of undefined/,
		);
		assert.match(
			presentation.diagnostics,
			/at SettingsRulesTab \(\/assets\/SettingsRulesTab-Bq3xK1\.js:1:24177\)/,
		);
		assert.match(presentation.diagnostics, /renderWithHooks/);
	});

	test("внутренности из текста исключения не подставляются в фразу для человека", () => {
		// Ровно тот класс строк, ради которого правка и делалась: адрес базы,
		// имя пользователя СУБД, фрагмент SQL с именем таблицы.
		const leaky = new Error(
			'insert into "patients" ... connect ECONNREFUSED 127.0.0.1:5432 user=dente_admin',
		);
		const presentation = moduleErrorPresentation(leaky, {
			includeDiagnostics: false,
		});

		assert.doesNotMatch(presentation.detail, /5432/);
		assert.doesNotMatch(presentation.detail, /dente_admin/);
		assert.doesNotMatch(presentation.detail, /patients/);
		assert.doesNotMatch(presentation.detail, /insert into/);
		assert.equal(
			presentation.detail,
			"Блок остановлен до повтора, чтобы не показывать неполные настройки.",
		);
	});

	test("сбой загрузки чанка распознаётся и в production", () => {
		const chunkFailure = new Error(
			"Failed to fetch dynamically imported module: /assets/SettingsImportsTab.js",
		);
		const presentation = moduleErrorPresentation(chunkFailure, {
			includeDiagnostics: false,
		});

		assert.equal(
			presentation.detail,
			"Файлы этого блока не загрузились. Обычно помогает повтор после восстановления сети.",
		);
		// Подсказка про сеть не должна тащить за собой имя файла бандла.
		assert.doesNotMatch(presentation.detail, /\/assets\//);
		assert.equal(presentation.diagnostics, "");
	});

	test("ошибка без стека не даёт строку 'undefined' на экране разработчика", () => {
		const bare = new Error("boom");
		bare.stack = "";

		const presentation = moduleErrorPresentation(bare, {
			includeDiagnostics: true,
		});

		assert.equal(presentation.diagnostics, "[Error] boom");
		assert.doesNotMatch(presentation.diagnostics, /undefined/);
	});

	test("брошенное не-исключение в production тоже не показывается", () => {
		const presentation = moduleErrorPresentation(
			{ internalRoute: "/api/settings/rules", token: "не должно всплыть" },
			{ includeDiagnostics: false },
		);

		assert.equal(presentation.diagnostics, "");
		assert.doesNotMatch(presentation.detail, /settings\/rules/);
		assert.doesNotMatch(presentation.detail, /всплыть/);
	});

	test("фраза для человека не зависит от режима сборки и не содержит ошибку", () => {
		// Эта функция — то, что видно всегда, в том числе в production. Ветка с
		// диагностикой её не касается, поэтому проверяется отдельно.
		const detail = moduleErrorDetail(errorWithStack());

		assert.doesNotMatch(detail, /Error/);
		assert.doesNotMatch(detail, /\/assets\//);
		assert.doesNotMatch(detail, /at SettingsRulesTab/);
		assert.doesNotMatch(detail, /organizationId/);
		assert.equal(
			detail,
			moduleErrorPresentation(errorWithStack(), { includeDiagnostics: true })
				.detail,
		);
	});
});
