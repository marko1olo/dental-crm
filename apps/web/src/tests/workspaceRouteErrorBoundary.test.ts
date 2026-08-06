/**
 * Проверка того, что стек JavaScript не попадает на экран сотрудника клиники.
 *
 * Ошибка, из-за которой появился этот файл: граница ошибок маршрутов возвращала
 * `[Error] ${error.message}\n${error.stack || ''}` без проверки режима сборки и
 * рисовала это значение в `<small>`. Администратор клиники при любом сбое
 * рендера видел сырой стек с путями внутри бандла и именами внутренних модулей.
 * Ни типы, ни сборка такого не видят: `error.stack` — обычная строка, typecheck
 * на неё зелёный. Поймать это можно только проверкой самого решения
 * «показывать стек или нет», поэтому оно вынесено в чистую функцию.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	workspaceRouteErrorDetail,
	workspaceRouteErrorPresentation,
} from "../workspaceRouteErrorBoundary";

const occurredAt = new Date(Date.UTC(2026, 6, 28, 11, 35, 7));

function errorWithStack(): Error {
	const error = new Error(
		"Cannot read properties of undefined (reading 'organizationId')",
	);
	error.stack =
		"Error: Cannot read properties of undefined (reading 'organizationId')\n" +
		"    at PatientsView (/assets/PatientsView-Bq3xK1.js:1:24177)\n" +
		"    at renderWithHooks (/assets/vendor-react-9f21.js:2:41883)";
	return error;
}

describe("вид сбоя раздела для сотрудника клиники", () => {
	test("в production стека нет ни в одном поле", () => {
		const presentation = workspaceRouteErrorPresentation(errorWithStack(), {
			includeDiagnostics: false,
			occurredAt,
		});

		assert.equal(presentation.diagnostics, "");

		const everythingShown = `${presentation.hint}\n${presentation.diagnostics}\n${presentation.reference}`;
		// Ни стека, ни путей внутри бандла, ни англоязычного текста исключения.
		assert.doesNotMatch(everythingShown, /at PatientsView/);
		assert.doesNotMatch(everythingShown, /\/assets\//);
		assert.doesNotMatch(everythingShown, /renderWithHooks/);
		assert.doesNotMatch(everythingShown, /organizationId/);
		assert.doesNotMatch(everythingShown, /\[Error\]/);
	});

	test("в разработке стек виден целиком", () => {
		const presentation = workspaceRouteErrorPresentation(errorWithStack(), {
			includeDiagnostics: true,
			occurredAt,
		});

		assert.match(
			presentation.diagnostics,
			/^\[Error\] Cannot read properties of undefined/,
		);
		assert.match(
			presentation.diagnostics,
			/at PatientsView \(\/assets\/PatientsView-Bq3xK1\.js:1:24177\)/,
		);
		assert.match(presentation.diagnostics, /renderWithHooks/);
	});

	test("сообщение об ошибке не подставляется в текст для человека", () => {
		const secretish = new Error(
			"PGlite connect ECONNREFUSED 127.0.0.1:5432 user=dente_admin",
		);
		const presentation = workspaceRouteErrorPresentation(secretish, {
			includeDiagnostics: false,
			occurredAt,
		});

		assert.doesNotMatch(presentation.hint, /5432/);
		assert.doesNotMatch(presentation.hint, /dente_admin/);
		assert.equal(
			presentation.hint,
			"Раздел остановлен до обновления, чтобы не показывать неполное рабочее место.",
		);
	});

	test("сбой загрузки чанка распознаётся и в production", () => {
		const chunkFailure = new Error(
			"Failed to fetch dynamically imported module: /assets/FinanceView.js",
		);
		const presentation = workspaceRouteErrorPresentation(chunkFailure, {
			includeDiagnostics: false,
			occurredAt,
		});

		assert.equal(
			presentation.hint,
			"Файлы раздела не загрузились. Обычно помогает обновление после восстановления сети.",
		);
		// Подсказка про сеть не должна тащить за собой имя файла бандла.
		assert.doesNotMatch(presentation.hint, /\/assets\//);
		assert.equal(presentation.diagnostics, "");
	});

	test("ошибка без стека не даёт строку 'undefined' на экране разработчика", () => {
		const bare = new Error("boom");
		bare.stack = "";

		const presentation = workspaceRouteErrorPresentation(bare, {
			includeDiagnostics: true,
			occurredAt,
		});

		assert.equal(presentation.diagnostics, "[Error] boom");
		assert.doesNotMatch(presentation.diagnostics, /undefined/);
	});

	test("брошенное не-исключение в production тоже не показывается", () => {
		const presentation = workspaceRouteErrorPresentation(
			{ internalRoute: "/api/imaging/studies", token: "не должно всплыть" },
			{ includeDiagnostics: false, occurredAt },
		);

		assert.equal(presentation.diagnostics, "");
		assert.doesNotMatch(presentation.hint, /imaging/);
	});

	test("фраза для человека не зависит от режима сборки и не содержит ошибку", () => {
		// Эта функция — то, что видно всегда, в том числе в production. Ветка с
		// диагностикой её не касается, поэтому проверяется отдельно от presentation.
		const detail = workspaceRouteErrorDetail(errorWithStack());

		assert.doesNotMatch(detail, /Error/);
		assert.doesNotMatch(detail, /\/assets\//);
		assert.doesNotMatch(detail, /at PatientsView/);
		assert.doesNotMatch(detail, /organizationId/);
		assert.equal(
			detail,
			workspaceRouteErrorPresentation(errorWithStack(), {
				includeDiagnostics: true,
				occurredAt,
			}).hint,
		);
	});

	test("время сбоя выдаётся в обоих режимах и в русском формате", () => {
		const production = workspaceRouteErrorPresentation(errorWithStack(), {
			includeDiagnostics: false,
			occurredAt,
		});
		const development = workspaceRouteErrorPresentation(errorWithStack(), {
			includeDiagnostics: true,
			occurredAt,
		});

		// Без этого сотруднику нечего назвать в поддержку: сквозного
		// идентификатора запроса в apps/web не существует.
		assert.match(
			production.reference,
			/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}$/,
		);
		assert.equal(production.reference, development.reference);
	});
});
