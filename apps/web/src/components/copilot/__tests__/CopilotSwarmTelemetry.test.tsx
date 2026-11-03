/**
 * @file CopilotSwarmTelemetry.test.tsx
 * @description Vitest/Node test suite for DENTE Context Telemetry Bar & In-App Multi-Agent Swarm Inspector.
 * Verifies:
 * 1. Context Telemetry Bar: patient info, model badge, response latency, token budget progress & soft compression markers (70% Pruning, 85% Sliding Window), gateway status.
 * 2. Multi-Agent Swarm Inspector: 4 canonical subagent roles (Triage Agent, Odontogram & Diary Inquisitor, Billing & Fiscal Sentinel, Vision & DICOM Specialist), status badges, audit metrics, single Primary CTA (Mandate 8am), non-disabled buttons (Mandate 8e).
 * 3. Mount in CopilotStudioModal and CopilotDrawer.
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
import { CopilotSwarmPanel } from "../swarm/CopilotSwarmPanel";
import { CopilotStudioModal } from "../CopilotStudioModal";
import { CopilotDrawer } from "../CopilotDrawer";
import { useCopilotStore } from "../../../store/copilotStore";
import { DEFAULT_SWARM_AGENTS } from "../swarm/swarmTypes";

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

describe("DENTE In-App Multi-Agent Swarm Inspector (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md)", () => {
	it("1. отображает все 4 канонические роли субагентов клинического роя", () => {
		const html = renderToString(<CopilotSwarmPanel />);
		assert.ok(html.includes("Triage Agent"), "1. Triage Agent обязан присутствовать");
		assert.ok(html.includes("Odontogram") && html.includes("Diary Inquisitor"), "2. Odontogram & Diary Inquisitor обязан присутствовать");
		assert.ok(html.includes("Billing") && html.includes("Fiscal Sentinel"), "3. Billing & Fiscal Sentinel обязан присутствовать");
		assert.ok(html.includes("Vision") && html.includes("DICOM Specialist"), "4. Vision & DICOM Specialist обязан присутствовать");

		assert.ok(html.includes("Маршрутизация обращений"), "Роль триажа обязана описываться");
		assert.ok(html.includes("Авто-аудит ЭМК"), "Роль инквизитора обязана описываться");
		assert.ok(html.includes("Сверка копеек"), "Роль сентинела обязана описываться");
		assert.ok(html.includes("Анализ RVG"), "Роль рентгенолога обязана описываться");
	});

	it("2. отображает статусы субагентов (Ожидание / В работе / Готово), последний аудит и количество проверенных записей", () => {
		const html = renderToString(<CopilotSwarmPanel />);
		assert.ok(html.includes("В работе") || html.includes("Готово") || html.includes("Ожидание"), "Статусы роя обязаны присутствовать");
		assert.ok(html.includes("Последний аудит:"), "Время последнего аудита обязано отображаться");
		assert.ok(html.includes("Проверено записей:"), "Счётчик проверенных записей обязан отображаться");
		assert.ok(html.includes("обращений"), "Метрика обращений для триажа обязана быть");
		assert.ok(html.includes("карт ЭМК"), "Метрика карт для инквизитора обязана быть");
		assert.ok(html.includes("чеков"), "Метрика чеков для сентинела обязана быть");
		assert.ok(html.includes("снимков КЛКТ"), "Метрика снимков для визиографа обязана быть");
	});

	it("3. Мандат 8am: ровно ОДНА Primary CTA кнопка («Запустить полный аудит роя»)", () => {
		const html = renderToString(<CopilotSwarmPanel />);
		assert.ok(html.includes("data-testid=\"swarm-run-all-cta\""), "Primary CTA обязан иметь data-testid");
		assert.ok(html.includes("copilot-primary-cta"), "Primary CTA обязан использовать класс .copilot-primary-cta");
		assert.ok(html.includes("Запустить полный аудит роя"), "Текст кнопки обязан быть 'Запустить полный аудит роя'");
		const primaryMatches = html.match(/copilot-primary-cta/g) || [];
		assert.equal(primaryMatches.length, 1, "Мандат 8am: ровно одна Primary CTA кнопка на видимый контекст");
	});

	it("4. Мандат 8e: кнопки проверки никогда не должны быть заблокированы (disabled запрещен)", () => {
		const html = renderToString(<CopilotSwarmPanel />);
		assert.equal(html.includes("disabled"), false, "Мандат 8e: кнопки врача никогда не блокируются");
	});

	it("5. triggerSwarmAudit интерактивно обновляет счетчики и статусы роя", () => {
		const initialCount = useCopilotStore.getState().swarmAgents.find((a) => a.id === "triage")?.inspectedRecordsCount || 0;
		useCopilotStore.getState().triggerSwarmAudit("triage");
		const updatedCount = useCopilotStore.getState().swarmAgents.find((a) => a.id === "triage")?.inspectedRecordsCount || 0;
		assert.equal(updatedCount, initialCount + 1, "triggerSwarmAudit обязан инкрементировать счетчик проверенных записей");
	});
});

describe("Mounting into CopilotStudioModal & CopilotDrawer", () => {
	it("1. CopilotStudioModal монтирует Context Telemetry Bar и вкладку «Клинический рой»", () => {
		const html = renderToString(
			<CopilotStudioModal
				isOpen={true}
				onClose={() => {}}
				activeTooth={36}
				patientName="Смирнов А.П."
				initialTab="swarm"
			/>
		);
		assert.ok(html.includes("data-testid=\"copilot-context-telemetry-bar\""), "Телеметрия контекста обязана присутствовать в студии");
		assert.ok(html.includes("Клинический рой"), "Вкладка Клинический рой обязана отображаться в навигации");
		assert.ok(html.includes("data-testid=\"copilot-swarm-panel\""), "Панель роя обязана рендериться при activeTab='swarm'");
		assert.ok(html.includes("Triage Agent"), "Роли роя обязаны рендериться внутри студии");
	});

	it("2. CopilotDrawer монтирует Context Telemetry Bar и вкладку роя", () => {
		const html = renderToString(
			<CopilotDrawer
				isOpen={true}
				messages={[]}
				busy={false}
				phase={null}
				pending={null}
				nameCache={{}}
				nudges={[]}
				activeTab="swarm"
				onTabChange={() => {}}
				onClose={() => {}}
				onSend={() => {}}
				onConfirm={() => {}}
				onReset={() => {}}
				onDismissNudge={() => {}}
			/>
		);
		assert.ok(html.includes("data-testid=\"copilot-context-telemetry-bar\""), "Телеметрия контекста обязана присутствовать в дровере");
		assert.ok(html.includes("Рой ИИ"), "Таб 'Рой ИИ' обязан отображаться в табах дровера");
		assert.ok(html.includes("data-testid=\"copilot-swarm-panel\""), "Панель роя обязана рендериться в дровере при activeTab='swarm'");
	});
});

describe("Architectural & Quality Invariants (Mandates 8b, 8d pt 7)", () => {
	it("1. Мандат 8b: проверка размеров файлов компонентов (Sweet Spot)", () => {
		const studioLines = fs.readFileSync(path.join(__dirname, "../CopilotStudioModal.tsx"), "utf-8").split("\n").length;
		assert.ok(studioLines >= 380 && studioLines <= 450, `CopilotStudioModal.tsx: ${studioLines} строк (ожидалось 380–450)`);

		const swarmPanelLines = fs.readFileSync(path.join(__dirname, "../swarm/CopilotSwarmPanel.tsx"), "utf-8").split("\n").length;
		assert.ok(swarmPanelLines >= 140 && swarmPanelLines <= 250, `CopilotSwarmPanel.tsx: ${swarmPanelLines} строк (ожидалось 140–250)`);

		const telemetryLines = fs.readFileSync(path.join(__dirname, "../telemetry/CopilotContextTelemetryBar.tsx"), "utf-8").split("\n").length;
		assert.ok(telemetryLines >= 80 && telemetryLines <= 200, `CopilotContextTelemetryBar.tsx: ${telemetryLines} строк (ожидалось 80–200)`);

		const drawerLines = fs.readFileSync(path.join(__dirname, "../CopilotDrawer.tsx"), "utf-8").split("\n").length;
		assert.ok(drawerLines <= 500, `CopilotDrawer.tsx: ${drawerLines} строк (ожидалось <= 500)`);
	});

	it("2. Мандат 8d pt 7: строго 0 cartoon emojis в новых и обновленных файлах", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const filesToCheck = [
			path.join(__dirname, "../CopilotStudioModal.tsx"),
			path.join(__dirname, "../CopilotDrawer.tsx"),
			path.join(__dirname, "../telemetry/CopilotContextTelemetryBar.tsx"),
			path.join(__dirname, "../swarm/CopilotSwarmPanel.tsx"),
			path.join(__dirname, "../swarm/swarmTypes.ts"),
		];

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf-8");
			assert.equal(emojiRegex.test(content), false, `Обнаружен запрещенный cartoon emoji в файле ${path.basename(file)}`);
		}
	});
});
