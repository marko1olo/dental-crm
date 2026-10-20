/**
 * @file packages/shared/src/ai/tokenCompactor.ts
 * @description Industrial Token Counter & Adaptive Context Compaction Engine.
 * 
 * Implements context management inspired by modern agent harnesses (Cline, OpenHands, Aider):
 * 1. Honest multi-script token estimation (Cyrillic ~1.5 tokens/word, Latin, JSON payloads, tool_calls, ChatML framing).
 * 2. Hard Invariant Tool-Call Pair Atomicity: NEVER breaks assistant.tool_calls <-> role: 'tool' pairs (prevents OpenAI HTTP 400).
 * 3. System prompt & initial root goal preservation (zero clinical amnesia).
 * 4. Dual Strategy: 'summarize_older' (structured semantic compaction) and 'sliding_window' (tail preservation).
 * 5. Human clinical terminology (no raw bureaucrat codes).
 */

export type AgentRouterRole = "system" | "user" | "assistant" | "tool";

export interface AgentRouterToolCallFunction {
	name: string;
	arguments: string; // JSON string payload per OpenAI / Anthropic function calling spec
}

export interface AgentRouterToolCall {
	id: string;
	type: "function";
	function: AgentRouterToolCallFunction;
}

export interface AgentRouterChatMessage {
	role: AgentRouterRole;
	content?: string | null;
	name?: string;
	tool_call_id?: string;
	tool_calls?: AgentRouterToolCall[];
	reasoning_content?: string | null;
}

export type CompactStrategy = "summarize_older" | "sliding_window";

export interface TokenCompactParams {
	messages: AgentRouterChatMessage[];
	maxContextTokens: number;
	compactThresholdRatio?: number; // default: 0.75 (compact when tokens >= maxContextTokens * 0.75)
	strategy?: CompactStrategy; // default: 'summarize_older'
	preserveRecentTurns?: number; // default: 3
	summaryRole?: "system" | "user"; // default: 'user'
	insertSlidingWindowNotice?: boolean; // default: true
	customSummarizer?: (messagesToSummarize: AgentRouterChatMessage[]) => string;
}

export interface AsyncTokenCompactParams extends Omit<TokenCompactParams, "customSummarizer"> {
	customSummarizer?: (messagesToSummarize: AgentRouterChatMessage[]) => Promise<string> | string;
}

export interface TokenCompactResult {
	messages: AgentRouterChatMessage[];
	compacted: boolean;
	tokensBefore: number;
	tokensAfter: number;
	compactedTurnsCount: number;
	summaryText?: string | undefined;
	strategyUsed?: CompactStrategy | undefined;
}

// ============================================================================
// 1. HONEST TOKEN ESTIMATION (CYRILLIC, LATIN, JSON & CHATML OVERHEAD)
// ============================================================================

/**
 * Accurately estimates token count for a text string.
 * Accounts for BPE tokenization differences:
 * - Cyrillic (Russian): ~3.2 chars/token (~1.5 tokens per Russian word)
 * - Latin (English/Code): ~4.0 chars/token (~0.75 tokens per English word)
 * - Numbers: ~2.5 chars/token
 * - JSON syntax / symbols ({}, [], :, ", \n): ~2.0 chars/token
 * - Whitespace: ~3.5 chars/token
 */
export function estimateStringTokens(text: string | null | undefined): number {
	if (!text || text.length === 0) {
		return 0;
	}

	let cyrillicCount = 0;
	let latinCount = 0;
	let digitCount = 0;
	let whitespaceCount = 0;
	let symbolCount = 0;

	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// Cyrillic unicode block: U+0400 - U+04FF
		if ((code >= 0x0400 && code <= 0x04ff) || code === 0x0401 || code === 0x0451) {
			cyrillicCount++;
		} else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
			// ASCII letters [A-Za-z]
			latinCount++;
		} else if (code >= 48 && code <= 57) {
			// Digits [0-9]
			digitCount++;
		} else if (code === 32 || code === 9 || code === 10 || code === 13) {
			// Whitespace ' ', \t, \n, \r
			whitespaceCount++;
		} else {
			// Punctuation, JSON syntax, unicode emoji
			symbolCount++;
		}
	}

	const estimated =
		cyrillicCount / 3.2 +
		latinCount / 4.0 +
		digitCount / 2.5 +
		whitespaceCount / 3.5 +
		symbolCount / 2.0;

	return Math.max(1, Math.ceil(estimated));
}

/**
 * Estimates token consumption for an individual ChatML message:
 * - Fixed ChatML framing overhead: 4 tokens (<|im_start|>role\n ... <|im_end|>)
 * - Name field overhead: +1 token + name tokens
 * - tool_call_id field overhead: +2 tokens + id tokens
 * - Content tokens: estimateStringTokens(content)
 * - Reasoning tokens: estimateStringTokens(reasoning_content)
 * - Tool calls overhead: 8 tokens schema framing + name + args + id tokens per call
 */
export function estimateMessageTokens(message: AgentRouterChatMessage): number {
	// Base ChatML envelope: <|im_start|> + role + \n + <|im_end|>
	let tokens = 4;

	if (message.name) {
		tokens += 1 + estimateStringTokens(message.name);
	}

	if (message.tool_call_id) {
		tokens += 2 + estimateStringTokens(message.tool_call_id);
	}

	if (message.content) {
		tokens += estimateStringTokens(message.content);
	}

	if (message.reasoning_content) {
		tokens += estimateStringTokens(message.reasoning_content);
	}

	if (message.tool_calls && message.tool_calls.length > 0) {
		for (const tc of message.tool_calls) {
			// Function call framing overhead
			tokens += 8;
			tokens += estimateStringTokens(tc.id);
			tokens += estimateStringTokens(tc.function.name);
			tokens += estimateStringTokens(tc.function.arguments);
		}
	}

	return tokens;
}

/**
 * Calculates total conversation token footprint including assistant reply priming.
 */
export function estimateConversationTokens(messages: AgentRouterChatMessage[]): number {
	if (!messages || messages.length === 0) {
		return 0;
	}

	let total = 0;
	for (const msg of messages) {
		total += estimateMessageTokens(msg);
	}

	// 3 tokens priming assistant response (<|im_start|>assistant\n)
	total += 3;

	return total;
}

// ============================================================================
// 2. RED TEAM INTEGRITY AUDIT: TOOL-CALL PAIR ATOMICITY VALIDATOR
// ============================================================================

export interface ToolCallIntegrityCheck {
	valid: boolean;
	error?: string;
	orphanedToolResponses?: string[];
	unansweredToolCalls?: string[];
}

/**
 * Strict validator verifying OpenAI / Anthropic specification invariants:
 * - Every role: 'tool' must have a tool_call_id matching a preceding assistant.tool_calls.
 * - No user or orphan assistant turn may interleave between assistant.tool_calls and its matching role: 'tool' responses.
 * - All tool calls declared by assistant must be resolved before proceeding.
 */
export function validateToolCallIntegrity(messages: AgentRouterChatMessage[]): ToolCallIntegrityCheck {
	const pendingToolCallIds = new Set<string>();
	const orphanedResponses: string[] = [];
	const allDeclaredToolCallIds = new Set<string>();

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (!msg) continue;

		if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
			if (pendingToolCallIds.size > 0) {
				return {
					valid: false,
					error: `Assistant declared new tool_calls while previous tool_calls were not resolved: [${Array.from(pendingToolCallIds).join(", ")}] at index ${i}`,
					unansweredToolCalls: Array.from(pendingToolCallIds),
				};
			}

			for (const tc of msg.tool_calls) {
				pendingToolCallIds.add(tc.id);
				allDeclaredToolCallIds.add(tc.id);
			}
		} else if (msg.role === "tool") {
			const id = msg.tool_call_id;
			if (!id) {
				orphanedResponses.push(`tool_at_index_${i}_missing_id`);
				return {
					valid: false,
					error: `Message at index ${i} has role: 'tool' but lacks tool_call_id.`,
					orphanedToolResponses: orphanedResponses,
				};
			}

			if (!pendingToolCallIds.has(id)) {
				orphanedResponses.push(id);
				return {
					valid: false,
					error: `Message at index ${i} has role: 'tool' with tool_call_id '${id}' without matching preceding assistant.tool_calls.`,
					orphanedToolResponses: orphanedResponses,
				};
			}

			pendingToolCallIds.delete(id);
		} else if (msg.role === "user") {
			if (pendingToolCallIds.size > 0) {
				return {
					valid: false,
					error: `User message received at index ${i} while assistant tool_calls [${Array.from(pendingToolCallIds).join(", ")}] are still awaiting responses.`,
					unansweredToolCalls: Array.from(pendingToolCallIds),
				};
			}
		}
	}

	if (pendingToolCallIds.size > 0) {
		return {
			valid: false,
			error: `Conversation ends with unanswered tool_calls: [${Array.from(pendingToolCallIds).join(", ")}]`,
			unansweredToolCalls: Array.from(pendingToolCallIds),
		};
	}

	return { valid: true };
}

// ============================================================================
// 3. HUMAN CLINICAL & SYSTEMIC EXTRACTIVE SUMMARIZER
// ============================================================================

/**
 * Humanizes tool names from raw code to clean medical / clinical & workstation terms.
 * Enforces NO RAW JARGON / NO RAW FORMS LAW.
 */
function humanizeToolName(name: string): string {
	switch (name) {
		// Clinical CRM Tools
		case "update_tooth_status":
		case "updateToothStatus":
			return "Одонтограмма (статус зуба)";
		case "calculate_anesthesia":
		case "calculateAnesthesia":
			return "Расчет безопасной анестезии";
		case "generate_form_043":
		case "generateForm043":
			return "Медицинская карта приёма (дневник визита)";
		case "create_invoice_draft":
		case "createInvoiceDraft":
			return "Предварительный расчёт стоимости (смета)";
		case "create_appointment":
		case "createAppointment":
			return "Запись на приём в расписании";
		case "search_services":
		case "searchServices":
			return "Поиск по каталогу процедур и прайс-листу";
		case "check_somatic_risks":
		case "checkSomaticRisks":
			return "Проверка соматического статуса и рисков";
		case "print_document":
		case "printDocument":
			return "Печать медицинского согласия и договора";

		// Native OS / Workstation Tools
		case "read_clinical_file":
		case "read_file":
		case "view_file":
			return "Чтение файлов рабочей станции";
		case "write_clinical_file":
		case "write_file":
			return "Запись файлов и выгрузок";
		case "replace_file_content":
		case "edit_file":
			return "Точечное обновление файлов";
		case "run_workstation_command":
		case "run_command":
			return "Выполнение системных команд";
		case "manage_task":
			return "Управление фоновыми задачами";
		case "schedule":
			return "Таймеры и регламентные напоминания";
		case "launch_workstation_app":
		case "launch_app":
			return "Запуск внешнего оборудования (визиограф/томограф)";
		case "capture_workstation_screen":
		case "capture_screen":
			return "Захват экрана датчика визиографа";

		default:
			return name;
	}
}

/**
 * Deterministic extractive summarizer that compresses intermediate conversation history
 * into a structured, highly informative medical/systemic briefing.
 */
export function generateHeuristicSummary(
	middleMessages: AgentRouterChatMessage[],
	firstUserGoal?: string
): string {
	const toolUsageMap = new Map<string, { count: number; examples: string[] }>();
	const extractedKeyFacts: string[] = [];
	const encounteredWarnings: string[] = [];

	let userTurnCount = 0;
	let assistantTurnCount = 0;
	let toolResultCount = 0;

	for (const msg of middleMessages) {
		if (msg.role === "user") {
			userTurnCount++;
			if (msg.content && msg.content.trim().length > 0) {
				const trimmed = msg.content.trim();
				if (trimmed.length <= 150) {
					extractedKeyFacts.push(`Запрос врача/пользователя: "${trimmed}"`);
				} else {
					extractedKeyFacts.push(`Запрос врача/пользователя: "${trimmed.slice(0, 140)}..."`);
				}
			}
		} else if (msg.role === "assistant") {
			assistantTurnCount++;

			// Inspect tool calls
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				for (const tc of msg.tool_calls) {
					const humanName = humanizeToolName(tc.function.name);
					const existing = toolUsageMap.get(humanName) ?? { count: 0, examples: [] };
					existing.count++;

					// Extract compact summary of arguments
					try {
						const parsedArgs = JSON.parse(tc.function.arguments);
						const argKeys = Object.keys(parsedArgs);
						if (argKeys.length > 0) {
							const compactSnippet = argKeys
								.slice(0, 3)
								.map((k) => `${k}: ${String(parsedArgs[k]).slice(0, 40)}`)
								.join(", ");
							if (existing.examples.length < 2) {
								existing.examples.push(compactSnippet);
							}
						}
					} catch {
						if (tc.function.arguments && existing.examples.length < 2) {
							existing.examples.push(tc.function.arguments.slice(0, 50));
						}
					}

					toolUsageMap.set(humanName, existing);
				}
			}

			// Extract assistant conclusions (first line kinetic strike)
			if (msg.content && msg.content.trim().length > 0) {
				const firstLine = msg.content.trim().split("\n")[0]?.trim() || "";
				if (firstLine.length > 0 && !firstLine.startsWith("[") && extractedKeyFacts.length < 6) {
					extractedKeyFacts.push(`Вывод ассистента: ${firstLine.slice(0, 160)}`);
				}
			}
		} else if (msg.role === "tool") {
			toolResultCount++;
			if (msg.content) {
				if (msg.content.includes("error") || msg.content.includes("Ошибка") || msg.content.includes("failed")) {
					encounteredWarnings.push(`Статус инструмента (${msg.tool_call_id}): ${msg.content.slice(0, 120)}`);
				}
			}
		}
	}

	const sections: string[] = [];
	sections.push("[СЖАТЫЙ КОНТЕКСТ СЕССИИ / COMPACTED HISTORY SUMMARY]");
	sections.push(`Сжато промежуточных шагов: ${middleMessages.length} (врач: ${userTurnCount}, ассистент: ${assistantTurnCount}, инструменты: ${toolResultCount})`);

	if (toolUsageMap.size > 0) {
		sections.push("🛠️ Действия и инструменты:");
		for (const [toolName, info] of toolUsageMap.entries()) {
			const exampleStr = info.examples.length > 0 ? ` (${info.examples.join("; ")})` : "";
			sections.push(`• ${toolName}: ${info.count}${exampleStr}`);
		}
	}

	if (extractedKeyFacts.length > 0) {
		sections.push("📋 Ключевые факты и решения:");
		for (const fact of extractedKeyFacts.slice(0, 5)) {
			sections.push(`• ${fact}`);
		}
	}

	if (encounteredWarnings.length > 0) {
		sections.push("⚠️ Предупреждения:");
		for (const warn of encounteredWarnings.slice(0, 2)) {
			sections.push(`• ${warn}`);
		}
	}

	return sections.join("\n");
}

// ============================================================================
// 4. ATOMIC TURN PARTITIONING (HEAD / MIDDLE / TAIL)
// ============================================================================

interface PartitionResult {
	head: AgentRouterChatMessage[];
	middle: AgentRouterChatMessage[];
	tail: AgentRouterChatMessage[];
	canCompact: boolean;
}

/**
 * Partitions the conversation messages into:
 * 1. Head: All initial system prompts + first user message (root task goal).
 * 2. Tail: Recent N turns with STRICT Tool-Call Pair Atomicity.
 * 3. Middle: Older intermediate turns eligible for compaction.
 */
export function partitionConversationAtomically(
	messages: AgentRouterChatMessage[],
	preserveRecentTurns: number = 3
): PartitionResult {
	if (messages.length === 0) {
		return { head: [], middle: [], tail: [], canCompact: false };
	}

	// 1. Identify Head (all starting system messages + first user message)
	let headEndIndex = 0;
	let foundFirstUser = false;

	while (headEndIndex < messages.length) {
		const msg = messages[headEndIndex];
		if (!msg) break;
		if (msg.role === "system") {
			headEndIndex++;
		} else if (msg.role === "user" && !foundFirstUser) {
			foundFirstUser = true;
			headEndIndex++;
			break;
		} else {
			break;
		}
	}

	// If the entire conversation is within the Head, cannot compact
	if (headEndIndex >= messages.length) {
		return {
			head: [...messages],
			middle: [],
			tail: [],
			canCompact: false,
		};
	}

	// 2. Identify Tail starting index based on preserveRecentTurns
	// We want to preserve at least `preserveRecentTurns` messages at the end,
	// but we must respect tool-call pairing boundaries!
	let targetTailLength = Math.max(1, preserveRecentTurns);
	let tailStartIndex = Math.max(headEndIndex, messages.length - targetTailLength);

	// Map out tool_call_id dependencies to prevent orphaned pairs
	// Case A: If messages[tailStartIndex] is role: 'tool', we MUST shift tailStartIndex LEFT
	// until we include the assistant message that spawned this tool call!
	// Case B: If messages[tailStartIndex - 1] is role: 'assistant' with tool_calls, and any of its
	// tool responses are in tail, we MUST include that assistant in tail!
	let adjusted = true;
	while (adjusted && tailStartIndex > headEndIndex) {
		adjusted = false;

		const currentMsg = messages[tailStartIndex];
		if (!currentMsg) break;

		// If currentMsg is role: 'tool', find its parent assistant
		if (currentMsg.role === "tool" && currentMsg.tool_call_id) {
			const targetId = currentMsg.tool_call_id;
			let parentIndex = -1;
			for (let i = tailStartIndex - 1; i >= headEndIndex; i--) {
				const prev = messages[i];
				if (prev && prev.role === "assistant" && prev.tool_calls?.some((tc) => tc.id === targetId)) {
					parentIndex = i;
					break;
				}
			}

			if (parentIndex !== -1 && parentIndex < tailStartIndex) {
				tailStartIndex = parentIndex;
				adjusted = true;
				continue;
			}
		}

		// Also check if the message just before tailStartIndex is an assistant with tool_calls
		// whose tool responses extend into tail
		const prevMsg = messages[tailStartIndex - 1];
		if (prevMsg && prevMsg.role === "assistant" && prevMsg.tool_calls && prevMsg.tool_calls.length > 0) {
			const declaredIds = new Set(prevMsg.tool_calls.map((tc) => tc.id));
			let hasChildrenInTail = false;
			for (let j = tailStartIndex; j < messages.length; j++) {
				const msgJ = messages[j];
				if (msgJ && msgJ.role === "tool" && msgJ.tool_call_id && declaredIds.has(msgJ.tool_call_id)) {
					hasChildrenInTail = true;
					break;
				}
			}

			if (hasChildrenInTail) {
				tailStartIndex = tailStartIndex - 1;
				adjusted = true;
				continue;
			}
		}
	}

	// Check if middle is empty
	if (tailStartIndex <= headEndIndex) {
		return {
			head: messages.slice(0, headEndIndex),
			middle: [],
			tail: messages.slice(headEndIndex),
			canCompact: false,
		};
	}

	const head = messages.slice(0, headEndIndex);
	const middle = messages.slice(headEndIndex, tailStartIndex);
	const tail = messages.slice(tailStartIndex);

	// Final verification: ensure middle doesn't end with an incomplete tool_call sequence
	// If middle ends with assistant.tool_calls whose responses are missing from middle,
	// our tailStartIndex expansion logic above already guaranteed that parent was shifted to tail.
	// But let's also ensure middle has valid self-contained pairs.
	const middleIntegrity = validateToolCallIntegrity(middle);
	if (!middleIntegrity.valid && middleIntegrity.unansweredToolCalls && middleIntegrity.unansweredToolCalls.length > 0) {
		// If middle somehow has unanswered tool_calls, shift tailStartIndex further left
		let lowestParent = tailStartIndex;
		for (const unansweredId of middleIntegrity.unansweredToolCalls) {
			for (let k = 0; k < middle.length; k++) {
				const middleK = middle[k];
				if (middleK?.tool_calls?.some((tc) => tc.id === unansweredId)) {
					if (k < lowestParent) {
						lowestParent = k;
					}
				}
			}
		}

		const newTailStart = headEndIndex + lowestParent;
		if (newTailStart <= headEndIndex) {
			return {
				head,
				middle: [],
				tail: messages.slice(headEndIndex),
				canCompact: false,
			};
		}

		return {
			head,
			middle: messages.slice(headEndIndex, newTailStart),
			tail: messages.slice(newTailStart),
			canCompact: true,
		};
	}

	return {
		head,
		middle,
		tail,
		canCompact: middle.length > 0,
	};
}

// ============================================================================
// 5. SYNCHRONOUS AND ASYNCHRONOUS COMPACTOR ENGINES
// ============================================================================

/**
 * Synchronous conversation compaction engine.
 * Respects threshold token limits and compresses conversation history.
 */
export function compactConversation(params: TokenCompactParams): TokenCompactResult {
	const {
		messages,
		maxContextTokens,
		compactThresholdRatio = 0.75,
		strategy = "summarize_older",
		preserveRecentTurns = 3,
		summaryRole = "user",
		insertSlidingWindowNotice = true,
		customSummarizer,
	} = params;

	const tokensBefore = estimateConversationTokens(messages);
	const threshold = Math.floor(maxContextTokens * compactThresholdRatio);

	// If context has not reached threshold, return original untouched
	if (tokensBefore < threshold) {
		return {
			messages,
			compacted: false,
			tokensBefore,
			tokensAfter: tokensBefore,
			compactedTurnsCount: 0,
		};
	}

	// Partition messages into Head, Middle (to compact), and Tail (to preserve)
	const partition = partitionConversationAtomically(messages, preserveRecentTurns);

	if (!partition.canCompact || partition.middle.length === 0) {
		return {
			messages,
			compacted: false,
			tokensBefore,
			tokensAfter: tokensBefore,
			compactedTurnsCount: 0,
		};
	}

	let compactedMessages: AgentRouterChatMessage[];
	let summaryText: string | undefined;

	if (strategy === "summarize_older") {
		// Find first user goal from head if present
		const firstUserMsg = partition.head.find((m) => m.role === "user");
		const firstGoal = firstUserMsg?.content ?? undefined;

		summaryText = customSummarizer
			? customSummarizer(partition.middle)
			: generateHeuristicSummary(partition.middle, firstGoal);

		let summaryMessage: AgentRouterChatMessage = {
			role: summaryRole,
			content: summaryText,
		};

		compactedMessages = [...partition.head, summaryMessage, ...partition.tail];
		let candidateTokens = estimateConversationTokens(compactedMessages);

		// If candidate summary didn't reduce tokens (e.g. intermediate turns were tiny),
		// fall back to ultra-dense summary so compaction is always guaranteed to reduce context
		if (candidateTokens >= tokensBefore && !customSummarizer) {
			summaryText = `[СЖАТЫЙ КОНТЕКСТ СЕССИИ / COMPACTED HISTORY SUMMARY]\nСжато ${partition.middle.length} промежуточных шагов.`;
			summaryMessage = {
				role: summaryRole,
				content: summaryText,
			};
			compactedMessages = [...partition.head, summaryMessage, ...partition.tail];
		}
	} else {
		// Sliding Window Strategy
		if (insertSlidingWindowNotice) {
			const noticeMessage: AgentRouterChatMessage = {
				role: summaryRole,
				content: `[СКОЛЬЗЯЩЕЕ ОКНО: пропущено ${partition.middle.length} промежуточных сообщений для оптимизации контекста. Недавняя история приведена ниже.]`,
			};
			compactedMessages = [...partition.head, noticeMessage, ...partition.tail];
		} else {
			compactedMessages = [...partition.head, ...partition.tail];
		}
	}

	// Verify resulting messages integrity
	const integrity = validateToolCallIntegrity(compactedMessages);
	if (!integrity.valid) {
		// If for any unforeseen reason integrity failed, fall back to safe head + tail
		// and purge any dangling tool response in tail
		const cleanTail = partition.tail.filter((m) => m.role !== "tool");
		compactedMessages = [...partition.head, ...cleanTail];
	}

	const tokensAfter = estimateConversationTokens(compactedMessages);

	return {
		messages: compactedMessages,
		compacted: true,
		tokensBefore,
		tokensAfter,
		compactedTurnsCount: partition.middle.length,
		summaryText,
		strategyUsed: strategy,
	};
}

/**
 * Asynchronous conversation compaction engine supporting async LLM summarizers.
 */
export async function compactConversationAsync(params: AsyncTokenCompactParams): Promise<TokenCompactResult> {
	const {
		messages,
		maxContextTokens,
		compactThresholdRatio = 0.75,
		strategy = "summarize_older",
		preserveRecentTurns = 3,
		summaryRole = "user",
		insertSlidingWindowNotice = true,
		customSummarizer,
	} = params;

	const tokensBefore = estimateConversationTokens(messages);
	const threshold = Math.floor(maxContextTokens * compactThresholdRatio);

	if (tokensBefore < threshold) {
		return {
			messages,
			compacted: false,
			tokensBefore,
			tokensAfter: tokensBefore,
			compactedTurnsCount: 0,
		};
	}

	const partition = partitionConversationAtomically(messages, preserveRecentTurns);

	if (!partition.canCompact || partition.middle.length === 0) {
		return {
			messages,
			compacted: false,
			tokensBefore,
			tokensAfter: tokensBefore,
			compactedTurnsCount: 0,
		};
	}

	let compactedMessages: AgentRouterChatMessage[];
	let summaryText: string | undefined;

	if (strategy === "summarize_older") {
		const firstUserMsg = partition.head.find((m) => m.role === "user");
		const firstGoal = firstUserMsg?.content ?? undefined;

		if (customSummarizer) {
			summaryText = await customSummarizer(partition.middle);
		} else {
			summaryText = generateHeuristicSummary(partition.middle, firstGoal);
		}

		let summaryMessage: AgentRouterChatMessage = {
			role: summaryRole,
			content: summaryText,
		};

		compactedMessages = [...partition.head, summaryMessage, ...partition.tail];
		let candidateTokens = estimateConversationTokens(compactedMessages);

		if (candidateTokens >= tokensBefore && !customSummarizer) {
			summaryText = `[СЖАТЫЙ КОНТЕКСТ СЕССИИ / COMPACTED HISTORY SUMMARY]\nСжато ${partition.middle.length} промежуточных шагов.`;
			summaryMessage = {
				role: summaryRole,
				content: summaryText,
			};
			compactedMessages = [...partition.head, summaryMessage, ...partition.tail];
		}
	} else {
		// Sliding Window
		if (insertSlidingWindowNotice) {
			const noticeMessage: AgentRouterChatMessage = {
				role: summaryRole,
				content: `[СКОЛЬЗЯЩЕЕ ОКНО: пропущено ${partition.middle.length} промежуточных сообщений для оптимизации контекста. Недавняя история приведена ниже.]`,
			};
			compactedMessages = [...partition.head, noticeMessage, ...partition.tail];
		} else {
			compactedMessages = [...partition.head, ...partition.tail];
		}
	}

	const integrity = validateToolCallIntegrity(compactedMessages);
	if (!integrity.valid) {
		const cleanTail = partition.tail.filter((m) => m.role !== "tool");
		compactedMessages = [...partition.head, ...cleanTail];
	}

	const tokensAfter = estimateConversationTokens(compactedMessages);

	return {
		messages: compactedMessages,
		compacted: true,
		tokensBefore,
		tokensAfter,
		compactedTurnsCount: partition.middle.length,
		summaryText,
		strategyUsed: strategy,
	};
}
