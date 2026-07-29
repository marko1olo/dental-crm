/*
 * ГДЕ НУЖЕН РАЗБОР TYPESCRIPT — ЗОВЁТСЯ TYPESCRIPT.
 *
 * Здесь стоял `sourceBetween(source, startNeedle, endNeedle)`: тело функции
 * вырезалось от текста её сигнатуры до текста сигнатуры СЛЕДУЮЩЕЙ функции. Это
 * разбор языка текстовым поиском, и он развалился ровно так, как обязан был:
 * у `downloadIssuedDocumentPdf` убрали параметр `overrideUrl?: string`, страж
 * потерял замыкающую границу и упал сообщением
 *   «Missing source end after async function openIssuedDocumentHtml(documentId: string)»
 * — то есть ПРО СВОЮ РАЗМЕТКУ, а не про предпросмотр документов. Ни одно
 * требование о поведении при этом даже не проверялось: падение случалось на
 * тридцать второй строке, до первой проверки.
 *
 * Хрупкость тут двойная. Граница ломалась от правки ЧУЖОЙ, соседней функции, а
 * `indexOf` по склейке трёх файлов мог увести границу за конец файла, где начало
 * искомой функции, и молча вырезать чужой код.
 *
 * Теперь тело берётся у компилятора: `ts.createSourceFile` + обход дерева до
 * объявления с нужным именем. Границы функции знает парсер, соседи не влияют,
 * переименование параметров и перенос строк — тоже. `typescript` уже в
 * зависимостях, тем же ходом пользуются scripts/check-css-tokens.mjs и
 * scripts/lib/route-topology.mjs.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { appLogicSourceFiles } from "./lib/app-logic-source.mjs";

const webSourceFiles = [
	"apps/web/src/App.tsx",
	...appLogicSourceFiles(),
	"apps/web/src/AppHelpers.tsx",
];

const appSource = webSourceFiles
	.map((file) => readFileSync(file, "utf8"))
	.join("\n");
const serverSource = readFileSync("apps/api/src/server.ts", "utf8");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function requireIn(source, needle, message) {
	assert(source.includes(needle), message);
}

function requireMatch(source, pattern, message) {
	assert(pattern.test(source), message);
}

function forbidIn(source, needle, message) {
	assert(!source.includes(needle), message);
}

/**
 * Тело функции по ИМЕНИ, границами от компилятора TypeScript.
 * Ищутся и `function name()`, и `const name = () => {}` — форма объявления
 * требованием не является.
 */
function functionSource(name) {
	for (const file of webSourceFiles) {
		const text = readFileSync(file, "utf8");
		const sourceFile = ts.createSourceFile(
			file,
			text,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		let found = null;
		const visit = (node) => {
			if (found) return;
			const declaresName =
				(ts.isFunctionDeclaration(node) && node.name?.text === name) ||
				(ts.isVariableDeclaration(node) &&
					ts.isIdentifier(node.name) &&
					node.name.text === name &&
					node.initializer &&
					(ts.isArrowFunction(node.initializer) ||
						ts.isFunctionExpression(node.initializer)));
			if (declaresName) {
				found = text.slice(node.getStart(sourceFile), node.getEnd());
				return;
			}
			ts.forEachChild(node, visit);
		};
		ts.forEachChild(sourceFile, visit);
		if (found) return found;
	}
	assert(false, `Function declaration not found in web sources: ${name}`);
}

const openIssuedDocumentHtmlSource = functionSource("openIssuedDocumentHtml");
const downloadIssuedDocumentHtmlSource = functionSource(
	"downloadIssuedDocumentHtml",
);

requireIn(
	appSource,
	"function issuedDocumentHtmlPreviewUrl(documentId: string): string",
	"App.tsx must centralize the issued HTML preview URL.",
);
requireIn(
	appSource,
	"return `/api/documents/${encodeURIComponent(documentId)}/html`;",
	"Issued HTML preview must use the server API URL and encode the document id.",
);
requireIn(
	appSource,
	"return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;",
	"Issued HTML download must derive from the same server API URL with download=1.",
);

requireIn(
	openIssuedDocumentHtmlSource,
	'window.open(previewUrl, "_blank", "noopener,noreferrer")',
	"Issued HTML preview must open the API URL directly so server response headers remain in force.",
);
requireIn(
	openIssuedDocumentHtmlSource,
	"clinicalAdminSecretSession.trim()",
	"Secret-header sessions must not open a predictable unauthenticated preview tab.",
);
requireIn(
	openIssuedDocumentHtmlSource,
	"не может передать секрет администратора клиники",
	"Secret-header sessions must explain why the archive download fallback is used.",
);
forbidIn(
	openIssuedDocumentHtmlSource,
	"fetch(",
	"Issued HTML preview must not fetch and clone server HTML into a browser-owned document.",
);
forbidIn(
	openIssuedDocumentHtmlSource,
	"response.blob()",
	"Issued HTML preview must not convert server HTML to a blob.",
);
forbidIn(
	openIssuedDocumentHtmlSource,
	"URL.createObjectURL",
	"Issued HTML preview must not create a blob: preview URL.",
);
forbidIn(
	openIssuedDocumentHtmlSource,
	"window.setTimeout",
	"Issued HTML preview must not rely on delayed object URL revocation.",
);
requireIn(
	openIssuedDocumentHtmlSource,
	"await downloadIssuedDocumentHtml(documentId, { preserveError: true });",
	"Popup-blocked issued HTML preview must immediately invoke the safe archive download fallback.",
);
requireIn(
	openIssuedDocumentHtmlSource,
	"Скачать HTML",
	"Popup-blocked fallback message must point operators to the visible HTML download action.",
);

/*
 * СВЯЗЬ, А НЕ НАПИСАНИЕ. Игла требовала весь вызов одной строкой и с голым
 * `denteClinicalReadHeaders()`. В useAppLogic.tsx вызов занимает четыре строки, а
 * заголовки берутся через `auth.denteClinicalReadHeaders()` — заголовки уехали в
 * объект auth. Требуется же ровно три вещи: качается именно download-адрес, кэш
 * выключен, и заголовки — аутентифицированные клинические (с любым префиксом
 * объекта-владельца).
 */
requireMatch(
	downloadIssuedDocumentHtmlSource,
	/fetch\(\s*issuedDocumentHtmlDownloadUrl\(documentId\)\s*,\s*\{[\s\S]{0,200}?cache:\s*"no-store"[\s\S]{0,200}?headers:\s*(?:[A-Za-z_$][\w$]*\.)*denteClinicalReadHeaders\(\)/,
	"Issued HTML download fallback must keep the authenticated no-store fetch path.",
);
requireIn(
	downloadIssuedDocumentHtmlSource,
	"if (!options.preserveError) setError(null);",
	"Popup-blocked fallback must not erase the visible fallback guidance after a successful download.",
);

requireIn(
	serverSource,
	'reply.header("Cache-Control", "no-store")',
	"API responses must keep no-store headers.",
);
requireIn(
	serverSource,
	'reply.header("X-Content-Type-Options", "nosniff")',
	"API responses must keep nosniff headers.",
);
requireIn(
	serverSource,
	'reply.header("Content-Security-Policy", contentSecurityPolicy)',
	"API responses must keep CSP headers.",
);
requireIn(
	serverSource,
	'contentType.includes("text/html")',
	"Server CSP must keep a dedicated policy for HTML document responses.",
);
requireIn(
	serverSource,
	"default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
	"Issued HTML server preview must stay under the restrictive HTML CSP.",
);

console.log(
	JSON.stringify(
		{
			ok: true,
			previewOpensServerUrl: true,
			secretHeaderSessionUsesDownloadFallback: true,
			blobPreviewForbidden: true,
			popupBlockedDownloadFallback: true,
			serverHtmlHeadersChecked: [
				"Cache-Control",
				"X-Content-Type-Options",
				"Content-Security-Policy",
			],
		},
		null,
		2,
	),
);
