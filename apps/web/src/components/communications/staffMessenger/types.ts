import type {
	DEFAULT_CLINIC_CHANNELS,
	INTERCOM_PRESETS,
	IntercomAck,
	IntercomLocationItem,
	IntercomPresetKey,
	PatientCardAttachment,
	StaffChatChannel,
	StaffChatMessage,
	StaffMemberPresenceItem,
} from "@dental/shared";
import type React from "react";

export type {
	DEFAULT_CLINIC_CHANNELS,
	INTERCOM_PRESETS,
	IntercomAck,
	IntercomLocationItem,
	IntercomPresetKey,
	PatientCardAttachment,
	StaffChatChannel,
	StaffChatMessage,
	StaffMemberPresenceItem,
};

export type MobileViewMode = "channels" | "chat";

export type IntercomAckType = "on_my_way" | "coming_soon" | "busy_reassigned";

export interface StaffMessengerPanelProps {
	onOpenPatientCard?: (patientId: string) => void;
	cabinetNumber?: string;
}

export interface StaffChatSidebarProps {
	channels: StaffChatChannel[];
	activeChannelId: string | null;
	members: StaffMemberPresenceItem[];
	mobileView: MobileViewMode;
	onSelectChannel: (channelId: string) => void;
	onOpenDirectChat: (targetUserId: string) => void;
	onPlayChimeTest: () => void;
}

export interface StaffChatHeaderProps {
	activeChannel: StaffChatChannel | undefined;
	selectedLocation: string;
	locations: IntercomLocationItem[];
	onBackToChannels: () => void;
	onLocationChange: (locationName: string) => void;
}

export interface StaffChatPresetsBarProps {
	onIntercomPing: (presetKey: IntercomPresetKey, customNote?: string) => void;
}

export interface StaffChatThreadProps {
	messages: StaffChatMessage[];
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	onIntercomAck: (messageId: string, ackType: IntercomAckType) => void;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export interface StaffChatInputProps {
	inputRef: React.RefObject<HTMLInputElement | null>;
	messageText: string;
	isSending: boolean;
	activeChannelName?: string | undefined;
	onChangeMessageText: (text: string) => void;
	onSendMessage: (e?: React.FormEvent) => void;
}
