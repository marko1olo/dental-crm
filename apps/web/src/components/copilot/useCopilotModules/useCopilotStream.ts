import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	readDenteClinicToken,
	readDenteStaffToken,
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
					handleEvent("error", {
						detail: `HTTP ${res.status}: ${res.statusText}`,
					});
					return;
				}

				await readEventStream(res.body, handleEvent, controller.signal);
			} catch (err: unknown) {
				if ((err as Error).name !== "AbortError") {
					handleEvent("error", { detail: String(err) });
				}
			} finally {
				if (abortControllerRef.current === controller) {
					abortControllerRef.current = null;
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
