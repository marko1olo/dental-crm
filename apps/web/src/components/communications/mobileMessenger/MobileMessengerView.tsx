import React from "react";
import { OmnichannelOperatorDesk } from "../../chat/OmnichannelOperatorDesk";
import { DialogsFeedView } from "./DialogsFeedView";
import { FullscreenChatView } from "./FullscreenChatView";
import { MessengerHeaderBar } from "./MessengerHeaderBar";
import { MobileJournalSection } from "./MobileJournalSection";
import { MobileTasksSection } from "./MobileTasksSection";
import type { MobileCommunicationsMessengerProps } from "./types";
import type { useMobileMessengerLogic } from "./useMobileMessengerLogic";

export interface MobileMessengerViewProps {
	props: MobileCommunicationsMessengerProps;
	logic: ReturnType<typeof useMobileMessengerLogic>;
}

export const MobileMessengerView: React.FC<MobileMessengerViewProps> = ({ props, logic }) => {
	const { onGoToSchedule } = props;

	return (
		<div className="mobile-messenger-root" data-testid="mobile-communications-messenger">
			<MessengerHeaderBar
				activeSection={logic.activeSection} setActiveSection={logic.setActiveSection}
				dialogsCount={logic.serverDialogs.length} tasksCount={logic.communicationTasks.length}
				eventsCount={logic.communicationEvents.length} isSearchOpen={logic.isSearchOpen}
				setIsSearchOpen={logic.setIsSearchOpen} onGoToSchedule={onGoToSchedule}
			/>

			{logic.activeSection === "dialogs" && (
				<DialogsFeedView
					isSearchOpen={logic.isSearchOpen} searchQuery={logic.searchQuery}
					setSearchQuery={logic.setSearchQuery} channelFilter={logic.channelFilter}
					setChannelFilter={logic.setChannelFilter} filteredDialogs={logic.filteredDialogs}
					onSelectDialog={logic.handleSelectDialog}
				/>
			)}

			{logic.activeSection === "tasks" && (
				<MobileTasksSection tasks={logic.communicationTasks} props={props} />
			)}

			{logic.activeSection === "journal" && (
				<MobileJournalSection events={logic.communicationEvents} props={props} />
			)}

			{logic.activeSection === "bots" && (
				<main className="p-2 pb-24" data-testid="mobile-bots-operator-section">
					<OmnichannelOperatorDesk />
				</main>
			)}

			{logic.selectedPatientId && logic.activePatient && (
				<FullscreenChatView
					activePatient={logic.activePatient} activeChannel={logic.activeChannel}
					isCurrentMobileIntercepted={logic.isCurrentMobileIntercepted}
					onBack={() => logic.setSelectedPatientId(null)} onTakeover={logic.handleMobileTakeoverChat}
					onQuickBook={logic.handleQuickBook}
					chatMessages={logic.chatMessages} messagesEndRef={logic.messagesEndRef}
					quickTemplates={logic.quickTemplates} onApplyTemplate={logic.handleApplyTemplate}
					inputText={logic.inputText} setInputText={logic.setInputText}
					onToggleChannel={logic.handleToggleChannel} attachedFileName={logic.attachedFileName}
					onAttachFile={logic.handleAttachFile} onRemoveAttachedFile={logic.handleRemoveAttachedFile}
					onSendMessage={logic.handleSendMessage} isSendingMessage={logic.isSendingMessage}
					textareaRef={logic.textareaRef}
				/>
			)}
		</div>
	);
};
