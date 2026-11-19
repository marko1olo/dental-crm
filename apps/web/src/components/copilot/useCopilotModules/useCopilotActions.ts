import { useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { denteQueryClient } from "../../../lib/queryClient";
import { useVisitStore } from "../../../store/visitStore";
import { useCopilotStore } from "../../../store/copilotStore";
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

export interface ExecuteCopilotConfirmationOptions {
	callId: string;
	decision: "confirm" | "reject";
	actionName: string;
	actionArgs?: Record<string, unknown> | undefined;
	modifiedArgs?: Record<string, unknown> | undefined;
	reason?: string | undefined;
	apiBaseUrl?: string | undefined;
	sessionId?: string | undefined;
	patientId?: string | undefined;
	runtimeMode?: string | undefined;
}

export async function executeCopilotConfirmation({
	callId,
	decision,
	actionName,
	actionArgs = {},
	modifiedArgs,
	reason,
	apiBaseUrl = "",
	sessionId,
	patientId,
	runtimeMode = "web_browser",
}: ExecuteCopilotConfirmationOptions): Promise<boolean> {
	const finalArgs = {
		...actionArgs,
		...(modifiedArgs || {}),
	};
	const baseUrl = apiBaseUrl.replace(/\/$/, "");
	const token = readDenteClinicToken() || readDenteStaffToken() || "";

	let apiOk = false;
	try {
		const res = await fetch(`${baseUrl}/api/agent/confirm`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-agent-runtime": runtimeMode,
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({
				callId,
				toolName: actionName,
				args: finalArgs,
				decision,
				confirmed: decision === "confirm",
				reason,
				patientId: patientId || undefined,
				sessionId: sessionId || undefined,
				runtimeMode,
			}),
		});
		apiOk = res.ok;
		if (res.ok) {
			const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			// Reactive cache invalidation via canonical denteQueryClient (Мандат 8d/8zq)
			void denteQueryClient.invalidateQueries({ queryKey: ["visits"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["appointments"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["patients"] });
			if (patientId) {
				void denteQueryClient.invalidateQueries({ queryKey: ["patient", patientId] });
				void denteQueryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
				void denteQueryClient.invalidateQueries({ queryKey: ["treatment-plans", patientId] });
				void denteQueryClient.invalidateQueries({ queryKey: ["clinicalNotes", patientId] });
			}
			void denteQueryClient.invalidateQueries({ queryKey: ["invoices"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["warehouse"] });

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:agent-action-confirmed", {
						detail: {
							callId,
							actionName,
							decision,
							result: json.result ?? json.data ?? json,
						},
					}),
				);
			}
		}
	} catch (apiErr) {
		console.warn("[executeCopilotConfirmation] Fastify confirm fallback:", apiErr);
	}

	return apiOk;
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

			const isValidUuid = typeof conversationId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId);
			const sessId = isValidUuid ? conversationId : generateUuidV7();
			if (!isValidUuid) setConversationId(sessId);

			const settings = useCopilotStore.getState().settings;
			const currentTrust = settings.trustLevel;
			const normalizedTrust: "confirm_all" | "balanced" | "autonomous" =
				currentTrust === "confirm_all"
					? "confirm_all"
					: currentTrust === "autonomous"
					? "autonomous"
					: "balanced";

			await streamRequest("/api/agent/chat", {
				conversationId: sessId,
				sessionId: sessId,
				message: text,
				messages: [{ role: "user", content: text }],
				stream: true,
				modelRoutingMode: settings.modelRoutingMode,
				byokProvider: settings.byokProvider,
				byokApiKey: settings.byokApiKey,
				byokModel: settings.byokModel,
				speedMode: settings.speedMode,
				trustLevel: normalizedTrust,
				runtimeMode: settings.runtimeMode,
				maskPhiData: settings.maskPhiData ?? true,
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

			const sessId = (conversationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId))
				? conversationId
				: generateUuidV7();

			try {
				await executeCopilotConfirmation({
					callId,
					decision,
					actionName,
					actionArgs,
					modifiedArgs,
					reason,
					apiBaseUrl,
					sessionId: sessId,
					patientId: (targetMsg?.args?.patientId as string) || undefined,
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
				useVisitStore.getState().setVisitNoteForm((prev) => {
					const appendWithSeparator = (existing?: string, addition?: string) => {
						if (!addition?.trim()) return existing || "";
						if (!existing?.trim()) return addition.trim();
						if (existing.includes(addition.trim())) return existing;
						return `${existing.trim()}\n\n${addition.trim()}`;
					};

					return {
						...prev,
						complaint: appendWithSeparator(prev.complaint, f043.complaint),
						anamnesis: appendWithSeparator(prev.anamnesis, f043.anamnesis),
						objectiveStatus: appendWithSeparator(prev.objectiveStatus, f043.objectiveStatus),
						diagnosis: appendWithSeparator(prev.diagnosis, f043.diagnosis),
						treatmentPlan: appendWithSeparator(prev.treatmentPlan, f043.treatmentPlan),
					};
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
		} catch (err) {
			console.info("[useCopilotActions] Load nudges offline fallback:", err);
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
			} catch (err) {
				console.info("[useCopilotActions] Dismiss nudge offline fallback:", err);
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
			} catch (err) {
				console.info("[useCopilotActions] Dismiss proactive alert offline fallback:", err);
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
