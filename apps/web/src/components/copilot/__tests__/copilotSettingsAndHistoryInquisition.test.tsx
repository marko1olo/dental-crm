/**
 * @file copilotSettingsAndHistoryInquisition.test.tsx
 * @description Red Team Test Suite for Copilot Workstation Settings,
 * Trust Levels (Cautious, Supervised, Autonomous), Generation Milestones & History Threads.
 *
 * Mandate 8av / Mandate 8e / Mandate 8b.
 */

import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { useCopilotStore } from "../../../store/copilotStore";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotSettingsTrustTab, normalizeTrustLevel } from "../settings/CopilotSettingsTrustTab";
import { CopilotSettingsModelRouting, MODERN_BYOK_MODELS, SERVER_MANAGED_TIERS } from "../settings/CopilotSettingsModelRouting";
import { CopilotSettingsVoicePrivacyTab } from "../settings/CopilotSettingsVoicePrivacyTab";
import { CopilotThinkingIndicator, getClinicalThinkingPhase } from "../CopilotThinkingIndicator";
import { CopilotHistoryDrawer, getThreadDateCategory } from "../CopilotHistoryDrawer";

describe("AI Copilot Workstation Settings & History Inquisitor", () => {
	beforeEach(() => {
		useCopilotStore.setState({
			settings: {
				...useCopilotStore.getState().settings,
				trustLevel: "supervised",
				provider: "gemini",
				model: "server_managed",
				modelRoutingMode: "server_managed",
				speechEngine: "gemini_live",
				runtimeMode: "web_browser",
			},
			threads: [],
			activeThreadId: "",
			threadMessages: {},
			threadSearchQuery: "",
		});
	});

	it("1. Trust Levels: Cautious, Supervised and Autonomous are strictly defined and normalized", () => {
		assert.equal(normalizeTrustLevel("cautious"), "cautious");
		assert.equal(normalizeTrustLevel("confirm_all"), "cautious");
		assert.equal(normalizeTrustLevel("supervised"), "supervised");
		assert.equal(normalizeTrustLevel("balanced"), "supervised");
		assert.equal(normalizeTrustLevel("autonomous"), "autonomous");

		useCopilotStore.getState().setTrustLevel("cautious");
		assert.equal(useCopilotStore.getState().settings.trustLevel, "cautious");

		useCopilotStore.getState().setTrustLevel("supervised");
		assert.equal(useCopilotStore.getState().settings.trustLevel, "supervised");

		useCopilotStore.getState().setTrustLevel("autonomous");
		assert.equal(useCopilotStore.getState().settings.trustLevel, "autonomous");
	});

	it("2. Model routing: supports Server-managed Smart Flash vs Lite vs Local fallback, and BYOK", () => {
		assert.ok(SERVER_MANAGED_TIERS.some((t) => t.id === "smart_flash"));
		assert.ok(SERVER_MANAGED_TIERS.some((t) => t.id === "chairside_lite"));
		assert.ok(SERVER_MANAGED_TIERS.some((t) => t.id === "local_fallback"));

		assert.ok(MODERN_BYOK_MODELS.some((m) => m.id === "gemini-3.6-flash"));
		assert.ok(MODERN_BYOK_MODELS.some((m) => m.id === "claude-3-5-sonnet"));
		assert.ok(MODERN_BYOK_MODELS.some((m) => m.id === "gpt-4o"));

		useCopilotStore.getState().updateSettings({
			modelRoutingMode: "custom_byok",
			byokProvider: "anthropic",
			byokModel: "claude-3-5-sonnet",
			byokApiKey: "sk-ant-test-key",
		});

		const current = useCopilotStore.getState().settings;
		assert.equal(current.modelRoutingMode, "custom_byok");
		assert.equal(current.byokProvider, "anthropic");
		assert.equal(current.byokModel, "claude-3-5-sonnet");
	});

	it("3. Voice engines: Gemini Live vs Whisper vs Web Speech with sensitivity options", () => {
		useCopilotStore.getState().updateSettings({
			speechEngine: "gemini_live",
			webSpeechSensitivity: "high",
		});
		assert.equal(useCopilotStore.getState().settings.speechEngine, "gemini_live");

		const html = renderToString(
			<CopilotSettingsVoicePrivacyTab
				speechEngine="gemini_live"
				setSpeechEngine={() => {}}
				webSpeechSensitivity="high"
				setSpeechSensitivity={() => {}}
				autoSaveDrafts={true}
				setAutoSaveDrafts={() => {}}
				maskPhiData={true}
				setMaskPhiData={() => {}}
				autoMicOnAppointmentOpen={false}
				setAutoMic={() => {}}
			/>
		);

		assert.ok(html.includes("Gemini Live"));
		assert.ok(html.includes("Whisper Cascade"));
		assert.ok(html.includes("Web Speech"));
		assert.ok(html.includes("Чувствительность распознавания речи Web Speech"));
	});

	it("4. Generation milestones: Stopwatch, phases [ Размышление... | Инструменты | Синтез ] and cursor", () => {
		assert.equal(getClinicalThinkingPhase(0.2), "ИИ формирует клинический протокол...");
		assert.equal(getClinicalThinkingPhase(1.5), "Дифференциальный диагноз по МКБ-10...");
		assert.equal(getClinicalThinkingPhase(2.5), "Проверка противопоказаний и СтАР...");
		assert.equal(getClinicalThinkingPhase(3.2), "Синтез рекомендаций и сметы...");

		const html = renderToString(
			<CopilotThinkingIndicator
				isThinking={true}
				activeTooth={46}
				icd10Code="K04.0"
				thoughtProcess="Формирование плана обтурации зуба 46 биокерамическим силером Bio-C"
				speedMode="turbo"
				showThinkingProcess={true}
				currentToolName="updateToothStatus"
			/>
		);

		assert.ok(html.includes("Размышление"));
		assert.ok(html.includes("Инструменты"));
		assert.ok(html.includes("Синтез"));
		assert.ok(html.includes("FDI 46"));
		assert.ok(html.includes("K04.0"));
		assert.ok(html.includes("Вызов инструмента: updateToothStatus"));
		assert.ok(html.includes("copilot-thinking-cursor"));
	});

	it("5. History Threads: creation, switching, search filtering and message isolation", () => {
		const threadId1 = useCopilotStore.getState().createThread("Иванов И.И.", "Санация зуба 16");
		const threadId2 = useCopilotStore.getState().createThread("Петрова А.В.", "Консультация имплантолога");

		assert.equal(useCopilotStore.getState().threads.length, 2);
		assert.equal(useCopilotStore.getState().activeThreadId, threadId2);

		// Save messages for thread 1
		useCopilotStore.getState().saveThreadMessages(threadId1, [
			{ id: "m1", role: "user", text: "Жалобы на скол пломбы 16" },
			{ id: "m2", role: "assistant", text: "Рекомендована керамическая вкладка e.max" },
		]);

		// Save messages for thread 2
		useCopilotStore.getState().saveThreadMessages(threadId2, [
			{ id: "m3", role: "user", text: "Планирование имплантации 24" },
		]);

		// Verify isolation
		assert.equal(useCopilotStore.getState().threadMessages[threadId1]?.length, 2);
		assert.equal(useCopilotStore.getState().threadMessages[threadId2]?.length, 1);

		// Search filtering
		useCopilotStore.getState().setThreadSearchQuery("Иванов");
		const allThreads = useCopilotStore.getState().threads;
		const query = useCopilotStore.getState().threadSearchQuery.toLowerCase();
		const matched = allThreads.filter((t) => t.patientName?.toLowerCase().includes(query));
		assert.equal(matched.length, 1);
		assert.equal(matched[0]?.patientName, "Иванов И.И.");

		// Switch thread
		useCopilotStore.getState().selectThread(threadId1);
		assert.equal(useCopilotStore.getState().activeThreadId, threadId1);
	});
});
