import {
	ChevronUp, Headphones, History, PhoneCall, PhoneIncoming, PhoneOutgoing, X,
} from "lucide-react";
import React from "react";
import {
	type IncomingCallPayload,
	type TelephonyAgentState,
	type TelephonyLineSession,
	formatDurationTimer,
} from "../../store/telephonyStore";

export interface TelephonyWidgetTopBarProps {
	activeCall: IncomingCallPayload | null;
	isCallAnswered: boolean;
	elapsedSeconds: number;
	agentState: TelephonyAgentState;
	onSetAgentState: (state: TelephonyAgentState) => void;
	onCollapse: () => void;
	onClose: () => void;
	isWsConnected?: boolean | undefined;
}

export function TelephonyWidgetTopBar({
	activeCall,
	isCallAnswered,
	elapsedSeconds,
	agentState,
	onSetAgentState,
	onCollapse,
	onClose,
	isWsConnected,
}: TelephonyWidgetTopBarProps) {
	return (
		<div className="dnt-widget-topbar">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="dnt-widget-brand-icon">
					{activeCall ? <PhoneCall size={15} /> : <Headphones size={15} />}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h4 className="dnt-widget-title whitespace-nowrap shrink-0">
							{activeCall
								? isCallAnswered
									? "Разговор"
									: "Входящий вызов"
								: "Софтфон клиники"}
						</h4>
						{activeCall && (
							<span className="dnt-widget-timer-pill shrink-0">
								{formatDurationTimer(elapsedSeconds)}
							</span>
						)}
						{isWsConnected === false && (
							<span
								className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse whitespace-nowrap shrink-0"
								title="Связь с сервером телефонии восстанавливается..."
								data-testid="telephony-reconnecting-badge"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
								{!activeCall && <span className="hidden sm:inline">Переподключение...</span>}
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted,#64748b)]">
						<button
							type="button"
							onClick={() =>
								onSetAgentState(
									agentState === "online" ? "dnd" : agentState === "dnd" ? "away" : "online",
								)
							}
							className="dnt-status-badge cursor-pointer"
							title="Сменить статус готовности"
						>
							<span
								className={`dnt-status-dot ${
									agentState === "online"
										? "dnt-status-dot--online"
										: agentState === "dnd"
											? "dnt-status-dot--dnd"
											: "dnt-status-dot--away"
								}`}
							/>
							<span>
								{agentState === "online" ? "Готов к вызовам" : agentState === "dnd" ? "Не беспокоить" : "Отошел"}
							</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onCollapse}
					className="dnt-icon-btn"
					title="Свернуть в капсулу"
					aria-label="Свернуть в капсулу"
				>
					<ChevronUp size={16} />
				</button>
				<button
					type="button"
					onClick={onClose}
					className="dnt-icon-btn hover:text-rose-500"
					title="Закрыть"
					aria-label="Закрыть"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
}

export interface TelephonyWidgetTabsBarProps {
	activeTab: "call" | "dialer" | "history";
	onSelectTab: (tab: "call" | "dialer" | "history") => void;
	callHistoryCount: number;
	activeLineId: number;
	onSwitchLine: (line: 1 | 2) => void;
	line1?: TelephonyLineSession | undefined;
	line2?: TelephonyLineSession | undefined;
}

export function TelephonyWidgetTabsBar({
	activeTab,
	onSelectTab,
	callHistoryCount,
	activeLineId,
	onSwitchLine,
	line1,
	line2,
}: TelephonyWidgetTabsBarProps) {
	return (
		<div className="dnt-widget-tabs-bar">
			<div className="dnt-tabs-group">
				<button
					type="button"
					onClick={() => onSelectTab("call")}
					className={`dnt-tab-btn ${activeTab === "call" ? "dnt-tab-btn--active" : ""}`}
				>
					<PhoneIncoming size={14} />
					<span>Вызов</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("dialer")}
					className={`dnt-tab-btn ${activeTab === "dialer" ? "dnt-tab-btn--active" : ""}`}
				>
					<PhoneOutgoing size={14} />
					<span>Набор</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("history")}
					className={`dnt-tab-btn ${activeTab === "history" ? "dnt-tab-btn--active" : ""}`}
				>
					<History size={14} />
					<span>Журнал{callHistoryCount > 0 ? ` (${callHistoryCount})` : ""}</span>
				</button>
			</div>

			<div className="dnt-segmented-group">
				<button
					type="button"
					onClick={() => onSwitchLine(1)}
					className={`dnt-line-chip ${activeLineId === 1 ? "dnt-line-chip--active" : ""}`}
					title={line1?.call ? `Линия 1: ${line1.call.patientName || line1.call.phone}` : "Линия 1 свободна"}
				>
					<span
						className={`dnt-line-dot ${
							line1?.call ? (line1.state === "held" ? "dnt-line-dot--held" : "dnt-line-dot--busy") : "dnt-line-dot--idle"
						}`}
					/>
					<span>Л1</span>
				</button>

				<button
					type="button"
					onClick={() => onSwitchLine(2)}
					className={`dnt-line-chip ${activeLineId === 2 ? "dnt-line-chip--active" : ""}`}
					title={line2?.call ? `Линия 2: ${line2.call.patientName || line2.call.phone}` : "Линия 2 свободна"}
				>
					<span
						className={`dnt-line-dot ${
							line2?.call ? (line2.state === "held" ? "dnt-line-dot--held" : "dnt-line-dot--busy") : "dnt-line-dot--idle"
						}`}
					/>
					<span>Л2</span>
				</button>
			</div>
		</div>
	);
}

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
	isWsConnected?: boolean;
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
	isWsConnected,
}: TelephonyWidgetHeaderProps) {
	return (
		<div className="dnt-widget-header-wrap">
			<TelephonyWidgetTopBar
				activeCall={activeCall}
				isCallAnswered={isCallAnswered}
				elapsedSeconds={elapsedSeconds}
				agentState={agentState}
				onSetAgentState={onSetAgentState}
				onCollapse={onCollapse}
				onClose={onClose}
				isWsConnected={isWsConnected}
			/>

			<TelephonyWidgetTabsBar
				activeTab={activeTab}
				onSelectTab={onSelectTab}
				callHistoryCount={callHistoryCount}
				activeLineId={activeLineId}
				onSwitchLine={onSwitchLine}
				line1={line1}
				line2={line2}
			/>
		</div>
	);
}

export default TelephonyWidgetHeader;
