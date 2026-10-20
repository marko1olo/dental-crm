import test from "node:test";
import assert from "node:assert/strict";
import {
	AgentRouterClient,
	maskApiKey,
	parseApiKeys,
	safeParseToolArguments,
	AgentRouterModelOverloadedError,
	DEFAULT_AGENTROUTER_KEYS,
	DEFAULT_AGENTROUTER_BASE_URL,
	DEFAULT_AGENTROUTER_MODEL,
	DEFAULT_CLINICAL_TEMPERATURE,
	MIN_REASONING_MAX_TOKENS,
} from "./agentRouterClient.js";

test("maskApiKey masks raw secrets preserving only last 5 characters", () => {
	assert.equal(
		maskApiKey("sk-6osQfoRXkSyFDuySQOAotuSU74uh75f4gGj69e2zqaVytT3u"),
		"agentrouter...ytT3u",
	);
	assert.equal(
		maskApiKey("sk-LhzyJtJxTfDf7enG1bbfrCmK1Aq73Sh9B188hwJNCXm2cENL"),
		"agentrouter...2cENL",
	);
	assert.equal(maskApiKey("123"), "agentrouter...*****");
	assert.equal(maskApiKey(""), "agentrouter...none");
	assert.equal(maskApiKey(null), "agentrouter...none");
	assert.equal(maskApiKey(undefined), "agentrouter...none");
});

test("parseApiKeys handles comma-separated strings, trim, and defaults", () => {
	const defaultKeys = parseApiKeys();
	assert.deepEqual(defaultKeys, [...DEFAULT_AGENTROUTER_KEYS]);

	const emptyParsed = parseApiKeys("  ,  ,  ");
	assert.deepEqual(emptyParsed, [...DEFAULT_AGENTROUTER_KEYS]);

	const customKeys = parseApiKeys("sk-test-1,  sk-test-2 , sk-test-3  ");
	assert.deepEqual(customKeys, ["sk-test-1", "sk-test-2", "sk-test-3"]);
});

test("safeParseToolArguments safely parses JSON without throwing syntax errors", () => {
	const validCall = {
		id: "call_1",
		type: "function" as const,
		function: {
			name: "create_dental_formula",
			arguments: '{"tooth": 46, "diagnosis": "K02.1"}',
		},
	};
	const parsed = safeParseToolArguments<{ tooth: number; diagnosis: string }>(
		validCall,
	);
	assert.deepEqual(parsed, { tooth: 46, diagnosis: "K02.1" });

	const brokenCall = {
		id: "call_2",
		type: "function" as const,
		function: {
			name: "create_dental_formula",
			arguments: '{"tooth": 46, BROKEN_JSON',
		},
	};
	const brokenParsed = safeParseToolArguments(brokenCall);
	assert.equal(brokenParsed, null);

	assert.equal(safeParseToolArguments({} as any), null);
});

test("AgentRouterClient enforces clinical defaults: temperature 0.2 and max_tokens >= 4096", async () => {
	let capturedBody: any = null;
	let capturedAuth = "";

	const mockFetch: typeof fetch = async (_url, init) => {
		capturedAuth = (init?.headers as Record<string, string>)?.Authorization || "";
		capturedBody = JSON.parse(init?.body as string);
		return new Response(
			JSON.stringify({
				id: "chatcmpl-test-1",
				object: "chat.completion",
				created: 1728000000,
				model: "deepseek-v4-flash",
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: "Клинический диагноз подтверждён.",
						},
						finish_reason: "stop",
					},
				],
				usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	};

	const client = new AgentRouterClient({
		apiKeys: ["sk-key-test-abcde"],
		fetchFn: mockFetch,
	});

	// Case 1: Default call without explicit temperature / max_tokens
	const res = await client.createChatCompletion({
		messages: [{ role: "user", content: "Привет" }],
	});

	assert.equal(res.choices[0]?.message.content, "Клинический диагноз подтверждён.");
	assert.equal(capturedAuth, "Bearer sk-key-test-abcde");
	assert.equal(capturedBody.temperature, DEFAULT_CLINICAL_TEMPERATURE);
	assert.equal(capturedBody.max_tokens, MIN_REASONING_MAX_TOKENS);
	assert.equal(capturedBody.model, DEFAULT_AGENTROUTER_MODEL);

	// Case 2: Attempting low max_tokens (e.g. 500) gets raised to MIN_REASONING_MAX_TOKENS (4096)
	await client.createChatCompletion({
		messages: [{ role: "user", content: "Короткий ответ" }],
		max_tokens: 500,
		temperature: 0.1,
	});

	assert.equal(capturedBody.max_tokens, MIN_REASONING_MAX_TOKENS);
	assert.equal(capturedBody.temperature, 0.1);
});

test("AgentRouterClient rotates keys automatically on HTTP 429 Rate Limit", async () => {
	const calledKeys: string[] = [];

	const mockFetch: typeof fetch = async (_url, init) => {
		const auth = (init?.headers as Record<string, string>)?.Authorization || "";
		const token = auth.replace("Bearer ", "");
		calledKeys.push(token);

		if (token === "sk-key-primary-11111") {
			// First key hits rate limit
			return new Response(
				JSON.stringify({
					error: { message: "Rate limit reached for requests per minute" },
				}),
				{ status: 429, headers: { "Content-Type": "application/json" } },
			);
		}

		// Second key succeeds
		return new Response(
			JSON.stringify({
				id: "chatcmpl-test-2",
				object: "chat.completion",
				created: 1728000000,
				model: "deepseek-v4-flash",
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: "Успешный ответ со второго ключа.",
						},
						finish_reason: "stop",
					},
				],
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	};

	const client = new AgentRouterClient({
		apiKeys: ["sk-key-primary-11111", "sk-key-secondary-22222"],
		fetchFn: mockFetch,
	});

	const response = await client.createChatCompletion({
		messages: [{ role: "user", content: "Лечение пульпита 3.6" }],
	});

	assert.equal(response.choices[0]?.message.content, "Успешный ответ со второго ключа.");
	assert.deepEqual(calledKeys, ["sk-key-primary-11111", "sk-key-secondary-22222"]);

	// Verify health snapshot: primary key is in cooldown, secondary key is healthy
	const health = client.getKeyHealthSnapshot();
	const primaryHealth = health.find((h) => h.keyMask === "agentrouter...11111");
	const secondaryHealth = health.find((h) => h.keyMask === "agentrouter...22222");

	assert.equal(primaryHealth?.isAvailable, false);
	assert.equal(primaryHealth?.failures, 1);
	assert.equal(secondaryHealth?.isAvailable, true);
});

test("AgentRouterClient HTTP 402 Budget pool quota exhausted: bans MODEL for 1800s, NEVER bans API KEY", async () => {
	let fetchCallCount = 0;

	const mockFetch: typeof fetch = async () => {
		fetchCallCount++;
		return new Response(
			JSON.stringify({
				error: {
					message:
						"Budget pool quota has been exhausted. Please ask an administrator to increase the limit",
				},
			}),
			{ status: 402, headers: { "Content-Type": "application/json" } },
		);
	};

	const client = new AgentRouterClient({
		apiKeys: ["sk-active-key-33333"],
		fetchFn: mockFetch,
	});

	await assert.rejects(
		async () => {
			await client.createChatCompletion({
				messages: [{ role: "user", content: "Анализ КТ" }],
				model: "deepseek-v4-flash",
			});
		},
		(err: Error) => {
			assert.ok(err instanceof AgentRouterModelOverloadedError);
			assert.equal(err.status, 402);
			assert.equal(err.model, "deepseek-v4-flash");
			assert.equal(err.cooldownSeconds, 1800);
			return true;
		},
	);

	// 1. Verify model is banned
	assert.equal(client.isModelBanned("deepseek-v4-flash"), true);

	// 2. CRITICAL INVARIANT: API key MUST REMAIN ACTIVE!
	const health = client.getKeyHealthSnapshot();
	const firstHealth = health[0];
	assert.ok(firstHealth);
	assert.equal(firstHealth.keyMask, "agentrouter...33333");
	assert.equal(firstHealth.isAvailable, true, "API Key MUST NOT be placed on cooldown on 402");
	assert.equal(firstHealth.cooldownUntil, 0);
	assert.equal(firstHealth.failures, 0);

	// 3. Second call for the same model fails immediately due to model ban without hitting network
	const initialFetchCount = fetchCallCount;
	await assert.rejects(
		async () => {
			await client.createChatCompletion({
				messages: [{ role: "user", content: "Повторный запрос" }],
				model: "deepseek-v4-flash",
			});
		},
		(err: Error) => {
			assert.ok(err instanceof AgentRouterModelOverloadedError);
			return true;
		},
	);
	assert.equal(fetchCallCount, initialFetchCount, "Must not hit network for banned model");
});

test("AgentRouterClient rotates keys on HTTP 500 / 502 / 503 Server Errors", async () => {
	const calledTokens: string[] = [];

	const mockFetch: typeof fetch = async (_url, init) => {
		const auth = (init?.headers as Record<string, string>)?.Authorization || "";
		const token = auth.replace("Bearer ", "");
		calledTokens.push(token);

		if (token === "sk-key-srv-1") {
			return new Response("502 Bad Gateway: upstream server unavailable", {
				status: 502,
				headers: { "Content-Type": "text/plain" },
			});
		}

		return new Response(
			JSON.stringify({
				id: "chatcmpl-test-500",
				object: "chat.completion",
				created: 1728000000,
				model: "deepseek-v4-flash",
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: "Успех после 502" },
						finish_reason: "stop",
					},
				],
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	};

	const client = new AgentRouterClient({
		apiKeys: ["sk-key-srv-1", "sk-key-srv-2"],
		fetchFn: mockFetch,
	});

	const response = await client.createChatCompletion({
		messages: [{ role: "user", content: "Проверка отказоустойчивости" }],
	});

	assert.equal(response.choices[0]?.message.content, "Успех после 502");
	assert.deepEqual(calledTokens, ["sk-key-srv-1", "sk-key-srv-2"]);
});

test("AgentRouterClient createStreamingChatCompletion streams SSE chunks, reasoning deltas, and tool calls", async () => {
	const ssePayload = [
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Анализирую жалобу пациента: "},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"reasoning_content":"выявляем кариес дентина 1.6."},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Здравствуйте! "},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Потребуется осмотр зуба 1.6."},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_diag_123","type":"function","function":{"name":"record_diagnosis","arguments":"{\\"tooth\\": 16"}}]},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":", \\"code\\": \\"K02.1\\"}"}}]},"finish_reason":null}]}\n\n',
		'data: {"id":"chatcmpl-stream-1","created":1728000000,"model":"deepseek-v4-flash","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
		"data: [DONE]\n\n",
	].join("");

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode(ssePayload));
			controller.close();
		},
	});

	const mockFetch: typeof fetch = async () => {
		return new Response(stream, {
			status: 200,
			headers: { "Content-Type": "text/event-stream" },
		});
	};

	const client = new AgentRouterClient({
		apiKeys: ["sk-key-stream-11111"],
		fetchFn: mockFetch,
	});

	const textChunks: string[] = [];
	const reasoningChunks: string[] = [];
	const toolDeltas: any[] = [];

	const fullResponse = await client.createStreamingChatCompletion(
		{
			messages: [{ role: "user", content: "Осмотр" }],
			tools: [
				{
					type: "function",
					function: {
						name: "record_diagnosis",
						description: "Запись диагноза",
						parameters: { type: "object" },
					},
				},
			],
		},
		{
			onChunk: (chunk) => textChunks.push(chunk),
			onReasoningChunk: (reasoning) => reasoningChunks.push(reasoning),
			onToolCallDelta: (delta) => toolDeltas.push(delta),
		},
	);

	// 1. Text streaming verification
	assert.equal(textChunks.join(""), "Здравствуйте! Потребуется осмотр зуба 1.6.");
	// 2. DeepSeek reasoning streaming verification
	assert.equal(
		reasoningChunks.join(""),
		"Анализирую жалобу пациента: выявляем кариес дентина 1.6.",
	);
	// 3. Tool call delta verification
	assert.ok(toolDeltas.length >= 2);

	// 4. Aggregated full response verification
	const firstChoice = fullResponse.choices[0];
	assert.ok(firstChoice);
	assert.equal(
		firstChoice.message.content,
		"Здравствуйте! Потребуется осмотр зуба 1.6.",
	);
	assert.equal(
		firstChoice.message.reasoning_content,
		"Анализирую жалобу пациента: выявляем кариес дентина 1.6.",
	);
	assert.equal(firstChoice.finish_reason, "tool_calls");

	const toolCalls = firstChoice.message.tool_calls;
	assert.ok(Array.isArray(toolCalls) && toolCalls.length === 1);
	const firstToolCall = toolCalls[0];
	assert.ok(firstToolCall);
	assert.equal(firstToolCall.id, "call_diag_123");
	assert.equal(firstToolCall.function.name, "record_diagnosis");
	assert.equal(
		firstToolCall.function.arguments,
		'{"tooth": 16, "code": "K02.1"}',
	);

	// 5. Test safeParseToolArguments on aggregated tool call
	const parsedArgs = safeParseToolArguments<{ tooth: number; code: string }>(
		firstToolCall,
	);
	assert.deepEqual(parsedArgs, { tooth: 16, code: "K02.1" });
});
