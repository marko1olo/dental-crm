import React from "react";
import {
	type IncomingCallPayload,
	type TelephonyAgentState,
	type TelephonyLineSession,
} from "../../store/telephonyStore";
import { TelephonyWidgetTabsBar } from "./telephonyWidgetHeader/TelephonyWidgetTabsBar";
import { TelephonyWidgetTopBar } from "./telephonyWidgetHeader/TelephonyWidgetTopBar";

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
