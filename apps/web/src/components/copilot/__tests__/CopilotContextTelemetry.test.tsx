/**
 * @file CopilotContextTelemetry.test.tsx
 * @description Vitest/Node test suite for DENTE Context Telemetry Bar (Antigravity Language Server Standard).
 * Verifies:
 * 1. Context Telemetry Bar: patient info, model badge, response latency, token budget progress & soft compression markers (70% Pruning, 85% Sliding Window), gateway status.
 * 2. Mount in CopilotStudioModal (tabs: dialog, actions, memory) with context telemetry and clean tabs.
 * 3. Mandate 8wy: Strict Production vs Showcase isolation (no fake mockups in production).
 * 4. Architectural invariants: file limits (Mandate 8b), strictly 0 cartoon emojis (Mandate 8d pt 7).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CopilotContextTelemetryBar } from "../telemetry/CopilotContextTelemetryBar";
import { CopilotStudioModal } from "../CopilotStudioModal";
import { useCopilotStore, getInitialCopilotState } from "../../../store/copilotStore";
import { setRuntimeDemoMode } from "../../../lib/demoMode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("DENTE Context Telemetry Bar (Antigravity Language Server Standard)", () => {
	it("1. рендерит активного пациента, ID карты и выбранный зуб FDI", () => {
		const html = renderToString(
			<CopilotContextTelemetryBar
				patientName="Иванов И.И."
				patientId="pat-458"
				activeTooth={36}
			/>
		);
		assert.ok(html.includes("data-testid=\"copilot-context-telemetry-bar\""), "Телеметрия обязана иметь testid");
		assert.ok(html.includes("Иванов И.И."), "ФИО пациента обязано отображаться");
		assert.ok(html.includes("#pat-458"), "ID карты пациента обязан отображаться");
		assert.ok(html.includes("Зуб 36"), "Зуб 36 по формуле FDI обязан отображаться");
	});

	it("2. отображает бейдж клинической модели с индикатором отклика (~450мс)", () => {
		const html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("Gemini 2.5 Flash") || html.includes("Gemini"), "Клиническая модель обязана отображаться");
		assert.ok(html.includes("мс"), "Индикатор отклика (мс) обязан отображаться");
	});

	it("3. отображает бюджет токенов, прогресс-бар и мягкие маркеры сжатия (Pruning при 70%, Sliding Window при 85%)", () => {
		// Тест стандартного бюджета (11%)
		useCopilotStore.getState().updateTelemetry({ activeTokens: 14250, maxTokens: 128000 });
		let html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("14") && html.includes("128"), "Счетчик токенов обязан отображаться");
		assert.ok(html.includes("11%"), "Процент заполнения контекста обязан отображаться");
		assert.ok(!html.includes("marker-pruning"), "При 11% маркер Pruning не должен отображаться");
		assert.ok(!html.includes("marker-sliding-window"), "При 11% маркер Sliding Window не должен отображаться");

		// Тест порога 70% (Pruning)
		useCopilotStore.getState().updateTelemetry({ activeTokens: 96000, maxTokens: 128000 });
		html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("marker-pruning"), "При >= 70% маркер Pruning обязан отображаться");
		assert.ok(!html.includes("marker-sliding-window"), "При 75% маркер Sliding Window не должен отображаться");

		// Тест порога 85% (Sliding Window)
		useCopilotStore.getState().updateTelemetry({ activeTokens: 115000, maxTokens: 128000 });
		html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("marker-sliding-window"), "При >= 85% маркер Sliding Window обязан отображаться");

		// Сброс к дефолту
		useCopilotStore.getState().updateTelemetry({ activeTokens: 14250, maxTokens: 128000 });
	});

	it("4. отображает статус контура (Облачный шлюз vs Локальный детерминированный)", () => {
		useCopilotStore.getState().updateSettings({ runtimeMode: "web_browser" });
		useCopilotStore.getState().updateTelemetry({ gatewayStatus: "cloud_active" });
		let html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("Облачный шлюз (Active)"), "В веб-режиме должен отображаться Облачный шлюз");

		useCopilotStore.getState().updateSettings({ runtimeMode: "desktop_native" });
		html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("Локальный детерминированный"), "В desktop_native должен отображаться Локальный детерминированный");
		useCopilotStore.getState().updateSettings({ runtimeMode: "web_browser" });
	});
});

describe("Clean Mounting into CopilotStudioModal (Zero Mockup Leaks)", () => {
	it("1. CopilotStudioModal монтирует Context Telemetry Bar и чистые клинические вкладки (dialog, actions, memory)", () => {
		const html = renderToString(
			<CopilotStudioModal
				isOpen={true}
				onClose={() => {}}
				activeTooth={36}
				patientName="Смирнов А.П."
				initialTab="dialog"
			/>
		);
		assert.ok(html.includes("data-testid=\"copilot-context-telemetry-bar\""), "Телеметрия контекста обязана присутствовать в студии");
		assert.ok(html.includes("Клинический диалог"), "Вкладка 'Клинический диалог' обязана присутствовать");
		assert.ok(html.includes("Быстрые действия"), "Вкладка 'Быстрые действия' обязана присутствовать");
		assert.ok(html.includes("Память ИИ"), "Вкладка 'Память ИИ' обязана присутствовать");
		assert.ok(!html.includes("Клинический рой"), "Бутафорская вкладка 'Клинический рой' обязана отсутствовать");
		assert.ok(!html.includes("Triage Agent"), "Внутренние промпт-архетипы субагентов не должны просачиваться врачу");
	});

	it("2. CopilotStudioModal монтирует вкладку быстрых действий и контекст телеметрии без моков", () => {
		const html = renderToString(
			<CopilotStudioModal
				isOpen={true}
				onClose={() => {}}
				activeTooth={36}
				patientName="Смирнов А.П."
				initialTab="actions"
			/>
		);
		assert.ok(html.includes("data-testid=\"copilot-context-telemetry-bar\""), "Телеметрия контекста обязана присутствовать");
		assert.ok(html.includes("Быстрые действия"), "Таб 'Быстрые действия' обязан отображаться");
		assert.ok(!html.includes("Рой ИИ"), "Бутафорский таб 'Рой ИИ' обязан отсутствовать");
	});
});

describe("Mandate 8wy: Production vs Showcase Isolation", () => {
	it("1. В боевом режиме (!isDemoShowcaseMode()) начальное состояние строго пустое и чистое", () => {
		setRuntimeDemoMode(false);
		const prodState = getInitialCopilotState();
		assert.equal(prodState.threads.length, 0, "В боевом режиме массив тредов обязан быть пустым");
		assert.equal(prodState.memoryFacts.length, 0, "В боевом режиме массив фактов памяти обязан быть пустым");
		assert.equal(prodState.toolExecutionLogs.length, 0, "В боевом режиме логи инструментов обязаны быть пустыми");
		assert.equal(prodState.telemetry.patientName, "", "В боевом режиме имя пациента обязано быть пустым");
		assert.equal(prodState.telemetry.activeTooth, null, "В боевом режиме активный зуб обязан быть null");
		assert.equal(prodState.telemetry.activeTokens, 0, "В боевом режиме токены обязаны быть 0");
	});

	it("2. CopilotContextTelemetryBar в боевом режиме при пустом пациенте отображает «Пациент не выбран» и «0 / 128k токенов»", () => {
		useCopilotStore.getState().updateTelemetry({
			patientName: "",
			patientId: "",
			activeTooth: null,
			activeTokens: 0,
			maxTokens: 128000,
		});

		const html = renderToString(<CopilotContextTelemetryBar />);
		assert.ok(html.includes("Пациент не выбран"), "При пустом пациенте обязан выводиться честный текст 'Пациент не выбран'");
		assert.ok(!html.includes("Иванов Иван Иванович"), "Фейковый Иванов не должен просачиваться в боевой прод");
		assert.ok(!html.includes("copilot-telemetry-tooth-badge"), "При activeTooth=null бейдж зуба не должен рендериться");
		assert.ok(html.includes("0 / 128k токенов"), "При 0 токенов обязан отображаться текст '0 / 128k токенов'");
	});

	it("3. В демо-режиме (isDemoShowcaseMode() === true) загружаются витринные данные", () => {
		setRuntimeDemoMode(true);
		const demoState = getInitialCopilotState();
		assert.ok(demoState.threads.length > 0, "В демо-режиме треды обязаны загружаться");
		assert.ok(demoState.memoryFacts.length > 0, "В демо-режиме факты памяти обязаны загружаться");
		assert.ok(demoState.toolExecutionLogs.length > 0, "В демо-режиме логи инструментов обязаны загружаться");
		assert.equal(demoState.telemetry.patientName, "Иванов Иван Иванович", "В демо-режиме витринный пациент Иванов");
		setRuntimeDemoMode(false);
	});
});

describe("Architectural & Quality Invariants (Mandates 8b, 8d pt 7)", () => {
	it("1. Мандат 8b: проверка размеров файлов компонентов (Sweet Spot)", () => {
		const studioLines = fs.readFileSync(path.join(__dirname, "../CopilotStudioModal.tsx"), "utf-8").split("\n").length;
		assert.ok(studioLines >= 380 && studioLines <= 450, `CopilotStudioModal.tsx: ${studioLines} строк (ожидалось 380–450)`);

		const telemetryLines = fs.readFileSync(path.join(__dirname, "../telemetry/CopilotContextTelemetryBar.tsx"), "utf-8").split("\n").length;
		assert.ok(telemetryLines >= 80 && telemetryLines <= 200, `CopilotContextTelemetryBar.tsx: ${telemetryLines} строк (ожидалось 80–200)`);

		const storeLines = fs.readFileSync(path.join(__dirname, "../../../store/copilotStore.ts"), "utf-8").split("\n").length;
		assert.ok(storeLines <= 450, `copilotStore.ts: ${storeLines} строк (ожидалось <= 450)`);

		const showcaseLines = fs.readFileSync(path.join(__dirname, "../../../store/copilotShowcaseData.ts"), "utf-8").split("\n").length;
		assert.ok(showcaseLines <= 120, `copilotShowcaseData.ts: ${showcaseLines} строк (ожидалось <= 120)`);
	});

	it("2. Мандат 8d pt 7: строго 0 cartoon emojis в новых и обновленных файлах", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const filesToCheck = [
			path.join(__dirname, "../CopilotStudioModal.tsx"),
			path.join(__dirname, "../telemetry/CopilotContextTelemetryBar.tsx"),
			path.join(__dirname, "../telemetry/telemetryTypes.ts"),
			path.join(__dirname, "../settings/CopilotSettingsIntelligenceTab.tsx"),
			path.join(__dirname, "../settings/CopilotSettingsTrustTab.tsx"),
			path.join(__dirname, "../settings/CopilotSettingsPersonaTab.tsx"),
			path.join(__dirname, "../../../store/copilotStore.ts"),
			path.join(__dirname, "../../../store/copilotShowcaseData.ts"),
		];

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf-8");
			assert.equal(emojiRegex.test(content), false, `Обнаружен запрещенный cartoon emoji в файле ${path.basename(file)}`);
		}
	});
});
