/**
 * @file scripts/check-react-hooks.mjs
 * @description Статический анализатор и линтер правил хуков React 19 для DENTE Dental CRM.
 *
 * ЗАЧЕМ. В React 19 нарушение правил хуков приводит к фатальным сбоям:
 * 1. Условные вызовы хуков (внутри if, тернарных операторов ? :, логических && / || / ??,
 *    циклов for/while или try/catch) нарушают внутренний индекс диспетчера хуков React.
 *    При изменении условия порядок хуков сбивается и приложение падает с ошибкой:
 *    «Rendered fewer hooks than expected. This may be caused by an accidental early return».
 * 2. Синхронные вызовы сеттеров состояния (set*()) непосредственно в теле рендера компонента
 *    вызывают мгновенный ререндер до завершения текущего цикла рендера, приводя к бесконечному
 *    зацикливанию и краху браузера («Maximum update depth exceeded» / Too many re-renders).
 * 3. Отсутствие массива зависимостей в useCallback / useMemo обессмысливает мемоизацию,
 *    вызывая непрерывное пересоздание ссылок и деградацию производительности.
 *
 * Анализатор использует AST-парсер @babel/parser и обход дерева @babel/traverse.
 * Сканирует apps/web/src (файлы .ts и .tsx).
 * Возвращает Exit Code 0 при отсутствии нарушений, Exit Code 1 при наличии дефектов.
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;

const WEB_SRC_DIR = path.resolve("apps/web/src");

function collectSourceFiles(dir) {
	const result = [];
	if (!fs.existsSync(dir)) return result;

	for (const entry of fs.readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === "dist" ||
			entry === ".git" ||
			entry === "__tests__" ||
			entry === "tests"
		) {
			continue;
		}

		const fullPath = path.join(dir, entry);
		let stat;
		try {
			stat = fs.statSync(fullPath);
		} catch {
			continue;
		}

		if (stat.isDirectory()) {
			result.push(...collectSourceFiles(fullPath));
		} else if (
			/\.(ts|tsx)$/.test(entry) &&
			!entry.endsWith(".d.ts") &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".spec.ts") &&
			!entry.endsWith(".spec.tsx")
		) {
			result.push(fullPath);
		}
	}

	return result;
}

function getEnclosingComponentOrHook(callPath) {
	let current = callPath.parentPath;
	const nestedChain = [];

	while (current) {
		if (current.isFunction()) {
			const parent = current.parentPath;
			let isHocWrapper = false;
			if (parent?.isCallExpression()) {
				const callee = parent.get("callee");
				const name = callee.isIdentifier()
					? callee.node.name
					: callee.isMemberExpression() && callee.node.property?.name;
				if (["memo", "forwardRef"].includes(name)) {
					isHocWrapper = true;
				}
			}

			nestedChain.push({
				fnPath: current,
				isHocWrapper,
			});
		}
		current = current.parentPath;
	}

	return nestedChain;
}

function getFunctionName(fnPath) {
	if (fnPath.node.id?.name) return fnPath.node.id.name;

	if (fnPath.parentPath?.isVariableDeclarator() && fnPath.parentPath.node.id?.name) {
		return fnPath.parentPath.node.id.name;
	}

	if (fnPath.parentPath?.isExportDefaultDeclaration()) {
		return "DefaultExportComponent";
	}

	if (fnPath.parentPath?.isCallExpression()) {
		const callee = fnPath.parentPath.get("callee");
		const calleeName = callee.isIdentifier()
			? callee.node.name
			: callee.isMemberExpression() && callee.node.property?.name;
		if (["memo", "forwardRef"].includes(calleeName)) {
			if (fnPath.parentPath.parentPath?.isVariableDeclarator()) {
				return (
					fnPath.parentPath.parentPath.node.id?.name || "AnonymousComponent"
				);
			}
			return "AnonymousComponent";
		}
	}

	return null;
}

function isComponentOrHookName(name) {
	if (!name) return false;
	if (name === "DefaultExportComponent" || name === "AnonymousComponent") {
		return true;
	}
	if (/^[A-Z]/.test(name)) return true;
	if (/^use[A-Z0-9]/.test(name)) return true;
	return false;
}

function getHookCallName(callPath) {
	const callee = callPath.get("callee");
	if (callee.isIdentifier()) {
		const name = callee.node.name;
		if (name === "use") return null; // React 19 use() API разрешен в условиях
		if (/^use[A-Z0-9]/.test(name)) return name;
	}
	if (callee.isMemberExpression()) {
		const obj = callee.get("object");
		const prop = callee.get("property");
		if (
			obj.isIdentifier() &&
			obj.node.name === "React" &&
			prop.isIdentifier() &&
			/^use[A-Z0-9]/.test(prop.node.name)
		) {
			return `React.${prop.node.name}`;
		}
	}
	return null;
}

export function lintReactHooksInFile(sourceCode, filePath = "component.tsx") {
	const errors = [];
	let ast;
	const isJsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
	const plugins = isJsx ? ["typescript", "jsx"] : ["typescript"];

	try {
		ast = parse(sourceCode, {
			sourceType: "module",
			plugins,
		});
	} catch (err) {
		return [
			{
				file: filePath,
				line: err.loc?.line || 1,
				col: err.loc?.column || 1,
				rule: "rules-of-hooks/parse-error",
				message: `Ошибка парсинга синтаксиса: ${err.message}`,
			},
		];
	}

	const stateSetters = new Map();

	traverse(ast, {
		VariableDeclarator(varPath) {
			const init = varPath.get("init");
			if (!init?.isCallExpression()) return;
			const hookName = getHookCallName(init);
			if (hookName !== "useState" && hookName !== "React.useState") return;

			const id = varPath.get("id");
			if (id.isArrayPattern() && id.node.elements.length >= 2) {
				const setterNode = id.node.elements[1];
				if (setterNode?.type === "Identifier") {
					const fnParent = varPath.getFunctionParent();
					if (fnParent) {
						if (!stateSetters.has(fnParent.node)) {
							stateSetters.set(fnParent.node, new Set());
						}
						stateSetters.get(fnParent.node).add(setterNode.name);
					}
				}
			}
		},

		CallExpression(callPath) {
			const hookName = getHookCallName(callPath);

			if (hookName) {
				const enclosingFns = getEnclosingComponentOrHook(callPath);
				if (enclosingFns.length === 0) {
					errors.push({
						file: filePath,
						line: callPath.node.loc?.start.line,
						col: callPath.node.loc?.start.column,
						rule: "rules-of-hooks/top-level",
						message: `Хук «${hookName}» вызван на уровне модуля вне функции-компонента или кастомного хука.`,
					});
					return;
				}

				const immediateFn = enclosingFns[0].fnPath;
				const immediateFnName = getFunctionName(immediateFn);

				// Вызов хука во вложенной функции/коллбэке внутри компонента
				if (enclosingFns.length > 1 && !enclosingFns[0].isHocWrapper) {
					const rootFn = enclosingFns[enclosingFns.length - 1].fnPath;
					const rootFnName = getFunctionName(rootFn) || "компонента";
					errors.push({
						file: filePath,
						line: callPath.node.loc?.start.line,
						col: callPath.node.loc?.start.column,
						rule: "rules-of-hooks/no-nested-callback",
						message: `Хук «${hookName}» вызван внутри вложенной функции/коллбэка внутри «${rootFnName}». Хуки разрешено вызывать строго на верхнем уровне тела компонента или кастомного хука.`,
					});
					return;
				}

				// Вызов хука во вспомогательной функции не-компоненте
				if (!isComponentOrHookName(immediateFnName)) {
					errors.push({
						file: filePath,
						line: callPath.node.loc?.start.line,
						col: callPath.node.loc?.start.column,
						rule: "rules-of-hooks/invalid-enclosing-function",
						message: `Хук «${hookName}» вызван внутри вспомогательной функции «${immediateFnName || "anonymous"}». Хуки могут вызываться только в компонентах React (PascalCase) или в кастомных хуках (use*).`,
					});
					return;
				}

				// Проверка пути от вызова хука до верхнего уровня тела функции
				let current = callPath;
				let illegalContext = null;

				while (current && current.parentPath && current.parentPath !== immediateFn) {
					const parent = current.parentPath;
					if (parent.isIfStatement()) {
						illegalContext = "условного оператора if";
						break;
					}
					if (parent.isConditionalExpression()) {
						if (current.node === parent.node.consequent || current.node === parent.node.alternate) {
							illegalContext = "тернарного оператора (? :)";
							break;
						}
					}
					if (parent.isLogicalExpression()) {
						if (current.node === parent.node.right) {
							illegalContext = "логического выражения (&& / || / ??)";
							break;
						}
					}
					if (
						parent.isForStatement() ||
						parent.isForInStatement() ||
						parent.isForOfStatement() ||
						parent.isWhileStatement() ||
						parent.isDoWhileStatement()
					) {
						illegalContext = "цикла";
						break;
					}
					if (parent.isSwitchStatement() || parent.isSwitchCase()) {
						illegalContext = "блока switch/case";
						break;
					}
					if (parent.isTryStatement() || parent.isCatchClause()) {
						illegalContext = "блока try/catch";
						break;
					}
					current = parent;
				}

				if (illegalContext) {
					errors.push({
						file: filePath,
						line: callPath.node.loc?.start.line,
						col: callPath.node.loc?.start.column,
						rule: "rules-of-hooks/no-conditional-hooks",
						message: `Хук «${hookName}» вызван внутри ${illegalContext}. Нарушение React 19 Rules of Hooks: порядок вызовов хуков обязан оставаться строго неизменным при каждом рендере.`,
					});
				}

				// Контроль зависимостей мемоизирующих хуков (useCallback, useMemo)
				const bareName = hookName.replace(/^React\./, "");
				if (["useCallback", "useMemo"].includes(bareName)) {
					const args = callPath.node.arguments;
					if (args.length < 2) {
						errors.push({
							file: filePath,
							line: callPath.node.loc?.start.line,
							col: callPath.node.loc?.start.column,
							rule: "rules-of-hooks/missing-deps",
							message: `Хук «${hookName}» вызван без массива зависимостей. Это лишает хук смысла и ведёт к непрерывному пересчёту на каждом рендере.`,
						});
					} else if (args[1].type !== "ArrayExpression") {
						errors.push({
							file: filePath,
							line: callPath.node.loc?.start.line,
							col: callPath.node.loc?.start.column,
							rule: "rules-of-hooks/invalid-deps",
							message: `Второй аргумент «${hookName}» обязан быть литералом массива зависимостей [dep1, dep2].`,
						});
					}
				}
			}

			// ПРОВЕРКА: Запрет синхронного вызова сеттеров стейта (set*()) в теле рендера
			const callee = callPath.get("callee");
			let calledSetterName = null;
			if (callee.isIdentifier() && /^set[A-Z0-9]/.test(callee.node.name)) {
				calledSetterName = callee.node.name;
			}

			if (calledSetterName) {
				const fnParent = callPath.getFunctionParent();
				if (fnParent) {
					const fnName = getFunctionName(fnParent);
					if (isComponentOrHookName(fnName) && /^[A-Z]/.test(fnName || "")) {
						const knownSetters = stateSetters.get(fnParent.node);
						const isKnownSetter = knownSetters && knownSetters.has(calledSetterName);

						let p = callPath.parentPath;
						let insideEffectOrHandler = false;

						while (p && p !== fnParent) {
							if (p.isCallExpression()) {
								const parentCallHook = getHookCallName(p);
								if (
									parentCallHook &&
									[
										"useEffect",
										"useLayoutEffect",
										"useInsertionEffect",
										"useCallback",
									].includes(parentCallHook.replace(/^React\./, ""))
								) {
									insideEffectOrHandler = true;
									break;
								}
							}
							if (p.isFunction() && p !== fnParent) {
								insideEffectOrHandler = true;
								break;
							}
							p = p.parentPath;
						}

						if (!insideEffectOrHandler && (isKnownSetter || /^set[A-Z]/.test(calledSetterName))) {
							let isInsideIfOrCondition = false;
							let currCheck = callPath.parentPath;
							while (currCheck && currCheck !== fnParent) {
								if (currCheck.isIfStatement() || currCheck.isConditionalExpression()) {
									isInsideIfOrCondition = true;
									break;
								}
								currCheck = currCheck.parentPath;
							}

							if (!isInsideIfOrCondition) {
								errors.push({
									file: filePath,
									line: callPath.node.loc?.start.line,
									col: callPath.node.loc?.start.column,
									rule: "rules-of-hooks/no-render-phase-setstate",
									message: `Синхронный вызов сеттера стейта «${calledSetterName}()» непосредственно в теле рендера компонента «${fnName}». Это вызовет бесконечный цикл ререндеров (Error: Too many re-renders в React 19). Перенесите вызов в useEffect или обработчик события.`,
								});
							}
						}
					}
				}
			}
		},
	});

	return errors;
}

export function runReactHooksCheck() {
	const startTime = Date.now();
	console.log("🔍 [REACT 19 HOOKS LINTER] Сканирование apps/web/src на чистоту хуков...");

	const allFiles = collectSourceFiles(WEB_SRC_DIR);
	const hookOrSetterRegex = /\buse[A-Z0-9]|\bset[A-Z0-9]/;

	const targetFiles = allFiles.filter((f) => {
		try {
			const code = fs.readFileSync(f, "utf8");
			return hookOrSetterRegex.test(code);
		} catch {
			return false;
		}
	});

	console.log(`📁 Найдено ${allFiles.length} исходных файлов, из них с хуками/сеттерами: ${targetFiles.length}.`);

	const allErrors = [];
	let processed = 0;

	for (const filePath of targetFiles) {
		processed++;
		let code = "";
		try {
			code = fs.readFileSync(filePath, "utf8");
		} catch (err) {
			allErrors.push({
				file: filePath,
				line: 1,
				col: 1,
				rule: "rules-of-hooks/file-read-error",
				message: `Не удалось прочитать файл: ${err.message}`,
			});
			continue;
		}

		const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
		const fileErrors = lintReactHooksInFile(code, relPath);
		if (fileErrors.length > 0) {
			allErrors.push(...fileErrors);
		}
	}

	const elapsedMs = Date.now() - startTime;

	if (allErrors.length === 0) {
		console.log(`\n✅ [REACT 19 HOOKS LINTER: EXIT 0] Проверено ${targetFiles.length} файлов за ${elapsedMs}мс.`);
		console.log("   Нарушений правил хуков, условных вызовов и рендер-сеттеров не обнаружено.\n");
		return 0;
	}

	console.error(`\n❌ [REACT 19 HOOKS LINTER: EXIT 1] Обнаружено ${allErrors.length} дефектов хуков за ${elapsedMs}мс:\n`);
	for (const err of allErrors) {
		console.error(`  • ${err.file}:${err.line}:${err.col} [${err.rule}]`);
		console.error(`    ${err.message}\n`);
	}

	return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/check-react-hooks.mjs")) {
	const exitCode = runReactHooksCheck();
	process.exit(exitCode);
}
