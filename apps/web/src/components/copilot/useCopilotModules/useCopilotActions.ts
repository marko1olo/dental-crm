import { useCallback } from "react";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import {
	dispatchCrmAction,
	copilotActionRunner,
} from "../../../services/ai";
import { useVisitStore } from "../../../store/visitStore";
import type {
	ConfirmUiMessage,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	Form043Note,
	PendingConfirmation,
	ProactiveAlertCardData,
	TextUiMessage,
	WhatsAppApprovalCard,
} from "./types";

interface UseCopilotActionsParams {
	apiBaseUrl: string;
	busy: boolean;
	setBusy: (busy: boolean) => void;
	conversationId: string | null;
	setConversationId: (id: string | null) => void;
	messages: CopilotUiMessage[];
	setMessages: React.Dispatch<React.SetStateAction<CopilotUiMessage[]>>;
	pending: PendingConfirmation | null;
	setPending: (pending: PendingConfirmation | null) => void;
	setPhase: (phase: CopilotPhase) => void;
	streamRequest: (pathStr: string, body: unknown) => Promise<void>;
	abortControllerRef: React.RefObject<AbortController | null>;
	resetState: () => void;
	setNudges: React.Dispatch<React.SetStateAction<CopilotNudge[]>>;
	setProactiveAlerts: React.Dispatch<
		React.SetStateAction<ProactiveAlertCardData[]>
	>;
	setWhatsappHitLCards: React.Dispatch<
		React.SetStateAction<WhatsAppApprovalCard[]>
	>;
}

export function useCopilotActions({
	apiBaseUrl,
	busy,
	setBusy,
	conversationId,
	setConversationId,
	messages,
	setMessages,
	pending,
	setPending,
	setPhase,
	streamRequest,
	abortControllerRef,
	resetState,
	setNudges,
	setProactiveAlerts,
	setWhatsappHitLCards,
}: UseCopilotActionsParams) {
	const send = useCallback(
		async (text: string) => {
			if (!text.trim() || busy) return;
			const userMsg: TextUiMessage = { kind: "text", role: "user", text };
			setMessages((prev) => [...prev, userMsg]);
			setBusy(true);
			setPhase("working");

			const sessId = conversationId || `sess_${Date.now()}`;
			if (!conversationId) setConversationId(sessId);

			await streamRequest("/api/v1/copilot/chat", {
				conversationId: sessId,
				message: text,
			});
			setBusy(false);
			setPhase(null);
		},
		[
			busy,
			conversationId,
			setConversationId,
			setMessages,
			setBusy,
			setPhase,
			streamRequest,
		],
	);

	const confirm = useCallback(
		async (
			callId: string,
			decision: "confirm" | "reject",
			modifiedArgs?: Record<string, unknown> | undefined,
			reason?: string | undefined,
		) => {
			if (busy) return;
			setMessages((prev) =>
				prev.map((m) =>
					m.kind === "confirmation" && m.callId === callId
						? {
								...m,
								resolved: decision,
								args: modifiedArgs ? { ...m.args, ...modifiedArgs } : m.args,
							}
						: m,
				),
			);
			setPending(null);
			setBusy(true);
			setPhase("working");

			const targetMsg = messages.find(
				(m) => m.kind === "confirmation" && m.callId === callId,
			) as ConfirmUiMessage | undefined;
			const actionName = targetMsg?.name || pending?.name || "action";
			const actionArgs = {
				...(targetMsg?.args || pending?.args || {}),
				...(modifiedArgs || {}),
			};

			if (decision === "confirm") {
				copilotActionRunner
					.confirmAction(callId, actionArgs, apiBaseUrl)
					.catch(() => {
						dispatchCrmAction(
							{
								callId,
								name: actionName,
								arguments: actionArgs,
								confirmed: true,
							},
							apiBaseUrl,
						).catch(() => {});
					});
			} else {
				copilotActionRunner
					.rejectAction(callId, reason, apiBaseUrl)
					.catch(() => {});
			}

			const sessId = conversationId || "default-session";
			try {
				await streamRequest("/api/v1/copilot/confirm", {
					sessionId: sessId,
					callId,
					decision,
					reason,
					modifiedArgs,
				});
			} catch (e) {
				console.error("Error confirming copilot action:", e);
			} finally {
				setBusy(false);
				setPhase(null);
			}
		},
		[
			busy,
			conversationId,
			streamRequest,
			messages,
			pending,
			apiBaseUrl,
			setMessages,
			setPending,
			setBusy,
			setPhase,
		],
	);

	const reset = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		resetState();
	}, [abortControllerRef, resetState]);

	const applyNudgeProtocol = useCallback(
		(nudge: CopilotNudge) => {
			const f043 = nudge.payload?.form043 as Form043Note | undefined;

			if (f043) {
				useVisitStore.getState().setVisitNoteForm({
					complaint: f043.complaint || "",
					anamnesis: f043.anamnesis || "",
					objectiveStatus: f043.objectiveStatus || "",
					diagnosis: f043.diagnosis || "",
					treatmentPlan: f043.treatmentPlan || "",
				});
			}

			setNudges((prev) => prev.filter((n) => n.id !== nudge.id));
		},
		[setNudges],
	);

	const loadNudges = useCallback(async () => {
		try {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			const res = await fetch(`${apiBaseUrl}/api/v1/copilot/nudges`, {
				headers: { Authorization: token ? `Bearer ${token}` : "" },
			});
			if (res.ok) {
				const json = await res.json();
				setNudges(json.nudges || json.data || json || []);
			}
		} catch {
			setNudges([]);
		}
	}, [apiBaseUrl, setNudges]);

	const dismissNudge = useCallback(
		async (id: string) => {
			setNudges((prev) => prev.filter((n) => n.id !== id));
			try {
				const token = readDenteClinicToken() || readDenteStaffToken() || "";
				await fetch(`${apiBaseUrl}/api/v1/copilot/dismiss-nudge`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify({ id }),
				});
			} catch {
				// Ignore network error on dismissal
			}
		},
		[apiBaseUrl, setNudges],
	);

	const approveWhatsAppCard = useCallback(
		async (approvalId: string, modifiedReply?: string) => {
			setWhatsappHitLCards((prev) =>
				prev.map((c) =>
					c.approvalId === approvalId ? { ...c, status: "approved" } : c,
				),
			);
			setProactiveAlerts((prev) =>
				prev.filter(
					(a) =>
						a.id !== `alert_hitl_${approvalId}` &&
						a.data?.approvalId !== approvalId,
				),
			);

			try {
				const token = readDenteClinicToken() || readDenteStaffToken() || "";
				await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/approve`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify({ approvalId, modifiedReply, sendNow: true }),
				});
			} catch (e) {
				console.error("Error approving proactive whatsapp card:", e);
			}
		},
		[apiBaseUrl, setWhatsappHitLCards, setProactiveAlerts],
	);

	const rejectWhatsAppCard = useCallback(
		async (approvalId: string, reason?: string) => {
			setWhatsappHitLCards((prev) =>
				prev.map((c) =>
					c.approvalId === approvalId ? { ...c, status: "rejected" } : c,
				),
			);
			setProactiveAlerts((prev) =>
				prev.filter(
					(a) =>
						a.id !== `alert_hitl_${approvalId}` &&
						a.data?.approvalId !== approvalId,
				),
			);

			try {
				const token = readDenteClinicToken() || readDenteStaffToken() || "";
				await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/reject`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify({ approvalId, reason }),
				});
			} catch (e) {
				console.error("Error rejecting proactive whatsapp card:", e);
			}
		},
		[apiBaseUrl, setWhatsappHitLCards, setProactiveAlerts],
	);

	const dismissProactiveAlert = useCallback(
		async (alertId: string) => {
			setProactiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
			try {
				const token = readDenteClinicToken() || readDenteStaffToken() || "";
				await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/dismiss-alert`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify({ alertId }),
				});
			} catch {
				// Ignore network error on dismissal
			}
		},
		[apiBaseUrl, setProactiveAlerts],
	);

	return {
		send,
		confirm,
		reset,
		applyNudgeProtocol,
		loadNudges,
		dismissNudge,
		approveWhatsAppCard,
		rejectWhatsAppCard,
		dismissProactiveAlert,
	};
}
