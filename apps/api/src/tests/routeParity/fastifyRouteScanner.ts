/**
 * apps/api/src/tests/routeParity/fastifyRouteScanner.ts
 *
 * Модуль интроспекции серверных маршрутов Fastify.
 * Объединяет:
 * 1. Живую интроспекцию Fastify через хук onRoute на тестовом приложении `createTenantTestApp`
 *    и `registerAllRoutes(app)` — находит 100% плагинов, вложенных префиксов и доменных групп.
 * 2. Статический AST-анализ через TypeScript Compiler API для самопроверки и контроля чистоты файлов.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { registerAllRoutes } from "../../serverModules/routeRegistrar.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { collectFiles, normalizePath } from "./routeCallExtractor.js";

/** Получатели, на которых в этом дереве регистрируют маршруты. */
const ROUTE_RECEIVERS = new Set([
	"app",
	"fastify",
	"server",
	"instance",
	"scope",
	"webhookScope",
]);

/** Глаголы, которыми Fastify регистрирует маршрут. */
const ROUTE_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

/** Префиксы, под которыми модули регистрируются в server.ts. */
const REGISTERED_PREFIXES = [
	"/api/inventory",
	"/api/portal",
	"/api/public/booking",
	"/api/public-booking",
	"/api/telephony",
	"/api/warehouse",
	"/api/treatment-consumables",
	"/api/orthodontics",
	"/api/sanpin",
	"/api/loyalty",
	"/api/telegram",
	"/api/fiscal",
	"/api/v1/messengers",
	"/api/cash",
];

export type RouteRegistration = { method: string; route: string };

function routePathLiteral(argument: ts.Expression | undefined): string | null {
	if (argument === undefined) return null;
	if (ts.isStringLiteralLike(argument)) return argument.text;
	if (ts.isTemplateExpression(argument)) {
		let text = argument.head.text;
		for (const span of argument.templateSpans)
			text += `\${}${span.literal.text}`;
		return text;
	}
	return null;
}

/**
 * Регистрация маршрутов в одном файле через TypeScript AST.
 */
export function routeRegistrations(
	file: string,
	source: string,
): RouteRegistration[] {
	const parsed = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ false,
		ts.ScriptKind.TS,
	);
	const found: RouteRegistration[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			if (
				ts.isPropertyAccessExpression(callee) &&
				ts.isIdentifier(callee.expression) &&
				ROUTE_RECEIVERS.has(callee.expression.text) &&
				ROUTE_METHODS.has(callee.name.text)
			) {
				const route = routePathLiteral(node.arguments[0]);
				if (route !== null)
					found.push({ method: callee.name.text.toUpperCase(), route });
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);
	return found;
}

/**
 * Собирает статические маршруты из файлов routes/ через AST.
 */
export function scanAstServerRoutes(apiSrc: string): {
	paths: Set<string>;
	withMethod: Set<string>;
} {
	const paths = new Set<string>();
	const withMethod = new Set<string>();

	for (const file of collectFiles(path.join(apiSrc, "routes"), [".ts"])) {
		if (file.endsWith(".test.ts")) continue;
		for (const { method, route } of routeRegistrations(
			file,
			readFileSync(file, "utf8"),
		)) {
			const normalized = normalizePath(route);
			paths.add(normalized);
			withMethod.add(`${method} ${normalized}`);
			if (!normalized.startsWith("/api")) {
				for (const prefix of REGISTERED_PREFIXES) {
					const prefixed = normalizePath(prefix + normalized);
					paths.add(prefixed);
					withMethod.add(`${method} ${prefixed}`);
				}
			}
		}
	}
	return { paths, withMethod };
}

/**
 * Интроспекция зарегистрированных маршрутов Fastify на живом тестовом приложении.
 * Возвращает полный реестр маршрутов с методами.
 */
export async function scanFastifyRoutes(apiSrc: string): Promise<{
	paths: Set<string>;
	withMethod: Set<string>;
}> {
	const { paths, withMethod } = scanAstServerRoutes(apiSrc);

	const app = createTenantTestApp();
	app.addHook("onRoute", (routeOptions) => {
		const methods = Array.isArray(routeOptions.method)
			? routeOptions.method
			: [routeOptions.method];
		const normalized = normalizePath(routeOptions.url);
		paths.add(normalized);
		for (const m of methods) {
			withMethod.add(`${m.toUpperCase()} ${normalized}`);
		}
	});

	await registerAllRoutes(app);
	await app.ready();
	await app.close();

	return { paths, withMethod };
}

/**
 * Совпадение с учётом параметров: `/api/patients/:param/duplicates` со стороны
 * фронта и та же форма со стороны сервера.
 */
export function isServed(candidate: string, routes: Set<string>): boolean {
	if (routes.has(candidate)) return true;

	const candidateSegments = candidate.split("/");
	for (const route of routes) {
		const routeSegments = route.split("/");
		if (routeSegments.length !== candidateSegments.length) continue;
		const same = routeSegments.every(
			(segment, index) =>
				segment === candidateSegments[index] ||
				segment === ":param" ||
				candidateSegments[index] === ":param",
		);
		if (same) return true;
	}
	return false;
}

/**
 * Отбор пар «путь есть, метод чужой».
 */
export function methodMismatches(
	calls: Map<string, string[]>,
	paths: Set<string>,
	withMethod: Set<string>,
	known: readonly string[],
): string[] {
	const missing: string[] = [];
	for (const [candidate, files] of calls) {
		if (isServed(candidate, withMethod)) continue;
		const candidatePath = candidate.slice(candidate.indexOf(" ") + 1);
		if (!isServed(candidatePath, paths)) continue;
		if (known.some((entry) => candidate === entry)) continue;
		missing.push(
			`${candidate} — зовут: ${[...new Set(files)].slice(0, 3).join(", ")}`,
		);
	}
	return missing;
}
