import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { CopilotComposer } from "./CopilotComposer";
import { CopilotChatPanel } from "./CopilotChatPanel";
import { useCopilotContextSync } from "./CopilotContextSync";
import { CopilotNudges } from "./CopilotNudges";
import { CopilotDrawerHeader } from "./drawer/CopilotDrawerHeader";
import { CopilotDrawerContextBar } from "./drawer/CopilotDrawerContextBar";
import { CopilotDrawerTabs } from "./drawer/CopilotDrawerTabs";
import { CopilotDrawerFeed } from "./drawer/CopilotDrawerFeed";
import { CopilotDrawerTasksTab } from "./drawer/CopilotDrawerTasksTab";
import { CopilotDrawerPlaybooks } from "./drawer/CopilotDrawerPlaybooks";
import { useCopilotDrawerDebts } from "./drawer/useCopilotDrawerDebts";
import type { CopilotDrawerProps } from "./drawer/drawerTypes";

export type { CopilotDrawerProps };

export const CopilotDrawer: React.FC<CopilotDrawerProps> = (props) => {
	const {
		isOpen, messages, busy, phase, pending, nameCache, nudges,
		proactiveAlerts = [], whatsappHitLCards = [], activeTab, onTabChange,
		onClose, onSend, onConfirm, onReset, onDismissNudge, onDismissProactiveAlert,
		onApproveWhatsApp, onRejectWhatsApp, onSelectPatient, onSelectAppointment, onBookSlot,
	} = props;

	const { context: uiContext, enrichMessage } = useCopilotContextSync();
	const [input, setInput] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
	const feedRef = useRef<HTMLDivElement>(null);

	const handleInputChange = (val: string) => {
		setInput(val);
		if (val.trim()) safeLocalStorageSetItem("dente_copilot_draft_text", val);
		else safeLocalStorageRemoveItem("dente_copilot_draft_text");
	};

	const handleReset = () => {
		setInput("");
		safeLocalStorageRemoveItem("dente_copilot_draft_text");
		onReset();
	};

	const handleSendEnriched = (text: string) => {
		if (!text.trim() || busy) return;
		onSend(enrichMessage(text));
	};

	const handleSubmit = () => {
		if (!input.trim() || busy) return;
		handleSendEnriched(input.trim());
		setInput("");
		safeLocalStorageRemoveItem("dente_copilot_draft_text");
	};

	useEffect(() => {
		if (isOpen && activeTab === "chat" && feedRef.current) {
			feedRef.current.scrollTop = feedRef.current.scrollHeight;
		}
	}, [isOpen, messages, activeTab]);

	const storeDashboard = useAppStore((s) => s.dashboard);
	const { shiftDebtRecalls, shiftDebtEstimates, totalEstimatesSumRub } = useCopilotDrawerDebts(storeDashboard);

	if (!isOpen) return null;

	const pendingConfirmCount = pending ? 1 : messages.filter((m) => m.kind === "confirmation" && !m.resolved).length;
	const pendingHitLCount = whatsappHitLCards?.filter((c) => c.status === "pending").length ?? 0;
	const pendingAlertCount = proactiveAlerts?.filter((a) => a.urgency === "CRITICAL" || a.urgency === "URGENT").length ?? 0;
	const totalTasksCount = pendingConfirmCount + pendingHitLCount + pendingAlertCount + shiftDebtRecalls.length + shiftDebtEstimates.length;

	const content = (
		<>
			<div
				className="copilot-drawer-backdrop"
				onClick={onClose}
				aria-hidden="true"
				data-testid="copilot-drawer-backdrop"
			/>
			<aside className="copilot-drawer open" aria-label="ДЕНТА — Клинический ассистент">
				<CopilotDrawerHeader busy={busy} phase={phase} onClose={onClose} onReset={handleReset} />
				<CopilotDrawerContextBar uiContext={uiContext} />
				<CopilotDrawerTabs activeTab={activeTab} onTabChange={onTabChange} messagesCount={messages.length} totalTasksCount={totalTasksCount} />
				<CopilotNudges nudges={nudges} onDismiss={onDismissNudge} onAct={handleSendEnriched} />
				<div className="copilot-feed" ref={feedRef}>
					{activeTab === "chat" ? (
						<CopilotDrawerFeed
							messages={messages} nameCache={nameCache} proactiveAlerts={proactiveAlerts}
							onConfirm={onConfirm} onSelectPatient={onSelectPatient} onSelectAppointment={onSelectAppointment}
							onBookSlot={onBookSlot} onSendPrompt={handleSendEnriched} onDismissProactiveAlert={onDismissProactiveAlert}
						/>
					) : (
						<CopilotDrawerTasksTab
							totalEstimatesSumRub={totalEstimatesSumRub} shiftDebtRecalls={shiftDebtRecalls} shiftDebtEstimates={shiftDebtEstimates}
							pending={pending} nameCache={nameCache} whatsappHitLCards={whatsappHitLCards} proactiveAlerts={proactiveAlerts}
							onConfirm={onConfirm} onBookSlot={onBookSlot} onSendPrompt={handleSendEnriched}
							onDismissProactiveAlert={onDismissProactiveAlert} onApproveWhatsApp={onApproveWhatsApp} onRejectWhatsApp={onRejectWhatsApp}
						/>
					)}
				</div>
				{activeTab === "chat" && <CopilotDrawerPlaybooks onSendPrompt={handleSendEnriched} />}
				<CopilotComposer value={input} busy={busy} onChange={handleInputChange} onSubmit={handleSubmit} onReset={handleReset} patientId={uiContext.patientId ?? null} />
				<div className="hidden" data-testid="copilot-chat-panel-container">
					<CopilotChatPanel {...props} embedMode={true} />
				</div>
			</aside>
		</>
	);

	if (typeof document !== "undefined" && document.body) return createPortal(content, document.body);
	return content;
};
export default CopilotDrawer;
