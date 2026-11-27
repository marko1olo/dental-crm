import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { WaitingLoungeSignage } from "../components/lounge/WaitingLoungeSignage";

const webSrcRoot = path.join(import.meta.dirname, "..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

test("компонент WaitingLoungeSignage экспортируется и является функцией", () => {
	assert.equal(typeof WaitingLoungeSignage, "function");
});

test("маршрут /lounge-display и #lounge-display подключен в main.tsx / mainRouter", () => {
	const mainSource = readSource("main.tsx");
	const routesSource = readSource("mainRouter/standaloneRoutes.ts");
	const dispatcherSource = readSource("mainRouter/standaloneDispatcher.tsx");
	assert.ok(
		mainSource.includes("STANDALONE_ROUTES") && mainSource.includes("renderStandaloneRoute"),
		"main.tsx должен делегировать standalone-маршруты в mainRouter",
	);
	assert.ok(
		routesSource.includes('"/lounge-display"'),
		"standaloneRoutes.ts должен разбирать путь /lounge-display",
	);
	assert.ok(
		routesSource.includes('"#/lounge-display"') || routesSource.includes('"#lounge-display"'),
		"standaloneRoutes.ts должен поддерживать хеш #/lounge-display",
	);
	assert.ok(
		routesSource.includes("WaitingLoungeSignage") && dispatcherSource.includes("descriptor.viewImport"),
		"standaloneRoutes.ts и standaloneDispatcher.tsx должны монтировать WaitingLoungeSignage",
	);
});

test("стили табло используют стекло backdrop-filter: blur(16px) и токен --paper-glass", () => {
	const cssSource = readSource("components/lounge/waitingLoungeSignage.css");
	assert.ok(
		cssSource.includes("backdrop-filter: blur(16px)"),
		"waitingLoungeSignage.css обязан содержать стеклянный эффект blur(16px)",
	);
	assert.ok(
		cssSource.includes("var(--paper-glass"),
		"waitingLoungeSignage.css обязан использовать переменную --paper-glass",
	);
	assert.ok(
		cssSource.includes(".lounge-cabinet-item--calling"),
		"waitingLoungeSignage.css должен стилизовать активный вызов пациента к кабинету",
	);
	assert.ok(
		cssSource.includes("transition: opacity"),
		"waitingLoungeSignage.css должен содержать плавное растворение фона при смене времени суток",
	);
});

test("в настройках клиники доступна прямая ссылка на табло зоны ожидания", () => {
	const clinicTabSource = readSource("components/settings/SettingsClinicTab.tsx");
	assert.ok(
		clinicTabSource.includes("/#lounge-display"),
		"SettingsClinicTab.tsx должен содержать ссылку на /#lounge-display",
	);
});
