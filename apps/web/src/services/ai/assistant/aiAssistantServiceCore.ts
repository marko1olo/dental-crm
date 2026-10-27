/**
 * aiAssistantServiceCore.ts — Ядро SSE ИИ-ассистента клиники DENTE с отказоустойчивым локальным фолбеком
 */

import type {
	AssistantEventCallbacks,
	AssistantMessage,
	AssistantPhase,
	CompactionTriggeredData,
} from "./types";
import { buildContextSnapshot } from "./contextSnapshotBuilder";
import { requestAssistantStream } from "./sseStreamClient";
import { executeLocalFallback } from "./localFallbackRouter";

export class AIAssistantService {
	private apiBaseUrl: string;
	private activeSessionId: string | null = null;
	private currentAbortController: AbortController | null = null;
	private currentPhase: AssistantPhase = "idle";
	private callbacks: AssistantEventCallbacks = {};
	private lastCompactionStats: (CompactionTriggeredData & { timestamp: number }) | null = null;

	constructor(apiBaseUrl = "") {
		this.apiBaseUrl = apiBaseUrl;
	}

	public setCallbacks(callbacks: AssistantEventCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
	}

	public getSessionId(): string {
		if (!this.activeSessionId) {
			const entropy =
				typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
					? crypto.randomUUID()
					: `${Date.now()}_${Math.floor(performance.now() * 1000)}`;
			this.activeSessionId = `sess_${entropy}`;
		}
		return this.activeSessionId;
	}

	public resetSession(): void {
		if (this.currentAbortController) {
			this.currentAbortController.abort();
			this.currentAbortController = null;
		}
		this.activeSessionId = null;
		this.setPhase("idle");
	}

	public getLastCompactionStats(): (CompactionTriggeredData & { timestamp: number }) | null {
		return this.lastCompactionStats;
	}

	private setPhase(phase: AssistantPhase): void {
		this.currentPhase = phase;
		this.callbacks.onPhaseChanged?.(phase);
	}

	public buildContextSnapshot(): string {
		return buildContextSnapshot();
	}

	public async sendMessage(
		prompt: string,
		options: {
			messageId?: string;
			history?: AssistantMessage[];
		} = {},
	): Promise<AssistantMessage> {
		const messageId =
			options.messageId ||
			(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? `msg_${crypto.randomUUID()}`
				: `msg_${Date.now()}_${Math.floor(performance.now() * 1000)}`);
		const contextHeader = this.buildContextSnapshot();
		const fullPrompt = `${contextHeader}\n\n${prompt.trim()}`;

		const assistantMessage: AssistantMessage = {
			id: messageId,
			role: "assistant",
			content: "",
			thinkingContent: "",
			streaming: true,
			timestamp: Date.now(),
			toolCalls: [],
		};

		this.setPhase("thinking");
		this.callbacks.onMessageUpdated?.({ ...assistantMessage });

		if (this.currentAbortController) {
			this.currentAbortController.abort();
		}
		this.currentAbortController = new AbortController();

		const success = await requestAssistantStream(
			this.apiBaseUrl,
			this.getSessionId(),
			fullPrompt,
			assistantMessage,
			this.currentAbortController.signal,
			(phase) => this.setPhase(phase),
			this.callbacks,
			(stats) => { this.lastCompactionStats = stats; },
		);

		if (!success) {
			await executeLocalFallback(prompt, assistantMessage, (phase) => this.setPhase(phase), this.callbacks);
		}

		assistantMessage.streaming = false;
		this.setPhase("idle");
		this.callbacks.onMessageUpdated?.({ ...assistantMessage });

		return assistantMessage;
	}
}

export const aiAssistantService = new AIAssistantService();
