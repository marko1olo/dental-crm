import React from "react";
import { MessageSquare } from "lucide-react";
import { ChannelConversationList } from "./ChannelConversationList";
import { LinkPatientModal } from "./LinkPatientModal";
import { OperatorInputBar } from "./OperatorInputBar";
import { OperatorMessageStream } from "./OperatorMessageStream";
import { QuickBookingModal } from "./QuickBookingModal";
import { QuickRepliesDrawer } from "./QuickRepliesDrawer";
import type { OmnichannelOperatorDeskProps } from "./types";
import type { UseOmnichannelOperatorDeskReturn } from "./useOmnichannelOperatorDesk";

export interface OmnichannelOperatorDeskViewProps extends OmnichannelOperatorDeskProps {
	desk: UseOmnichannelOperatorDeskReturn;
}

export function OmnichannelOperatorDeskView({
	className = "",
	onOpenPatientCard,
	desk,
}: OmnichannelOperatorDeskViewProps) {
	const {
		conversations,
		filteredConversations,
		selectedKey,
		isLoadingList,
		channelFilter,
		statusFilter,
		searchQuery,
		isMobileThreadOpen,
		activeConv,
		messages,
		isLoadingMessages,
		inputText,
		isSending,
		operatorName,
		messagesEndRef,
		isQuickBookingOpen,
		bookingDate,
		bookingTime,
		bookingReason,
		bookingDoctorId,
		bookingSendConfirmation,
		isBookingSubmitting,
		doctorsList,
		isLinkPatientModalOpen,
		newPatientFullName,
		newPatientPhone,
		isLinkingSubmitting,
		setSelectedKey,
		setIsMobileThreadOpen,
		fetchConversations,
		handleSimulateIncoming,
		setChannelFilter,
		setStatusFilter,
		setSearchQuery,
		handleOpenQuickBooking,
		handleOpenLinkPatient,
		handleTakeover,
		handleRelease,
		handleSendMessage,
		setInputText,
		setOperatorName,
		setIsQuickBookingOpen,
		setBookingDate,
		setBookingTime,
		setBookingReason,
		setBookingDoctorId,
		setBookingSendConfirmation,
		handleQuickBookingSubmit,
		setIsLinkPatientModalOpen,
		setNewPatientFullName,
		setNewPatientPhone,
		handleLinkPatientSubmit,
	} = desk;

	return (
		<div
			className={`flex flex-col md:flex-row h-[calc(100vh-230px)] min-h-[520px] md:h-[780px] w-full rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm overflow-hidden text-[var(--ink,#0f172a)] ${className}`}
			data-testid="omnichannel-operator-desk"
		>
			{/* ════════════ LEFT COLUMN: CONVERSATION LIST ════════════ */}
			<ChannelConversationList
				conversations={conversations}
				filteredConversations={filteredConversations}
				selectedKey={selectedKey}
				isLoadingList={isLoadingList}
				channelFilter={channelFilter}
				statusFilter={statusFilter}
				searchQuery={searchQuery}
				isMobileThreadOpen={isMobileThreadOpen}
				onSelectConversation={(key) => {
					setSelectedKey(key);
					setIsMobileThreadOpen(true);
				}}
				onRefresh={fetchConversations}
				onSimulateIncoming={handleSimulateIncoming}
				onSetChannelFilter={setChannelFilter}
				onSetStatusFilter={setStatusFilter}
				onSetSearchQuery={setSearchQuery}
			/>

			{/* ════════════ RIGHT COLUMN: CHAT WINDOW ════════════ */}
			<div
				className={`flex-1 min-h-0 flex flex-col bg-[var(--paper,#ffffff)] ${
					!isMobileThreadOpen ? "hidden md:flex" : "flex"
				} overflow-hidden`}
			>
				{activeConv ? (
					<>
						<OperatorMessageStream
							activeConv={activeConv}
							messages={messages}
							isLoadingMessages={isLoadingMessages}
							operatorName={operatorName}
							messagesEndRef={messagesEndRef}
							onCloseMobileThread={() => setIsMobileThreadOpen(false)}
							onOpenPatientCard={onOpenPatientCard}
							onOpenQuickBooking={handleOpenQuickBooking}
							onOpenLinkPatient={handleOpenLinkPatient}
							onTakeover={handleTakeover}
							onRelease={handleRelease}
						/>

						{/* Quick Response Clinical Templates */}
						<QuickRepliesDrawer onSelectReply={handleSendMessage} />

						{/* Bottom Send Bar */}
						<OperatorInputBar
							inputText={inputText}
							isSending={isSending}
							operatorName={operatorName}
							onInputChange={setInputText}
							onOperatorNameChange={setOperatorName}
							onSendMessage={() => handleSendMessage()}
						/>
					</>
				) : (
					/* No Active Conversation Selected */
					<div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--muted,#64748b)] gap-3">
						<div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
							<MessageSquare size={32} />
						</div>
						<h3 className="font-bold text-base text-[var(--ink,#0f172a)]">
							Выберите диалог из списка слева
						</h3>
						<p className="text-xs max-w-sm">
							Все обращения пациентов из Telegram, ВКонтакте, WhatsApp и MAX попадают сюда в реальном времени. Вы можете перехватить диалог или позволить боту консультировать пациента автоматически.
						</p>
					</div>
				)}
			</div>

			{/* ════════════ MODAL: QUICK APPOINTMENT BOOKING (MANDATE 8e) ════════════ */}
			<QuickBookingModal
				isOpen={isQuickBookingOpen}
				activeConv={activeConv}
				bookingDate={bookingDate}
				bookingTime={bookingTime}
				bookingReason={bookingReason}
				bookingDoctorId={bookingDoctorId}
				bookingSendConfirmation={bookingSendConfirmation}
				isBookingSubmitting={isBookingSubmitting}
				doctorsList={doctorsList}
				onClose={() => setIsQuickBookingOpen(false)}
				onDateChange={setBookingDate}
				onTimeChange={setBookingTime}
				onReasonChange={setBookingReason}
				onDoctorIdChange={setBookingDoctorId}
				onSendConfirmationChange={setBookingSendConfirmation}
				onSubmit={handleQuickBookingSubmit}
			/>

			{/* ════════════ MODAL: LINK / CREATE PATIENT (MANDATE 8e) ════════════ */}
			<LinkPatientModal
				isOpen={isLinkPatientModalOpen}
				activeConv={activeConv}
				newPatientFullName={newPatientFullName}
				newPatientPhone={newPatientPhone}
				isLinkingSubmitting={isLinkingSubmitting}
				onClose={() => setIsLinkPatientModalOpen(false)}
				onFullNameChange={setNewPatientFullName}
				onPhoneChange={setNewPatientPhone}
				onSubmit={handleLinkPatientSubmit}
			/>
		</div>
	);
}
