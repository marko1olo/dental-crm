import { useCallback, useEffect, useState } from "react";
import type {
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	UseCopilotOptions,
	WhatsAppApprovalCard,
} from "./types";
import { useCopilotStore } from "../../../store/copilotStore";
import { denteQueryClient } from "../../../lib/queryClient";

export function useCopilotState(options: UseCopilotOptions = {}) {
	const activeThreadId = useCopilotStore((s) => s.activeThreadId);
	const selectThread = useCopilotStore((s) => s.selectThread);
	const saveThreadMessages = useCopilotStore((s) => s.saveThreadMessages);
	const isStudioOpen = useCopilotStore((s) => s.isStudioOpen);
	const setStudioOpen = useCopilotStore((s) => s.setStudioOpen);
	const threadMessages = useCopilotStore((s) => s.threadMessages);

	// Synchronize isOpen with Zustand SSOT store
	const isOpen = isStudioOpen;
	const setIsOpen = useCallback(
		(val: boolean | ((prev: boolean) => boolean)) => {
			const current = useCopilotStore.getState().isStudioOpen;
			const next = typeof val === "function" ? val(current) : val;
			useCopilotStore.getState().setStudioOpen(next);
		},
		[],
	);

	useEffect(() => {
		if (options.initialOpen && !useCopilotStore.getState().isStudioOpen) {
			useCopilotStore.getState().setStudioOpen(true);
		}
	}, [options.initialOpen]);

	const conversationId = activeThreadId || options.conversationId || null;

	const setConversationId = useCallback(
		(id: string | null) => {
			if (id) {
				selectThread(id);
			}
		},
		[selectThread],
	);

	// Messages backed by global Zustand store threadMessages for zero desync
	const activeThreadMessages = (conversationId && threadMessages[conversationId]) || [];
	const messages = activeThreadMessages as CopilotUiMessage[];

	const setMessages: React.Dispatch<React.SetStateAction<CopilotUiMessage[]>> = useCallback(
		(action) => {
			const currentThreadId = useCopilotStore.getState().activeThreadId || options.conversationId || "default-thread";
			const current = (useCopilotStore.getState().threadMessages[currentThreadId] || []) as CopilotUiMessage[];
			const next = typeof action === "function" ? action(current) : action;
			const mapped = next.map((m, idx) => ({
				id: "id" in m && typeof m.id === "string" ? m.id : `msg-${idx}`,
				role: ("role" in m && m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
				text: "text" in m && typeof m.text === "string" ? m.text : "",
				content: "text" in m && typeof m.text === "string" ? m.text : "",
				...m,
			}));
			saveThreadMessages(currentThreadId, mapped);
		},
		[options.conversationId, saveThreadMessages],
	);

	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState<PendingConfirmation | null>(null);
	const [phase, setPhase] = useState<CopilotPhase>(null);
	const [nameCache, setNameCache] = useState<Record<string, string>>({});
	const [nudges, setNudges] = useState<CopilotNudge[]>([]);
	const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");
	const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlertCardData[]>([]);
	const [whatsappHitLCards, setWhatsappHitLCards] = useState<WhatsAppApprovalCard[]>([]);

	const toggle = useCallback(() => {
		useCopilotStore.getState().setStudioOpen(!useCopilotStore.getState().isStudioOpen);
	}, []);

	const openDrawer = useCallback(() => {
		useCopilotStore.getState().setStudioOpen(true);
	}, []);

	const closeDrawer = useCallback(() => {
		useCopilotStore.getState().setStudioOpen(false);
	}, []);

	// Invalidation handler for 29 canonical dental tools (Mandate 8zq)
	const invalidateQueriesForTool = useCallback((toolName: string, args?: Record<string, unknown>, result?: unknown) => {
		const short = toolName.split(".").pop() || toolName;
		const r = (result && typeof result === "object" ? result : {}) as Record<string, unknown>;
		const effectivePatientId = String(args?.patientId || r?.patientId || "");

		if (
			short === "create_appointment" ||
			short === "reschedule_appointment" ||
			short === "cancel_appointment" ||
			short === "book_chairside_appointment" ||
			short === "get_day_overview" ||
			short === "get_appointment"
		) {
			void denteQueryClient.invalidateQueries({ queryKey: ["appointments"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["visits"] });
		} else if (
			short === "update_tooth_status" ||
			short === "create_treatment_plan_item" ||
			short === "get_patient_emr_and_odontogram" ||
			short === "get_patient" ||
			short === "search_patients"
		) {
			if (effectivePatientId) {
				void denteQueryClient.invalidateQueries({ queryKey: ["patient", effectivePatientId] });
				void denteQueryClient.invalidateQueries({ queryKey: ["odontogram", effectivePatientId] });
			}
			void denteQueryClient.invalidateQueries({ queryKey: ["patient"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["odontogram"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
		} else if (short === "create_invoice_draft" || short === "search_clinic_services_and_prices") {
			void denteQueryClient.invalidateQueries({ queryKey: ["invoices"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["billing"] });
		} else if (short === "deduct_inventory_stock") {
			void denteQueryClient.invalidateQueries({ queryKey: ["inventory"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["warehouse"] });
		}
	}, []);

	const cacheNames = useCallback((toolName: string, result: unknown, args?: Record<string, unknown>) => {
		if (!result || typeof result !== "object") return;
		const r = result as Record<string, unknown>;
		const short = toolName.split(".").pop() || toolName;

		// Immediately trigger reactive cache invalidation
		invalidateQueriesForTool(toolName, args, result);

		setNameCache((prev) => {
			const next = { ...prev };
			const put = (id: unknown, label: unknown) => {
				if (typeof id === "string" && typeof label === "string") {
					next[id] = label;
				}
			};

			const rows = (key: string): Record<string, unknown>[] =>
				Array.isArray(r[key]) ? (r[key] as Record<string, unknown>[]) : [];

			// 29 Canonical Tools & Legacy Compatibility
			if (short === "search_patients" || short === "get_patient_emr_and_odontogram") {
				rows("patients").forEach((p) => put(p.id, p.fullName || p.full_name));
				if (r.patientId || r.id) {
					put(r.patientId || r.id, r.fullName || r.full_name || r.name);
				}
			} else if (short === "get_patient") {
				put(r.id, r.fullName || r.full_name);
			} else if (
				short === "get_day_overview" ||
				short === "create_appointment" ||
				short === "reschedule_appointment" ||
				short === "cancel_appointment"
			) {
				rows("appointments").forEach((a) => put(a.patientId || a.patient_id, a.patientName || a.patient_name));
				if (r.patientId || r.patient_id) {
					put(r.patientId || r.patient_id, r.patientName || r.patient_name);
				}
			} else if (short === "get_appointment") {
				put(r.patientId || r.patient_id, r.patientName || r.patient_name);
			} else if (short === "list_cabinets") {
				rows("cabinets").forEach((c) => put(c.id, c.name));
			} else if (short === "search_clinic_services_and_prices") {
				rows("services").forEach((s) => put(s.id || s.code, s.name || s.title));
			}
			return next;
		});
	}, [invalidateQueriesForTool]);

	// Expose global automation hooks for Playwright & E2E proof captures
	useEffect(() => {
		if (typeof window !== "undefined") {
			const existing = window.__denteCopilot;
			window.__denteCopilot = {
				open: () => useCopilotStore.getState().setStudioOpen(true),
				close: () => useCopilotStore.getState().setStudioOpen(false),
				toggle: () => useCopilotStore.getState().setStudioOpen(!useCopilotStore.getState().isStudioOpen),
				openHud: existing?.openHud || (() => useCopilotStore.getState().setHudOpen(true)),
				closeHud: existing?.closeHud || (() => useCopilotStore.getState().setHudOpen(false)),
				toggleHud: existing?.toggleHud || (() => useCopilotStore.getState().setHudOpen(!useCopilotStore.getState().isHudOpen)),
				openVoiceModal: existing?.openVoiceModal || (() => {}),
				closeVoiceModal: existing?.closeVoiceModal || (() => {}),
				openTreatmentPlanCopilot: existing?.openTreatmentPlanCopilot || (() => {}),
				closeTreatmentPlanCopilot: existing?.closeTreatmentPlanCopilot || (() => {}),
				openAiSettings: existing?.openAiSettings || (() => useCopilotStore.getState().setSettingsOpen(true)),
				setContext: existing?.setContext || (() => {}),
				setMessages: (msgs: CopilotUiMessage[]) => setMessages(msgs),
				setPending: (pend: PendingConfirmation | null) => setPending(pend),
				setBusy: (b: boolean) => setBusy(b),
				setPhase: (p: string | null) => setPhase(p as CopilotPhase),
				setActiveTab: (tab: "chat" | "pending") => setActiveTab(tab),
				setProactiveAlerts: (alerts: unknown[]) => setProactiveAlerts(alerts as ProactiveAlertCardData[]),
				setWhatsappHitLCards: (cards: unknown[]) => setWhatsappHitLCards(cards as WhatsAppApprovalCard[]),
			};
		}
		return () => {
			if (typeof window !== "undefined" && window.__denteCopilot) {
				delete window.__denteCopilot;
			}
		};
	}, [setMessages]);

	const resetState = useCallback(() => {
		const currentThreadId = useCopilotStore.getState().activeThreadId || options.conversationId;
		if (currentThreadId) {
			saveThreadMessages(currentThreadId, []);
		}
		setPending(null);
		setPhase(null);
		setBusy(false);
	}, [options.conversationId, saveThreadMessages]);

	return {
		isOpen, setIsOpen, conversationId, setConversationId, messages, setMessages,
		busy, setBusy, pending, setPending, phase, setPhase, nameCache, setNameCache,
		nudges, setNudges, activeTab, setActiveTab, proactiveAlerts, setProactiveAlerts,
		whatsappHitLCards, setWhatsappHitLCards, toggle, openDrawer, closeDrawer,
		cacheNames, invalidateQueriesForTool, resetState,
	};
}
