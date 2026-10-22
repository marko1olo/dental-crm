import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { MobileViewMode } from "./types";
import { useStaffChannels } from "./useStaffChannels";
import { useStaffIntercomActions } from "./useStaffIntercomActions";
import { useStaffMessages } from "./useStaffMessages";

interface UseStaffMessengerOptions {
	cabinetNumber?: string;
}

export function useStaffMessenger({ cabinetNumber = "Каб. 1" }: UseStaffMessengerOptions = {}) {
	const [mobileView, setMobileView] = useState<MobileViewMode>("channels");

	const chState = useStaffChannels(cabinetNumber);
	const msgState = useStaffMessages(chState.channels, chState.activeChannelId);
	const actState = useStaffIntercomActions(
		chState.channels, chState.setChannels, chState.activeChannelId,
		chState.setActiveChannelId, msgState.setMessages, chState.selectedLocation, setMobileView,
	);

	useEffect(() => {
		void chState.loadLocations();
		void chState.loadChannels();
		void chState.loadMembers();
	}, []);

	useEffect(() => {
		if (chState.activeChannelId) void msgState.loadMessages(chState.activeChannelId);
	}, [chState.activeChannelId]);

	useEffect(() => {
		if (msgState.messagesEndRef.current?.parentElement) {
			msgState.messagesEndRef.current.parentElement.scrollTop = msgState.messagesEndRef.current.parentElement.scrollHeight;
		}
	}, [msgState.messages]);

	const activeChannel = useMemo(
		() => chState.channels.find((c) => c.id === chState.activeChannelId),
		[chState.channels, chState.activeChannelId],
	);

	const markChannelAsRead = (channelId: string) => {
		chState.setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
	};

	return {
		channels: chState.channels, setChannels: chState.setChannels,
		activeChannelId: chState.activeChannelId, setActiveChannelId: chState.setActiveChannelId,
		activeChannel, messages: msgState.messages, setMessages: msgState.setMessages,
		members: chState.members, locations: chState.locations,
		messageText: msgState.messageText, setMessageText: msgState.setMessageText,
		selectedLocation: chState.selectedLocation, setSelectedLocation: chState.setSelectedLocation,
		isLoading: chState.isLoading, isSending: msgState.isSending,
		mobileView, setMobileView,
		quickNotePrompt: actState.quickNotePrompt, setQuickNotePrompt: actState.setQuickNotePrompt,
		quickNoteText: actState.quickNoteText, setQuickNoteText: actState.setQuickNoteText,
		messagesEndRef: msgState.messagesEndRef, inputRef: msgState.inputRef,
		loadLocations: chState.loadLocations, loadChannels: chState.loadChannels,
		loadMembers: chState.loadMembers, loadMessages: msgState.loadMessages,
		markChannelAsRead, handleSendMessage: msgState.handleSendMessage,
		handleIntercomPing: actState.handleIntercomPing, handleIntercomAck: actState.handleIntercomAck,
		handleOpenDirectChat: actState.handleOpenDirectChat,
	};
}
