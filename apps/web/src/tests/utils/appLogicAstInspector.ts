import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { webSrcRoot } from "./componentReachability";

export { webSrcRoot };

export const APP_PATH = join(webSrcRoot, "App.tsx");
export const LOGIC_PATH = existsSync(join(webSrcRoot, "hooks", "appLogic", "index.ts"))
	? join(webSrcRoot, "hooks", "appLogic", "index.ts")
	: join(webSrcRoot, "useAppLogic.tsx");
export const TELEGRAM_PATH = join(webSrcRoot, "hooks", "useTelegramSettings.ts");
export const AUTH_PATH = join(webSrcRoot, "hooks", "domains", "useAuthLogic.ts");
export const SETTINGS_STORE_PATH = join(webSrcRoot, "store", "settingsStore.ts");
export const DOMAINS_DIR = join(webSrcRoot, "hooks", "domains");
export const APP_LOGIC_DIR = join(webSrcRoot, "hooks", "appLogic");
export const APP_LOGIC_MODULES_DIR = join(APP_LOGIC_DIR, "appLogicModules");
export const COMPAT_DIR = join(APP_LOGIC_MODULES_DIR, "compatibility");

/**
 * Спреды в return useAppLogic, которые разворачиваются из доменных хуков.
 * Ключ — имя спреда, значение — { файл, имя функции }.
 */
export const DOMAIN_SPREADS: ReadonlyMap<string, { file: string; fn: string }> = new Map([
	["clinicalVisitLogic", { file: join(DOMAINS_DIR, "useClinicalVisitLogic.ts"), fn: "useClinicalVisitLogic" }],
	["communicationsQueries", { file: join(DOMAINS_DIR, "useCommunicationsQueries.ts"), fn: "useCommunicationsQueries" }],
	["dicomWorkbenchModule", { file: join(DOMAINS_DIR, "useDicomWorkbenchModule.ts"), fn: "useDicomWorkbenchModule" }],
	["documentWorkflow", { file: join(DOMAINS_DIR, "useDocumentWorkflowModule.ts"), fn: "useDocumentWorkflowModule" }],
	["imagingQueries", { file: join(DOMAINS_DIR, "useImagingQueries.ts"), fn: "useImagingQueries" }],
	["migrationQueries", { file: join(DOMAINS_DIR, "useMigrationQueries.ts"), fn: "useMigrationQueries" }],
	["modalOrchestrator", { file: join(DOMAINS_DIR, "useModalOrchestrator.ts"), fn: "useModalOrchestrator" }],
	["navigationRouter", { file: join(DOMAINS_DIR, "useNavigationRouter.ts"), fn: "useNavigationRouter" }],
	["patientIntakeLogic", { file: join(DOMAINS_DIR, "usePatientIntakeLogic.ts"), fn: "usePatientIntakeLogic" }],
	["scheduleFilterController", { file: join(DOMAINS_DIR, "useScheduleFilterController.ts"), fn: "useScheduleFilterController" }],
	["staffSettingsLogic", { file: join(DOMAINS_DIR, "useStaffSettingsLogic.ts"), fn: "useStaffSettingsLogic" }],
	["billingModal", { file: join(APP_LOGIC_DIR, "useBillingModalLogic.ts"), fn: "useBillingModalLogic" }],
	["emergencyTriage", { file: join(APP_LOGIC_MODULES_DIR, "useAppEmergencyHandlers.ts"), fn: "useAppEmergencyHandlers" }],
	["imagingSlice", { file: join(APP_LOGIC_MODULES_DIR, "appLogicImagingCompatibility.ts"), fn: "buildAppLogicImagingCompatibility" }],
	["legacyAppStore", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyAppStoreBindings" }],
	["legacyFieldBindings", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyFieldBindings" }],
	["legacyNavigation", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyNavigationAndClinicalBindings" }],
	["legacyNormalizers", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyNormalizers" }],
	["legacyPatient", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyPatientFields" }],
	["legacyStubs", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildLegacyStubsAndFallbacks" }],
	["navigationSync", { file: join(APP_LOGIC_MODULES_DIR, "useAppNavigationSync.ts"), fn: "useAppNavigationSync" }],
	["patientSelection", { file: join(APP_LOGIC_DIR, "usePatientSelectionState.ts"), fn: "usePatientSelectionState" }],
	["profileAndLegal", { file: join(COMPAT_DIR, "appLogicLegacyBridge.ts"), fn: "buildProfileAndLegalHelpers" }],
	["scheduleLogic", { file: join(APP_LOGIC_DIR, "useScheduleLogic.ts"), fn: "useScheduleLogic" }],
	["workflowSlice", { file: join(APP_LOGIC_MODULES_DIR, "appLogicWorkflowCompatibility.ts"), fn: "buildAppLogicWorkflowCompatibility" }],
]);

/** Подмешивания в `return` useAppLogic, источники которых страж разбирает сам. */
export const RESOLVED_SPREADS = [
	"auth",
	"billingModal",
	"clinicalVisitLogic",
	"communicationsQueries",
	"dicomWorkbenchModule",
	"documentWorkflow",
	"emergencyTriage",
	"imagingQueries",
	"imagingSlice",
	"legacyAppStore",
	"legacyFieldBindings",
	"legacyNavigation",
	"legacyNormalizers",
	"legacyPatient",
	"legacyStubs",
	"migrationQueries",
	"modalOrchestrator",
	"navigationRouter",
	"navigationSync",
	"patientIntakeLogic",
	"patientSelection",
	"profileAndLegal",
	"scheduleFilterController",
	"scheduleLogic",
	"staffSettingsLogic",
	"telegram",
	"telegramSettingsModule",
	"workflowSlice",
] as const;

/** Подмешивания внутри useTelegramSettings, источники которых страж разбирает сам. */
export const RESOLVED_TELEGRAM_SPREADS = ["settingsStore"] as const;

export type BabelNode = { readonly type: string; readonly [key: string]: unknown };

export interface ObjectShape {
	readonly keys: ReadonlySet<string>;
	readonly spreads: readonly string[];
}

export function parseFile(filePath: string): BabelNode {
	return parse(readFileSync(filePath, "utf8"), {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	}) as unknown as BabelNode;
}

/** Обойти дерево разбора целиком: узлы здесь — объекты и массивы объектов. */
export function walk(node: unknown, visit: (node: BabelNode) => void): void {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit);
		return;
	}
	const candidate = node as BabelNode;
	if (typeof candidate.type === "string") visit(candidate);
	for (const value of Object.values(candidate)) {
		if (value && typeof value === "object") walk(value, visit);
	}
}

export function propertyName(property: BabelNode): string | null {
	const key = property.key as BabelNode | undefined;
	if (!key) return null;
	if (key.type === "Identifier" && typeof key.name === "string")
		return key.name;
	if (key.type === "StringLiteral" && typeof key.value === "string")
		return key.value;
	return null;
}

/** Ключи и подмешивания одного объектного литерала. */
export function shapeOfObjectExpression(objectExpression: BabelNode): ObjectShape {
	const keys = new Set<string>();
	const spreads: string[] = [];
	for (const property of (objectExpression.properties as BabelNode[] | undefined) ?? []) {
		if (property.type === "SpreadElement") {
			const argument = property.argument as BabelNode | undefined;
			if (argument?.type === "Identifier" && typeof argument.name === "string") {
				spreads.push(argument.name);
			} else if (
				argument?.type === "MemberExpression" &&
				(argument.property as BabelNode)?.type === "Identifier" &&
				typeof (argument.property as BabelNode).name === "string"
			) {
				spreads.push((argument.property as BabelNode).name as string);
			} else {
				spreads.push("<не идентификатор>");
			}
			continue;
		}
		const name = propertyName(property);
		if (name) keys.add(name);
	}
	return { keys, spreads };
}

/**
 * Объект из `return { ... }` названной функции верхнего уровня.
 */
export function returnedObjectShape(filePath: string, functionName: string): ObjectShape {
	const ast = parseFile(filePath);
	let target: BabelNode | null = null;
	walk(ast, (node) => {
		if (node.type !== "FunctionDeclaration") return;
		const id = node.id as BabelNode | undefined;
		if (id?.type === "Identifier" && id.name === functionName) target = node;
	});
	assert.ok(
		target,
		`Функция ${functionName} не найдена в ${filePath} — страж потерял цель разбора`,
	);
	const body = (target as BabelNode).body as BabelNode;
	let shape: ObjectShape | null = null;
	for (const statement of (body.body as BabelNode[] | undefined) ?? []) {
		if (statement.type !== "ReturnStatement") continue;
		const argument = statement.argument as BabelNode | undefined;
		if (argument?.type === "ObjectExpression")
			shape = shapeOfObjectExpression(argument);
		// Поддержка: return useMemo(() => ({...}), [...])
		if (argument?.type === "CallExpression") {
			const callee = argument.callee as BabelNode | undefined;
			if (
				callee?.type === "Identifier" &&
				(callee.name === "useMemo" || callee.name === "useCallback")
			) {
				const args = argument.arguments as BabelNode[] | undefined;
				const factory = args?.[0];
				if (
					factory?.type === "ArrowFunctionExpression" ||
					factory?.type === "FunctionExpression"
				) {
					const factoryBody = factory.body as BabelNode | undefined;
					if (factoryBody?.type === "ObjectExpression")
						shape = shapeOfObjectExpression(factoryBody);
					if (factoryBody?.type === "BlockStatement") {
						for (const inner of (factoryBody.body as BabelNode[] | undefined) ?? []) {
							if (inner.type !== "ReturnStatement") continue;
							const innerArg = inner.argument as BabelNode | undefined;
							if (innerArg?.type === "ObjectExpression")
								shape = shapeOfObjectExpression(innerArg);
							if (
								innerArg?.type === "CallExpression" &&
								(innerArg.callee as BabelNode)?.type === "Identifier" &&
								(innerArg.callee as BabelNode).name === "buildAppLogicCompatibilityBag"
							) {
								const bagPath = join(
									webSrcRoot,
									"hooks",
									"appLogic",
									"appLogicModules",
									"compatibility",
									"appLogicCompatibilityBag.ts",
								);
								return returnedObjectShape(bagPath, "buildAppLogicCompatibilityBag");
							}
						}
					}
					if (
						factoryBody?.type === "CallExpression" &&
						(factoryBody.callee as BabelNode)?.type === "Identifier" &&
						(factoryBody.callee as BabelNode).name === "buildAppLogicCompatibilityBag"
					) {
						const bagPath = join(
							webSrcRoot,
							"hooks",
							"appLogic",
							"appLogicModules",
							"compatibility",
							"appLogicCompatibilityBag.ts",
						);
						return returnedObjectShape(bagPath, "buildAppLogicCompatibilityBag");
					}
				}
			}
			if (
				callee?.type === "Identifier" &&
				callee.name === "buildAppLogicCompatibilityBag"
			) {
				const bagPath = join(
					webSrcRoot,
					"hooks",
					"appLogic",
					"appLogicModules",
					"compatibility",
					"appLogicCompatibilityBag.ts",
				);
				return returnedObjectShape(bagPath, "buildAppLogicCompatibilityBag");
			}
		}
	}
	assert.ok(
		shape,
		`У ${functionName} в ${filePath} нет возврата объектным литералом`,
	);
	return shape as ObjectShape;
}

/**
 * Ключи хранилища настроек: начальное состояние плюс действия из create().
 * Поддерживает модульные срезы в store/settings/ и монолитный settingsStore.ts.
 */
export function settingsStoreKeys(): ReadonlySet<string> {
	const keys = new Set<string>();
	const settingsDir = join(webSrcRoot, "store", "settings");

	if (existsSync(settingsDir)) {
		const sliceFiles = [
			"clinicModeSlice.ts",
			"staffPinSlice.ts",
			"uiPreferencesSlice.ts",
			"telegramSettingsSlice.ts",
		];
		let sawInitialState = false;
		let sawStoreFactory = false;

		for (const sliceFile of sliceFiles) {
			const fullPath = join(settingsDir, sliceFile);
			if (!existsSync(fullPath)) continue;
			const ast = parseFile(fullPath);
			walk(ast, (node) => {
				if (node.type === "VariableDeclarator") {
					const id = node.id as BabelNode | undefined;
					const init = node.init as BabelNode | undefined;
					if (
						id?.type === "Identifier" &&
						(id.name.startsWith("initial") || id.name === "initialSettingsState") &&
						init?.type === "ObjectExpression"
					) {
						sawInitialState = true;
						for (const key of shapeOfObjectExpression(init).keys) {
							keys.add(key);
							if (sliceFile === "telegramSettingsSlice.ts") {
								const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
								keys.add(setter);
							}
						}
					}
				}
				if (node.type === "FunctionDeclaration") {
					const id = node.id as BabelNode | undefined;
					if (id?.type === "Identifier" && id.name.startsWith("create")) {
						walk(node.body, (inner) => {
							if (inner.type === "ReturnStatement") {
								const arg = inner.argument as BabelNode | undefined;
								if (arg?.type === "ObjectExpression") {
									sawStoreFactory = true;
									for (const key of shapeOfObjectExpression(arg).keys) {
										keys.add(key);
									}
								}
							}
						});
					}
				}
			});
		}

		assert.ok(
			sawInitialState,
			"В store/settings/ не найдено начальное состояние initial*Slice — страж потерял источник состояния",
		);
		assert.ok(
			sawStoreFactory,
			"В store/settings/ не найдены фабрики действий create*Slice — страж потерял источник действий",
		);
		return keys;
	}

	const ast = parseFile(SETTINGS_STORE_PATH);
	let sawInitialState = false;
	let sawStoreFactory = false;
	walk(ast, (node) => {
		if (node.type !== "VariableDeclarator") return;
		const id = node.id as BabelNode | undefined;
		if (id?.type !== "Identifier") return;
		const init = node.init as BabelNode | undefined;
		if (
			id.name === "initialSettingsState" &&
			init?.type === "ObjectExpression"
		) {
			sawInitialState = true;
			for (const key of shapeOfObjectExpression(init).keys) keys.add(key);
			return;
		}
		if (id.name !== "useSettingsStore") return;
		walk(init, (inner) => {
			if (inner.type !== "ObjectExpression") return;
			const shape = shapeOfObjectExpression(inner);
			if (!shape.keys.size) return;
			sawStoreFactory = true;
			for (const key of shape.keys) keys.add(key);
		});
	});
	assert.ok(
		sawInitialState,
		"В settingsStore.ts не найдено initialSettingsState — страж потерял источник состояния",
	);
	assert.ok(
		sawStoreFactory,
		"В settingsStore.ts не найден объект действий create() — страж потерял источник действий",
	);
	return keys;
}

/** Имена, которые App.tsx и модули оболочки достают из appLogic / appLogicValue. */
export function namesConsumedByApp(): ReadonlySet<string> {
	const names = new Set<string>();
	const files = [APP_PATH];
	const appModulesDir = join(webSrcRoot, "appModules");

	if (existsSync(appModulesDir)) {
		for (const file of readdirSync(appModulesDir)) {
			if (file.endsWith(".tsx") || file.endsWith(".ts")) {
				files.push(join(appModulesDir, file));
			}
		}
	}

	for (const filePath of files) {
		const ast = parseFile(filePath);
		walk(ast, (node) => {
			if (node.type === "MemberExpression") {
				const obj = node.object as BabelNode | undefined;
				const prop = node.property as BabelNode | undefined;
				if (
					obj?.type === "Identifier" &&
					(obj.name === "appLogic" || obj.name === "appLogicValue") &&
					prop?.type === "Identifier" &&
					typeof prop.name === "string"
				) {
					names.add(prop.name);
				}
			}
			if (node.type === "VariableDeclarator") {
				const init = node.init as BabelNode | undefined;
				const id = node.id as BabelNode | undefined;
				if (
					init?.type === "Identifier" &&
					(init.name === "appLogic" || init.name === "appLogicValue") &&
					id?.type === "ObjectPattern"
				) {
					for (const property of (id.properties as BabelNode[] | undefined) ?? []) {
						if (property.type === "ObjectProperty") {
							const name = propertyName(property);
							if (name) names.add(name);
						}
					}
				}
			}
		});
	}

	assert.ok(
		names.size > 0,
		"В App.tsx и appModules не найдено обращений к appLogic / appLogicValue — страж потерял цель разбора",
	);
	return names;
}

/** Сбор всех отдаваемых общей логикой имён через AST-анализ. */
export function resolveAppLogicReturnKeys(): ReadonlySet<string> {
	const logic = returnedObjectShape(LOGIC_PATH, "useAppLogic");
	assert.deepEqual(
		[...logic.spreads].sort(),
		[...RESOLVED_SPREADS].sort(),
		"В return useAppLogic появилось новое подмешивание. Разберите его источник и добавьте в RESOLVED_SPREADS: " +
			"иначе страж считает мёртвыми имена, которые на самом деле приходят оттуда",
	);
	const telegram = returnedObjectShape(TELEGRAM_PATH, "useTelegramSettings");
	assert.deepEqual(
		[...telegram.spreads].sort(),
		[...RESOLVED_TELEGRAM_SPREADS].sort(),
		"В return useTelegramSettings появилось новое подмешивание. Разберите его источник и добавьте в " +
			"RESOLVED_TELEGRAM_SPREADS",
	);
	const auth = returnedObjectShape(AUTH_PATH, "useAuthLogic");
	assert.deepEqual(
		auth.spreads,
		[],
		"В return useAuthLogic появилось подмешивание — разберите его источник",
	);

	const produced = new Set<string>();
	for (const source of [
		logic.keys,
		telegram.keys,
		auth.keys,
		settingsStoreKeys(),
	]) {
		for (const key of source) produced.add(key);
	}
	for (const spreadName of RESOLVED_SPREADS) {
		const domain = DOMAIN_SPREADS.get(spreadName);
		if (!domain) continue;
		try {
			const shape = returnedObjectShape(domain.file, domain.fn);
			for (const key of shape.keys) produced.add(key);
			if (spreadName === "documentWorkflow") {
				const listsPath = join(DOMAINS_DIR, "documents", "workflow", "useDocumentFilteredLists.ts");
				if (existsSync(listsPath)) {
					const listsShape = returnedObjectShape(listsPath, "useDocumentFilteredLists");
					for (const key of listsShape.keys) produced.add(key);
				}
			}
		} catch {
			// файл не разобрался — страж уже упадёт на assert выше
		}
	}
	return produced;
}

export const producedNames = resolveAppLogicReturnKeys;
