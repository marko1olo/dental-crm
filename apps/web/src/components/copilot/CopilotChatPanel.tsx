import React, { useEffect, useRef, useState } from "react";
import {
	Activity,
	CheckSquare,
	Flame,
	Loader2,
	MessageSquare,
	RotateCcw,
	Sparkles,
	User,
	Zap,
} from "lucide-react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { CopilotComposer } from "./CopilotComposer";
import { CopilotActionConfirm } from "./CopilotActionConfirm";
import { useCopilotContextSync } from "./CopilotContextSync";
import {
	ProactiveAlertCardView,
	WhatsAppApprovalCardView,
} from "./CopilotGenerativeCards";
import { CopilotMessage } from "./CopilotMessage";
import { CopilotNudges } from "./CopilotNudges";
import { CopilotSuggestions } from "./CopilotSuggestions";
import type {
	BookSlotHandler,
	ConfirmHandler,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	SelectIdHandler,
	WhatsAppApprovalCard,
} from "./copilotTypes";

export interface CopilotChatPanelProps {
	messages: CopilotUiMessage[];
	busy: boolean;
	phase: CopilotPhase;
	pending: PendingConfirmation | null;
	nameCache: Record<string, string>;
	nudges?: CopilotNudge[] | undefined;
	proactiveAlerts?: ProactiveAlertCardData[] | undefined;
	whatsappHitLCards?: WhatsAppApprovalCard[] | undefined;
	onSend: (text: string) => void;
	onConfirm: ConfirmHandler;
	onReset: () => void;
	onDismissNudge?: ((id: string) => void) | undefined;
	onDismissProactiveAlert?: ((alertId: string) => void) | undefined;
	onApproveWhatsApp?: ((approvalId: string, modifiedReply?: string) => void) | undefined;
	onRejectWhatsApp?: ((approvalId: string, reason?: string) => void) | undefined;
	onSelectPatient?: SelectIdHandler | undefined;
	onSelectAppointment?: SelectIdHandler | undefined;
	onBookSlot?: BookSlotHandler | undefined;
	embedMode?: boolean | undefined;
}

const formatShortPatientName = (fullName?: string | null) => {
	if (!fullName) return null;
	const parts = fullName.trim().split(/\s+/);
	const p0 = parts[0];
	const p1 = parts[1];
	const p2 = parts[2];
	if (p0 && p1 && p2) {
		return `${p0} ${p1[0] ?? ""}.${p2[0] ?? ""}.`;
	}
	if (p0 && p1) {
		return `${p0} ${p1[0] ?? ""}.`;
	}
	return fullName;
};

export const CopilotChatPanel: React.FC<CopilotChatPanelProps> = ({
	messages,
	busy,
	phase,
	pending,
	nameCache,
	nudges = [],
	proactiveAlerts = [],
	whatsappHitLCards = [],
	onSend,
	onConfirm,
	onReset,
	onDismissNudge,
	onDismissProactiveAlert,
	onApproveWhatsApp,
	onRejectWhatsApp,
	onSelectPatient,
	onSelectAppointment,
	onBookSlot,
	embedMode = false,
}) => {
	const { context: uiContext, enrichMessage } = useCopilotContextSync();
	const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");

	const [input, setInput] = useState(() => {
		try {
			return safeLocalStorageGetItem("dente_copilot_draft_text") || "";
		} catch {
			return "";
		}
	});

	const feedRef = useRef<HTMLDivElement>(null);

	const handleInputChange = (newVal: string) => {
		setInput(newVal);
		try {
			if (newVal.trim()) {
				safeLocalStorageSetItem("dente_copilot_draft_text", newVal);
			} else {
				safeLocalStorageRemoveItem("dente_copilot_draft_text");
			}
		} catch {
			// ignore storage access errors
		}
	};

	const handleReset = () => {
		setInput("");
		try {
			safeLocalStorageRemoveItem("dente_copilot_draft_text");
		} catch {
			// ignore storage access errors
		}
		onReset();
	};

	const handleSendEnriched = (textToSend: string) => {
		if (!textToSend.trim() || busy) return;
		const enriched = enrichMessage(textToSend);
		onSend(enriched);
	};

	const handleSubmit = () => {
		if (!input.trim() || busy) return;
		const text = input.trim();
		handleSendEnriched(text);
		setInput("");
		try {
			safeLocalStorageRemoveItem("dente_copilot_draft_text");
		} catch {
			// ignore storage access errors
		}
	};

	useEffect(() => {
		if (activeTab === "chat" && feedRef.current) {
			feedRef.current.scrollTop = feedRef.current.scrollHeight;
		}
	}, [messages, activeTab]);

	const pendingConfirmCount = pending
		? 1
		: messages.filter((m) => m.kind === "confirmation" && !m.resolved).length;
	const pendingHitLCount = whatsappHitLCards
		? whatsappHitLCards.filter((c) => c.status === "pending").length
		: 0;
	const pendingAlertCount = proactiveAlerts
		? proactiveAlerts.filter(
				(a) => a.urgency === "CRITICAL" || a.urgency === "URGENT",
			).length
		: 0;
	const pendingCount =
		pendingConfirmCount + pendingHitLCount + pendingAlertCount;

	return (
		<div className="copilot-chat-panel" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
			{/* Context Chip Header */}
			<div
				className="copilot-context-bar"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 14px",
					backgroundColor: "var(--card-bg, var(--paper))",
					borderBottom: "1px solid var(--border)",
					fontSize: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							fontWeight: 600,
							color: "var(--accent, #10b981)",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Activity size={13} /> {uiContext.viewLabel || "Одонтограмма"}
					</span>
					{uiContext.activeTooth && (
						<span
							style={{
								padding: "1px 6px",
								borderRadius: "4px",
								backgroundColor: "var(--border)",
								fontWeight: 500,
							}}
						>
							Зуб #{uiContext.activeTooth}
						</span>
					)}
					{uiContext.patientName && (
						<span
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								color: "var(--text-muted)",
							}}
						>
							<User size={12} /> {formatShortPatientName(uiContext.patientName)}
						</span>
					)}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<button
						type="button"
						onClick={handleReset}
						className="copilot-icon-btn"
						title="Сброс диалога"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--text-muted)",
							padding: "4px",
						}}
					>
						<RotateCcw size={14} />
					</button>
				</div>
			</div>

			{/* Subnav Tabs */}
			<div
				className="copilot-tabs"
				style={{
					display: "flex",
					borderBottom: "1px solid var(--border)",
					backgroundColor: "var(--card-bg, var(--paper))",
				}}
			>
				<button
					type="button"
					className={`copilot-tab ${activeTab === "chat" ? "active" : ""}`}
					onClick={() => setActiveTab("chat")}
					style={{
						flex: 1,
						padding: "8px 12px",
						border: "none",
						borderBottom: activeTab === "chat" ? "2px solid var(--accent, #10b981)" : "none",
						background: "none",
						cursor: "pointer",
						fontWeight: activeTab === "chat" ? 600 : 400,
						color: activeTab === "chat" ? "var(--text)" : "var(--text-muted)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						fontSize: "13px",
					}}
				>
					<MessageSquare size={14} /> Чат
				</button>
				<button
					type="button"
					className={`copilot-tab ${activeTab === "pending" ? "active" : ""}`}
					onClick={() => setActiveTab("pending")}
					style={{
						flex: 1,
						padding: "8px 12px",
						border: "none",
						borderBottom: activeTab === "pending" ? "2px solid var(--accent, #10b981)" : "none",
						background: "none",
						cursor: "pointer",
						fontWeight: activeTab === "pending" ? 600 : 400,
						color: activeTab === "pending" ? "var(--text)" : "var(--text-muted)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						fontSize: "13px",
					}}
				>
					<CheckSquare size={14} /> Подтверждения
					{pendingCount > 0 && (
						<span
							style={{
								padding: "1px 6px",
								borderRadius: "10px",
								fontSize: "11px",
								backgroundColor: "var(--accent, #10b981)",
								color: "#fff",
								fontWeight: 700,
							}}
						>
							{pendingCount}
						</span>
					)}
				</button>
			</div>

			{/* Main Feed */}
			<div
				ref={feedRef}
				className="copilot-feed"
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "12px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				{activeTab === "pending" ? (
					<div className="copilot-pending-list">
						{pending ? (
							<CopilotActionConfirm
								callId={pending.callId}
								name={pending.name}
								args={pending.args}
								nameCache={nameCache}
								onConfirm={onConfirm}
							/>
						) : (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "var(--text-muted)",
									fontSize: "13px",
								}}
							>
								Нет действий, требующих подтверждения врача.
							</div>
						)}
					</div>
				) : (
					<>
						{/* Proactive Clinical Nudges */}
						{nudges.length > 0 && onDismissNudge && (
							<CopilotNudges
								nudges={nudges}
								onAct={handleSendEnriched}
								onDismiss={onDismissNudge}
							/>
						)}

						{/* Proactive Clinical Alerts */}
						{proactiveAlerts.map((alert) => (
							<ProactiveAlertCardView
								key={alert.id}
								alert={alert}
								onDismiss={onDismissProactiveAlert}
							/>
						))}

						{/* Messages */}
						{messages.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "var(--text-muted)",
								}}
							>
								<div
									style={{
										width: "48px",
										height: "48px",
										borderRadius: "50%",
										backgroundColor: "var(--border)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										margin: "0 auto 12px auto",
										color: "var(--accent, #10b981)",
									}}
								>
									<Sparkles size={24} />
								</div>
								<div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
									ДЕНТА Ассистент готов к работе
								</div>
								<div style={{ fontSize: "12px", maxWidth: "280px", margin: "0 auto" }}>
									Заполняйте дневник 043/у, обновляйте зубную формулу или создавайте наряды ЗТЛ голосом или текстом.
								</div>
							</div>
						)}

						{messages.map((m, idx) => {
							if (m.kind === "confirmation") {
								return (
									<CopilotActionConfirm
										key={`conf_${m.callId || idx}`}
										callId={m.callId}
										name={m.name}
										args={m.args}
										resolved={m.resolved}
										nameCache={nameCache}
										onConfirm={onConfirm}
									/>
								);
							}
							return (
								<CopilotMessage
									key={`msg_${idx}`}
									message={m}
									nameCache={nameCache}
									onSelectPatient={onSelectPatient}
									onSelectAppointment={onSelectAppointment}
									onBookSlot={onBookSlot}
								/>
							);
						})}

						{busy && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "12px",
									color: "var(--text-muted)",
									padding: "8px 12px",
								}}
							>
								<Loader2 size={14} className="animate-spin" />
								<span>
									{phase === "working"
										? "Выполняются клинические действия..."
										: "Ассистент думает..."}
								</span>
							</div>
						)}
					</>
				)}
			</div>

			{/* Suggestions Bar */}
			{messages.length < 5 && (
				<div style={{ padding: "0 12px 8px 12px" }}>
					<CopilotSuggestions onPick={handleSendEnriched} />
				</div>
			)}

			{/* Composer Area */}
			<div
				style={{
					padding: "10px 12px",
					borderTop: "1px solid var(--border)",
					backgroundColor: "var(--card-bg, var(--paper))",
				}}
			>
				<CopilotComposer
					value={input}
					busy={busy}
					onChange={handleInputChange}
					onSubmit={handleSubmit}
				/>
			</div>
		</div>
	);
};
