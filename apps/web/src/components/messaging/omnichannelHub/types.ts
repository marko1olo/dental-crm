import type React from "react";
import type {
	InteractiveButtonPayload,
	MessageAttachment,
	NpsMetrics,
	NpsReview,
	NpsReviewStatus,
	OmnichannelChannel,
	OmnichannelChannelFilter,
	OmnichannelMessage,
	OmnichannelTemplate,
	PatientOmnichannelContact,
	SbpPaymentInvoice,
} from "../omnichannelTypes.js";

export type OmnichannelTab = "chat" | "templates" | "nps";

export interface PatientOmnichannelHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly onSendMessage?: ((message: OmnichannelMessage) => Promise<void> | void) | undefined;
	readonly portal?: boolean | undefined;
}

export interface OmnichannelHeaderProps {
	readonly titleId: string;
	readonly activeTab: OmnichannelTab;
	readonly setActiveTab: (tab: OmnichannelTab) => void;
	readonly unreadCount: number;
	readonly criticalPendingCount: number;
	readonly npsScore: number;
	readonly averageScore: number;
	readonly onClose: () => void;
}

export interface OmnichannelFooterProps {
	readonly inputChannel: OmnichannelChannel;
	readonly setInputChannel: (ch: OmnichannelChannel) => void;
	readonly messageText: string;
	readonly setMessageText: (text: string) => void;
	readonly selectedTemplateCategory: string;
	readonly setSelectedTemplateCategory: (cat: string) => void;
	readonly isSending: boolean;
	readonly selectedContactName: string;
	readonly onSendMessage: () => void;
	readonly onAttachFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onApplyTemplate: (tpl: OmnichannelTemplate) => void;
}

export interface OmnichannelModalFooterProps {
	readonly onClose: () => void;
}

export interface OmnichannelChatTabProps {
	readonly hub: import("./useOmnichannelHubState.js").UseOmnichannelHubStateReturn;
}

export type {
	InteractiveButtonPayload,
	MessageAttachment,
	NpsMetrics,
	NpsReview,
	NpsReviewStatus,
	OmnichannelChannel,
	OmnichannelChannelFilter,
	OmnichannelMessage,
	OmnichannelTemplate,
	PatientOmnichannelContact,
	SbpPaymentInvoice,
};
