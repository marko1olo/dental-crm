#!/usr/bin/env node
/**
 * check-single-doors.mjs — Автоматический линтер единых дверей и защиты SSOT (Single-Door SSOT Guardian).
 *
 * ФИЛОСОФИЯ И ДОМЕННОЕ ОБОСНОВАНИЕ:
 * Основано на «Законе замка» Создателя и Тимаэрта:
 *   «У каждой сущности ровно одна точка входа ("дверь"). Вторую сделать физически нельзя —
 *    компилятор бьёт по рукам... Строки ловят локальный мусор, списки — структурный:
 *    вторую дверь, колонку без читателя, закон, которому код не соответствует...
 *    В дверях до сих пор жульничество! Пока это узкое горло не срежем — никакой игры,
 *    иначе мир на костылях захлебнётся».
 *
 * ТРИ СВЯЩЕННЫХ САНИТАРНЫХ ПРАВИЛА:
 * 1. Правило 1 (Анти-Клоны UI):
 *    У каждой священной студии клиники (Касса 54-ФЗ, ЭМК, План лечения, Расписание,
 *    Карточка пациента, Лаборатория, Зарплата, Документы, Прейскурант, Телефония)
 *    есть СТРОГО ОДНА каноническая дверь. Создание параллельных модалок со сходными
 *    именами или суффиксами клонирования (*V2, *New, *Copy, *2) категорически запрещено (Мандат 8bf).
 *
 * 2. Правило 2 (Сквозное монтирование / Анти-Сироты UI):
 *    Любая модалка первого класса (*StudioModal.tsx, *Modal.tsx) обязана иметь хотя бы
 *    один активный входящий импорт в дереве вызовов приложения. Компоненты-сироты без
 *    потребителей запрещены (Мандат 8aq).
 *
 * 3. Правило 3 (Защита Дверей API):
 *    Каждый роут мутации Fastify (POST, PUT, PATCH) в apps/api/src/routes/ обязан иметь
 *    схему валидации тела (schema: { body: ... }), Zod safeParse/parse в обработчике,
 *    либо явный маркер «// door-validation: none — <причина>», предотвращая появление
 *    открытых невалидированных бэкдоров.
 *
 * Запуск:
 *   node scripts/check-single-doors.mjs [--verbose] [--json]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export const webSrcDir = path.join(repoRoot, "apps/web/src");
export const apiRoutesDir = path.join(repoRoot, "apps/api/src/routes");
export const allowlistPath = path.join(repoRoot, "scripts/config/single-doors-allowlist.json");

/**
 * 10 Священных доменных студий клиники DENTE CRM.
 */
export const SACRED_STUDIOS = [
	{
		domain: "cashbox",
		title: "Касса 54-ФЗ и фискализация",
		canonicals: ["CashRegisterStudioModal.tsx"],
		prohibitedPatterns: [
			/^CashboxModal/i,
			/^CashRegisterModal/i,
			/^CashRegisterDrawer/i,
			/^CashCheckoutStudioModal/i,
			/^QuickPayModal/i,
		],
	},
	{
		domain: "emr",
		title: "Электронная медицинская карта (ЭМК / Приём)",
		canonicals: ["MedicalRecordStudioModal.tsx"],
		prohibitedPatterns: [
			/^EmrStudioModal/i,
			/^EmrModal/i,
			/^MedicalRecordModal/i,
			/^VisitStudioModal/i,
		],
	},
	{
		domain: "treatment_plans",
		title: "Планы лечения",
		canonicals: ["TreatmentPlanStudioModal.tsx"],
		prohibitedPatterns: [
			/^TreatmentPlanModal/i,
			/^TreatmentPlansModal/i,
			/^PlanStudioModal/i,
		],
	},
	{
		domain: "schedule",
		title: "Расписание и запись на приём",
		canonicals: ["AppointmentModal.tsx", "QuickAppointmentModal.tsx"],
		prohibitedPatterns: [
			/^AppointmentStudioModal/i,
			/^ScheduleModal/i,
			/^NewAppointmentModal/i,
		],
	},
	{
		domain: "patient_card",
		title: "Карточка пациента",
		canonicals: ["PatientCardModal.tsx"],
		prohibitedPatterns: [
			/^PatientStudioModal/i,
			/^PatientDrawer/i,
			/^PatientModal/i,
		],
	},
	{
		domain: "dental_lab",
		title: "Зуботехническая лаборатория",
		canonicals: ["DentalLabStudioModal.tsx"],
		prohibitedPatterns: [
			/^LabModal/i,
			/^LabOrderModal/i,
			/^DentalLabModal/i,
		],
	},
	{
		domain: "doctor_payroll",
		title: "Зарплата врачей",
		canonicals: ["DoctorPayrollStudioModal.tsx"],
		prohibitedPatterns: [
			/^DoctorSalaryModal/i,
			/^PayrollModal/i,
			/^DoctorPayrollModal/i,
		],
	},
	{
		domain: "documents",
		title: "Документы и согласия ИДС",
		canonicals: ["DocumentsStudioModal.tsx"],
		prohibitedPatterns: [
			/^LegalDocumentsModal/i,
			/^DocumentsModal/i,
		],
	},
	{
		domain: "pricelist",
		title: "Прейскурант и каталог услуг",
		canonicals: ["PricelistStudioModal.tsx"],
		prohibitedPatterns: [
			/^PricelistModal/i,
			/^PriceModal/i,
			/^ServicesCatalogModal/i,
		],
	},
	{
		domain: "telephony",
		title: "Телефония и софтфон",
		canonicals: ["TelephonyStudioModal.tsx"],
		prohibitedPatterns: [
			/^TelephonyModal/i,
			/^CallsModal/i,
			/^PhoneModal/i,
		],
	},
];

const MUTATION_METHODS = new Set(["post", "put", "patch"]);
const NON_FASTIFY_RECEIVERS = new Set([
	"db",
	"tx",
	"trx",
	"cache",
	"map",
	"store",
	"headers",
	"params",
	"query",
	"console",
	"wsApp",
]);

/**
 * Загрузка конфигурационного вайтлиста.
 */
export function loadAllowlist(customPath = allowlistPath) {
	if (!fs.existsSync(customPath)) {
		return {
			ui_sacred_clones_allowlist: [],
			ui_orphan_modals_legacy_backlog: [],
			api_mutation_doors_legacy_backlog: [],
		};
	}
	try {
		const raw = fs.readFileSync(customPath, "utf8");
		return JSON.parse(raw);
	} catch (err) {
		console.error(`[check-single-doors] Ошибка парсинга allowlist ${customPath}:`, err);
		return {
			ui_sacred_clones_allowlist: [],
			ui_orphan_modals_legacy_backlog: [],
			api_mutation_doors_legacy_backlog: [],
		};
	}
}

/**
 * Рекурсивный сбор файлов.
 */
export function walkFiles(dir, filter) {
	const files = [];
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".data") continue;
			files.push(...walkFiles(full, filter));
		} else if (entry.isFile() && (!filter || filter(entry.name, full))) {
			files.push(full);
		}
	}
	return files;
}

/**
 * Проверка файла: является ли он вспомогательным субкомпонентом, а не модалкой.
 */
function isSubpartFile(baseName, normalizedPath) {
	if (
		normalizedPath.includes("/studioModules/") ||
		normalizedPath.includes("/modalModules/") ||
		normalizedPath.includes("/modalParts/") ||
		normalizedPath.includes("/parts/") ||
		normalizedPath.includes("/helpers/")
	) {
		return true;
	}
	const subpartSuffixes = [
		"Header.tsx",
		"Footer.tsx",
		"Tabs.tsx",
		"Dropzone.tsx",
		"Props.ts",
		"Props.tsx",
		"State.ts",
		"State.tsx",
		"Section.tsx",
		"Actions.tsx",
		"View.tsx",
		"Content.tsx",
		"Body.tsx",
		"Card.tsx",
		"Layer.tsx",
		"Types.ts",
		"Types.tsx",
		"Persistence.ts",
		"Helpers.ts",
		"Context.ts",
	];
	return subpartSuffixes.some((suffix) => baseName.endsWith(suffix));
}

/**
 * ПРАВИЛО 1: Проверка UI на клоны священных студий и суффиксы клонирования.
 */
export function checkUiClones(webFiles, allowlist) {
	const violations = [];
	const allowedClones = new Set(
		(allowlist.ui_sacred_clones_allowlist || []).map((x) => x.file.replace(/\\/g, "/")),
	);

	for (const file of webFiles) {
		const base = path.basename(file);
		const normalized = file.replace(/\\/g, "/");
		const relPath = path.relative(repoRoot, file).replace(/\\/g, "/");

		if (base.includes(".test.") || base.includes(".spec.") || normalized.includes("/__tests__/")) {
			continue;
		}

		if (isSubpartFile(base, normalized)) {
			continue;
		}

		const isModalLike =
			base.endsWith("Modal.tsx") ||
			base.endsWith("StudioModal.tsx") ||
			base.endsWith("Drawer.tsx") ||
			/(?:Modal|StudioModal|Drawer)(?:V[2-9]|New|Copy|[2-9])\.tsx$/i.test(base);
		if (!isModalLike) continue;

		// 1. Проверка на суффиксы клонирования: *V2, *New, *Copy, *2
		if (/(?:V[2-9]|New|Copy|[2-9])\.tsx$/i.test(base)) {
			if (!allowedClones.has(relPath)) {
				violations.push({
					rule: "UI_CLONE_SUFFIX",
					file: relPath,
					message: `Обнаружен запрещенный суффикс параллельного клонирования: «${base}». Следуйте Мандату 8bf: шлифуйте существующий канонический компонент, не плодите копии!`,
				});
			}
		}

		// 2. Проверка священных студий клиники
		for (const studio of SACRED_STUDIOS) {
			if (studio.canonicals.includes(base)) continue;
			for (const pattern of studio.prohibitedPatterns) {
				if (pattern.test(base)) {
					if (!allowedClones.has(relPath)) {
						violations.push({
							rule: "UI_SACRED_CLONE",
							domain: studio.domain,
							file: relPath,
							message: `Параллельный клон священной студии «${studio.title}» (канон: ${studio.canonicals.join(", ")}): «${base}». В клинике должна быть ровно ОДНА точка входа (Закон замка)!`,
						});
					}
				}
			}
		}
	}

	return violations;
}

/**
 * Разрешение импорта в абсолютный путь к файлу.
 */
function resolveImportSpecifier(fromFile, specifier) {
	if (!specifier.startsWith(".")) return null;
	const base = path.resolve(path.dirname(fromFile), specifier);
	const candidates = [
		base,
		base + ".tsx",
		base + ".ts",
		base + ".jsx",
		base + ".js",
		path.join(base, "index.tsx"),
		path.join(base, "index.ts"),
		path.join(base, "index.jsx"),
		path.join(base, "index.js"),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			try {
				if (fs.statSync(candidate).isFile()) {
					return path.normalize(candidate);
				}
			} catch {}
		}
	}
	return null;
}

/**
 * ПРАВИЛО 2: Проверка UI на компоненты-сироты (модалки без входящих импортов).
 */
export function checkUiOrphans(webFiles, allowlist) {
	const violations = [];
	const allowedOrphans = new Set(
		(allowlist.ui_orphan_modals_legacy_backlog || []).map((x) => x.file.replace(/\\/g, "/")),
	);

	// Строим множество всех файлов, на которые есть входящие импорты
	const importedFiles = new Set();

	for (const file of webFiles) {
		const source = fs.readFileSync(file, "utf8");
		const parsed = ts.createSourceFile(
			file,
			source,
			ts.ScriptTarget.Latest,
			false,
			file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);

		function visit(node) {
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
				const resolved = resolveImportSpecifier(file, node.moduleSpecifier.text);
				if (resolved) importedFiles.add(resolved);
			}
			if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
				const resolved = resolveImportSpecifier(file, node.moduleSpecifier.text);
				if (resolved) importedFiles.add(resolved);
			}
			if (
				ts.isCallExpression(node) &&
				node.expression.kind === ts.SyntaxKind.ImportKeyword &&
				node.arguments.length > 0
			) {
				const arg = node.arguments[0];
				if (ts.isStringLiteralLike(arg)) {
					const resolved = resolveImportSpecifier(file, arg.text);
					if (resolved) importedFiles.add(resolved);
				}
			}
			ts.forEachChild(node, visit);
		}

		ts.forEachChild(parsed, visit);
	}

	// Ищем самостоятельные верхнеуровневые модалки
	for (const file of webFiles) {
		const base = path.basename(file);
		const normalized = file.replace(/\\/g, "/");
		const relPath = path.relative(repoRoot, file).replace(/\\/g, "/");

		if (!base.endsWith("Modal.tsx") && !base.endsWith("StudioModal.tsx")) continue;
		if (base.includes(".test.") || base.includes(".spec.") || normalized.includes("/__tests__/")) continue;
		if (isSubpartFile(base, normalized)) continue;

		const normPath = path.normalize(file);
		if (!importedFiles.has(normPath)) {
			if (!allowedOrphans.has(relPath)) {
				violations.push({
					rule: "UI_ORPHAN_MODAL",
					file: relPath,
					message: `Модальное окно «${base}» никем не импортируется в apps/web/src! Нарушение Мандата 8aq: компонент обязан быть смонтирован в боевой UI либо удален/задокументирован в allowlist!`,
				});
			}
		}
	}

	return violations;
}

/**
 * Проверка текста на наличие ключевых слов валидации.
 */
function hasValidationKeywords(text) {
	return (
		text.includes(".safeParse") ||
		text.includes(".parse") ||
		text.includes("safeParse(") ||
		text.includes("parseSchedulePayload") ||
		text.includes("parseBody") ||
		text.includes("validate") ||
		text.includes("assert") ||
		text.includes("door-validation: none")
	);
}

/**
 * Сопоставление маршрута с паттерном allowlist.
 */
function matchesPattern(routeMethod, routePath, pattern) {
	const [patMethod, patPath] = pattern.split(" ");
	if (!patMethod || !patPath) return false;
	if (patMethod !== "*" && patMethod.toUpperCase() !== routeMethod.toUpperCase()) return false;
	if (patPath === "*") return true;
	if (patPath.endsWith("/*")) {
		const prefix = patPath.slice(0, -2);
		return routePath.startsWith(prefix);
	}
	if (patPath.endsWith("*")) {
		const prefix = patPath.slice(0, -1);
		return routePath.startsWith(prefix);
	}
	if (patPath.startsWith("*/")) {
		const suffix = patPath.slice(1);
		return routePath.endsWith(suffix);
	}
	if (patPath.includes(":")) {
		const patSegs = patPath.split("/");
		const routeSegs = routePath.split("/");
		if (patSegs.length !== routeSegs.length) return false;
		return patSegs.every((seg, idx) => seg.startsWith(":") || seg === routeSegs[idx]);
	}
	return routePath === patPath;
}

/**
 * ПРАВИЛО 3: Проверка защиты дверей мутаций API Fastify.
 */
export function checkApiMutationDoors(routeFiles, allowlist) {
	const violations = [];
	const legacyBacklog = allowlist.api_mutation_doors_legacy_backlog || [];

	// Карта верхнеуровневых функций по файлам
	const parsedFilesCache = new Map();
	const topLevelFunctionsMap = new Map();

	for (const file of routeFiles) {
		const source = fs.readFileSync(file, "utf8");
		const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
		parsedFilesCache.set(file, parsed);

		const fnMap = new Map();
		function collectFns(node) {
			if (ts.isFunctionDeclaration(node) && node.name) {
				fnMap.set(node.name.text, node.getText(parsed));
			} else if (ts.isVariableStatement(node)) {
				for (const decl of node.declarationList.declarations) {
					if (ts.isIdentifier(decl.name) && decl.initializer) {
						fnMap.set(decl.name.text, decl.initializer.getText(parsed));
					}
				}
			}
			ts.forEachChild(node, collectFns);
		}
		ts.forEachChild(parsed, collectFns);
		topLevelFunctionsMap.set(file, fnMap);
	}

	for (const file of routeFiles) {
		const parsed = parsedFilesCache.get(file);
		const localFns = topLevelFunctionsMap.get(file);

		// Поиск импортированных хэндлеров
		const importedFns = new Map();
		function collectImports(node) {
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
				const spec = node.moduleSpecifier.text;
				if (spec.startsWith(".")) {
					const targetBase = path.resolve(path.dirname(file), spec);
					const candidates = [
						targetBase.replace(/\.js$/, ".ts"),
						targetBase + ".ts",
						path.join(targetBase, "index.ts"),
					];
					const target = candidates.find(fs.existsSync);
					if (target) {
						const clause = node.importClause;
						if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
							for (const el of clause.namedBindings.elements) {
								importedFns.set(el.name.text, target);
							}
						}
					}
				}
			}
			ts.forEachChild(node, collectImports);
		}
		ts.forEachChild(parsed, collectImports);

		function visit(node) {
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const verb = node.expression.name.text.toLowerCase();
				if (MUTATION_METHODS.has(verb) && node.arguments.length >= 2) {
					const receiver = ts.isIdentifier(node.expression.expression)
						? node.expression.expression.text
						: null;
					if (receiver && NON_FASTIFY_RECEIVERS.has(receiver)) return;

					const pathArg = node.arguments[0];
					let pathText = "<dynamic>";
					if (ts.isStringLiteralLike(pathArg)) {
						pathText = pathArg.text;
					}

					let hasSchemaBody = false;
					let hasHandlerValidation = false;

					// 1. Проверяем schema: { body: ... }
					for (let i = 1; i < node.arguments.length; i++) {
						const arg = node.arguments[i];
						if (ts.isObjectLiteralExpression(arg)) {
							for (const prop of arg.properties) {
								if (
									ts.isPropertyAssignment(prop) &&
									prop.name &&
									(prop.name.text === "schema" || prop.name.escapedText === "schema")
								) {
									const schemaInit = prop.initializer;
									if (ts.isObjectLiteralExpression(schemaInit)) {
										for (const sProp of schemaInit.properties) {
											if (
												sProp.name &&
												(sProp.name.text === "body" || sProp.name.escapedText === "body")
											) {
												hasSchemaBody = true;
											}
										}
									}
								}
							}
						}
					}

					// 2. Проверяем хэндлер
					const lastArg = node.arguments[node.arguments.length - 1];
					if (lastArg) {
						if (ts.isArrowFunction(lastArg) || ts.isFunctionExpression(lastArg)) {
							const text = lastArg.getText(parsed);
							if (hasValidationKeywords(text)) {
								hasHandlerValidation = true;
							}
						} else if (ts.isIdentifier(lastArg)) {
							const fnName = lastArg.text;
							if (localFns && localFns.has(fnName)) {
								const fnText = localFns.get(fnName);
								if (hasValidationKeywords(fnText)) {
									hasHandlerValidation = true;
								}
							} else if (importedFns.has(fnName)) {
								const targetFile = importedFns.get(fnName);
								const targetFns = topLevelFunctionsMap.get(targetFile);
								if (targetFns && targetFns.has(fnName)) {
									const fnText = targetFns.get(fnName);
									if (hasValidationKeywords(fnText)) {
										hasHandlerValidation = true;
									}
								}
							}
						}
					}

					// 3. Проверяем комментарии door-validation: none
					const fullText = parsed.getFullText();
					const leadingComments = ts.getLeadingCommentRanges(fullText, node.getFullStart());
					let hasCommentOverride = false;
					if (leadingComments) {
						for (const c of leadingComments) {
							const commentText = fullText.slice(c.pos, c.end);
							if (/door-validation:\s*none\s*[—-]\s*.{5,}/.test(commentText)) {
								hasCommentOverride = true;
							}
						}
					}

					const isValidated = hasSchemaBody || hasHandlerValidation || hasCommentOverride;

					if (!isValidated) {
						const method = verb.toUpperCase();
						// Проверяем allowlist
						const isAllowed = legacyBacklog.some((entry) =>
							matchesPattern(method, pathText, entry.pattern),
						);

						if (!isAllowed) {
							const line = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1;
							const relFile = path.relative(repoRoot, file).replace(/\\/g, "/");
							violations.push({
								rule: "API_MUTATION_UNVALIDATED",
								file: `${relFile}:${line}`,
								method,
								path: pathText,
								message: `Эндпоинт мутации [${method}] ${pathText} не имеет схемы валидации тела (schema.body) или Zod-парсера! Закройте открытую дверь схемы либо добавьте // door-validation: none — <причина>`,
							});
						}
					}
				}
			}
			ts.forEachChild(node, visit);
		}

		ts.forEachChild(parsed, visit);
	}

	return violations;
}

/**
 * Главный раннер санитарной проверки единых дверей.
 */
export function runSingleDoorChecks(options = {}) {
	const allowlist = options.allowlist || loadAllowlist(options.allowlistPath);
	const verbose = Boolean(options.verbose);

	const webFiles =
		options.webFiles ||
		walkFiles(webSrcDir, (name) => (name.endsWith(".tsx") || name.endsWith(".ts")) && !name.endsWith(".d.ts"));

	const apiFiles =
		options.apiFiles ||
		walkFiles(apiRoutesDir, (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

	if (verbose) {
		console.log(`[check-single-doors] Сканирование Web файлов: ${webFiles.length}`);
		console.log(`[check-single-doors] Сканирование API файлов: ${apiFiles.length}`);
	}

	const cloneViolations = checkUiClones(webFiles, allowlist);
	const orphanViolations = checkUiOrphans(webFiles, allowlist);
	const apiViolations = checkApiMutationDoors(apiFiles, allowlist);

	const allViolations = [...cloneViolations, ...orphanViolations, ...apiViolations];

	return {
		passed: allViolations.length === 0,
		cloneViolations,
		orphanViolations,
		apiViolations,
		allViolations,
		stats: {
			webFilesCount: webFiles.length,
			apiFilesCount: apiFiles.length,
			totalViolationsCount: allViolations.length,
		},
	};
}

// CLI запуск
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const isVerbose = process.argv.includes("--verbose");
	const isJson = process.argv.includes("--json");

	const result = runSingleDoorChecks({ verbose: isVerbose });

	if (isJson) {
		console.log(JSON.stringify(result, null, 2));
		process.exit(result.passed ? 0 : 1);
	}

	console.log("\n================================================================================");
	console.log("🚪 DENTE CRM — СТРАЖ ЕДИНЫХ ТОЧЕК ВХОДА И ЗАЩИТЫ SSOT (SINGLE-DOOR GUARDIAN)");
	console.log("================================================================================");

	if (result.cloneViolations.length > 0) {
		console.error(`\n❌ НАЙДЕНЫ ПАРАЛЛЕЛЬНЫЕ КЛОНЫ UI (${result.cloneViolations.length} шт):`);
		for (const v of result.cloneViolations) {
			console.error(`  - [${v.rule}] ${v.file}: ${v.message}`);
		}
	} else {
		console.log("✅ Правило 1 (Анти-Клоны UI): 0 параллельных версий модалок. Закон замка соблюден.");
	}

	if (result.orphanViolations.length > 0) {
		console.error(`\n❌ НАЙДЕНЫ КОМПОНЕНТЫ-СИРОТЫ UI (${result.orphanViolations.length} шт):`);
		for (const v of result.orphanViolations) {
			console.error(`  - [${v.rule}] ${v.file}: ${v.message}`);
		}
	} else {
		console.log("✅ Правило 2 (Сквозное монтирование UI): 0 сиротских модалок без входящих импортов.");
	}

	if (result.apiViolations.length > 0) {
		console.error(`\n❌ НАЙДЕНЫ НЕВАЛИДИРОВАННЫЕ МУТАЦИИ API (${result.apiViolations.length} шт):`);
		for (const v of result.apiViolations) {
			console.error(`  - [${v.method}] ${v.path} (${v.file}): ${v.message}`);
		}
	} else {
		console.log("✅ Правило 3 (Защита Дверей API): 100% мутаций Fastify защищены схемами валидации.");
	}

	console.log("--------------------------------------------------------------------------------");
	if (result.passed) {
		console.log("🎉 [VERDICT: EXIT CODE 0] ВСЕ ЕДИНЫЕ ДВЕРИ SSOT ЗАЩИЩЕНЫ. НАРУШЕНИЙ НЕТ.");
		console.log("================================================================================\n");
		process.exit(0);
	} else {
		console.error(`💥 [VERDICT: EXIT CODE 1] ОБНАРУЖЕНО ${result.allViolations.length} НАРУШЕНИЙ SSOT.`);
		console.error("================================================================================\n");
		process.exit(1);
	}
}
