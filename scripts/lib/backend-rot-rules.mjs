/**
 * scripts/lib/backend-rot-rules.mjs
 *
 * Реальный TypeScript Compiler AST-инквизитор системной гнили бэкенда (`apps/api/src`, `packages/shared/src`).
 * Ловит глубокие баги, к которым слепы регулярки и `tsc`:
 *   - `tx` функция дёргает глобальный `db.*` (self-deadlock узкого пула PG18),
 *   - внешний `fetch()` / `readFileSync()` внутри открытой PG-транзакции,
 *   - `SET session_replication_role = 'replica'` (`42501` в бою на PG18),
 *   - `FOR UPDATE` без `ORDER BY` (дедлоки `40P01`),
 *   - `.toISOString().slice(0, 10)` в роутах/сервисах (сдвиг дат на сутки из-за UTC),
 *   - `NODE_ENV === "test"` обходы авторизации/токенов в боевом коде,
 *   - неограниченные `select().from(...)` на массовых таблицах в роутах (OOM на 4 ГБ ОЗУ),
 *   - `sql.raw(...)` / `query(...)` с интерполяцией `${...}` или `+` (SQLi / краш),
 *   - внешний `fetch()` в API/демонах без `signal:` (таймаута AbortSignal),
 *   - `setInterval()` без `.unref()` (зависание graceful shutdown и тестов),
 *   - float-умножения/деления `* 100` / `/ 100` / `* 0.01` на деньгах вне `money.ts`.
 */

import ts from "typescript";

export const BACKEND_ROT_RULE_KEYS = [
	"tx_calls_global_db",
	"network_or_sync_io_inside_tx",
	"replica_session_role",
	"for_update_without_order",
	"utc_date_slice_shift",
	"node_env_test_bypass_in_prod",
	"unbounded_select_in_route",
	"raw_sql_string_interpolation",
	"missing_fetch_timeout_abort_signal",
	"set_interval_without_unref",
	"floating_point_money_in_domain",
	"inner_join_drops_optional_visit",
	"unbounded_memory_cache",
	"unhandled_tx_savepoint_fake_200",
];

export const BACKEND_ROT_GUIDANCE = {
	tx_calls_global_db:
		"Внутри функции/транзакции с параметром `tx` вызван глобальный `db.*`! На узком пуле PG18 (5-10 коннектов под HDD) это гарантированный self-deadlock. Передавай и используй строго `tx.*`!",
	network_or_sync_io_inside_tx:
		"Внутри открытой транзакции PG (`db.transaction`/`withTenantWriteCtx`/`withTenantReadCtx`) торчит внешний `fetch()` или синхронный `readFileSync`! При подвисании LLM/ОФД/бота коннект PG висит мёртвым грузом и кладёт всю клинику. Выноси сетевой I/O и файлы наружу (короткие `runReadTx`/`runWriteTx`).",
	replica_session_role:
		"`SET session_replication_role = 'replica'` падает с `42501 permission denied` под боевой ролью PostgreSQL 18 (не superuser)! Для DR-восстановления используй топологический порядок таблиц и 2-проходные `deferredNullableColumns`.",
	for_update_without_order:
		"SQL `SELECT ... FOR UPDATE` без `ORDER BY` вызывает взаимоблокировки (`40P01 deadlock detected`) при параллельной работе двух кабинетов. Добавь детерминированный `ORDER BY id ASC` перед `FOR UPDATE`.",
	utc_date_slice_shift:
		"`.toISOString().slice(0, 10)` (или `.split('T')[0]`) сдвигает даты клиник РФ (+03..+12) на прошлые сутки около полуночи! Форматируй даты расписания/кассы строго в `clinicTimezone` клиники.",
	node_env_test_bypass_in_prod:
		"Боевой роут/сервис/демон проверяет `NODE_ENV === 'test'` для обхода проверки токенов/подписей/BOLA! Вне тестов любые обходы запрещены: используй явный DI при регистрации роута.",
	unbounded_select_in_route:
		"В API-роуте таблица с десятками тысяч записей выбирается без `.where(...)` И без `.limit(...)`! На сервере клиники с 4 ГБ ОЗУ это роняет процесс или тормозит интерфейс. Внедри `.limit()` и keyset-пагинацию.",
	raw_sql_string_interpolation:
		"Динамическая конкатенация `+` или `${...}` внутри `sql.raw()`/`pool.query()`/`client.query()` вместо параметров `$1` / `sql`! Риск SQL-инъекции и падений синтаксиса.",
	missing_fetch_timeout_abort_signal:
		"Внешний `fetch(...)` без `signal` (например `AbortSignal.timeout(10_000)` или `controller.signal`)! Если внешний сервис повиснет, запрос Fastify зависнет навсегда и выест пул.",
	set_interval_without_unref:
		"Фоновый `setInterval(...)` не вызывает `.unref()`! Процесс API или тесты будут висеть на завершении до таймаута ОС.",
	floating_point_money_in_domain:
		"Ручной IEEE-754 float-пересчёт денег (`* 100` / `/ 100` / `* 0.01`) в финансовом/биллинговом домене! Используй целочисленные `*Kopecks` и `@dental/shared` `money.ts`.",
	inner_join_drops_optional_visit:
		"В финансовом/зарплатном расчёте стоит `.innerJoin(visits/appointments)`! При авансе или возврате без привязанного визита `INNER JOIN` молча выбрасывает деньги врача/клиники из отчёта — меняй на `.leftJoin(...)`!",
	unbounded_memory_cache:
		"Глобальный модульный `new Map()` / `new Set()` на уровне модуля в бэкенде без `BoundedTtlMap` (LRU + TTL)! На сервере с 4 ГБ ОЗУ это гарантированная утечка памяти за недели аптайма.",
	unhandled_tx_savepoint_fake_200:
		"Перехват ошибки снаружи `db.transaction()`/`withTenantWriteCtx()` с возвратом `{ ok: true }` или `reply.send()` без статуса ошибки! PostgreSQL уже откатил транзакцию — отдавать клиенту 200 OK категорически запрещено.",
};

function hasTxParameter(node) {
	if (!("parameters" in node) || !Array.isArray(node.parameters)) return false;
	return node.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === "tx");
}

function getChainText(expr) {
	return expr.getText ? expr.getText().replace(/\s+/g, " ") : "";
}

function getSqlStringLiteralText(node) {
	if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}
	if (ts.isTemplateExpression(node)) {
		return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ${...} ");
	}
	return null;
}

const MULTI_ROW_TABLES_RE = /\b(?:patients|appointments|invoices|payments|labOrders|dentalLabOrders|visits|auditLogs|smsMessages|telephonyCalls)\b/;
const TX_WRAPPER_NAMES = new Set(["transaction", "withTenantWriteCtx", "withTenantReadCtx", "runReadTx", "runWriteTx"]);
const MONEY_DOMAIN_PATH_RE = /\/(?:billing|payroll|payments|cashbox|invoices|finance|lab)\//i;
const MONEY_VAR_RE = /(?:rub|kop|kopecks|price|amount|total|pay|sum|balance|fee|salary|cash|cost|advance|refund|revenue|cents)/i;

function insideFn(node) {
	let p = node.parent;
	while (p) {
		if (ts.isFunctionLike(p)) return true;
		p = p.parent;
	}
	return false;
}

/**
 * Inspects a single backend `.ts` / `.js` file via TypeScript Compiler AST.
 */
export function scanBackendRotAst(filePath, content) {
	const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const findings = [];
	const normPath = filePath.replace(/\\/g, "/");
	const isRouteOrService = /\/(?:routes|services|daemons|ai|integrations|security)\//.test(normPath);
	const isRouteFile = /\/routes\//.test(normPath);
	const isMoneyDomain = MONEY_DOMAIN_PATH_RE.test(normPath) && !/(?:money|kopecks)[^/]*\.[cm]?[jt]s$/i.test(normPath);

	const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
	const push = (rule, pos, snippet, customMsg) => {
		findings.push({
			rule,
			file: normPath,
			line: lineOf(pos),
			snippet: String(snippet).replace(/\s+/g, " ").trim().slice(0, 140),
			message: customMsg || BACKEND_ROT_GUIDANCE[rule] || rule,
		});
	};

	function visit(node, ctx) {
		const isFunctionLike =
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node);

		let nextCtx = ctx;
		if (isFunctionLike) {
			const introducesTxParam = hasTxParameter(node);
			const shadowsDb =
				Array.isArray(node.parameters) &&
				node.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === "db");
			nextCtx = {
				...ctx,
				insideTxScope: introducesTxParam || ctx.insideTxScope,
				dbShadowed: shadowsDb ? true : introducesTxParam ? false : ctx.dbShadowed,
			};
		}

		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			const methodName = ts.isPropertyAccessExpression(callee)
				? callee.name.text
				: ts.isIdentifier(callee)
					? callee.text
					: "";

			if (TX_WRAPPER_NAMES.has(methodName)) {
				for (const arg of node.arguments) {
					if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
						visit(arg, { ...nextCtx, insideTxWrapper: true });
					} else {
						visit(arg, nextCtx);
					}
				}
				visit(callee, nextCtx);
				return;
			}

			// 1. Calling global `db.*` while inside a function/closure holding `tx`
			if (
				nextCtx.insideTxScope &&
				!nextCtx.dbShadowed &&
				ts.isPropertyAccessExpression(callee) &&
				ts.isIdentifier(callee.expression) &&
				callee.expression.text === "db" &&
				/^(?:select|insert|update|delete|execute|query)$/.test(callee.name.text)
			) {
				push("tx_calls_global_db", node.getStart(sf), getChainText(callee));
			}

			// 2. External fetch() or sync readFileSync() inside open PG transaction wrapper
			if (nextCtx.insideTxWrapper) {
				if (
					(ts.isIdentifier(callee) && (callee.text === "fetch" || callee.text === "readFileSync")) ||
					(ts.isPropertyAccessExpression(callee) &&
						ts.isIdentifier(callee.expression) &&
						callee.expression.text === "fs" &&
						callee.name.text === "readFileSync")
				) {
					push("network_or_sync_io_inside_tx", node.getStart(sf), getChainText(node));
				}
			}

			// 2b. External fetch() in routes/services/ai/integrations without AbortSignal / signal option
			if (isRouteOrService && ts.isIdentifier(callee) && callee.text === "fetch") {
				const initArg = node.arguments[1];
				let hasSignal = false;
				if (initArg) {
					const initTxt = getChainText(initArg);
					hasSignal = /\bsignal\b|\bAbortSignal\b/.test(initTxt);
				}
				if (!hasSignal) {
					push("missing_fetch_timeout_abort_signal", node.getStart(sf), getChainText(node));
				}
			}

			// 2c. setInterval without .unref() anywhere in enclosing block or chained call
			if (ts.isIdentifier(callee) && callee.text === "setInterval") {
				const parentTxt = node.parent ? getChainText(node.parent) : "";
				let hasUnref = /\.\s*unref\s*\(/.test(parentTxt);
				if (!hasUnref && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
					const varName = node.parent.name.text;
					let scope = node.parent;
					while (scope && !ts.isBlock(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
					if (scope && new RegExp(`\\b${varName}\\s*(?:\\?\\.)?\\.\\s*unref\\s*\\(`).test(scope.getText(sf))) {
						hasUnref = true;
					}
				}
				if (!hasUnref) {
					push("set_interval_without_unref", node.getStart(sf), getChainText(node));
				}
			}

			// 2d. Raw SQL string interpolation via sql.raw(`...${x}...`) or pool/client.query("..." + x)
			if (
				ts.isPropertyAccessExpression(callee) &&
				((ts.isIdentifier(callee.expression) && callee.expression.text === "sql" && callee.name.text === "raw") ||
					(/(?:pool|client|pg|dbRaw)$/.test(callee.expression.getText(sf)) && callee.name.text === "query"))
			) {
				const firstArg = node.arguments[0];
				if (firstArg && ts.isTemplateExpression(firstArg)) {
					const hasDynamicExpr = firstArg.templateSpans.some(
						(sp) => !(ts.isIdentifier(sp.expression) && /^[A-Z][A-Z0-9_]+$/.test(sp.expression.text)),
					);
					if (hasDynamicExpr) {
						push("raw_sql_string_interpolation", node.getStart(sf), getChainText(node));
					}
				} else if (firstArg && ts.isBinaryExpression(firstArg)) {
					push("raw_sql_string_interpolation", node.getStart(sf), getChainText(node));
				}
			}

			// 3. `.toISOString().slice(0, 10)` / `.split("T")[0]` in route/service business logic
			if (isRouteOrService && ts.isPropertyAccessExpression(callee)) {
				const prop = callee.name.text;
				const innerCall = callee.expression;
				if (
					ts.isCallExpression(innerCall) &&
					ts.isPropertyAccessExpression(innerCall.expression) &&
					innerCall.expression.name.text === "toISOString"
				) {
					const fullText = getChainText(node);
					if (
						(prop === "slice" && node.arguments.length === 2 && node.arguments[0]?.getText(sf) === "0" && node.arguments[1]?.getText(sf) === "10") ||
						(prop === "split" && node.arguments[0]?.getText(sf)?.includes("T"))
					) {
						push("utc_date_slice_shift", node.getStart(sf), fullText);
					}
				}
			}

			// 4b. `.innerJoin(visits` / `.innerJoin(appointments` inside financial/payroll queries -> drops advances/refunds without visits
			if (isMoneyDomain && ts.isPropertyAccessExpression(callee) && callee.name.text === "innerJoin") {
				const firstArgTxt = node.arguments[0] ? getChainText(node.arguments[0]) : "";
				if (/^(?:visits|appointments|schema\.visits|schema\.appointments)$/.test(firstArgTxt)) {
					push("inner_join_drops_optional_visit", node.getStart(sf), getChainText(node));
				}
			}

			// 4. Unbounded `db.select().from(bigTable)` in routes without `.where(` and without `.limit(`
			if (isRouteFile && ts.isPropertyAccessExpression(callee) && callee.name.text === "from") {
				const rootCall = getChainText(callee.expression);
				const argText = node.arguments[0] ? getChainText(node.arguments[0]) : "";
				if (/^(?:db|tx)\s*\.\s*select/.test(rootCall) && MULTI_ROW_TABLES_RE.test(argText)) {
					let outer = node.parent;
					let fullChain = getChainText(node);
					while (outer && (ts.isPropertyAccessExpression(outer) || ts.isCallExpression(outer))) {
						fullChain = getChainText(outer);
						outer = outer.parent;
					}
					if (!/\.\s*(?:where|limit)\s*\(/.test(fullChain)) {
						push("unbounded_select_in_route", node.getStart(sf), fullChain);
					}
				}
			}
		}

		// 5. SQL template / string invariants (`session_replication_role`, `FOR UPDATE` without `ORDER BY`)
		if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
			const raw = getSqlStringLiteralText(node);
			if (raw) {
				if (/SET\s+(?:LOCAL\s+)?session_replication_role\s*=/i.test(raw)) {
					push("replica_session_role", node.getStart(sf), raw);
				}
				if (/\bFOR\s+(?:NO\s+KEY\s+)?UPDATE\b/i.test(raw) && !/\bORDER\s+BY\b/i.test(raw)) {
					push("for_update_without_order", node.getStart(sf), raw);
				}
			}
			if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return;
		}

		// 6. `process.env.NODE_ENV === "test"` inside production routes/services/daemons
		if (isRouteOrService && ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken)) {
			const txt = getChainText(node);
			if (/process\s*\.\s*env\s*\.\s*NODE_ENV/.test(txt) && /["'`]test["'`]/.test(txt)) {
				push("node_env_test_bypass_in_prod", node.getStart(sf), txt);
			}
		}

		// 7. Raw float money arithmetic (* 100 / 100 / * 0.01) on financial variables in money domains
		if (
			isMoneyDomain &&
			ts.isBinaryExpression(node) &&
			(node.operatorToken.kind === ts.SyntaxKind.AsteriskToken || node.operatorToken.kind === ts.SyntaxKind.SlashToken)
		) {
			const rightTxt = node.right.getText(sf).trim();
			const leftTxt = node.left.getText(sf).trim();
			const unwrapParens = (expr) => {
				let cur = expr;
				while (cur && ts.isParenthesizedExpression(cur)) cur = cur.expression;
				return cur;
			};
			const unwrapParentExpr = (expr) => {
				let p = expr?.parent;
				while (p && ts.isParenthesizedExpression(p)) p = p.parent;
				return p;
			};
			const isScaleConst =
				(node.operatorToken.kind === ts.SyntaxKind.SlashToken && rightTxt === "100") ||
				(node.operatorToken.kind === ts.SyntaxKind.AsteriskToken && (rightTxt === "100" || rightTxt === "0.01" || leftTxt === "100" || leftTxt === "0.01"));
			if (isScaleConst && MONEY_VAR_RE.test(getChainText(node))) {
				let isPercentageRatio = false;
				if (node.operatorToken.kind === ts.SyntaxKind.SlashToken && rightTxt === "100") {
					// Math.round((a / b) * 10000) / 100 computes percentage to 2 decimals, not kopecks->rubles
					const leftUnwrapped = unwrapParens(node.left);
					if (leftUnwrapped && /\/\s*.+\*\s*10000\b|\*\s*10000\b.*\//.test(getChainText(leftUnwrapped))) {
						isPercentageRatio = true;
					}
				} else if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken && (rightTxt === "100" || leftTxt === "100")) {
					const otherSide = rightTxt === "100" ? unwrapParens(node.left) : unwrapParens(node.right);
					const outerParent = unwrapParentExpr(node);
					if (
						(otherSide && ts.isBinaryExpression(otherSide) && otherSide.operatorToken.kind === ts.SyntaxKind.SlashToken) ||
						(outerParent && ts.isBinaryExpression(outerParent) && outerParent.operatorToken.kind === ts.SyntaxKind.SlashToken)
					) {
						isPercentageRatio = true;
					}
				}
				if (!isPercentageRatio) {
					push("floating_point_money_in_domain", node.getStart(sf), getChainText(node));
				}
			}
		}

		// 8. Top-level empty mutable `new Map()` / `new Set()` in services/security/ai/routes -> memory leak on 4GB RAM
		if (
			isRouteOrService &&
			!insideFn(node) &&
			ts.isNewExpression(node) &&
			ts.isIdentifier(node.expression) &&
			(node.expression.text === "Map" || node.expression.text === "Set") &&
			(!node.arguments || node.arguments.length === 0)
		) {
			const declParent = node.parent && ts.isVariableDeclaration(node.parent) ? node.parent.getText(sf) : getChainText(node);
			if (!/const\s+[A-Z0-9_]+\s*=/.test(declParent)) {
				push("unbounded_memory_cache", node.getStart(sf), getChainText(node.parent || node));
			}
		}

		// 9. `try { await db.transaction(...) } catch { reply.send({ ok: true }) }` — fake success after PG rollback
		if (ts.isTryStatement(node) && node.catchClause) {
			const tryTxt = getChainText(node.tryBlock);
			const catchTxt = getChainText(node.catchClause.block);
			if (/\b(?:db\.transaction|withTenantWriteCtx)\s*\(/.test(tryTxt) && /reply\.send\s*\(\s*\{\s*ok\s*:\s*true|return\s+\{\s*ok\s*:\s*true/.test(catchTxt)) {
				push("unhandled_tx_savepoint_fake_200", node.catchClause.getStart(sf), catchTxt);
			}
		}

		ts.forEachChild(node, (child) => visit(child, nextCtx));
	}

	visit(sf, { insideTxScope: false, insideTxWrapper: false, dbShadowed: false });
	return findings;
}
