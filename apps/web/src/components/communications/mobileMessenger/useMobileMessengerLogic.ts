import { useCallback, useMemo, useState } from "react";
import { buildQuickTemplates } from "../../chat/whatsAppChatTemplates";
import type {
	ActivePatient, ActiveSection, MobileCommunicationsMessengerProps, MobilePatientDialogSummary,
} from "./types";
import { useMobileChatThread } from "./useMobileChatThread";
import { useMobileDialogsFeed } from "./useMobileDialogsFeed";
import { useMobileMessageSender } from "./useMobileMessageSender";

export function useMobileMessengerLogic({
	dashboard,
	initialPatientId = null,
	communicationChannelLabels = {
		whatsapp: "WhatsApp", telegram: "Telegram", sms: "SMS",
		max: "MAX", phone: "Телефон", email: "Email",
	},
}: MobileCommunicationsMessengerProps) {
	const [activeSection, setActiveSection] = useState<ActiveSection>("dialogs");
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);

	const feed = useMobileDialogsFeed(dashboard);

	const activePatient: ActivePatient | null = useMemo(() => {
		if (!selectedPatientId) return null;
		const fromDialogs = feed.serverDialogs.find((d) => d.patientId === selectedPatientId);
		const fromStore = dashboard?.patients?.find((p) => p.id === selectedPatientId);
		return {
			id: selectedPatientId,
			fullName: fromStore?.fullName || fromDialogs?.patientName || "Пациент клиники",
			phone: fromStore?.phone || fromDialogs?.patientPhone || "",
		};
	}, [selectedPatientId, feed.serverDialogs, dashboard?.patients]);

	const quickTemplates = useMemo(() => {
		return buildQuickTemplates({
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || "клинику DENTE",
			clinicAddress: dashboard?.clinicSettings?.profile?.address || "г. Москва, ул. Арбат, 24",
			clinicPhone: dashboard?.clinicSettings?.profile?.phone || "+7 (495) 123-45-67",
			effectiveName: activePatient?.fullName || "Пациент",
			upcomingAppointment: {
				formattedDate: "завтра, 14 октября", formattedTime: "11:30", doctorName: "Смирнова Е.А.",
				startsAt: new Date(Date.now() + 86400000).toISOString(), reason: "Консультация и прицельный снимок",
			},
			financialSummary: { formattedDebt: "0 ₽" },
		});
	}, [dashboard?.clinicSettings, activePatient]);

	const sender = useMobileMessageSender(
		selectedPatientId, () => {}, communicationChannelLabels, quickTemplates,
	);
	const thread = useMobileChatThread(selectedPatientId, sender.activeChannel, dashboard);

	// Connect chatMessages setter to sender
	sender.handleSendMessage = useMobileMessageSender(
		selectedPatientId, thread.setChatMessages, communicationChannelLabels, quickTemplates,
	).handleSendMessage;

	const handleSelectDialog = useCallback((dialog: MobilePatientDialogSummary) => {
		setSelectedPatientId(dialog.patientId);
		sender.setActiveChannel(dialog.channel === "max" ? "whatsapp" : dialog.channel);
	}, [sender]);

	return {
		activeSection, setActiveSection,
		channelFilter: feed.channelFilter, setChannelFilter: feed.setChannelFilter,
		searchQuery: feed.searchQuery, setSearchQuery: feed.setSearchQuery,
		isSearchOpen: feed.isSearchOpen, setIsSearchOpen: feed.setIsSearchOpen,
		selectedPatientId, setSelectedPatientId,
		serverDialogs: feed.serverDialogs, filteredDialogs: feed.filteredDialogs,
		chatMessages: thread.chatMessages, isFetchingChat: thread.isFetchingChat,
		isCurrentMobileIntercepted: thread.isCurrentMobileIntercepted,
		handleMobileTakeoverChat: thread.handleMobileTakeoverChat,
		messagesEndRef: thread.messagesEndRef,
		inputText: sender.inputText, setInputText: sender.setInputText,
		activeChannel: sender.activeChannel, setActiveChannel: sender.setActiveChannel,
		attachedFileName: sender.attachedFileName, setAttachedFileName: sender.setAttachedFileName,
		isSendingMessage: sender.isSendingMessage,
		handleSendMessage: sender.handleSendMessage, handleToggleChannel: sender.handleToggleChannel,
		handleAttachFile: sender.handleAttachFile, handleRemoveAttachedFile: sender.handleRemoveAttachedFile,
		handleApplyTemplate: sender.handleApplyTemplate, textareaRef: sender.textareaRef,
		activePatient, quickTemplates, handleSelectDialog,
		communicationTasks: dashboard?.communicationTasks ?? [],
		communicationEvents: dashboard?.communicationEvents ?? [],
	};
}
