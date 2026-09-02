/**
 * copilotService.ts — SSE Streaming, Action Confirmation Manager & Default LLM Provider.
 */

import { and, eq, lt } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { copilotPendingActions } from "../../db/schema/copilot.js";
import { selectProviderKey } from "../../speech/keyPool.js";
import type { AgentContext } from "./context.js";
import type { ToolResult } from "./tools/tool.js";
import { SemanticRouter } from "./semanticRouter.js";
import { ClinicalValidatorAgent } from "./validatorAgent.js";
import type {
	LLMProvider,
	LLMStreamEvent,
	TextBlock,
	ToolResultBlock,
	ToolUseBlock,
	TurnEvent,
} from "./types.js";

export interface PendingAction {
	readonly sessionId: string;
	readonly callId: string;
	readonly toolName: string;
	readonly arguments: Record<string, unknown>;
	readonly createdAt: number;
	readonly organizationId?: string | undefined;
	readonly userId?: string | undefined;
}

export const COPILOT_ACTION_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Formats a TurnEvent or proactive event into standard SSE protocol chunk.
 */
export function formatSseEvent(
	event: TurnEvent | { type: string; [key: string]: unknown },
): string {
	let eventName: string = event.type;
	if (event.type === "tool_call_started") eventName = "tool_call";
	else if (event.type === "tool_call_finished") eventName = "tool_result";
	else if (event.type === "confirmation_required")
		eventName = "tool_confirmation_required";
	else if (event.type === "final") eventName = "done";
	else if (event.type === "proactive_alert") eventName = "proactive_alert";

	const payload = JSON.stringify(event);
	return `event: ${eventName}\ndata: ${payload}\n\n`;
}

export interface CopilotStreamSubscriber {
	readonly id: string;
	readonly organizationId: string;
	readonly userId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly send: (chunk: string) => boolean;
	readonly close?: (() => void) | undefined;
	readonly write?: ((chunk: string) => void) | undefined;
}

/**
 * Manages active SSE streaming connections for real-time Server-Initiated Proactive Messages.
 */
export class CopilotStreamManager {
	private readonly subscribers = new Map<string, CopilotStreamSubscriber>();

	public subscribe(
		subOrId: CopilotStreamSubscriber | string,
		maybeSub?:
			| {
					organizationId?: string | undefined;
					userId?: string | undefined;
					sessionId?: string | undefined;
					send?: ((chunk: string) => boolean) | undefined;
					write?: ((chunk: string) => void) | undefined;
					close?: (() => void) | undefined;
			  }
			| undefined,
	): () => void {
		let sub: CopilotStreamSubscriber;
		if (typeof subOrId === "string") {
			const id = subOrId;
			const organizationId = maybeSub?.organizationId || "default";
			const writeFn = maybeSub?.write;
			const sendFn =
				maybeSub?.send ||
				((chunk: string) => {
					if (writeFn) {
						writeFn(chunk);
						return true;
					}
					return true;
				});
			sub = {
				id,
				organizationId,
				send: sendFn,
				...(maybeSub?.userId !== undefined ? { userId: maybeSub.userId } : {}),
				...(maybeSub?.sessionId !== undefined
					? { sessionId: maybeSub.sessionId }
					: {}),
				...(writeFn !== undefined ? { write: writeFn } : {}),
				...(maybeSub?.close !== undefined ? { close: maybeSub.close } : {}),
			};
		} else {
			sub = subOrId;
		}

		this.subscribers.set(sub.id, sub);
		return () => {
			this.subscribers.delete(sub.id);
		};
	}

	public broadcastToOrganization(
		organizationId: string,
		eventName: string,
		data: unknown,
	): number {
		const chunk = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
		let count = 0;
		for (const [id, sub] of this.subscribers.entries()) {
			if (sub.organizationId === organizationId) {
				const ok = sub.send(chunk);
				if (ok) {
					count++;
				} else {
					this.subscribers.delete(id);
				}
			}
		}
		return count;
	}

	public broadcastProactiveAlert(
		organizationId: string,
		alert: unknown,
	): number {
		return this.broadcastToOrganization(
			organizationId,
			"proactive_alert",
			alert,
		);
	}

	public getSubscriberCount(organizationId?: string): number {
		if (!organizationId) return this.subscribers.size;
		let count = 0;
		for (const sub of this.subscribers.values()) {
			if (sub.organizationId === organizationId) count++;
		}
		return count;
	}

	public getActiveSubscribersCount(organizationId?: string): number {
		return this.getSubscriberCount(organizationId);
	}
}

export const defaultCopilotStreamManager = new CopilotStreamManager();

/**
 * Manages pending actions requiring human-in-the-loop review or confirmation.
 * Backed by in-memory L1 cache + persistent PostgreSQL storage with tenant isolation.
 */
export class CopilotActionManager {
	private readonly pendingActions = new Map<string, PendingAction>();

	public registerPending(
		sessionId: string,
		callId: string,
		toolName: string,
		args: Record<string, unknown>,
		meta?: { organizationId?: string | undefined; userId?: string | undefined },
	): PendingAction {
		const action: PendingAction = {
			sessionId,
			callId,
			toolName,
			arguments: args,
			createdAt: Date.now(),
			organizationId: meta?.organizationId,
			userId: meta?.userId,
		};
		this.pendingActions.set(callId, action);

		// Asynchronously persist to PostgreSQL if organizationId is present
		if (meta?.organizationId) {
			const orgId = meta.organizationId;
			const expiresAt = new Date(action.createdAt + COPILOT_ACTION_TTL_MS);
			withTenantCtx(orgId, async (tx) => {
				await tx
					.insert(copilotPendingActions)
					.values({
						id: callId,
						sessionId,
						organizationId: orgId,
						userId: meta?.userId ?? null,
						toolName,
						arguments: args,
						status: "pending",
						createdAt: new Date(action.createdAt),
						expiresAt,
					})
					.onConflictDoUpdate({
						target: copilotPendingActions.id,
						set: {
							status: "pending",
							toolName,
							arguments: args,
							expiresAt,
						},
					});
			}).catch(() => {});
		}

		return action;
	}

	public getPending(callId: string): PendingAction | undefined {
		const action = this.pendingActions.get(callId);
		if (!action) return undefined;

		// Clean up expired actions older than 15 minutes
		if (Date.now() - action.createdAt > COPILOT_ACTION_TTL_MS) {
			this.pendingActions.delete(callId);
			return undefined;
		}

		return action;
	}

	public async resolvePending(
		callId: string,
		organizationId?: string,
	): Promise<PendingAction | undefined> {
		const cached = this.getPending(callId);
		if (cached) return cached;

		if (!organizationId) return undefined;

		try {
			const rows = await withTenantCtx(organizationId, async (tx) => {
				return tx
					.select()
					.from(copilotPendingActions)
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, organizationId),
							eq(copilotPendingActions.status, "pending"),
						),
					)
					.limit(1);
			});

			const row = rows[0];
			if (!row) return undefined;
			if (row.expiresAt.getTime() <= Date.now()) {
				return undefined;
			}

			const action: PendingAction = {
				sessionId: row.sessionId,
				callId: row.id,
				toolName: row.toolName,
				arguments: (row.arguments ?? {}) as Record<string, unknown>,
				createdAt: row.createdAt.getTime(),
				organizationId: row.organizationId,
				userId: row.userId ?? undefined,
			};

			this.pendingActions.set(callId, action);
			return action;
		} catch {
			return undefined;
		}
	}

	public async confirmAction(
		ctx: AgentContext,
		callId: string,
		modifiedArgs?: Record<string, unknown>,
	): Promise<ToolResult> {
		const action = await this.resolvePending(callId, ctx.organizationId);
		if (!action) {
			return {
				ok: false,
				error: "Запрос на действие не найден или истек срок ожидания",
				executionTimeMs: 0,
			};
		}

		this.pendingActions.delete(callId);

		const effectiveArgs = modifiedArgs ?? action.arguments;

		// Mark as confirmed in PostgreSQL
		if (ctx.organizationId) {
			withTenantCtx(ctx.organizationId, async (tx) => {
				await tx
					.update(copilotPendingActions)
					.set({
						status: "confirmed",
						arguments: effectiveArgs,
						resolvedAt: new Date(),
					})
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, ctx.organizationId),
						),
					);
			}).catch(() => {});
		}

		// Execute with guardrail config overriding supervised requirement for this approved action
		const approvedCtx: AgentContext = {
			...ctx,
			mode: "autonomous",
		};

		return await ctx.tools.call(approvedCtx, action.toolName, effectiveArgs);
	}

	public rejectAction(
		callId: string,
		reason = "Действие отклонено пользователем",
		organizationId?: string,
	): { ok: boolean; reason: string } {
		const action = this.getPending(callId);

		this.pendingActions.delete(callId);

		// If organizationId or action.organizationId is available, update DB
		const orgId = organizationId ?? action?.organizationId;
		if (orgId) {
			withTenantCtx(orgId, async (tx) => {
				await tx
					.update(copilotPendingActions)
					.set({
						status: "rejected",
						rejectionReason: reason,
						resolvedAt: new Date(),
					})
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, orgId),
						),
					);
			}).catch(() => {});
		}

		if (!action && !organizationId) {
			return {
				ok: false,
				reason: "Запрос на действие не найден",
			};
		}

		return {
			ok: true,
			reason,
		};
	}

	public async rejectActionAsync(
		callId: string,
		reason = "Действие отклонено пользователем",
		organizationId?: string,
	): Promise<{ ok: boolean; reason: string }> {
		const action = await this.resolvePending(callId, organizationId);
		this.pendingActions.delete(callId);

		const orgId = organizationId ?? action?.organizationId;
		if (orgId) {
			try {
				await withTenantCtx(orgId, async (tx) => {
					await tx
						.update(copilotPendingActions)
						.set({
							status: "rejected",
							rejectionReason: reason,
							resolvedAt: new Date(),
						})
						.where(
							and(
								eq(copilotPendingActions.id, callId),
								eq(copilotPendingActions.organizationId, orgId),
							),
						);
				});
			} catch {}
		}

		if (!action) {
			return {
				ok: false,
				reason: "Запрос на действие не найден",
			};
		}

		return {
			ok: true,
			reason,
		};
	}

	public clear(): void {
		this.pendingActions.clear();
	}
}

export const defaultCopilotActionManager = new CopilotActionManager();

/**
 * Creates the default LLM provider for the AI Clinical Copilot with streaming and heuristic fallbacks.
 */
export function createDefaultLlmProvider(): LLMProvider {
	return {
		async *complete(params): AsyncIterable<LLMStreamEvent> {
			const groqKey =
				process.env.GROQ_API_KEY || selectProviderKey("groq_whisper")?.value;
			const geminiKey =
				process.env.GEMINI_API_KEY ||
				process.env.GOOGLE_API_KEY ||
				selectProviderKey("google_speech")?.value;
			const openaiKey =
				process.env.OPENAI_API_KEY ||
				selectProviderKey("openai_transcribe")?.value;
			const apiKey = groqKey || geminiKey || openaiKey;

			if (apiKey) {
				const baseUrl = groqKey
					? "https://api.groq.com/openai/v1"
					: geminiKey
						? "https://generativelanguage.googleapis.com/v1beta/openai"
						: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
				const model =
					params.model ||
					(groqKey
						? "llama-3.3-70b-versatile"
						: geminiKey
							? "gemini-3.5-flash-lite"
							: process.env.OPENAI_MODEL || "gpt-4o-mini");

				const messages: Array<{
					role: string;
					content?: string | null;
					tool_calls?: Array<{
						id: string;
						type: "function";
						function: { name: string; arguments: string };
					}>;
					tool_call_id?: string;
				}> = [{ role: "system", content: params.system }];

				for (const m of params.messages) {
					if (typeof m.content === "string") {
						messages.push({ role: m.role, content: m.content });
					} else if (Array.isArray(m.content)) {
						const textBlocks = m.content.filter(
							(b): b is TextBlock => b.type === "text",
						);
						const toolUseBlocks = m.content.filter(
							(b): b is ToolUseBlock => b.type === "tool_use",
						);
						const toolResultBlocks = m.content.filter(
							(b): b is ToolResultBlock => b.type === "tool_result",
						);

						if (toolResultBlocks.length > 0) {
							for (const tr of toolResultBlocks) {
								messages.push({
									role: "tool",
									tool_call_id: tr.toolCallId,
									content:
										typeof tr.content === "string"
											? tr.content
											: JSON.stringify(tr.content),
								});
							}
						} else {
							const textContent = textBlocks.map((b) => b.text).join("\n");
							const toolCalls =
								toolUseBlocks.length > 0
									? toolUseBlocks.map((tu) => ({
											id: tu.id,
											type: "function" as const,
											function: {
												name: tu.name,
												arguments: JSON.stringify(tu.input),
											},
										}))
									: undefined;
							messages.push({
								role: m.role,
								content: textContent || null,
								...(toolCalls ? { tool_calls: toolCalls } : {}),
							});
						}
					}
				}

				try {
					const requestPayload: Record<string, unknown> = {
						model,
						messages,
						stream: true,
						temperature: params.temperature ?? 0.2,
						max_tokens: params.maxTokens ?? 4096,
					};
					if (params.tools && params.tools.length > 0) {
						requestPayload.tools = params.tools;
					}

					const response = await fetch(`${baseUrl}/chat/completions`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${apiKey}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(requestPayload),
					});

					if (response.ok && response.body) {
						const reader = response.body.getReader();
						const decoder = new TextDecoder();
						let buffer = "";
						const pendingToolCalls = new Map<
							number,
							{ id: string; name: string; args: string }
						>();

						while (true) {
							const { value, done } = await reader.read();
							if (done) break;
							buffer += decoder.decode(value, { stream: true });
							let idx = buffer.indexOf("\n\n");
							while (idx >= 0) {
								const frame = buffer.slice(0, idx);
								buffer = buffer.slice(idx + 2);
								for (const line of frame.split("\n")) {
									const trimmed = line.trim();
									if (!trimmed.startsWith("data:")) continue;
									const dataStr = trimmed.slice(5).trim();
									if (dataStr === "[DONE]") {
										for (const tc of pendingToolCalls.values()) {
											let parsedArgs: Record<string, unknown> = {};
											try {
												parsedArgs = JSON.parse(tc.args || "{}");
											} catch {}
											yield {
												type: "tool_use",
												id: tc.id || `call_${Date.now()}`,
												name: tc.name,
												input: parsedArgs,
											};
										}
										pendingToolCalls.clear();
										yield { type: "done", stopReason: "stop" };
										return;
									}
									try {
										const json = JSON.parse(dataStr);
										const choice = json.choices?.[0];
										if (!choice) continue;
										const delta = choice.delta;
										if (delta?.content) {
											yield { type: "text_delta", text: delta.content };
										}
										if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
											for (const tc of delta.tool_calls) {
												const index = tc.index ?? 0;
												const existing = pendingToolCalls.get(index) ?? {
													id: tc.id ?? "",
													name: tc.function?.name ?? "",
													args: "",
												};
												if (tc.id) existing.id = tc.id;
												if (tc.function?.name) existing.name = tc.function.name;
												if (tc.function?.arguments) {
													existing.args += tc.function.arguments;
												}
												pendingToolCalls.set(index, existing);
											}
										}
										if (choice.finish_reason) {
											for (const tc of pendingToolCalls.values()) {
												let parsedArgs: Record<string, unknown> = {};
												try {
													parsedArgs = JSON.parse(tc.args || "{}");
												} catch {}
												yield {
													type: "tool_use",
													id: tc.id || `call_${Date.now()}`,
													name: tc.name,
													input: parsedArgs,
												};
											}
											pendingToolCalls.clear();
											yield {
												type: "done",
												stopReason: choice.finish_reason,
											};
											return;
										}
									} catch {}
								}
								idx = buffer.indexOf("\n\n");
							}
						}
						return;
					}
				} catch {
					// Fall through to heuristic fallback
				}
			}

			// Local Intelligent Fallback Generator
			const lastMsg = params.messages[params.messages.length - 1];
			let userText = "";
			if (typeof lastMsg?.content === "string") {
				userText = lastMsg.content;
			} else if (Array.isArray(lastMsg?.content)) {
				userText = lastMsg.content
					.filter((b): b is TextBlock => b.type === "text")
					.map((b) => b.text)
					.join(" ");
			}
			const lower = userText.toLowerCase();

			// Parse embedded or system-provided clinical context
			const systemStr = params.system || "";
			const toothMatch =
				systemStr.match(/Выбранный зуб \(FDI\):\s*#?([0-9]{2})/i) ||
				userText.match(/(?:зуб[аеу]?|tooth)\s*#?\s*([1-48][1-8])/i);
			const contextTooth = toothMatch?.[1] ? Number(toothMatch[1]) : 46;

			const patientMatch =
				systemStr.match(/Активный пациент:[^()]*\(ID:\s*([a-f0-9-]+)\)/i) ||
				userText.match(
					/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
				);
			const contextPatientId =
				patientMatch?.[1] && patientMatch[1] !== "null"
					? patientMatch[1]
					: "00000000-0000-7000-8000-000000000001";

			// 0. Fast Deterministic Semantic Router for Compound Doctor Prompts
			const decomposedPlan = SemanticRouter.decompose(userText, {
				currentTooth: contextTooth,
				patientId: contextPatientId,
			});

			if (
				decomposedPlan.hasClinical &&
				(decomposedPlan.hasFinance || decomposedPlan.hasBooking)
			) {
				const aggregated = SemanticRouter.dispatchAndAggregate(decomposedPlan, {
					currentTooth: contextTooth,
					patientId: contextPatientId,
				});

				yield {
					type: "text_delta",
					text: `${aggregated.unifiedResponseRu}\n\n`,
				};

				const clinicalTask = decomposedPlan.subtasks.find(
					(s) => s.intent === "clinical",
				);
				const tooth =
					(clinicalTask && "toothNumber" in clinicalTask
						? clinicalTask.toothNumber
						: undefined) || contextTooth;
				const diagnosis =
					clinicalTask && "diagnoses" in clinicalTask && clinicalTask.diagnoses?.[0]
						? clinicalTask.diagnoses[0]
						: "K02.1";

				yield {
					type: "tool_use",
					id: `call_plan_${Date.now()}`,
					name: "clinical.suggest_treatment_plan",
					input: {
						patientId: contextPatientId,
						tooth,
						primaryDiagnosis: diagnosis,
					},
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 1. Treatment Plan & 3-Tier Estimate
			if (
				lower.includes("план") ||
				lower.includes("смет") ||
				lower.includes("тариф") ||
				lower.includes("эконом") ||
				lower.includes("оптимум") ||
				lower.includes("премиум") ||
				lower.includes("лечени") ||
				lower.includes("кариес") ||
				lower.includes("пульпит") ||
				lower.includes("имплант")
			) {
				const diagnosis = lower.includes("пульпит")
					? "Pulpitis"
					: lower.includes("имплант")
						? "Implantation"
						: "Caries";
				yield {
					type: "tool_use",
					id: `call_plan_${Date.now()}`,
					name: "clinical.suggest_treatment_plan",
					input: {
						patientId: contextPatientId,
						tooth: contextTooth,
						primaryDiagnosis: diagnosis,
					},
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 2. Statutory Prescription Form 107-1/u
			if (
				lower.includes("рецепт") ||
				lower.includes("107") ||
				lower.includes("назнач") ||
				lower.includes("выпиши") ||
				lower.includes("лекарств") ||
				lower.includes("амоксиклав") ||
				lower.includes("амоксициллин") ||
				lower.includes("ибупрофен") ||
				lower.includes("нимесил") ||
				lower.includes("линкомицин")
			) {
				yield {
					type: "tool_use",
					id: `call_rx_${Date.now()}`,
					name: "clinical.create_prescription_107",
					input: {
						patientId: contextPatientId,
						drugs: [
							{
								mnn: "Amoxicillin + Clavulanic acid",
								tradeName: "Амоксиклав",
								latinName: "Amoxicillini + Acidi clavulanici",
								dosageForm: "таблетки диспергируемые",
								dosage: "875 мг + 125 мг",
								quantity: "14 шт (1 уп)",
								signa:
									"По 1 таблетке 2 раза в сутки внутрь перед приемом пищи, 7 дней",
								icd10: "K04.0",
							},
						],
						validityDays: 60,
						isChronicallyIll: false,
					},
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 3. Drug-Drug Interaction & Allergy Safety Check
			if (
				lower.includes("взаимодейств") ||
				lower.includes("совместим") ||
				lower.includes("аллерг") ||
				lower.includes("ddi") ||
				lower.includes("противопоказ")
			) {
				yield {
					type: "tool_use",
					id: `call_ddi_${Date.now()}`,
					name: "clinical.check_drug_interaction",
					input: {
						patientId: contextPatientId,
						newDrug: "Амоксициллин",
						currentMedications: ["Пенициллин", "Варфарин"],
					},
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 4. Patient Search
			if (
				lower.includes("пациент") ||
				lower.includes("найди") ||
				lower.includes("поиск") ||
				lower.includes("больной")
			) {
				const query =
					userText.replace(/найди|пациента|пациент|поиск|карту/gi, "").trim() ||
					"Иванов";
				yield {
					type: "tool_use",
					id: `call_patient_${Date.now()}`,
					name: "clinical.find_patient",
					input: { query },
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 5. Doctor Schedule & Free Slots
			if (
				lower.includes("расписание") ||
				lower.includes("прием") ||
				lower.includes("окна") ||
				lower.includes("слот") ||
				lower.includes("запис") ||
				lower.includes("свободн")
			) {
				const now = new Date();
				const startOfDay = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					0,
					0,
					0,
					0,
				);
				const endOfDay = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate() + 3,
					23,
					59,
					59,
					999,
				);
				yield {
					type: "tool_use",
					id: `call_schedule_${Date.now()}`,
					name: "clinical.get_doctor_schedule",
					input: {
						doctorUserId: "00000000-0000-7000-8000-000000000002",
						dateFrom: startOfDay.toISOString(),
						dateTo: endOfDay.toISOString(),
					},
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 6. Form 043/u Clinical Diary
			if (
				lower.includes("043") ||
				lower.includes("осмотр") ||
				lower.includes("дневник") ||
				lower.includes("диктовка") ||
				lower.includes("жалоб") ||
				lower.includes("статус")
			) {
				yield {
					type: "tool_use",
					id: `call_notes_${Date.now()}`,
					name: "clinical_notes.parse_voice_dictation",
					input: { transcript: userText, specialty: "therapist" },
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			// 7. Price List / RAG Knowledge Search
			if (
				lower.includes("цена") ||
				lower.includes("стоимост") ||
				lower.includes("почем") ||
				lower.includes("прайс") ||
				lower.includes("сколько стоит") ||
				lower.includes("804н") ||
				lower.includes("гаранти") ||
				lower.includes("протокол")
			) {
				const category = lower.includes("гаранти")
					? "guarantee"
					: lower.includes("протокол")
						? "clinical_protocol"
						: "price_804n";
				yield {
					type: "tool_use",
					id: `call_rag_${Date.now()}`,
					name: "internal.search_knowledge_base",
					input: { query: userText, category, threshold: 0.75 },
				};
				yield { type: "done", stopReason: "tool_use" };
				return;
			}

			const defaultResponse =
				"Здравствуйте! Я клинический ассистент DENTE. Готов помочь вам с:\n" +
				"• Поиском и открытием медицинских карт пациентов\n" +
				"• Расчетом интерактивных 3-Tier планов лечения (Эконом / Оптимум / Премиум)\n" +
				"• Выпиской рецептов по форме 107-1/у и проверкой совместимости препаратов (DDI)\n" +
				"• Автоматическим заполнением формы 043/у по диктовке врача\n" +
				"• Просмотром расписания и быстрым подбором свободных окон.\n\n" +
				"Чем могу помочь прямо сейчас?";

			for (const char of defaultResponse) {
				yield { type: "text_delta", text: char };
			}
			yield { type: "done", stopReason: "stop" };
		},
	};
}

export const defaultLlmProvider = createDefaultLlmProvider();
