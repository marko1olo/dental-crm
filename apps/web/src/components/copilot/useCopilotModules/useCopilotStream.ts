import { useCallback, useEffect, useRef } from "react";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { dispatchCrmAction } from "../../../services/ai";
import type {
	ConfirmUiMessage,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	ReactStepItem,
	ToolUiMessage,
	WhatsAppApprovalCard,
} from "./types";

interface UseCopilotStreamParams {
	apiBaseUrl: string;
	isOpen: boolean;
	setPhase: (phase: CopilotPhase) => void;
	setMessages: React.Dispatch<React.SetStateAction<CopilotUiMessage[]>>;
	setPending: (pending: PendingConfirmation | null) => void;
	setProactiveAlerts: React.Dispatch<
		React.SetStateAction<ProactiveAlertCardData[]>
	>;
	setWhatsappHitLCards: React.Dispatch<
		React.SetStateAction<WhatsAppApprovalCard[]>
	>;
	cacheNames: (toolName: string, result: unknown) => void;
}

export function useCopilotStream({
	apiBaseUrl,
	isOpen,
	setPhase,
	setMessages,
	setPending,
	setProactiveAlerts,
	setWhatsappHitLCards,
	cacheNames,
}: UseCopilotStreamParams) {
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamAbortRef = useRef<AbortController | null>(null);

	const loadProactivePending = useCallback(async () => {
		try {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			const res = await fetch(
				`${apiBaseUrl}/api/v1/copilot/proactive/pending`,
				{
					headers: { Authorization: token ? `Bearer ${token}` : "" },
				},
			);
			if (res.ok) {
				const json = await res.json();
				if (Array.isArray(json.alerts)) setProactiveAlerts(json.alerts);
				if (Array.isArray(json.hitlCards)) setWhatsappHitLCards(json.hitlCards);
			}
		} catch {
			// Ignore network error
		}
	}, [apiBaseUrl, setProactiveAlerts, setWhatsappHitLCards]);

	const handleEvent = useCallback(
		(event: string, data: Record<string, unknown>) => {
			if (event === "thought" || event === "reasoning") {
				setPhase("thinking");
				setMessages((prev) => {
					const last = prev[prev.length - 1];
					if (last && last.kind === "thinking" && last.streaming) {
						return [
							...prev.slice(0, -1),
							{ ...last, text: last.text + String(data.text || "") },
						];
					}
					return [
						...prev,
						{
							kind: "thinking",
							text: String(data.text || ""),
							streaming: true,
						},
					];
				});
			} else if (event === "token" || event === "delta") {
				setPhase("writing");
				setMessages((prev) => {
					// Mark any streaming thinking blocks as finished
					const finalizedPrev = prev.map((m) =>
						m.kind === "thinking" && m.streaming
							? { ...m, streaming: false }
							: m,
					);
					const last = finalizedPrev[finalizedPrev.length - 1];
					if (
						last &&
						last.kind === "text" &&
						last.role === "assistant" &&
						last.streaming
					) {
						return [
							...finalizedPrev.slice(0, -1),
							{ ...last, text: last.text + String(data.text || "") },
						];
					}
					return [
						...finalizedPrev,
						{
							kind: "text",
							role: "assistant",
							text: String(data.text || ""),
							streaming: true,
						},
					];
				});
			} else if (event === "tool_call" || event === "tool_start") {
				setPhase("working");
				setMessages((prev) =>
					prev.map((m) =>
						m.kind === "thinking" && m.streaming
							? { ...m, streaming: false }
							: m,
					),
				);
				const toolMsg: ToolUiMessage = {
					kind: "tool",
					callId: String(data.callId || data.call_id || Date.now()),
					name: String(data.name || "tool"),
					status: "running",
					args:
						(data.args as Record<string, unknown>) ||
						(data.arguments as Record<string, unknown>) ||
						{},
				};
				setMessages((prev) => [...prev, toolMsg]);
			} else if (event === "tool_result") {
				const callId = String(data.callId || data.call_id);
				const isOk = Boolean(data.ok !== false && data.status !== "failed");
				const res = data.result;

				setMessages((prev) =>
					prev.map((m) => {
						if (m.kind === "tool" && m.callId === callId) {
							return {
								...m,
								status: isOk ? "done" : "failed",
								result: res,
							};
						}
						return m;
					}),
				);

				if (isOk && data.name) {
					cacheNames(String(data.name), res);
					const toolArgs =
						(data.args as Record<string, unknown>) ||
						(data.arguments as Record<string, unknown>) ||
						{};
					dispatchCrmAction(
						{
							callId,
							name: String(data.name),
							arguments: toolArgs,
							confirmed: true,
						},
						apiBaseUrl,
					).catch(() => {});
				}
			} else if (
				event === "confirmation_required" ||
				event === "tool_confirmation_required"
			) {
				const cMsg: ConfirmUiMessage = {
					kind: "confirmation",
					callId: String(data.callId || data.call_id || Date.now()),
					name: String(data.name || "action"),
					args:
						(data.args as Record<string, unknown>) ||
						(data.arguments as Record<string, unknown>) ||
						{},
				};
				setMessages((prev) => [...prev, cMsg]);
				setPending({ callId: cMsg.callId, name: cMsg.name, args: cMsg.args });
			} else if (event === "react_steps" || event === "react_pipeline") {
				const steps = (data.steps as ReactStepItem[]) || [];
				const title = typeof data.title === "string" ? data.title : undefined;
				const isComplete =
					typeof data.isComplete === "boolean" ? data.isComplete : false;
				const currentStepIndex =
					typeof data.currentStepIndex === "number"
						? data.currentStepIndex
						: undefined;
				const totalDurationMs =
					typeof data.totalDurationMs === "number"
						? data.totalDurationMs
						: undefined;

				setMessages((prev) => {
					const last = prev[prev.length - 1];
					if (last && last.kind === "react_steps") {
						return [
							...prev.slice(0, -1),
							{
								...last,
								steps,
								title: title || last.title,
								isComplete,
								currentStepIndex,
								totalDurationMs,
							},
						];
					}
					return [
						...prev,
						{
							kind: "react_steps",
							title,
							steps,
							isComplete,
							currentStepIndex,
							totalDurationMs,
						},
					];
				});
			} else if (event === "proactive_alert") {
				const alertData =
					(data.data as ProactiveAlertCardData) ||
					(data as unknown as ProactiveAlertCardData);
				if (alertData?.id) {
					setProactiveAlerts((prev) => {
						if (prev.some((a) => a.id === alertData.id)) return prev;
						return [alertData, ...prev];
					});
					const hitl = alertData.data?.approvalCard as
						| WhatsAppApprovalCard
						| undefined;
					if (hitl?.approvalId) {
						setWhatsappHitLCards((prev) => {
							if (prev.some((c) => c.approvalId === hitl.approvalId))
								return prev;
							return [hitl, ...prev];
						});
					}
				}
			} else if (event === "proactive_alert_resolved") {
				const cardId = String(data.id || "");
				setWhatsappHitLCards((prev) =>
					prev.map((c) =>
						c.approvalId === cardId
							? {
									...c,
									status: data.status === "approved" ? "approved" : "rejected",
								}
							: c,
					),
				);
				setProactiveAlerts((prev) =>
					prev.filter(
						(a) =>
							a.id !== `alert_hitl_${cardId}` && a.data?.approvalId !== cardId,
					),
				);
			} else if (event === "proactive_alert_dismissed") {
				const alertId = String(data.alertId || "");
				setProactiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
			} else if (event === "done" || event === "finish") {
				setPhase(null);
				setMessages((prev) =>
					prev.map((m) =>
						m.kind === "text" && m.streaming ? { ...m, streaming: false } : m,
					),
				);
			} else if (event === "budget_exceeded") {
				setMessages((prev) => [
					...prev,
					{
						kind: "text",
						role: "assistant",
						text: "Превышен месячный лимит токенов Copilot для клиники.",
						streaming: false,
					},
				]);
			} else if (event === "error") {
				setMessages((prev) => [
					...prev,
					{
						kind: "text",
						role: "assistant",
						text: `Ошибка: ${String(data.detail || data.message || "Неизвестная ошибка")}`,
						streaming: false,
					},
				]);
			}
		},
		[
			cacheNames,
			apiBaseUrl,
			setPhase,
			setMessages,
			setPending,
			setProactiveAlerts,
			setWhatsappHitLCards,
		],
	);

	const streamRequest = useCallback(
		async (pathStr: string, body: unknown) => {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			abortControllerRef.current = new AbortController();

			try {
				const res = await fetch(`${apiBaseUrl}${pathStr}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify(body),
					signal: abortControllerRef.current.signal,
				});

				if (!res.ok || !res.body) {
					handleEvent("error", {
						detail: `HTTP ${res.status}: ${res.statusText}`,
					});
					return;
				}

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buf = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					buf += decoder.decode(value, { stream: true });
					let idx = buf.indexOf("\n\n");
					while (idx >= 0) {
						const frame = buf.slice(0, idx);
						buf = buf.slice(idx + 2);
						let event = "message";
						let dataStr = "";
						for (const line of frame.split("\n")) {
							if (line.startsWith("event:")) event = line.slice(6).trim();
							else if (line.startsWith("data:"))
								dataStr += line.slice(5).trim();
						}
						if (dataStr) {
							try {
								handleEvent(event, JSON.parse(dataStr));
							} catch {
								handleEvent(event, { text: dataStr });
							}
						}
						idx = buf.indexOf("\n\n");
					}
				}
			} catch (err: unknown) {
				if ((err as Error).name !== "AbortError") {
					handleEvent("error", { detail: String(err) });
				}
			}
		},
		[apiBaseUrl, handleEvent],
	);

	// Background SSE Stream Subscription for Proactive Alerts
	useEffect(() => {
		if (!isOpen) return;

		loadProactivePending();
		const token = readDenteClinicToken() || readDenteStaffToken() || "";
		const controller = new AbortController();
		streamAbortRef.current = controller;

		const startStream = async () => {
			try {
				const res = await fetch(`${apiBaseUrl}/api/v1/copilot/stream`, {
					headers: {
						Authorization: token ? `Bearer ${token}` : "",
						Accept: "text/event-stream",
					},
					signal: controller.signal,
				});

				if (!res.ok || !res.body) return;

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buf = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					buf += decoder.decode(value, { stream: true });
					let idx = buf.indexOf("\n\n");
					while (idx >= 0) {
						const frame = buf.slice(0, idx);
						buf = buf.slice(idx + 2);
						let event = "message";
						let dataStr = "";
						for (const line of frame.split("\n")) {
							if (line.startsWith("event:")) event = line.slice(6).trim();
							else if (line.startsWith("data:"))
								dataStr += line.slice(5).trim();
						}
						if (dataStr) {
							try {
								handleEvent(event, JSON.parse(dataStr));
							} catch {
								handleEvent(event, { text: dataStr });
							}
						}
						idx = buf.indexOf("\n\n");
					}
				}
			} catch (_err: unknown) {
				// stream disconnected or aborted
			}
		};

		startStream();

		return () => {
			if (streamAbortRef.current) {
				streamAbortRef.current.abort();
			}
		};
	}, [isOpen, apiBaseUrl, loadProactivePending, handleEvent]);

	// Cleanup on unmount (Rotten Seeds invariant)
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			if (streamAbortRef.current) {
				streamAbortRef.current.abort();
			}
		};
	}, []);

	return {
		handleEvent,
		streamRequest,
		loadProactivePending,
		abortControllerRef,
		streamAbortRef,
	};
}
