import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createRemoteSession,
	fetchRemoteSessions,
	fetchSpeechGatewayHealth,
	saveRemoteMemoryFacts,
	saveRemoteSettings,
} from "../../../store/copilotSessionApi";
import { executeCopilotAgentRequest } from "../chairside/chairsideAgentExecutor";
import { CopilotMessageFeed } from "../studio/CopilotMessageFeed";
import { CopilotVoiceStenographer } from "../CopilotVoiceStenographer";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	resetInMemoryAuthTokens,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";

describe("AI Copilot & Voice Red Team Runtime Regressions", () => {
	const originalFetch = globalThis.fetch;
	const originalWindow = globalThis.window;

	afterEach(() => {
		resetInMemoryAuthTokens();
		globalThis.fetch = originalFetch;
		Object.defineProperty(globalThis, "window", {
			value: originalWindow,
			configurable: true,
			writable: true,
		});
	});

	it("1. P0-2: copilotSessionApi resolves absolute URLs, sends credentials:include and Read headers in non-HTTP/Node origin", async () => {
		const calls: Array<{ url: string; method: string; credentials: RequestCredentials | undefined; headers: Headers }> = [];
		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			calls.push({
				url,
				method: init?.method ?? "GET",
				credentials: init?.credentials,
				headers: new Headers(init?.headers),
			});
			return new Response(JSON.stringify({ ok: true, sessions: [], settings: {} }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;

		// Case A: Node / jsdom with undefined window
		Object.defineProperty(globalThis, "window", {
			value: undefined,
			configurable: true,
			writable: true,
		});

		const sessionId = "01945000-0000-7000-8000-000000000011";
		assert.equal(await createRemoteSession({ id: sessionId, title: "Осмотр 36" }), true);
		assert.equal(await saveRemoteSettings({ showTypingAnimation: false }), true);
		assert.equal(await saveRemoteMemoryFacts([]), true);
		assert.ok(Array.isArray(await fetchRemoteSessions({ q: "кариес" })));
		assert.ok(await fetchSpeechGatewayHealth());

		// Case B: Electron / Capacitor file:// origin
		Object.defineProperty(globalThis, "window", {
			value: { location: { origin: "file://", search: "" } },
			configurable: true,
			writable: true,
		});
		assert.equal(await createRemoteSession({ id: sessionId, title: "Осмотр 16" }), true);

		assert.equal(calls.length, 6);
		for (const call of calls) {
			assert.ok(
				call.url.startsWith("http://127.0.0.1:3000/api/"),
				`URL должен резолвиться в абсолютный HTTP URL, получено: ${call.url}`,
			);
			assert.equal(call.credentials, "include", `${call.method} ${call.url} обязан передавать credentials: include`);
		}

		// Mutations carry Idempotency-Key; GETs use ReadHeaders (without forcing Content-Type)
		const mutations = calls.filter((c) => c.method === "POST" || c.method === "PUT");
		const reads = calls.filter((c) => c.method === "GET");
		assert.equal(mutations.length, 4);
		assert.equal(reads.length, 2);
		for (const m of mutations) {
			assert.ok(m.headers.get("Idempotency-Key"), `Мутация ${m.url} обязана передавать Idempotency-Key`);
		}
		for (const r of reads) {
			assert.equal(r.headers.get("Content-Type"), null, `GET ${r.url} не должен ставить Content-Type через mutationHeaders`);
		}
	});

	it("2. P0-3: chairsideAgentExecutor JSON fallback sends canonical payload without toothNumber/context and includes Idempotency-Key", async () => {
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "test-clinic-jwt");
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "test-staff-jwt");

		const capturedJsonCalls: Array<{
			url: string;
			credentials: RequestCredentials | undefined;
			headers: Headers;
			body: Record<string, unknown>;
		}> = [];

		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			const headers = new Headers(init?.headers);
			const parsedBody = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
			if (parsedBody.stream === true) {
				return new Response(JSON.stringify({ error: "StreamUnavailable" }), { status: 503 });
			}
			capturedJsonCalls.push({
				url,
				credentials: init?.credentials,
				headers,
				body: parsedBody,
			});
			return new Response(
				JSON.stringify({
					text: "Кариес зуба 36: выполнена реставрация.",
					toolCalls: [],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		const result = await executeCopilotAgentRequest({
			promptText: "Зуб 36 глубокий кариес, пломба",
			activeTooth: 36,
			patientId: "11111111-1111-4111-8111-111111111111",
			visitId: "22222222-2222-4222-8222-222222222222",
			patientAllergies: ["Лидокаин"],
			patientSomaticHistory: "Гипертензия",
		});

		assert.ok(result);
		assert.equal(capturedJsonCalls.length, 1);
		const jsonReq = capturedJsonCalls[0]!;
		assert.ok(jsonReq.url.endsWith("/api/agent/chat"));
		assert.equal(jsonReq.credentials, "include");
		assert.ok(jsonReq.headers.get("Idempotency-Key"), "Fallback POST обязан передавать Idempotency-Key");
		assert.equal(jsonReq.headers.get("Authorization"), "Bearer test-staff-jwt");
		assert.equal(jsonReq.body.activeTooth, 36);
		assert.equal("toothNumber" in jsonReq.body, false, "Устаревшее поле toothNumber запрещено (.strict())");
		assert.equal("context" in jsonReq.body, false, "Устаревшее поле context запрещено (.strict())");
	});

	it("3. P1-4: CopilotMessageFeed honors showTypingAnimation toggle during streaming", () => {
		const baseProps = {
			messages: [{ id: "m-1", role: "assistant" as const, text: "Ответ", timestamp: "12:00" }],
			activeTooth: 36,
			patientId: null,
			activeDiff: null,
			applyActiveDiff: () => {},
			rejectActiveDiff: () => {},
			appliedActionIds: new Set<string>(),
			actionError: null,
			onApplyAction: () => {},
			onRejectMessageAction: () => {},
			onSendMessage: () => {},
			isStreaming: true,
			speedMode: "turbo" as const,
			showThinkingProcess: false,
			currentThought: "",
			activeToolName: null,
			messagesEndRef: { current: null },
		};

		const enabledHtml = renderToString(<CopilotMessageFeed {...baseProps} showTypingAnimation={true} />);
		const disabledHtml = renderToString(<CopilotMessageFeed {...baseProps} showTypingAnimation={false} />);

		assert.ok(enabledHtml.includes("copilot-typing-cursor"), "При showTypingAnimation=true курсор обязан отображаться");
		assert.equal(disabledHtml.includes("copilot-typing-cursor"), false, "При showTypingAnimation=false курсор обязан быть скрыт");
	});

	it("4. P2-2: CopilotVoiceStenographer localizes SOAP section names and hides raw English keys", () => {
		const html = renderToString(
			<CopilotVoiceStenographer
				isOpen={true}
				activeTooth={36}
				patientName="Петров В.В."
				initialTranscript="Жалобы: ноющая боль зуба 36 при накусывании"
			/>,
		);
		assert.ok(html.includes("Раздел: Жалобы"), "Должно выводиться русское клиническое название раздела");
		assert.equal(html.includes("Раздел: complaint"), false, "Английский enum не должен отображаться");
	});
});
