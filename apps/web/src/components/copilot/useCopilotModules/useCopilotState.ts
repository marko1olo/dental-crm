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

export function useCopilotState(options: UseCopilotOptions = {}) {
	const [isOpen, setIsOpen] = useState(options.initialOpen || false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [messages, setMessages] = useState<CopilotUiMessage[]>([]);
	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState<PendingConfirmation | null>(null);
	const [phase, setPhase] = useState<CopilotPhase>(null);
	const [nameCache, setNameCache] = useState<Record<string, string>>({});
	const [nudges, setNudges] = useState<CopilotNudge[]>([]);
	const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");
	const [proactiveAlerts, setProactiveAlerts] = useState<
		ProactiveAlertCardData[]
	>([]);
	const [whatsappHitLCards, setWhatsappHitLCards] = useState<
		WhatsAppApprovalCard[]
	>([]);

	const toggle = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	const openDrawer = useCallback(() => {
		setIsOpen(true);
	}, []);

	const closeDrawer = useCallback(() => {
		setIsOpen(false);
	}, []);

	// Expose global automation hooks for Playwright & E2E proof captures
	useEffect(() => {
		if (typeof window !== "undefined") {
			// biome-ignore lint/suspicious/noExplicitAny: automation hook
			(window as any).__denteCopilot = {
				open: () => setIsOpen(true),
				close: () => setIsOpen(false),
				toggle: () => setIsOpen((prev) => !prev),
				setMessages: (msgs: CopilotUiMessage[]) => setMessages(msgs),
				setPending: (pend: PendingConfirmation | null) => setPending(pend),
				setActiveTab: (tab: "chat" | "pending") => setActiveTab(tab),
				setProactiveAlerts: (alerts: ProactiveAlertCardData[]) =>
					setProactiveAlerts(alerts),
				setWhatsappHitLCards: (cards: WhatsAppApprovalCard[]) =>
					setWhatsappHitLCards(cards),
			};
		}
		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: automation hook cleanup
			if (typeof window !== "undefined" && (window as any).__denteCopilot) {
				// biome-ignore lint/suspicious/noExplicitAny: automation hook cleanup
				delete (window as any).__denteCopilot;
			}
		};
	}, []);

	const cacheNames = useCallback((toolName: string, result: unknown) => {
		if (!result || typeof result !== "object") return;
		const r = result as Record<string, unknown>;
		const short = toolName.split(".").pop() || toolName;

		setNameCache((prev) => {
			const next = { ...prev };
			const put = (id: unknown, label: unknown) => {
				if (typeof id === "string" && typeof label === "string") {
					next[id] = label;
				}
			};

			const rows = (key: string): Record<string, unknown>[] =>
				Array.isArray(r[key]) ? (r[key] as Record<string, unknown>[]) : [];

			if (short === "search_patients") {
				rows("patients").forEach((p) => put(p.id, p.full_name));
			} else if (short === "get_patient") {
				put(r.id, r.full_name);
			} else if (short === "get_day_overview") {
				rows("appointments").forEach((a) => put(a.patient_id, a.patient_name));
			} else if (short === "get_appointment") {
				put(r.patient_id, r.patient_name);
			} else if (short === "list_cabinets") {
				rows("cabinets").forEach((c) => put(c.id, c.name));
			}
			return next;
		});
	}, []);

	const resetState = useCallback(() => {
		setConversationId(null);
		setMessages([]);
		setPending(null);
		setPhase(null);
		setBusy(false);
	}, []);

	return {
		isOpen,
		setIsOpen,
		conversationId,
		setConversationId,
		messages,
		setMessages,
		busy,
		setBusy,
		pending,
		setPending,
		phase,
		setPhase,
		nameCache,
		setNameCache,
		nudges,
		setNudges,
		activeTab,
		setActiveTab,
		proactiveAlerts,
		setProactiveAlerts,
		whatsappHitLCards,
		setWhatsappHitLCards,
		toggle,
		openDrawer,
		closeDrawer,
		cacheNames,
		resetState,
	};
}
