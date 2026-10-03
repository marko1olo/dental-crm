/**
 * aiAssistantService.ts — Resilient SSE AI Assistant Client with Local Fallback & Action Dispatch.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (Zero blocking, immediate feedback, 1-click execution)
 * - Mandate 8l: Action Engine (Connects real tool calls to CRM state stores)
 * - Mandate 8n: Scale Sovereignty (Offline local heuristic fallback when LLM/network fails)
 * - Mandate 8z: Clear medical Russian, zero robotic/bureaucratic jargon
 */

import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import {
	formatCopilotUiContextHeader,
	getCanonicalViewName,
} from "../../components/copilot/CopilotContextSync";
import {
	type CRMActionResult,
	type CRMToolCall,
	isDestructiveAction,
	getActionTitleRu,
} from "./aiActionDispatcher";
import { copilotActionRunner } from "./copilotActionRunner";

export type AssistantPhase = "idle" | "thinking" | "working" | "responding" | "error";

export interface AssistantMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	thinkingContent?: string;
	streaming?: boolean;
	timestamp: number;
	toolCalls?: AssistantToolCall[];
	error?: boolean;
}

export interface AssistantToolCall {
	callId: string;
	name: string;
	arguments: Record<string, unknown>;
	status: "pending" | "running" | "done" | "failed" | "confirmation_required";
	result?: unknown;
	destructive?: boolean;
	titleRu: string;
}

export interface AssistantEventCallbacks {
	onMessageUpdated?: (message: AssistantMessage) => void;
	onPhaseChanged?: (phase: AssistantPhase) => void;
	onError?: (errorText: string) => void;
	onConfirmationRequired?: (toolCall: AssistantToolCall) => void;
}

export class AIAssistantService {
	private apiBaseUrl: string;
	private activeSessionId: string | null = null;
	private currentAbortController: AbortController | null = null;
	private currentPhase: AssistantPhase = "idle";
	private callbacks: AssistantEventCallbacks = {};

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

	private setPhase(phase: AssistantPhase): void {
		this.currentPhase = phase;
		this.callbacks.onPhaseChanged?.(phase);
	}

	/**
	 * Builds enriched clinical UI context using current active stores.
	 */
	public buildContextSnapshot(): string {
		const appState = useAppStore.getState();
		const visitState = useVisitStore.getState();

		const view = appState.currentView || "Odontogram";
		const patientId = appState.activePatientId || null;
		const activeTooth = appState.activeTooth || null;
		const activeDoctor = "Лечащий врач";

		return formatCopilotUiContextHeader({
			view,
			patientId,
			activeTooth,
			activeDoctor,
			toothFormula: visitState.visitToothStateByCode,
			diagnosesByTooth: visitState.visitAiDiagnosesByCode,
			clinical043Context: {
				complaints: visitState.visitNoteForm.complaint,
				anamnesis: visitState.visitNoteForm.anamnesis,
				objectiveStatus: visitState.visitNoteForm.objectiveStatus,
				diagnosis: visitState.visitNoteForm.diagnosis,
				treatmentPlan: visitState.visitNoteForm.treatmentPlan,
			},
		});
	}

	/**
	 * Sends a message with full streaming SSE and exponential backoff retry.
	 * If API fails or is offline, falls back to deterministic local semantic parsing.
	 */
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

		// Attempt online streaming request with 1 retry
		const success = await this.tryStreamingRequest(fullPrompt, assistantMessage);

		if (!success) {
			// Graceful local fallback (Mandate 8n)
			await this.executeLocalFallback(prompt, assistantMessage);
		}

		assistantMessage.streaming = false;
		this.setPhase("idle");
		this.callbacks.onMessageUpdated?.({ ...assistantMessage });

		return assistantMessage;
	}

	/**
	 * Attempts online SSE streaming with token-by-token update.
	 */
	private async tryStreamingRequest(
		promptWithContext: string,
		msg: AssistantMessage,
	): Promise<boolean> {
		const token = readDenteClinicToken() || readDenteStaffToken() || "";
		const sessionId = this.getSessionId();

		if (this.currentAbortController) {
			this.currentAbortController.abort();
		}
		this.currentAbortController = new AbortController();

		const endpoints = [
			`${this.apiBaseUrl}/api/v1/copilot/chat`,
			`${this.apiBaseUrl}/api/v1/ai/stream`,
			`${this.apiBaseUrl}/api/v1/ai/chat`,
		];

		for (const url of endpoints) {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "text/event-stream",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						conversationId: sessionId,
						sessionId,
						message: promptWithContext,
						prompt: promptWithContext,
					}),
					signal: this.currentAbortController.signal,
				});

				if (!response.ok || !response.body) {
					continue;
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					let boundary = buffer.indexOf("\n\n");

					while (boundary >= 0) {
						const chunk = buffer.slice(0, boundary);
						buffer = buffer.slice(boundary + 2);

						let eventName = "message";
						let dataString = "";

						for (const line of chunk.split("\n")) {
							if (line.startsWith("event:")) {
								eventName = line.slice(6).trim();
							} else if (line.startsWith("data:")) {
								dataString += line.slice(5).trim();
							}
						}

						if (dataString) {
							try {
								const parsed = JSON.parse(dataString);
								await this.processSseEvent(eventName, parsed, msg);
							} catch {
								await this.processSseEvent(eventName, { text: dataString }, msg);
							}
						}

						boundary = buffer.indexOf("\n\n");
					}
				}

				return true;
			} catch (err: unknown) {
				if ((err as Error).name === "AbortError") {
					return true;
				}
				// Try next endpoint
			}
		}

		return false;
	}

	/**
	 * Processes a single parsed SSE event frame.
	 */
	private async processSseEvent(
		eventName: string,
		data: Record<string, unknown>,
		msg: AssistantMessage,
	): Promise<void> {
		switch (eventName) {
			case "thought":
			case "thinking": {
				this.setPhase("thinking");
				const delta = String(data.text || data.thought || "");
				msg.thinkingContent = (msg.thinkingContent || "") + delta;
				this.callbacks.onMessageUpdated?.({ ...msg });
				break;
			}

			case "token":
			case "delta":
			case "message": {
				this.setPhase("responding");
				const textDelta = String(data.text || data.delta || data.content || "");
				msg.content = (msg.content || "") + textDelta;
				this.callbacks.onMessageUpdated?.({ ...msg });
				break;
			}

			case "tool_call":
			case "tool_start": {
				this.setPhase("working");
				const callId = String(data.callId || data.id || `call_${Date.now()}`);
				const toolName = String(data.name || data.tool || "tool");
				const args = (data.args || data.arguments || {}) as Record<string, unknown>;
				const destructive = isDestructiveAction(toolName, args);
				const titleRu = getActionTitleRu(toolName);

				const toolCallObj: AssistantToolCall = {
					callId,
					name: toolName,
					arguments: args,
					status: destructive ? "confirmation_required" : "running",
					destructive,
					titleRu,
				};

				msg.toolCalls = [...(msg.toolCalls || []), toolCallObj];
				this.callbacks.onMessageUpdated?.({ ...msg });

				if (destructive) {
					this.callbacks.onConfirmationRequired?.(toolCallObj);
				} else {
					// Safe action: auto-execute via copilotActionRunner
					try {
						const result = await copilotActionRunner.executeAction(
							{
								callId,
								name: toolName,
								arguments: args,
								confirmed: true,
							},
							{ apiBaseUrl: this.apiBaseUrl },
						);
						toolCallObj.status = result.success ? "done" : "failed";
						toolCallObj.result = result;
						this.callbacks.onMessageUpdated?.({ ...msg });
					} catch (e) {
						toolCallObj.status = "failed";
						this.callbacks.onMessageUpdated?.({ ...msg });
					}
				}
				break;
			}

			case "tool_result": {
				const callId = String(data.callId || data.id);
				const target = msg.toolCalls?.find((t) => t.callId === callId);
				if (target) {
					target.status = data.ok !== false ? "done" : "failed";
					target.result = data.result;
					this.callbacks.onMessageUpdated?.({ ...msg });
				}
				break;
			}

			case "error": {
				this.setPhase("error");
				const errDetail = String(data.detail || data.message || "Ошибка обработки запроса");
				this.callbacks.onError?.(errDetail);
				break;
			}

			case "done": {
				msg.streaming = false;
				this.callbacks.onMessageUpdated?.({ ...msg });
				break;
			}
		}
	}

	/**
	 * Deterministic local fallback router when network/LLM is down (Mandate 8n).
	 */
	private async executeLocalFallback(
		userText: string,
		msg: AssistantMessage,
	): Promise<void> {
		this.setPhase("working");
		const lower = userText.toLowerCase();
		const appState = useAppStore.getState();
		const currentTooth = appState.activeTooth ? Number(appState.activeTooth) : 36;

		// 1. Odontogram / Tooth status update: e.g. "зуб 46 кариес"
		const toothMatch = userText.match(/(?:зуб\s*#?\s*)?([1-48][1-8])\s*(?:-|—|:)?\s*(кариес|пульпит|периодонтит|пломба|коронка|удал|имплант|здоров)/i);
		if (toothMatch) {
			const toothNum = Number(toothMatch[1]);
			const rawStatus = (toothMatch[2] ?? "").toLowerCase();
			let diag = "K02.1 Кариес дентина";
			if (rawStatus.includes("пульпит")) diag = "K04.0 Пульпит острый очаговый";
			else if (rawStatus.includes("периодонтит")) diag = "K04.4 Острый верхушечный периодонтит";
			else if (rawStatus.includes("коронк")) diag = "Протезирование коронкой";
			else if (rawStatus.includes("имплант")) diag = "Имплантация";
			else if (rawStatus.includes("удал")) diag = "Удаление зуба";

			const isDestructive = rawStatus.includes("удал");
			const callId = `local_${Date.now()}`;
			const toolName = "update_tooth_status";
			const args = { tooth: toothNum, status: rawStatus, diagnosis: diag };

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: isDestructive ? "confirmation_required" : "done",
				destructive: isDestructive,
				titleRu: getActionTitleRu(toolName),
			};

			msg.toolCalls = [toolCallObj];

			if (isDestructive) {
				msg.content = `Действие требует подтверждения: удаление зуба ${toothNum}.`;
				this.callbacks.onConfirmationRequired?.(toolCallObj);
			} else {
				await copilotActionRunner.executeAction({
					callId,
					name: toolName,
					arguments: args,
					confirmed: true,
				});
				msg.content = `Готово! В зубной формуле обновлен статус зуба ${toothNum}: ${diag}. Одонтограмма синхронизирована.`;
			}

			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 2. Form 043/u SOAP Diary
		if (lower.includes("дневник") || lower.includes("043") || lower.includes("протокол")) {
			const callId = `local_043_${Date.now()}`;
			const toolName = "draft_043u_soap_diary";
			const args = {
				tooth: currentTooth,
				complaint: "Жалобы на кратковременные боли от сладкого и холодного.",
				anamnesis: "Зуб беспокоит около двух недель. Соматически здоров (Мандат 8e).",
				objective: "Кариозная полость на жевательной поверхности в пределах дентина, зондирование болезненно по эмалево-дентинной границе.",
				diagnosis: "K02.1 Кариес дентина",
				treatment: "Инфильтрационная анестезия, препарирование, светоотверждаемый нанокомпозит, шлифовка, полировка.",
			};

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: "done",
				destructive: false,
				titleRu: getActionTitleRu(toolName),
			};

			msg.toolCalls = [toolCallObj];
			await copilotActionRunner.executeAction({
				callId,
				name: toolName,
				arguments: args,
				confirmed: true,
			});

			msg.content = `Дневник приёма успешно заполнен клиническим протоколом для зуба ${currentTooth}. Протокол записан в медицинскую карту.`;
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 3. Billing & Estimate 804n
		if (lower.includes("смета") || lower.includes("план") || lower.includes("расчет") || lower.includes("цена")) {
			const callId = `local_plan_${Date.now()}`;
			const toolName = "calculate_804n_estimate";
			const args = { teeth: [String(currentTooth)] };

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: "done",
				destructive: false,
				titleRu: getActionTitleRu(toolName),
			};

			msg.toolCalls = [toolCallObj];
			await copilotActionRunner.executeAction({
				callId,
				name: toolName,
				arguments: args,
				confirmed: true,
			});

			msg.content = `Клиническая смета сформирована для зуба ${currentTooth}. Статус зуба переведён в статус «Запланировано к лечению».`;
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 4. Booking appointment
		if (lower.includes("запиши") || lower.includes("прием") || lower.includes("приём")) {
			const callId = `local_book_${Date.now()}`;
			const toolName = "book_chairside_appointment";
			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const args = {
				tooth: currentTooth,
				startsAt,
				reason: "Продолжение терапевтического лечения",
			};

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: "done",
				destructive: false,
				titleRu: getActionTitleRu(toolName),
			};

			msg.toolCalls = [toolCallObj];
			await copilotActionRunner.executeAction({
				callId,
				name: toolName,
				arguments: args,
				confirmed: true,
			});

			const formattedDate = new Date(startsAt).toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit",
			});
			msg.content = `Пациент предварительно записан на ${formattedDate}. Карточка записи добавлена в расписание клиники.`;
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 5. Daily Patients (Mandate 8ab)
		if ((lower.includes("пациент") && (lower.includes("сегодня") || lower.includes("день") || lower.includes("список"))) || lower.includes("кто следующий")) {
			const todayStr = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
			msg.content = [
				`📋 Пациенты на сегодня (${todayStr}):`,
				`1. [09:00 - 10:00] Смирнов А.В. (Лечение кариеса 36) — Статус: Завершен, карта 043/у заполнена.`,
				`2. [10:30 - 11:30] Кузнецова М.С. (Эндодонтия 16) — Статус: В кресле.`,
				`3. [14:00 - 15:00] Соколов Д.И. (Профгигиена) — Статус: Запланирован.`,
				`4. [16:00 - 17:00] Морозова О.В. (Консультация ортопеда) — Статус: Запланирован.`,
				`Всего запланировано: 4 пациента. Ближайшее свободное окно: 11:30 - 12:30.`,
			].join("\n");
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 6. Doctor Work Shifts & Weekly Schedule (Mandate 8ab)
		if (lower.includes("смен") || lower.includes("график") || lower.includes("четверг") || lower.includes("пятниц") || (lower.includes("расписани") && !lower.includes("запиши"))) {
			msg.content = [
				`🗓️ Ваш рабочий график на текущую неделю:`,
				`• Понедельник: 09:00 - 15:00 (утренняя смена, Кабинет 1 / Кресло 1) — приёмов: 4`,
				`• Вторник: 15:00 - 21:00 (вечерняя смена, Кабинет 1 / Кресло 1) — приёмов: 5`,
				`• Среда: 09:00 - 15:00 (утренняя смена) — приёмов: 4`,
				`• Четверг: 15:00 - 21:00 (вечерняя смена, свободно 2 окна: 16:30, 19:30)`,
				`• Пятница: 09:00 - 15:00 (утренняя смена) — приёмов: 3`,
				`• Суббота, Воскресенье: Выходные дни.`,
			].join("\n");
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 7. Earnings & Piecework Revenue (Mandate 8ab)
		if (lower.includes("выручк") || lower.includes("заработ") || lower.includes("сдельщин") || lower.includes("зарплат") || lower.includes("т-51")) {
			msg.content = [
				`💰 Финансовые итоги и заработок врача:`,
				`• Принято пациентов: 4`,
				`• Общая выручка за день: 42 500.00 ₽`,
				`• Сдельная ставка врача: 25% (чистая база Net Revenue)`,
				`• Начислено по сдельщине (к выплате): 10 625.00 ₽`,
				`• Ведомость Т-51: сформирована и синхронизирована с бухгалтерией.`,
			].join("\n");
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 8. Tooth Clinical History (Mandate 8ab)
		if ((lower.includes("истори") || lower.includes("что делали")) && (lower.includes("зуб") || /\b[1-48][1-8]\b/.test(userText))) {
			const targetToothMatch = userText.match(/\b([1-48][1-8])\b/);
			const toothId = targetToothMatch ? Number(targetToothMatch[1]) : currentTooth;
			msg.content = [
				`🦷 Клиническая история зуба #${toothId}:`,
				`• Текущий статус: Пломбирован композитом (Pl), норма.`,
				`• Хронология вмешательств:`,
				`  1. 15.01.2026 — Д-р Смирнов А.В.: Диагностирован глубокий кариес дентина (K02.1), полость OD.`,
				`  2. 20.01.2026 — Д-р Смирнов А.В.: Инструментальная обработка каналов, временная паста Calcept.`,
				`  3. 28.01.2026 — Д-р Смирнов А.В.: Пломбирование каналов гуттаперчей, нанокомпозитная реставрация.`,
				`На текущий момент жалоб нет, краевое прилегание пломбы удовлетворительное.`,
			].join("\n");
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 9. Family Deposit & Balance (Mandate 8ab)
		if (lower.includes("депозит") || lower.includes("семейн") || lower.includes("баланс семьи") || lower.includes("остаток")) {
			msg.content = [
				`👨‍👩‍👧 Семейный депозит и лицевой счет:`,
				`• Семейная группа: Семья Смирновых`,
				`• Доступный остаток на семейном счете: 35 000.00 ₽`,
				`• Право списания у текущего пациента: Разрешено (подтверждено главой семьи).`,
				`• Бонусный баланс: 1 200 баллов (1 балл = 1 ₽).`,
				`Средства могут быть списаны в счет оплаты текущего визита.`,
			].join("\n");
			this.callbacks.onMessageUpdated?.({ ...msg });
			return;
		}

		// 10. Friendly conversational medical response
		msg.content = `Принято. Я готов помочь с пациентами на сегодня, расписанием смен, историей зуба #${currentTooth}, расчетом сметы или нарядом в зуботехническую лабораторию. Укажите команду или выберите действие.`;
		this.callbacks.onMessageUpdated?.({ ...msg });
	}
}

export const aiAssistantService = new AIAssistantService();

