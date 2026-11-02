/**
 * panelsAreMounted.test.ts
 *
 * Страж: панель или раздел, которых никто не отрисовывает, — это несделанная работа.
 * Архитектурно декомпозирован per Mandates 8b, 8zi на:
 * - panelsMountedSuite/panelsMountExceptions.ts (реестры долгов и исключений)
 * - panelsMountedSuite/panelsMountScanner.ts (утилиты и сканеры достижимости)
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	componentReachability,
	webSrcRoot,
} from "./utils/componentReachability.js";
import {
	DECLARED_UNMOUNTED,
	LEGACY_UNMOUNTED_BACKLOG,
	DEMOUNTED_MODAL_SHIRMS_BACKLOG,
	LEGACY_BACKLOG_CEILING,
	DEMOUNTED_MODAL_SHIRMS_CEILING,
	CENSUS_FLOOR,
	CENSUS_TIME_CEILING_MS,
	keyOf,
	readSource,
	sourceWithoutComments,
	registeredAppViews,
	collectKnownKeys,
	findUnmountedAppeared,
	findStaleKnownKeys,
	assertFilesDoNotExist,
	assertFilesExist,
} from "./panelsMountedSuite/index.js";

test("перепись компонентов не выродилась и не поднимает процесс на файл", { timeout: 60000 }, () => {
	const census = componentReachability();

	assert.equal(
		census.parsedFiles,
		census.scannedFiles,
		`разобрано ${census.parsedFiles} файлов из ${census.scannedFiles}. Пропущенный файл — дырка в переписи.`,
	);
	assert.ok(
		census.scannedFiles >= CENSUS_FLOOR.sourceFiles,
		`в apps/web/src найдено ${census.scannedFiles} исходников — обход дерева сломался`,
	);
	assert.ok(
		census.componentFiles >= CENSUS_FLOOR.componentFiles,
		`файлов с компонентами найдено ${census.componentFiles} — разбор объявлений сломался`,
	);
	assert.ok(
		census.verdicts.length >= CENSUS_FLOOR.components,
		`компонентов найдено ${census.verdicts.length} — разбор объявлений сломался`,
	);
	assert.ok(
		census.reachableFiles.size >= CENSUS_FLOOR.reachableFiles,
		`от ${census.entry} достижимо ${census.reachableFiles.size} файлов — обход импортов сломался`,
	);
	assert.ok(
		census.wallClockMs < CENSUS_TIME_CEILING_MS,
		`перепись заняла ${census.wallClockMs} мс при лимите ${CENSUS_TIME_CEILING_MS} мс`,
	);

	console.log(
		`перепись: ${census.scannedFiles} файлов, ${census.verdicts.length} компонентов, ${census.wallClockMs} мс`,
	);
});

test("ни один компонент apps/web/src не остаётся несмонтированным незаявленно", { timeout: 60000 }, () => {
	const census = componentReachability();
	const knownKeys = collectKnownKeys(
		DECLARED_UNMOUNTED,
		LEGACY_UNMOUNTED_BACKLOG,
		DEMOUNTED_MODAL_SHIRMS_BACKLOG,
	);

	const appeared = findUnmountedAppeared(census, knownKeys);
	assert.deepEqual(
		appeared,
		[],
		`Компонент существует, и пользователь его увидеть не может:\n  ${appeared.join("\n  ")}`,
	);

	const stale = findStaleKnownKeys(census, knownKeys);
	assert.deepEqual(
		stale,
		[],
		`Компонент записан несмонтированным, но перепись его так уже не видит: ${stale.join(", ")}`,
	);
});

test("список наследия только сокращается", () => {
	assert.ok(
		LEGACY_UNMOUNTED_BACKLOG.length <= LEGACY_BACKLOG_CEILING,
		`в LEGACY_UNMOUNTED_BACKLOG ${LEGACY_UNMOUNTED_BACKLOG.length} записей при потолке ${LEGACY_BACKLOG_CEILING}.`,
	);

	const duplicated = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key, index) => LEGACY_UNMOUNTED_BACKLOG.indexOf(key) !== index,
	);
	assert.deepEqual(duplicated, [], `в LEGACY_UNMOUNTED_BACKLOG повторы: ${duplicated.join(", ")}`);

	const declaredKeys = new Set(
		DECLARED_UNMOUNTED.map((debt) => keyOf({ file: debt.file, name: debt.name })),
	);
	const inBothLists = LEGACY_UNMOUNTED_BACKLOG.filter((key) => declaredKeys.has(key));
	assert.deepEqual(inBothLists, [], `Компонент записан и как заявленный долг, и как наследие: ${inBothLists.join(", ")}`);

	const missingFiles = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key) => !existsSync(path.join(webSrcRoot, key.slice(0, key.lastIndexOf(":")))),
	);
	assert.deepEqual(missingFiles, [], `Наследие записано на файл, которого в дереве нет: ${missingFiles.join(", ")}`);
});

test("бэклог ликвидации бутафорских ширм актуален, не содержит фантомов и только сокращается", () => {
	assert.ok(
		DEMOUNTED_MODAL_SHIRMS_BACKLOG.length <= DEMOUNTED_MODAL_SHIRMS_CEILING,
		`в DEMOUNTED_MODAL_SHIRMS_BACKLOG ${DEMOUNTED_MODAL_SHIRMS_BACKLOG.length} записей при потолке ${DEMOUNTED_MODAL_SHIRMS_CEILING}.`,
	);

	const duplicated = DEMOUNTED_MODAL_SHIRMS_BACKLOG.filter(
		(key, index) => DEMOUNTED_MODAL_SHIRMS_BACKLOG.indexOf(key) !== index,
	);
	assert.deepEqual(duplicated, [], `в DEMOUNTED_MODAL_SHIRMS_BACKLOG повторы: ${duplicated.join(", ")}`);

	const missingFiles = DEMOUNTED_MODAL_SHIRMS_BACKLOG.filter(
		(key) => !existsSync(path.join(webSrcRoot, key.slice(0, key.lastIndexOf(":")))),
	);
	assert.deepEqual(missingFiles, [], `В DEMOUNTED_MODAL_SHIRMS_BACKLOG записан несуществующий файл: ${missingFiles.join(", ")}`);
});

test("заявленные долги существуют, объяснены и не устарели", () => {
	const census = componentReachability();
	const byKey = new Map(census.verdicts.map((v) => [keyOf(v), v]));

	const missingFiles: string[] = [];
	const missingDeclarations: string[] = [];
	const emptyReasons: string[] = [];
	const shallowReasons: string[] = [];

	for (const debt of DECLARED_UNMOUNTED) {
		const key = keyOf({ file: debt.file, name: debt.name });
		if (!existsSync(path.join(webSrcRoot, debt.file))) {
			missingFiles.push(debt.file);
			continue;
		}
		if (!byKey.has(key)) missingDeclarations.push(key);
		if (debt.reason.trim().length === 0) {
			emptyReasons.push(key);
			continue;
		}
		if (debt.reason.trim().length < 120) shallowReasons.push(key);
	}

	assert.deepEqual(missingFiles, [], `Долг заявлен на файл, которого в дереве нет: ${missingFiles.join(", ")}`);
	assert.deepEqual(missingDeclarations, [], `Долг заявлен на объявление, которого перепись не находит: ${missingDeclarations.join(", ")}`);
	assert.deepEqual(emptyReasons, [], `Долг заявлен с пустой причиной: ${emptyReasons.join(", ")}`);
	assert.deepEqual(shallowReasons, [], `Долг заявлен отпиской вместо причины: ${shallowReasons.join(", ")}`);
});

test("каждый раздел из реестра отрисовывается в App.tsx", () => {
	const appSource = readSource("App.tsx");
	const missing = registeredAppViews().filter(
		(view) => !appSource.includes(`currentView === "${view}"`),
	);
	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но App.tsx их не отрисовывает: ${missing.join(", ")}`,
	);
});

test("каждый раздел из реестра умеет предзагружаться", () => {
	const preloadSource =
		readSource("workspacePreload.ts") +
		readSource("workspacePreloadModules/viewPreloadersMap.ts");
	const missing = registeredAppViews().filter(
		(view) => !new RegExp(`\\b${view}: \\(\\) => import\\(`).test(preloadSource),
	);
	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но не зарегистрированы в workspacePreload.ts: ${missing.join(", ")}`,
	);
});

test("модуль каждого предзагружаемого раздела действительно существует", { timeout: 30000 }, () => {
	const preloadFile = "workspacePreloadModules/viewPreloadersMap.ts";
	const preloadSource = readSource(preloadFile);
	const census = componentReachability();

	const broken: string[] = [];
	for (const match of preloadSource.matchAll(/(\w+): \(\) => import\("(\.[^"]+)"\)/g)) {
		const view = match[1] as string;
		const specifier = match[2] as string;
		const target = path.posix.normalize(
			path.posix.join(path.posix.dirname(preloadFile), specifier),
		);
		const exists = [
			`${target}.tsx`,
			`${target}.ts`,
			`${target}/index.tsx`,
			`${target}/index.ts`,
		].some((candidate) => census.facts.has(candidate));
		if (!exists) broken.push(`${view} → ${specifier}`);
	}

	assert.deepEqual(broken, [], `Предзагрузчик ссылается на отсутствующий модуль: ${broken.join(", ")}`);
});

test("второго маршрутизатора рядом с App.tsx больше нет", () => {
	assert.equal(
		existsSync(path.join(webSrcRoot, "AppRouter.tsx")),
		false,
		"AppRouter.tsx создан заново. Второй файл с цепочкой по currentView не участвует в отрисовке.",
	);
});

test("внешнего стража достижимости в дереве больше нет", () => {
	const repoRoot = path.join(webSrcRoot, "..", "..", "..");
	assertFilesDoNotExist(
		[
			"scripts/check-component-mount-reachability.mjs",
			"scripts/lib/component-mount-rules.yml",
			"scripts/tests/check-component-mount-reachability.test.mjs",
		],
		repoRoot,
		"Достижимость компонентов проверяется panelsAreMounted.test.ts",
	);
});

test("второго планировщика смет и его очереди без читателя в дереве больше нет", () => {
	assertFilesDoNotExist([
		"components/plan/ComparativePlannerDashboard.tsx",
		"components/plan/ComparativePlanner.css",
	]);

	for (const owner of ["store/patientStore.ts", "components/odontogram/OdontogramModule.tsx"]) {
		assert.equal(
			sourceWithoutComments(owner).includes("PlanSuggestion"),
			false,
			`В ${owner} вернулась очередь pendingPlanSuggestions.`,
		);
	}

	assertFilesExist(
		["components/treatment-plans/planPricing.ts"],
		webSrcRoot,
		"components/treatment-plans/planPricing.ts удалён. Это расчёт сметы для TreatmentEstimator.",
	);
});

test("дубликатов КЛКТ и листа дозовых нагрузок (Wave 199) в дереве больше нет", () => {
	assertFilesDoNotExist([
		"components/radiology/CbctMprViewer.tsx",
		"components/radiology/ImplantCrossSectionPlanner.tsx",
		"components/radiology/doseSheet/RadiationDoseSheetModal.tsx",
	]);

	assertFilesExist([
		"components/radiology/CbctMprImplantStudioModal.tsx",
		"components/documents/forms/RadiationDoseSheetForm.tsx",
	]);
});

test("бутафорских модальных хостов ClinicalModalsHost и BackofficeModalsHost (Wave 200) в дереве больше нет", () => {
	assertFilesDoNotExist([
		"components/modals/ClinicalModalsHost.tsx",
		"components/modals/BackofficeModalsHost.tsx",
	]);
});

test("несмонтированного PrescriptionsWidget и мертвого дубликата AdultToothChart в дереве больше нет", () => {
	assertFilesDoNotExist([
		"components/clinical/PrescriptionsWidget.tsx",
		"components/odontogram/AdultToothChart.tsx",
	]);
});

test("устаревших фасадов-дубликатов представлений (AnalyticsView, PaymentsView, WarehouseView, LaboratoryView) в дереве больше нет", () => {
	assertFilesDoNotExist([
		"AnalyticsView.tsx",
		"LaboratoryView.tsx",
		"PaymentsView.tsx",
		"WarehouseView.tsx",
		"components/warehouse/index.ts",
		"components/settings/migrationHelpers.ts",
		"utils/formatting.ts",
		"components/finance/fiscal/index.ts",
		"components/patients/transfer/index.ts",
		"components/payroll/index.ts",
		"components/surgery/index.ts",
		"components/treatment-plans/qr/index.ts",
		"components/visit/endo/index.ts",
		"components/visit/surgery/index.ts",
		"components/visit/therapy/index.ts",
		"components/analytics/index.ts",
		"components/copilot/index.ts",
		"components/dashboard/index.ts",
		"components/guidance/index.ts",
		"components/orthodontics/index.ts",
		"components/reports/index.ts",
		"components/sync/index.ts",
		"components/doctor/index.ts",
		"components/presence/index.ts",
		"components/finance/index.ts",
		"components/diagnostics/index.ts",
		"components/radiology/index.ts",
		"components/telephony/index.ts",
		"components/patients/index.ts",
	]);

	assertFilesExist([
		"pages/AnalyticsDashboardView.tsx",
		"pages/LabOrdersPage.tsx",
		"components/billing/InvoicesView.tsx",
		"components/InventoryView.tsx",
	]);
});

test("авиационно-бытового симулятора предполетной подготовки (ChairsidePreFlight) в дереве больше нет", () => {
	assertFilesDoNotExist([
		"components/chairside/ChairsidePreFlightChecklist.tsx",
		"components/chairside/chairsidePreFlight.css",
		"components/chairside/__tests__/ChairsidePreFlightChecklist.test.tsx",
	]);

	assertFilesExist(["components/chairside/DoctorCommandHud.tsx"]);
});
