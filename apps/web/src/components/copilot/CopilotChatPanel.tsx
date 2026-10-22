import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { CopilotComposer } from "./CopilotComposer";
import { useCopilotContextSync } from "./CopilotContextSync";
import { CopilotNudges } from "./CopilotNudges";
import { CopilotDrawerContextBar } from "./drawer/CopilotDrawerContextBar";
import { CopilotDrawerTabs } from "./drawer/CopilotDrawerTabs";
import { CopilotDrawerFeed } from "./drawer/CopilotDrawerFeed";
import { CopilotDrawerTasksTab } from "./drawer/CopilotDrawerTasksTab";
import { CopilotDrawerPlaybooks } from "./drawer/CopilotDrawerPlaybooks";
import { useCopilotDrawerDebts } from "./drawer/useCopilotDrawerDebts";
import type { CopilotDrawerProps } from "./drawer/drawerTypes";

export type CopilotChatPanelProps = Omit<CopilotDrawerProps, "isOpen" | "onClose" | "activeTab" | "onTabChange"> & {
	embedMode?: boolean;
	onDismissNudge?: (id: string) => void;
};

export const CopilotChatPanel: React.FC<CopilotChatPanelProps> = ({
	messages, busy, phase, pending, nameCache, nudges = [],
	proactiveAlerts = [], whatsappHitLCards = [], onSend, onConfirm,
	onReset, onDismissNudge, onDismissProactiveAlert, onApproveWhatsApp,
	onRejectWhatsApp, onSelectPatient, onSelectAppointment, onBookSlot,
	embedMode = false,
}) => {
	const { context: uiContext, enrichMessage } = useCopilotContextSync();
	const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");
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
		if (activeTab === "chat" && feedRef.current) {
			feedRef.current.scrollTop = feedRef.current.scrollHeight;
		}
	}, [messages, activeTab]);

	const storeDashboard = useAppStore((s) => s.dashboard);
	const { shiftDebtRecalls, shiftDebtEstimates, totalEstimatesSumRub } = useCopilotDrawerDebts(storeDashboard);

	const pendingConfirmCount = pending ? 1 : messages.filter((m) => m.kind === "confirmation" && !m.resolved).length;
	const pendingHitLCount = whatsappHitLCards?.filter((c) => c.status === "pending").length ?? 0;
	const pendingAlertCount = proactiveAlerts?.filter((a) => a.urgency === "CRITICAL" || a.urgency === "URGENT").length ?? 0;
	const totalTasksCount = pendingConfirmCount + pendingHitLCount + pendingAlertCount + shiftDebtRecalls.length + shiftDebtEstimates.length;

	return (
		<div className="copilot-chat-panel" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
			<div className="copilot-header" style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Sparkles size={16} className="text-[var(--teal)]" />
					<span style={{ fontWeight: 600, fontSize: "13px" }}>ДЕНТА Копилот</span>
					{busy && <Loader2 size={13} className="animate-spin text-[var(--teal)]" />}
				</div>
				<button type="button" onClick={handleReset} className="copilot-icon-btn" title="Очистить диалог">
					<RotateCcw size={14} />
				</button>
			</div>
			<CopilotDrawerContextBar uiContext={uiContext} />
			<CopilotDrawerTabs activeTab={activeTab} onTabChange={setActiveTab} messagesCount={messages.length} totalTasksCount={totalTasksCount} />
			{onDismissNudge && <CopilotNudges nudges={nudges} onDismiss={onDismissNudge} onAct={handleSendEnriched} />}
			<div className="copilot-feed" ref={feedRef} style={{ flex: 1, overflowY: "auto" }}>
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
		</div>
	);
};
