/**
 * OmnichannelChatView.tsx — Unified Omnichannel Messaging Center (Mandates 8b, 8e, 8n)
 * 1-click booking, sovereign SSOT communication, Apple HIG ergonomics.
 */

import React from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { executeBookAppointmentFromChat } from "../communications/bookFromChatAutonomy";
import { showToast } from "../GlobalToast";
import type { OmnichannelChannel } from "./types";
import {
	OmnichannelActiveChatHeader, OmnichannelChatHeader, OmnichannelConversationList,
	OmnichannelInputBar, OmnichannelMessageStream, OmnichannelQuickTemplatesBar,
	useOmnichannelChatState,
} from "./modules";

export interface OmnichannelChatViewProps {
	initialChannel?: OmnichannelChannel | "all" | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	onQuickBookAppointment?: ((patientId: string, patientName: string) => void) | undefined;
	className?: string | undefined;
}

export function OmnichannelChatView({
	initialChannel = "all", onOpenPatientCard, onQuickBookAppointment, className = "",
}: OmnichannelChatViewProps): React.JSX.Element {
	const state = useOmnichannelChatState(initialChannel);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const handleOpenCard = () => {
		if (!state.activeConv) return;
		if (state.activeConv.patientId) setSelectedPatientId(state.activeConv.patientId);
		if (onOpenPatientCard && state.activeConv.patientId) {
			onOpenPatientCard(state.activeConv.patientId);
		} else {
			useAppStore.getState().setCurrentView("patients");
			showToast(`Карта пациента: ${state.activeConv.patientName}`, "info");
		}
	};

	const handleBook = () => {
		if (!state.activeConv) return;
		if (onQuickBookAppointment && state.activeConv.patientId) {
			onQuickBookAppointment(state.activeConv.patientId, state.activeConv.patientName);
		} else {
			executeBookAppointmentFromChat({
				id: state.activeConv.patientId, fullName: state.activeConv.patientName,
				phone: state.activeConv.patientPhone,
			});
		}
	};

	return (
		<div
			className={`omnichannel-chat-root flex flex-col w-full h-full max-w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper-card)] text-[var(--ink)] shadow-lg ${className}`}
			data-testid="omnichannel-chat-root"
		>
			<OmnichannelChatHeader
				selectedChannel={state.selectedChannel} onSelectChannel={state.setSelectedChannel}
				mobileViewMode={state.mobileViewMode}
			/>
			<div className="flex-1 flex overflow-hidden relative">
				<OmnichannelConversationList
					conversations={state.filteredConversations} activeConversationId={state.activeConv?.id || null}
					searchQuery={state.searchQuery} onSearchChange={state.setSearchQuery}
					onSelectConversation={state.handleSelectConversation} mobileViewMode={state.mobileViewMode}
					isLoading={state.isConversationsLoading}
				/>
				<main
					aria-label="Окно активного диалога и сообщений"
					className={`flex-1 flex flex-col bg-[var(--paper)] overflow-hidden ${
						state.mobileViewMode === "list" ? "hidden sm:flex" : "flex"
					}`}
					data-testid="omnichannel-active-chat-pane"
				>
					{state.activeConv ? (
						<>
							<OmnichannelActiveChatHeader
								conversation={state.activeConv} onBackToList={() => state.setMobileViewMode("list")}
								onOpenCard={handleOpenCard} onQuickBook={handleBook}
							/>
							<OmnichannelMessageStream messages={state.activeMessages} isLoading={state.isThreadLoading} />
							<OmnichannelQuickTemplatesBar onApplyTemplate={state.handleApplyTemplate} />
							<OmnichannelInputBar
								draftText={state.draftText} onDraftChange={state.setDraftText}
								onSend={state.handleSend} channelName={state.activeConv.channel}
								inputRef={state.inputRef} isSending={state.isSending}
							/>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--muted)]">
							Выберите диалог из списка слева для начала общения
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

export default OmnichannelChatView;
