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
import { useCopilotStore, detectRuntimeEnvironment } from "../../../store/copilotStore";
import {
	fetchRemoteMemoryFacts,
	fetchRemoteMessages,
	fetchRemoteSessions,
	fetchRemoteSettings,
} from "../../../store/copilotSessionApi";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotSettingsTrustTab, normalizeTrustLevel } from "../settings/CopilotSettingsTrustTab";
import { CopilotSettingsModelRouting, MODERN_BYOK_MODELS, SERVER_MANAGED_TIERS } from "../settings/CopilotSettingsModelRouting";
import { CopilotSettingsVoicePrivacyTab } from "../settings/CopilotSettingsVoicePrivacyTab";
import { CopilotThinkingIndicator, getClinicalThinkingPhase } from "../CopilotThinkingIndicator";
import { CopilotHistoryDrawer, getThreadDateCategory } from "../CopilotHistoryDrawer";
import { executeCopilotConfirmationWithResult } from "../useCopilotModules/useCopilotActions";

describe("AI Copilot Workstation Settings & History Inquisitor", () => {
	beforeEach(() => {
		useCopilotStore.setState({
			settings: {
				...useCopilotStore.getState().settings,
				trustLevel: "balanced",
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

	it("1. Trust Levels: Cautious/confirm_all, Supervised/balanced and Autonomous are strictly defined and normalized", () => {
		assert.equal(normalizeTrustLevel("cautious"), "confirm_all");
		assert.equal(normalizeTrustLevel("confirm_all"), "confirm_all");
		assert.equal(normalizeTrustLevel("supervised"), "balanced");
		assert.equal(normalizeTrustLevel("balanced"), "balanced");
		assert.equal(normalizeTrustLevel("autonomous"), "autonomous");

		useCopilotStore.getState().setTrustLevel("confirm_all");
		assert.equal(useCopilotStore.getState().settings.trustLevel, "confirm_all");

		useCopilotStore.getState().setTrustLevel("balanced");
		assert.equal(useCopilotStore.getState().settings.trustLevel, "balanced");

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

		const htmlZeroNoise = renderToString(
			<CopilotThinkingIndicator
				isThinking={true}
			/>
		);
		assert.ok(!htmlZeroNoise.includes("FDI"), "FDI badge must not render without activeTooth");
		assert.ok(!htmlZeroNoise.includes("МКБ-10"), "ICD-10 badge must not render without icd10Code");
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

	it("6. copilotSessionApi unwraps { data } envelopes and clearThreads deletes remote UUID sessions", async () => {
		const originalFetch = globalThis.fetch;
		const deletedIds: string[] = [];
		const uuidA = "01945000-0000-7000-8000-000000000101";

		try {
			setRuntimeDemoMode(false);
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.startsWith("/api/agent/sessions?") || url === "/api/agent/sessions") {
					return new Response(
						JSON.stringify({ data: { sessions: [{ id: uuidA, summary: "План имплантации", updatedAt: new Date().toISOString() }] } }),
						{ status: 200 },
					);
				}
				if (url.includes("/messages")) {
					return new Response(JSON.stringify({ data: { messages: [{ id: "m-1", role: "user", content: "Привет" }] } }), { status: 200 });
				}
				if (url === "/api/agent/memory") {
					return new Response(JSON.stringify({ data: { memoryFacts: [{ id: "f-1", fact: "Предпочтение Ультракаина" }] } }), { status: 200 });
				}
				if (url === "/api/agent/settings") {
					return new Response(JSON.stringify({ data: { settings: { trustLevel: "autonomous", speedMode: "deep_reasoning" } } }), { status: 200 });
				}
				if (init?.method === "DELETE") {
					deletedIds.push(url);
					return new Response(JSON.stringify({ ok: true }), { status: 200 });
				}
				return new Response("{}", { status: 404 });
			}) as typeof fetch;

			const sessions = await fetchRemoteSessions({ q: "имплантации" });
			assert.equal(sessions?.length, 1);
			assert.equal(sessions?.[0]?.id, uuidA);

			const msgs = await fetchRemoteMessages(uuidA);
			assert.equal(msgs?.length, 1);

			const facts = await fetchRemoteMemoryFacts();
			assert.equal(facts?.length, 1);

			const remoteSettings = await fetchRemoteSettings();
			assert.equal(remoteSettings?.trustLevel, "autonomous");

			useCopilotStore.setState({
				threads: [{ id: uuidA, title: "План", updatedAt: "10:00", createdAt: new Date().toISOString(), messageCount: 1 }],
				activeThreadId: uuidA,
			});
			useCopilotStore.getState().clearThreads();
			await new Promise((r) => setTimeout(r, 10));
			assert.ok(deletedIds.some((u) => u.includes(uuidA)), "clearThreads must DELETE remote UUID sessions");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("7. detectRuntimeEnvironment recognizes window.denteDesktopNative as desktop_native", () => {
		const originalWindow = (globalThis as Record<string, unknown>).window;
		try {
			(globalThis as Record<string, unknown>).window = {
				denteDesktopNative: { isDesktop: true, platform: "win32" },
				matchMedia: () => ({ matches: false }),
			};
			assert.equal(detectRuntimeEnvironment(), "desktop_native");
		} finally {
			if (originalWindow === undefined) {
				delete (globalThis as Record<string, unknown>).window;
			} else {
				(globalThis as Record<string, unknown>).window = originalWindow;
			}
		}
	});

	it("8. Two-phase confirmation and applyActiveDiff propagate 403 errors honestly without false applied=true", async () => {
		const originalFetch = globalThis.fetch;
		const capturedActionBodies: Array<Record<string, unknown>> = [];
		try {
			setRuntimeDemoMode(false);
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.endsWith("/api/agent/confirm")) {
					return new Response(
						JSON.stringify({
							ok: false,
							error: "ConfirmationRequired",
							message: "Деструктивное действие требует подтверждения врача",
						}),
						{ status: 403 },
					);
				}
				if (url === "/api/agent/action") {
					const parsed = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
					capturedActionBodies.push(parsed);
					if (capturedActionBodies.length === 1) {
						return new Response(
							JSON.stringify({
								ok: false,
								error: "ConfirmationRequired",
								message: "Требуется подтверждение врача",
							}),
							{ status: 403 },
						);
					}
					return new Response(JSON.stringify({ ok: true, result: { updated: true } }), { status: 200 });
				}
				return new Response("{}", { status: 404 });
			}) as typeof fetch;

			const confirmFail = await executeCopilotConfirmationWithResult({
				callId: "call-403",
				decision: "confirm",
				actionName: "delete_tooth_record",
				actionArgs: { tooth: 16 },
			});
			assert.equal(confirmFail.ok, false);
			assert.equal(confirmFail.status, 403);
			assert.match(confirmFail.error ?? "", /подтверждения/i);

			useCopilotStore.getState().setActiveDiff({
				id: "diff-1",
				callId: "call-diff-9",
				title: "Правка файла",
				targetEntity: "notes.txt",
				beforeText: "(Новый файл)",
				afterText: "Клинический текст",
				applied: false,
			});

			const diffFailOk = await useCopilotStore.getState().applyActiveDiff();
			assert.equal(diffFailOk, false);
			assert.equal(useCopilotStore.getState().activeDiff?.applied, false);
			assert.equal(capturedActionBodies[0]?.confirmed, true);
			assert.equal(capturedActionBodies[0]?.callId, "call-diff-9");

			const diffPassOk = await useCopilotStore.getState().applyActiveDiff();
			assert.equal(diffPassOk, true);
			assert.equal(useCopilotStore.getState().activeDiff?.applied, true);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("9. updateSettings & togglePinThread sync full settings and pinnedThreadIds with server", async () => {
		const originalFetch = globalThis.fetch;
		const putPayloads: Array<Record<string, unknown>> = [];
		const uuidPin = "01945000-0000-7000-8000-000000000202";
		try {
			setRuntimeDemoMode(false);
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url === "/api/agent/settings" && init?.method === "PUT") {
					const parsed = JSON.parse(String(init.body ?? "{}")) as { settings: Record<string, unknown> };
					putPayloads.push(parsed.settings);
					return new Response(JSON.stringify({ ok: true, settings: parsed.settings }), { status: 200 });
				}
				if (url === "/api/agent/settings") {
					return new Response(
						JSON.stringify({
							ok: true,
							settings: {
								byokProvider: "custom",
								byokBaseUrl: "https://llm.clinic.example/v1",
								pinnedThreadIds: [uuidPin],
							},
						}),
						{ status: 200 },
					);
				}
				if (url.startsWith("/api/agent/sessions")) {
					return new Response(
						JSON.stringify({
							data: {
								sessions: [{ id: uuidPin, summary: "Закреплённый диалог", updatedAt: new Date().toISOString() }],
							},
						}),
						{ status: 200 },
					);
				}
				if (url === "/api/agent/memory") {
					return new Response(JSON.stringify({ data: { memoryFacts: [] } }), { status: 200 });
				}
				return new Response("{}", { status: 404 });
			}) as typeof fetch;

			useCopilotStore.getState().updateSettings({
				contextLimitTokens: 65536,
				byokProvider: "custom",
				byokApiKey: "sk-test-secret",
				byokModel: "custom-model-v1",
				byokBaseUrl: "https://llm.clinic.example/v1",
				autoSaveDrafts: false,
				localDropzonePath: "D:\\Xray",
				gloveModeTouchTarget: true,
				screenWakeLock: false,
				hapticFeedbackEnabled: false,
				runtimeMode: "desktop_native",
			});
			await new Promise((r) => setTimeout(r, 10));
			assert.equal(putPayloads.length, 1);
			assert.equal(putPayloads[0]?.contextLimitTokens, 65536);
			assert.equal(putPayloads[0]?.byokProvider, "custom");
			assert.equal(putPayloads[0]?.byokModel, "custom-model-v1");
			assert.equal(putPayloads[0]?.byokBaseUrl, "https://llm.clinic.example/v1");
			assert.equal(putPayloads[0]?.byokApiKey, "sk-test-secret");
			assert.equal(putPayloads[0]?.autoSaveDrafts, false);
			assert.equal(putPayloads[0]?.localDropzonePath, "D:\\Xray");
			assert.equal(putPayloads[0]?.gloveModeTouchTarget, true);
			assert.equal(putPayloads[0]?.screenWakeLock, false);
			assert.equal(putPayloads[0]?.hapticFeedbackEnabled, false);
			assert.equal(putPayloads[0]?.runtimeMode, "desktop_native");

			useCopilotStore.setState({
				threads: [{ id: uuidPin, title: "Чат", updatedAt: "10:00", createdAt: new Date().toISOString(), messageCount: 1, pinned: false }],
				activeThreadId: uuidPin,
			});
			useCopilotStore.getState().togglePinThread(uuidPin);
			await new Promise((r) => setTimeout(r, 10));
			assert.deepEqual(putPayloads[1]?.pinnedThreadIds, [uuidPin]);

			useCopilotStore.setState({ threads: [], activeThreadId: "" });
			await useCopilotStore.getState().hydrateSessionsFromBackend();
			assert.equal(useCopilotStore.getState().threads[0]?.pinned, true);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
