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

test("маршрут /lounge-display и #lounge-display подключен в main.tsx", () => {
	const mainSource = readSource("main.tsx");
	assert.ok(
		mainSource.includes('window.location.pathname === "/lounge-display"'),
		"main.tsx должен разбирать путь /lounge-display",
	);
	assert.ok(
		mainSource.includes('window.location.hash === "#/lounge-display"') ||
			mainSource.includes('window.location.hash === "#lounge-display"'),
		"main.tsx должен поддерживать хеш #/lounge-display",
	);
	assert.ok(
		mainSource.includes("<WaitingLoungeSignage"),
		"main.tsx должен монтировать WaitingLoungeSignage при переходе на /lounge-display",
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
