import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppLoadingState, AppUnlockState } from "../../../AppBootState";
import {
	isOfflineAutonomyMode,
	setOfflineAutonomyMode,
} from "../../../lib/offlineStorage";

describe("AppBootState & 2.5s Freeze Protection Suite", () => {
	it("renders AppLoadingState with clinical branding and initial message via SSR", () => {
		const html = renderToString(
			React.createElement(AppLoadingState, {
				message: "Загрузка рабочей смены",
			}),
		);

		assert.ok(html.includes("boot-state"));
		assert.ok(html.includes("DENTE"));
		assert.ok(html.includes("Загрузка рабочей смены"));
		assert.ok(html.includes("var(--paper"));
	});

	it("renders AppUnlockState with password form and access guidance via SSR", () => {
		const html = renderToString(
			React.createElement(AppUnlockState, {
				accessMessage: "Требуется секрет администратора",
				adminSecretDraft: "",
				onAdminSecretChange: () => {},
				onUnlock: () => {},
			}),
		);

		assert.ok(html.includes("boot-unlock-state"));
		assert.ok(html.includes("Нужен доступ к данным клиники"));
		assert.ok(html.includes("Требуется секрет администратора"));
		assert.ok(html.includes("boot-unlock-form"));
	});

	it("renders retry button when onAction is provided", () => {
		const htmlWithRetry = renderToString(
			React.createElement(AppLoadingState, {
				message: "Рабочий сервер недоступен: network timeout",
				actionLabel: "Повторить загрузку",
				onAction: () => {},
			}),
		);

		assert.ok(htmlWithRetry.includes("boot-retry-button"));
		assert.ok(htmlWithRetry.includes("Повторить загрузку"));
	});

	it("offline autonomy storage mode sets and clears safely", () => {
		setOfflineAutonomyMode(true);
		assert.equal(isOfflineAutonomyMode(), true);

		setOfflineAutonomyMode(false);
		assert.equal(isOfflineAutonomyMode(), false);
	});

	it("AppLoadingState supports timeoutMs and onSwitchToOffline props without crashing", () => {
		let switched = false;
		const element = React.createElement(AppLoadingState, {
			message: "Загрузка",
			timeoutMs: 2500,
			onSwitchToOffline: () => {
				switched = true;
			},
		});

		const html = renderToString(element);
		assert.ok(html.includes("DENTE"));
		assert.equal(switched, false); // initial render before timeout
	});
});
