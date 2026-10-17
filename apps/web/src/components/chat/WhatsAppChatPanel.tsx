import { useWhatsAppChatLogic } from "./useWhatsAppChatLogic";
import { WhatsAppChatHeader } from "./WhatsAppChatHeader";
import { WhatsAppQuickBar } from "./WhatsAppQuickBar";
import { WhatsAppMessageList } from "./WhatsAppMessageList";
import { WhatsAppInputBar } from "./WhatsAppInputBar";

export interface ChatMessage {
	id: string;
	sender: "clinic" | "patient" | "system";
	senderName?: string;
	text: string;
	timestamp: string;
	status?: "sent" | "delivered" | "read" | "failed";
	mediaUrl?: string;
	mediaType?: "image" | "document" | "audio";
	quickActionPayload?: string;
}

export interface WhatsAppChatPanelProps {
	patientId?: string | null;
	patientPhone?: string | null;
	patientName?: string | null;
	onClose?: () => void;
	className?: string;
}

/**
 * WhatsApp & Patient Communications Chat Panel (Canonical Decomposed Coordinator)
 * Strict Mandate 8k (No procedural status simulators, no fake timers)
 * Strict Mandate 8e (Doctor & Staff autonomy, zero misleading fake states)
 * Strict Mandate 8b (All modular components strictly <= 250 lines)
 */
export function WhatsAppChatPanel(props: WhatsAppChatPanelProps) {
	const { onClose, className = "" } = props;
	const {
		patient,
		effectivePhone,
		effectiveName,
		formattedPhone,
		initials,
		avatarColors,
		financialSummary,
		upcomingAppointment,
		isLoading,
		isSending,
		selectedChannel,
		setSelectedChannel,
		inputText,
		setInputText,
		searchQuery,
		setSearchQuery,
		isSearchOpen,
		setIsSearchOpen,
		selectedChipTemplate,
		messagesEndRef,
		textareaRef,
		quickTemplates,
		fetchThread,
		handleApplyTemplate,
		handleDirectSendTemplate,
		handleSendMessage,
		handleLaunchWhatsAppNative,
		handleCallPatient,
		filteredMessages,
	} = useWhatsAppChatLogic(props);

	return (
		<div
			className={`flex flex-col h-full w-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none shadow-xl overflow-hidden overflow-x-clip max-w-full font-sans ${className}`}
			data-testid="whatsapp-chat-panel"
		>
			<WhatsAppChatHeader
				effectiveName={effectiveName}
				formattedPhone={formattedPhone}
				effectivePhone={effectivePhone}
				initials={initials}
				avatarColors={avatarColors}
				isPatient={!!patient}
				selectedChannel={selectedChannel}
				isLoading={isLoading}
				isSearchOpen={isSearchOpen}
				searchQuery={searchQuery}
				onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
				onSearchChange={setSearchQuery}
				onClearSearch={() => setSearchQuery("")}
				onRefresh={fetchThread}
				onCallPatient={handleCallPatient}
				onLaunchWhatsAppNative={handleLaunchWhatsAppNative}
				onClose={onClose}
				upcomingAppointment={upcomingAppointment}
				financialSummary={financialSummary}
			/>

			<WhatsAppQuickBar
				selectedChannel={selectedChannel}
				onSelectChannel={setSelectedChannel}
				quickTemplates={quickTemplates}
				selectedChipTemplate={selectedChipTemplate}
				isSending={isSending}
				onApplyTemplate={handleApplyTemplate}
				onDirectSendTemplate={handleDirectSendTemplate}
			/>

			<WhatsAppMessageList
				messages={filteredMessages}
				isLoading={isLoading}
				searchQuery={searchQuery}
				effectiveName={effectiveName}
				quickTemplates={quickTemplates}
				onApplyTemplate={handleApplyTemplate}
				onClearSearch={() => setSearchQuery("")}
				messagesEndRef={messagesEndRef}
			/>

			<WhatsAppInputBar
				inputText={inputText}
				isSending={isSending}
				onChangeText={setInputText}
				onSendMessage={() => void handleSendMessage()}
				textareaRef={textareaRef}
			/>
		</div>
	);
}
