import React from "react";
import type { QuickTemplateItem } from "../../chat/whatsAppChatTemplates";
import { ChatTopBar } from "./ChatTopBar";
import { MessageBubbleList } from "./MessageBubbleList";
import { QuickReplyChipsBar } from "./QuickReplyChipsBar";
import { MessageInputFloatingBar } from "./MessageInputFloatingBar";
import type { ActivePatient, ChatChannel, MobileChatMessageItem } from "./types";

export interface FullscreenChatViewProps {
	activePatient: ActivePatient;
	activeChannel: ChatChannel;
	isCurrentMobileIntercepted: boolean;
	onBack: () => void;
	onTakeover: () => void;
	chatMessages: MobileChatMessageItem[];
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	quickTemplates: QuickTemplateItem[];
	onApplyTemplate: (tmpl: QuickTemplateItem) => void;
	inputText: string;
	setInputText: React.Dispatch<React.SetStateAction<string>>;
	onToggleChannel: () => void;
	attachedFileName: string | null;
	onAttachFile: () => void;
	onRemoveAttachedFile: () => void;
	onSendMessage: () => void | Promise<void>;
	isSendingMessage: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const FullscreenChatView: React.FC<FullscreenChatViewProps> = ({
	activePatient,
	activeChannel,
	isCurrentMobileIntercepted,
	onBack,
	onTakeover,
	chatMessages,
	messagesEndRef,
	quickTemplates,
	onApplyTemplate,
	inputText,
	setInputText,
	onToggleChannel,
	attachedFileName,
	onAttachFile,
	onRemoveAttachedFile,
	onSendMessage,
	isSendingMessage,
	textareaRef,
}) => {
	return (
		<div
			className="mobile-chat-fullscreen animate-in slide-in-from-right duration-200"
			data-testid="mobile-chat-fullscreen"
		>
			<ChatTopBar
				activePatient={activePatient}
				activeChannel={activeChannel}
				isCurrentMobileIntercepted={isCurrentMobileIntercepted}
				onBack={onBack}
				onTakeover={onTakeover}
			/>

			<MessageBubbleList
				chatMessages={chatMessages}
				isCurrentMobileIntercepted={isCurrentMobileIntercepted}
				onTakeover={onTakeover}
				messagesEndRef={messagesEndRef}
			/>

			<QuickReplyChipsBar
				quickTemplates={quickTemplates}
				onApplyTemplate={onApplyTemplate}
			/>

			<MessageInputFloatingBar
				inputText={inputText}
				setInputText={setInputText}
				activeChannel={activeChannel}
				onToggleChannel={onToggleChannel}
				attachedFileName={attachedFileName}
				onAttachFile={onAttachFile}
				onRemoveAttachedFile={onRemoveAttachedFile}
				onSendMessage={onSendMessage}
				isSendingMessage={isSendingMessage}
				textareaRef={textareaRef}
			/>
		</div>
	);
};
