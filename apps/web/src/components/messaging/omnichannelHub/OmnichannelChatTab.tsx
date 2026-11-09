/**
 * OmnichannelChatTab.tsx — Координатор вкладки чата и омниканальной ленты.
 * Декомпозирован на микро-модули в соответствии с Мандатом 8b (<=120 строк).
 */

import React, { useState } from "react";
import { OmnichannelContactsSidebar } from "./chat/OmnichannelContactsSidebar.js";
import { OmnichannelChatHeader } from "./chat/OmnichannelChatHeader.js";
import { OmnichannelMessageFeed } from "./chat/OmnichannelMessageFeed.js";
import { QuickBookingDrawer } from "../../schedule/QuickBookingDrawer";
import { OmnichannelChatComposer } from "./OmnichannelChatComposer.js";
import type { OmnichannelChatTabProps } from "./types.js";

export const OmnichannelChatTab: React.FC<OmnichannelChatTabProps> = ({ hub }) => {
	const [mobileView, setMobileView] = useState<"contacts" | "chat">("chat");
	const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);

	return (
		<div className="hub-chat-workspace">
			<OmnichannelContactsSidebar
				contacts={hub.filteredContacts}
				selectedPatientId={hub.selectedPatientId}
				onSelectContact={(id) => {
					hub.setSelectedPatientId(id);
					setMobileView("chat");
				}}
				searchQuery={hub.patientSearchQuery}
				onSearchChange={hub.setPatientSearchQuery}
				isVisibleMobile={mobileView === "contacts"}
			/>

			<section className={`hub-active-chat-pane ${mobileView === "chat" ? "mobile-visible" : "mobile-hidden"}`}>
				<OmnichannelChatHeader
					selectedContact={hub.selectedContact}
					channelFilter={hub.channelFilter}
					setChannelFilter={hub.setChannelFilter}
					isIntercepted={hub.isCurrentPatientIntercepted}
					onTakeoverChat={hub.handleTakeoverChat}
					onOpenSbpModal={hub.handleOpenSbpModal}
					onOpenBooking={() => setIsBookingOpen(true)}
					onBackToContacts={() => setMobileView("contacts")}
				/>

				<OmnichannelMessageFeed
					messages={hub.currentThreadMessages}
					onInteractiveButtonClick={hub.handleInteractiveButtonClick}
				/>

				<OmnichannelChatComposer
					inputChannel={hub.inputChannel}
					setInputChannel={hub.setInputChannel}
					messageText={hub.messageText}
					setMessageText={hub.setMessageText}
					selectedTemplateCategory={hub.selectedTemplateCategory}
					setSelectedTemplateCategory={hub.setSelectedTemplateCategory}
					isSending={hub.isSending}
					selectedContactName={hub.selectedContact.fullName}
					onSendMessage={hub.handleSendMessage}
					onAttachFile={hub.handleAttachFile}
					onApplyTemplate={hub.handleApplyTemplate}
				/>

				{isBookingOpen && (
					<QuickBookingDrawer
						isOpen={isBookingOpen}
						onClose={() => setIsBookingOpen(false)}
						initialSlot={{
							patientId: hub.selectedContact.id,
							patientName: hub.selectedContact.fullName,
							patientPhone: hub.selectedContact.phone,
							reason: "Запись из чата",
						}}
						onAppointmentCreated={(appt) => {
							setIsBookingOpen(false);
							const dateFormatted = new Date(appt.startsAt).toLocaleString("ru-RU", {
								day: "numeric",
								month: "long",
								hour: "2-digit",
								minute: "2-digit",
							});
							hub.setMessageText(
								`Запись подтверждена на ${dateFormatted}. Ждём вас!`,
							);
						}}
					/>
				)}
			</section>
		</div>
	);
};
