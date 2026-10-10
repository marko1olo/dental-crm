import {
	ChevronUp,
	Headphones,
	History,
	PhoneCall,
	PhoneIncoming,
	PhoneOutgoing,
	X,
} from "lucide-react";
import React from "react";
import {
	type IncomingCallPayload,
	type TelephonyAgentState,
	type TelephonyLineSession,
	formatDurationTimer,
} from "../../store/telephonyStore";

export interface TelephonyWidgetHeaderProps {
	activeCall: IncomingCallPayload | null;
	isCallAnswered: boolean;
	elapsedSeconds: number;
	agentState: TelephonyAgentState;
	onSetAgentState: (state: TelephonyAgentState) => void;
	activeLineId: number;
	onSwitchLine: (line: 1 | 2) => void;
	line1?: TelephonyLineSession | undefined;
	line2?: TelephonyLineSession | undefined;
	isHeld: boolean;
	onToggleHold: () => void;
	isMuted: boolean;
	onToggleMute: () => void;
	onAnswerCall: () => void;
	onRejectCall: () => void;
	onCollapse: () => void;
	onClose: () => void;
	activeTab: "call" | "dialer" | "history";
	onSelectTab: (tab: "call" | "dialer" | "history") => void;
	callHistoryCount: number;
}

export function TelephonyWidgetHeader({
	activeCall,
	isCallAnswered,
	elapsedSeconds,
	agentState,
	onSetAgentState,
	activeLineId,
	onSwitchLine,
	line1,
	line2,
	onCollapse,
	onClose,
	activeTab,
	onSelectTab,
	callHistoryCount,
}: TelephonyWidgetHeaderProps) {
	return (
		<div className="dnt-widget-header-wrap">
			{/* Row 1: Header Topbar (Title, Timer, Operator Status & Window Controls) */}
			<div className="dnt-widget-topbar">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="dnt-widget-brand-icon">
						{activeCall ? <PhoneCall size={15} /> : <Headphones size={15} />}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h4 className="dnt-widget-title">
								{activeCall
									? isCallAnswered
										? "Разговор"
										: "Входящий вызов"
									: "Софтфон клиники"}
							</h4>
							{activeCall && (
								<span className="dnt-widget-timer-pill">
									{formatDurationTimer(elapsedSeconds)}
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<div className="dnt-segmented-group">
						{(
							[
								{ id: "online", label: "Онлайн" },
								{ id: "dnd", label: "Занят" },
								{ id: "pause", label: "Перерыв" },
							] as const
						).map((st) => (
							<button
								key={st.id}
								type="button"
								onClick={() => onSetAgentState(st.id)}
								className={`dnt-status-chip ${
									agentState === st.id ? "dnt-status-chip--active" : ""
								}`}
							>
								{st.label}
							</button>
						))}
					</div>

					<button
						type="button"
						onClick={onCollapse}
						className="dnt-btn-icon"
						title="Свернуть в компактный бейдж"
						aria-label="Свернуть в верхнюю капсулу"
					>
						<ChevronUp size={16} />
					</button>

					<button
						type="button"
						onClick={onClose}
						className="dnt-btn-icon"
						title="Закрыть софтфон"
						aria-label="Закрыть софтфон"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Row 2: Navigation Tabs + Line 1/2 Switcher */}
			<div className="dnt-widget-tabs-bar">
				<div className="dnt-tabs-group">
					<button
						type="button"
						onClick={() => onSelectTab("call")}
						className={`dnt-tab-btn ${
							activeTab === "call" ? "dnt-tab-btn--active" : ""
						}`}
					>
						<PhoneIncoming size={14} />
						<span>Вызов</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTab("dialer")}
						className={`dnt-tab-btn ${
							activeTab === "dialer" ? "dnt-tab-btn--active" : ""
						}`}
					>
						<PhoneOutgoing size={14} />
						<span>Набор</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTab("history")}
						className={`dnt-tab-btn ${
							activeTab === "history" ? "dnt-tab-btn--active" : ""
						}`}
					>
						<History size={14} />
						<span>
							Журнал{callHistoryCount > 0 ? ` (${callHistoryCount})` : ""}
						</span>
					</button>
				</div>

				<div className="dnt-segmented-group">
					<button
						type="button"
						onClick={() => onSwitchLine(1)}
						className={`dnt-line-chip ${
							activeLineId === 1 ? "dnt-line-chip--active" : ""
						}`}
						title={
							line1?.call
								? `Линия 1: ${line1.call.patientName || line1.call.phone}`
								: "Линия 1 свободна"
						}
					>
						<span
							className={`dnt-line-dot ${
								line1?.call ? "dnt-line-dot--busy" : ""
							}`}
						/>
						<span>Л1</span>
					</button>
					<button
						type="button"
						onClick={() => onSwitchLine(2)}
						className={`dnt-line-chip ${
							activeLineId === 2 ? "dnt-line-chip--active" : ""
						}`}
						title={
							line2?.call
								? `Линия 2: ${line2.call.patientName || line2.call.phone}`
								: "Линия 2 свободна"
						}
					>
						<span
							className={`dnt-line-dot ${
								line2?.call ? "dnt-line-dot--busy" : ""
							}`}
						/>
						<span>Л2</span>
					</button>
				</div>
			</div>
		</div>
	);
}
