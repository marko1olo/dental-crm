import type React from "react";
import { playIntercomChime } from "../../../lib/intercomSound";
import "../staffMessenger.css";
import { StaffChatHeader } from "./StaffChatHeader";
import { StaffChatInput, StaffChatPresetsBar } from "./StaffChatInput";
import { StaffChatSidebar } from "./StaffChatSidebar";
import { StaffChatThread } from "./StaffChatThread";
import type { StaffMessengerPanelProps } from "./types";
import { useStaffMessenger } from "./useStaffMessenger";

export const StaffMessengerPanel: React.FC<StaffMessengerPanelProps> = ({
	onOpenPatientCard,
	cabinetNumber = "Каб. 1",
}) => {
	const logic = useStaffMessenger({ cabinetNumber });

	return (
		<div
			className="staff-messenger-container flex flex-col md:flex-row h-[780px] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-2xl overflow-hidden shadow-xl"
			data-testid="staff-messenger-panel"
		>
			{/* Левая боковая панель: Каналы и коллеги */}
			<StaffChatSidebar
				channels={logic.channels}
				activeChannelId={logic.activeChannelId}
				members={logic.members}
				mobileView={logic.mobileView}
				onSelectChannel={(chId) => {
					logic.setActiveChannelId(chId);
					logic.setMobileView("chat");
				}}
				onOpenDirectChat={logic.handleOpenDirectChat}
				onPlayChimeTest={() => playIntercomChime("normal")}
			/>

			{/* Правая панель: Чат живого общения и интерком */}
			<div
				className={`flex-1 flex flex-col bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] ${
					logic.mobileView === "channels" ? "hidden md:flex" : "flex"
				}`}
			>
				{/* Шапка чата */}
				<StaffChatHeader
					activeChannel={logic.activeChannel}
					selectedLocation={logic.selectedLocation}
					locations={logic.locations}
					onBackToChannels={() => logic.setMobileView("channels")}
					onLocationChange={logic.setSelectedLocation}
				/>

				{/* 1-Click Chairside Intercom Presets (Быстрые сигналы у кресла) */}
				<StaffChatPresetsBar onIntercomPing={logic.handleIntercomPing} />

				{/* Лента живых сообщений */}
				<StaffChatThread
					messages={logic.messages}
					onOpenPatientCard={onOpenPatientCard}
					onIntercomAck={logic.handleIntercomAck}
					messagesEndRef={logic.messagesEndRef}
				/>

				{/* Панель живого ввода сообщения */}
				<StaffChatInput
					inputRef={logic.inputRef}
					messageText={logic.messageText}
					isSending={logic.isSending}
					activeChannelName={logic.activeChannel?.name}
					onChangeMessageText={logic.setMessageText}
					onSendMessage={logic.handleSendMessage}
				/>
			</div>
		</div>
	);
};

export default StaffMessengerPanel;

export * from "./StaffChatHeader";
export * from "./StaffChatInput";
export * from "./StaffChatSidebar";
export * from "./StaffChatThread";
export * from "./types";
export * from "./useStaffMessenger";
