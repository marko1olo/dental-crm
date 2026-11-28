import { useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import { denteQueryClient } from "../../../lib/queryClient";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";
import { useCopilotStore } from "../../../store/copilotStore";
import { toCleanToothNumber, toCleanUuid } from "../client/copilotStreamClient";
import { getCurrentCopilotUiContext } from "../contextSync/contextStoreReader";
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

export interface CopilotConfirmationResult {
	ok: boolean;
	status?: number | undefined;
	error?: string | undefined;
	result?: unknown | undefined;
}

export async function executeCopilotConfirmationWithResult({
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
}: ExecuteCopilotConfirmationOptions): Promise<CopilotConfirmationResult> {
	const finalArgs = {
		...actionArgs,
		...(modifiedArgs || {}),
	};
	const baseUrl = apiBaseUrl.replace(/\/$/, "");

	try {
		const res = await fetch(`${baseUrl}/api/agent/confirm`, {
			method: "POST",
			credentials: "include",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"x-agent-runtime": runtimeMode,
				"Idempotency-Key": generateUuidV7(),
			}),
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
		let json: Record<string, unknown> = {};
		try {
			json = (await res.json()) as Record<string, unknown>;
		} catch (parseErr) {
			clientLogger.warn("[useCopilotActions] Invalid JSON response from /api/agent/confirm:", parseErr);
		}
		const payload = (typeof json.data === "object" && json.data !== null ? json.data : json) as Record<string, unknown>;
		const ok = res.ok && json.ok !== false && payload.ok !== false;
		if (ok) {
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

			const resultPayload = payload.result ?? json.result ?? payload;
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:agent-action-confirmed", {
						detail: {
							callId,
							actionName,
							decision,
							result: resultPayload,
						},
					}),
				);
			}
			return { ok: true, status: res.status, result: resultPayload };
		}
		const errText =
			(typeof json.message === "string" && json.message) ||
			(typeof json.error === "string" && json.error) ||
			(typeof payload.error === "string" && payload.error) ||
			res.statusText ||
			`HTTP ${res.status}`;
		return { ok: false, status: res.status, error: errText };
	} catch (apiErr) {
		const message = apiErr instanceof Error ? apiErr.message : "Ошибка сети при подтверждении действия";
		clientLogger.warn("[executeCopilotConfirmation] Fastify confirm failed:", apiErr);
		return { ok: false, error: message };
	}
}

export async function executeCopilotConfirmation(
	options: ExecuteCopilotConfirmationOptions,
): Promise<boolean> {
	const result = await executeCopilotConfirmationWithResult(options);
	return result.ok;
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

			const copilotState = useCopilotStore.getState();
			const settings = copilotState.settings;
			const uiContext = getCurrentCopilotUiContext();
			const appState = useAppStore.getState();
			const resolvedPatientId = toCleanUuid(uiContext.patientId ?? appState.activePatientId);
			const resolvedVisitId = toCleanUuid(appState.dashboard?.activeVisit?.id);
			const resolvedTooth = toCleanToothNumber(uiContext.activeTooth ?? appState.activeTooth);
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
				...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
				...(resolvedVisitId ? { activeVisitId: resolvedVisitId } : {}),
				...(resolvedTooth !== undefined ? { activeTooth: resolvedTooth } : {}),
				...(uiContext.allergies && uiContext.allergies.length > 0
					? { patientAllergies: [...uiContext.allergies] }
					: {}),
				...(settings.customDoctorInstructions
					? { customInstructions: settings.customDoctorInstructions }
					: {}),
				...(copilotState.memoryFacts.length > 0
					? { memoryFacts: copilotState.memoryFacts.map((m) => m.fact) }
					: {}),
				...(settings.clinicalSpecialization
					? { doctorSpecialization: settings.clinicalSpecialization }
					: {}),
				...(settings.granularPermissions
					? { granularPermissions: settings.granularPermissions }
					: {}),
				...(settings.temperature !== undefined
					? { temperature: settings.temperature }
					: {}),
				...(settings.contextLimitTokens !== undefined
					? { contextLimitTokens: settings.contextLimitTokens }
					: {}),
				...(settings.showTypingAnimation !== undefined
					? { showTypingAnimation: settings.showTypingAnimation }
					: {}),
				...(settings.localDropzonePath
					? { localDropzonePath: settings.localDropzonePath }
					: {}),
				stream: true,
				modelRoutingMode: settings.modelRoutingMode,
				byokProvider: settings.byokProvider,
				byokApiKey: settings.byokApiKey,
				byokModel: settings.byokModel,
				...(settings.byokBaseUrl ? { byokBaseUrl: settings.byokBaseUrl } : {}),
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
			const previousPending = pending;
			const targetMsg = messages.find(
				(m) => m.kind === "confirmation" && m.callId === callId,
			) as ConfirmUiMessage | undefined;
			const previousResolved = targetMsg?.resolved;

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

			const actionName = targetMsg?.name || previousPending?.name || "action";
			const actionArgs = {
				...(targetMsg?.args || previousPending?.args || {}),
				...(modifiedArgs || {}),
			};

			const sessId = (conversationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId))
				? conversationId
				: generateUuidV7();

			const revertConfirmationUi = () => {
				setMessages((prev) =>
					prev.map((m) => {
						if (m.kind === "confirmation" && m.callId === callId) {
							if (previousResolved !== undefined) {
								return { ...m, resolved: previousResolved };
							}
							const { resolved: _prevResolved, ...rest } = m;
							return rest;
						}
						return m;
					}),
				);
				if (previousPending) {
					setPending(previousPending);
				}
			};

			try {
				const res = await executeCopilotConfirmationWithResult({
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
				if (!res.ok) {
					revertConfirmationUi();
					showToast(res.error || "Не удалось подтвердить действие на сервере", "error");
				}
			} catch (e) {
				clientLogger.error("Error confirming copilot action:", e);
				revertConfirmationUi();
				showToast("Ошибка при подтверждении действия", "error");
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
			const res = await fetch(`${apiBaseUrl}/api/v1/copilot/nudges`, {
				credentials: "include",
				headers: denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const rawJson: unknown = await res.json();
				const unwrapped =
					rawJson && typeof rawJson === "object" && "data" in rawJson
						? (rawJson as { data?: unknown }).data
						: rawJson;
				const nudgesList = Array.isArray(unwrapped)
					? unwrapped
					: unwrapped &&
						  typeof unwrapped === "object" &&
						  "nudges" in unwrapped &&
						  Array.isArray((unwrapped as { nudges?: unknown }).nudges)
						? (unwrapped as { nudges: CopilotNudge[] }).nudges
						: [];
				setNudges(nudgesList as CopilotNudge[]);
			}
		} catch (err) {
			clientLogger.info("[useCopilotActions] Load nudges offline fallback:", err);
			setNudges([]);
		}
	}, [apiBaseUrl, setNudges]);

	const dismissNudge = useCallback(
		async (id: string) => {
			setNudges((prev) => prev.filter((n) => n.id !== id));
			try {
				const res = await fetch(`${apiBaseUrl}/api/v1/copilot/dismiss-nudge`, {
					method: "POST",
					credentials: "include",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({ id }),
				});
				if (!res.ok) {
					clientLogger.warn("[useCopilotActions] Dismiss nudge HTTP status:", res.status);
				}
			} catch (err) {
				clientLogger.info("[useCopilotActions] Dismiss nudge offline fallback:", err);
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

			try {
				const res = await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/approve`, {
					method: "POST",
					credentials: "include",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({ approvalId, modifiedReply, sendNow: true }),
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				setProactiveAlerts((prev) =>
					prev.filter(
						(a) =>
							a.id !== `alert_hitl_${approvalId}` &&
							a.data?.approvalId !== approvalId,
					),
				);
			} catch (e) {
				clientLogger.error("Error approving proactive whatsapp card:", e);
				setWhatsappHitLCards((prev) =>
					prev.map((c) =>
						c.approvalId === approvalId ? { ...c, status: "pending" } : c,
					),
				);
				showToast("Не удалось одобрить отправку сообщения", "error");
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

			try {
				const res = await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/reject`, {
					method: "POST",
					credentials: "include",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({ approvalId, reason }),
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				setProactiveAlerts((prev) =>
					prev.filter(
						(a) =>
							a.id !== `alert_hitl_${approvalId}` &&
							a.data?.approvalId !== approvalId,
					),
				);
			} catch (e) {
				clientLogger.error("Error rejecting proactive whatsapp card:", e);
				setWhatsappHitLCards((prev) =>
					prev.map((c) =>
						c.approvalId === approvalId ? { ...c, status: "pending" } : c,
					),
				);
				showToast("Не удалось отклонить карточку сообщения", "error");
			}
		},
		[apiBaseUrl, setWhatsappHitLCards, setProactiveAlerts],
	);

	const dismissProactiveAlert = useCallback(
		async (alertId: string) => {
			setProactiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
			try {
				const res = await fetch(`${apiBaseUrl}/api/v1/copilot/proactive/dismiss-alert`, {
					method: "POST",
					credentials: "include",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({ alertId }),
				});
				if (!res.ok) {
					clientLogger.warn("[useCopilotActions] Dismiss alert HTTP status:", res.status);
				}
			} catch (err) {
				clientLogger.info("[useCopilotActions] Dismiss proactive alert offline fallback:", err);
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
