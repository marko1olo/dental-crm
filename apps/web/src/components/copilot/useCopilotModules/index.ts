import { useCopilotActions } from "./useCopilotActions";
import { useCopilotContextBuilder } from "./useCopilotContextBuilder";
import { useCopilotState } from "./useCopilotState";
import { useCopilotStream } from "./useCopilotStream";
import type { UseCopilotOptions, UseCopilotReturn } from "./types";

export function useCopilot(options: UseCopilotOptions = {}): UseCopilotReturn {
	const apiBaseUrl = options.apiBaseUrl || "";

	const state = useCopilotState(options);

	useCopilotContextBuilder({
		setNudges: state.setNudges,
	});

	const stream = useCopilotStream({
		apiBaseUrl,
		isOpen: state.isOpen,
		setPhase: state.setPhase,
		setMessages: state.setMessages,
		setPending: state.setPending,
		setProactiveAlerts: state.setProactiveAlerts,
		setWhatsappHitLCards: state.setWhatsappHitLCards,
		cacheNames: state.cacheNames,
	});

	const actions = useCopilotActions({
		apiBaseUrl,
		busy: state.busy,
		setBusy: state.setBusy,
		conversationId: state.conversationId,
		setConversationId: state.setConversationId,
		messages: state.messages,
		setMessages: state.setMessages,
		pending: state.pending,
		setPending: state.setPending,
		setPhase: state.setPhase,
		streamRequest: stream.streamRequest,
		abortControllerRef: stream.abortControllerRef,
		resetState: state.resetState,
		setNudges: state.setNudges,
		setProactiveAlerts: state.setProactiveAlerts,
		setWhatsappHitLCards: state.setWhatsappHitLCards,
	});

	return {
		isOpen: state.isOpen,
		conversationId: state.conversationId,
		messages: state.messages,
		busy: state.busy,
		pending: state.pending,
		phase: state.phase,
		nameCache: state.nameCache,
		nudges: state.nudges,
		proactiveAlerts: state.proactiveAlerts,
		whatsappHitLCards: state.whatsappHitLCards,
		activeTab: state.activeTab,
		setActiveTab: state.setActiveTab,
		toggle: state.toggle,
		toggleOpen: state.toggle,
		setIsOpen: state.setIsOpen,
		openDrawer: state.openDrawer,
		closeDrawer: state.closeDrawer,
		send: actions.send,
		sendMessage: actions.send,
		confirm: actions.confirm,
		confirmAction: actions.confirm,
		reset: actions.reset,
		resetSession: actions.reset,
		loadNudges: actions.loadNudges,
		dismissNudge: actions.dismissNudge,
		applyNudgeProtocol: actions.applyNudgeProtocol,
		loadProactivePending: stream.loadProactivePending,
		approveWhatsAppCard: actions.approveWhatsAppCard,
		rejectWhatsAppCard: actions.rejectWhatsAppCard,
		dismissProactiveAlert: actions.dismissProactiveAlert,
	};
}

export { useCopilotActions } from "./useCopilotActions";
export { useCopilotContextBuilder } from "./useCopilotContextBuilder";
export { useCopilotState } from "./useCopilotState";
export { useCopilotStream } from "./useCopilotStream";

export type * from "./types";
