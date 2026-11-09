import { useCallback, useMemo, useState } from "react";
import {
	calculatePatientFinancialStatus,
	resolvePatientUpcomingAppointment,
} from "../../../store/telephonyStore";
import { buildQuickTemplates } from "../../chat/whatsAppChatTemplates";
import { executeBookAppointmentFromChat } from "../bookFromChatAutonomy";
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

	const patientObj = useMemo(() => {
		if (!selectedPatientId || !dashboard?.patients) return null;
		return dashboard.patients.find((p) => p.id === selectedPatientId) || null;
	}, [selectedPatientId, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!selectedPatientId || !dashboard?.patientInsights) return null;
		return dashboard.patientInsights.find((pi) => pi.patientId === selectedPatientId) || null;
	}, [selectedPatientId, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			patientObj,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [patientObj, patientInsight, dashboard?.insuranceContracts]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			selectedPatientId,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [selectedPatientId, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const activeTreatmentPlan = useMemo(() => {
		if (patientInsight?.treatmentPlanTitle) {
			return {
				title: patientInsight.treatmentPlanTitle,
				totalRub: patientInsight.treatmentPlanTotalRub || "0",
			};
		}
		return null;
	}, [patientInsight]);

	const quickTemplates = useMemo(() => {
		return buildQuickTemplates({
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || "клинику DENTE",
			clinicAddress: dashboard?.clinicSettings?.profile?.address || "г. Москва, ул. Арбат, 24",
			clinicPhone: dashboard?.clinicSettings?.profile?.phone || "+7 (495) 123-45-67",
			effectiveName: activePatient?.fullName || "Пациент",
			upcomingAppointment,
			financialSummary: { formattedDebt: financialSummary?.formattedDebt || "0 ₽" },
			activeTreatmentPlan,
		});
	}, [
		dashboard?.clinicSettings,
		activePatient,
		upcomingAppointment,
		financialSummary,
		activeTreatmentPlan,
	]);

	const sender = useMobileMessageSender(
		selectedPatientId, () => {}, communicationChannelLabels, quickTemplates,
	);
	const thread = useMobileChatThread(selectedPatientId, sender.activeChannel, dashboard);

	sender.handleSendMessage = useMobileMessageSender(
		selectedPatientId, thread.setChatMessages, communicationChannelLabels, quickTemplates,
	).handleSendMessage;

	const handleSelectDialog = useCallback((dialog: MobilePatientDialogSummary) => {
		setSelectedPatientId(dialog.patientId);
		sender.setActiveChannel(dialog.channel === "max" ? "whatsapp" : dialog.channel);
	}, [sender]);

	const handleQuickBook = useCallback(() => {
		if (activePatient) executeBookAppointmentFromChat(activePatient, dashboard);
	}, [activePatient, dashboard]);

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
		handleAttachFile: sender.handleAttachFile, handleFileChange: sender.handleFileChange,
		fileInputRef: sender.fileInputRef, handleRemoveAttachedFile: sender.handleRemoveAttachedFile,
		handleApplyTemplate: sender.handleApplyTemplate, textareaRef: sender.textareaRef,
		activePatient, quickTemplates, handleSelectDialog, handleQuickBook,
		communicationTasks: dashboard?.communicationTasks ?? [],
		communicationEvents: dashboard?.communicationEvents ?? [],
	};
}
