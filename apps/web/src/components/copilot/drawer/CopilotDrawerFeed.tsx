import React from "react";
import { ProactiveAlertCardView } from "../CopilotGenerativeCards";
import { CopilotMessage } from "../CopilotMessage";
import { CopilotSuggestions } from "../CopilotSuggestions";
import type {
	BookSlotHandler,
	ConfirmHandler,
	CopilotUiMessage,
	ProactiveAlertCardData,
	SelectIdHandler,
} from "../copilotTypes";

interface CopilotDrawerFeedProps {
	messages: CopilotUiMessage[];
	nameCache: Record<string, string>;
	proactiveAlerts?: ProactiveAlertCardData[] | undefined;
	onConfirm: ConfirmHandler;
	onSelectPatient?: SelectIdHandler;
	onSelectAppointment?: SelectIdHandler;
	onBookSlot?: BookSlotHandler;
	onSendPrompt: (prompt: string) => void;
	onDismissProactiveAlert?: ((alertId: string) => void) | undefined;
}

export const CopilotDrawerFeed: React.FC<CopilotDrawerFeedProps> = ({
	messages,
	nameCache,
	proactiveAlerts = [],
	onConfirm,
	onSelectPatient,
	onSelectAppointment,
	onBookSlot,
	onSendPrompt,
	onDismissProactiveAlert,
}) => {
	const criticalAlerts = proactiveAlerts.filter(
		(a) => a.urgency === "CRITICAL" || a.urgency === "URGENT",
	);

	return (
		<>
			{criticalAlerts.map((alert) => (
				<ProactiveAlertCardView
					key={alert.id}
					alert={alert}
					onDismiss={onDismissProactiveAlert}
					onSendPrompt={onSendPrompt}
				/>
			))}

			{messages.length === 0 ? (
				<CopilotSuggestions onPick={onSendPrompt} />
			) : (
				messages.map((msg, idx) => (
					<CopilotMessage
						key={idx}
						message={msg}
						nameCache={nameCache}
						onConfirm={onConfirm}
						onSelectPatient={onSelectPatient}
						onSelectAppointment={onSelectAppointment}
						onBookSlot={onBookSlot}
					/>
				))
			)}
		</>
	);
};
