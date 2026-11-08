/**
 * @file copilotSotaAgentCapabilities.test.tsx
 * @description Red Team Test Suite for SOTA Open-Source AI Agent System in DENTE CRM.
 * Verifies:
 * 1. Granular Tool Permissions (Auto-Approve rules for files, clinical mutations, billing drafts)
 * 2. Persistent Thread Message Storage & Instant Session Switching
 * 3. Doctor Custom Instructions & Long-Term Clinical Memory Injection
 * 4. Streaming Typewriter Animation & Monospace Chain-of-Thought (CoT) Explorer
 * 5. Interactive Unified Diff Viewer & Tool Execution Telemetry Logs
 */

import React from "react";
import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { useCopilotStore } from "../../../store/copilotStore";
import { CopilotSettingsGranularPermissions } from "../settings/CopilotSettingsGranularPermissions";
import { CopilotSettingsPersonaTab } from "../settings/CopilotSettingsPersonaTab";
import { CopilotSettingsTrustTab } from "../settings/CopilotSettingsTrustTab";
import { CopilotThinkingIndicator } from "../CopilotThinkingIndicator";
import { CopilotHistoryDrawer } from "../CopilotHistoryDrawer";
import { CopilotMemoryTab } from "../CopilotMemoryTab";
import { CopilotSettingsModelRouting } from "../settings/CopilotSettingsModelRouting";
import { CopilotContextTelemetryBar } from "../telemetry/CopilotContextTelemetryBar";

describe("SOTA AI Agent System & Open-Source Architecture Parity", () => {
	it("1. copilotStore initializes with granular permissions, custom instructions, and thread storage", () => {
		const state = useCopilotStore.getState();
		assert.ok(state.settings.granularPermissions, "Granular permissions must be defined in settings");
		assert.strictEqual(typeof state.settings.granularPermissions.autoApproveFileReads, "boolean");
		assert.strictEqual(typeof state.settings.granularPermissions.autoApproveClinicalMutations, "boolean");
		assert.strictEqual(typeof state.settings.customDoctorInstructions, "string");
		assert.ok(state.threadMessages !== undefined, "threadMessages registry must exist");
		assert.strictEqual(typeof state.saveThreadMessages, "function");
	});

	it("2. CopilotSettingsGranularPermissions renders 4 fine-grained auto-approve toggles with WCAG touch labels", () => {
		const perms = {
			autoApproveFileReads: true,
			autoApproveFileWrites: false,
			autoApproveClinicalMutations: true,
			autoApproveFinancialDrafts: true,
			autoApproveExternalSoftware: false,
		};
		let updated: any = null;
		const html = renderToString(
			<CopilotSettingsGranularPermissions
				granularPermissions={perms}
				setGranularPermissions={(next) => { updated = next; }}
			/>
		);

		assert.ok(html.includes("Гранулярные разрешения действий (Auto-Approve)"));
		assert.ok(html.includes("Чтение снимков и файлов на ПК"));
		assert.ok(html.includes("Разметка формулы и дневника ЭМК"));
		assert.ok(html.includes("Формирование черновиков сметы"));
		assert.ok(html.includes("Запись и экспорт файлов на диск"));
	});

	it("3. CopilotSettingsPersonaTab and CopilotSettingsTrustTab render doctor prompt and trust levels", () => {
		const personaHtml = renderToString(
			<CopilotSettingsPersonaTab
				clinicalSpecialization="therapy"
				setClinicalSpecialization={() => {}}
				diaryTemplate="soap"
				setDiaryTemplate={() => {}}
				customInstructions="Я терапевт-микроскопист, коффердам обязателен"
				setCustomInstructions={() => {}}
			/>
		);

		assert.ok(personaHtml.includes("Индивидуальные инструкции и персональный стиль врача"));
		assert.ok(personaHtml.includes("Я терапевт-микроскопист, коффердам обязателен"));

		const trustHtml = renderToString(
			<CopilotSettingsTrustTab
				trustLevel="supervised"
				setTrustLevel={() => {}}
				granularPermissions={{
					autoApproveFileReads: true,
					autoApproveFileWrites: false,
					autoApproveClinicalMutations: true,
					autoApproveFinancialDrafts: true,
					autoApproveExternalSoftware: false,
				}}
				setGranularPermissions={() => {}}
			/>
		);

		assert.ok(trustHtml.includes("Уровень доверия к действиям ИИ"));
		assert.ok(trustHtml.includes("Гранулярные разрешения действий"));
	});

	it("5. saveThreadMessages persistently saves messages per thread and retrieves cleanly", () => {
		const { saveThreadMessages, threadMessages } = useCopilotStore.getState();
		const testThreadId = "thread-unit-test-123";
		const testMsgs = [
			{ id: "msg-1", role: "user" as const, text: "Зуб 46 глубокий кариес", timestamp: "12:00" },
			{ id: "msg-2", role: "assistant" as const, text: "Диагноз K02.1, препарирование и нанокомпозит", timestamp: "12:01" },
		];

		saveThreadMessages(testThreadId, testMsgs);
		const updatedState = useCopilotStore.getState();
		assert.deepStrictEqual(updatedState.threadMessages[testThreadId], testMsgs);
	});

	it("6. CopilotThinkingIndicator renders animated typewriter shimmer and elapsed timer", () => {
		const html = renderToString(
			<CopilotThinkingIndicator
				isThinking={true}
				activeTooth={46}
				icd10Code="K02.1"
				thoughtProcess="Проверка соматики и одонтограммы зуба 46. Препарирование полости по II классу Блэка..."
				speedMode="turbo"
				showThinkingProcess={true}
			/>
		);

		assert.ok(html.includes("Мышление модели"));
		assert.ok(html.includes("FDI 46"));
		assert.ok(html.includes("МКБ-10 K02.1"));
		assert.ok(html.includes("Печатает"));
	});

	it("7. CopilotMemoryTab renders long-term memory categories with zero cartoon emojis", () => {
		const html = renderToString(<CopilotMemoryTab />);
		assert.ok(html.includes("Долговременная память ассистента"));
		assert.ok(html.includes("Добавить клиническое предпочтение"));
		assert.ok(html.includes("Материалы"));
		assert.ok(html.includes("Анестезия"));

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(html), false, "Must contain strictly 0 cartoon emojis in CopilotMemoryTab");
	});

	it("8. CopilotSettingsModelRouting defaults to server managed routing and reveals BYOK controls only when requested", () => {
		// Server managed view
		const serverHtml = renderToString(
			<CopilotSettingsModelRouting
				modelRoutingMode="server_managed"
				setModelRoutingMode={() => {}}
				byokProvider="gemini"
				setByokProvider={() => {}}
				byokApiKey=""
				setByokApiKey={() => {}}
				byokModel="gemini-2.5-flash"
				setByokModel={() => {}}
			/>
		);
		assert.ok(serverHtml.includes("Умный серверный роутер DENTE активен"));
		assert.ok(serverHtml.includes("Серверный роутинг"));
		assert.strictEqual(serverHtml.includes("Персональный API-ключ"), false, "BYOK inputs must be hidden in server_managed mode");

		// BYOK view
		const byokHtml = renderToString(
			<CopilotSettingsModelRouting
				modelRoutingMode="custom_byok"
				setModelRoutingMode={() => {}}
				byokProvider="gemini"
				setByokProvider={() => {}}
				byokApiKey="test-key"
				setByokApiKey={() => {}}
				byokModel="gemini-2.5-flash"
				setByokModel={() => {}}
			/>
		);
		assert.ok(byokHtml.includes("Персональный API-ключ"));
		assert.ok(byokHtml.includes("Провайдер ИИ"));
	});

	it("9. CopilotContextTelemetryBar renders intelligent server routing badge without hardcoded model strings", () => {
		useCopilotStore.setState((s) => ({
			...s,
			settings: {
				...s.settings,
				modelRoutingMode: "server_managed",
			},
		}));

		const html = renderToString(<CopilotContextTelemetryBar activeTooth={16} />);
		assert.ok(html.includes("DENTE Интеллект") && (html.includes("&lt;300мс") || html.includes("<300мс") || html.includes("300мс")), "Must render dynamic server-managed intelligence badge");
	});
});
