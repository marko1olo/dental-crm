import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
} from "../../../lib/safeLocalStorage";
import type {
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	WhatsAppApprovalCard,
} from "./types";
import { readEventStream } from "./copilotStreamReader";
import { createStreamEventHandler } from "./copilotStreamEventHandler";
import { executeLocalFallback } from "../../../services/ai/assistant/localFallbackRouter";

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

			// COP-05: Сквозной вызов Chairside Sentinel analyze при открытии шторки
			const patientId = safeLocalStorageGetItem("dente_active_patient_id") || undefined;
			if (patientId) {
				const sentinelRes = await fetch(`${apiBaseUrl}/api/v1/copilot/sentinel/analyze`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify({
						patientId,
						mode: "supervised",
					}),
				});
				if (sentinelRes.ok) {
					const sentinelJson = await sentinelRes.json();
					const alerts = sentinelJson?.data?.alerts;
					if (Array.isArray(alerts) && alerts.length > 0) {
						const mappedAlerts: ProactiveAlertCardData[] = alerts.map((a: any, idx: number) => ({
							id: `sentinel-alert-${idx}-${Date.now()}`,
							urgency: a.alertType === "drug_allergy_conflict" ? "CRITICAL" : "URGENT",
							title: a.alertType === "drug_allergy_conflict" ? "Лекарственная несовместимость" : "Клиническое предостережение",
							subtitle: "Chairside Sentinel Engine",
							description: a.message,
							created_at: new Date().toISOString(),
							actions: a.safeAlternative ? [{ label: `Альтернатива: ${a.safeAlternative}`, type: "secondary" }] : [],
						}));
						setProactiveAlerts((prev) => [...prev.filter((p) => !p.id.startsWith("sentinel-alert-")), ...mappedAlerts]);
					}
				}
			}
		} catch {
			// Ignore network error
		}
	}, [apiBaseUrl, setProactiveAlerts, setWhatsappHitLCards]);

	const handleEvent = useMemo(
		() =>
			createStreamEventHandler({
				apiBaseUrl,
				setPhase,
				setMessages,
				setPending,
				setProactiveAlerts,
				setWhatsappHitLCards,
				cacheNames,
			}),
		[
			apiBaseUrl,
			setPhase,
			setMessages,
			setPending,
			setProactiveAlerts,
			setWhatsappHitLCards,
			cacheNames,
		],
	);

	const streamRequest = useCallback(
		async (pathStr: string, body: unknown) => {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			const controller = new AbortController();
			abortControllerRef.current = controller;

			try {
				const res = await fetch(`${apiBaseUrl}${pathStr}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify(body),
					signal: controller.signal,
				});

				if (!res.ok || !res.body) {
					// COP-06: Детерминированный оффлайн-фолбек при 429 или сбое шлюза
					if (typeof body === "object" && body && "message" in body && typeof (body as any).message === "string") {
						const queryText = (body as any).message;
						const fallbackMsg: any = {
							id: `msg-fallback-${Date.now()}`,
							role: "assistant",
							content: "",
							timestamp: Date.now(),
						};
						await executeLocalFallback(
							queryText,
							fallbackMsg,
							(p) => setPhase(p),
							{
								onMessageUpdated: (updated) => {
									if (updated.content) {
										handleEvent("text_chunk", { text: updated.content });
									}
								},
								onPhaseChanged: (p) => setPhase(p),
							},
						);
						handleEvent("done", {});
						return;
					}

					handleEvent("error", {
						detail: `HTTP ${res.status}: ${res.statusText}`,
					});
					return;
				}

				await readEventStream(res.body, handleEvent, controller.signal);
			} catch (err: unknown) {
				if ((err as Error).name !== "AbortError") {
					// COP-06: Локальный фолбек при сетевом сбое (Failed to fetch)
					if (typeof body === "object" && body && "message" in body && typeof (body as any).message === "string") {
						const queryText = (body as any).message;
						const fallbackMsg: any = {
							id: `msg-fallback-${Date.now()}`,
							role: "assistant",
							content: "",
							timestamp: Date.now(),
						};
						await executeLocalFallback(
							queryText,
							fallbackMsg,
							(p) => setPhase(p),
							{
								onMessageUpdated: (updated) => {
									if (updated.content) {
										handleEvent("text_chunk", { text: updated.content });
									}
								},
								onPhaseChanged: (p) => setPhase(p),
							},
						);
						handleEvent("done", {});
						return;
					}

					handleEvent("error", { detail: String(err) });
				}
			} finally {
				if (abortControllerRef.current === controller) {
					abortControllerRef.current = null;
				}
			}
		},
		[apiBaseUrl, handleEvent, setPhase],
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

				await readEventStream(res.body, handleEvent, controller.signal);
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
