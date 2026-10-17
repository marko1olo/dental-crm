import { ChevronUp, Headphones, PhoneCall, X } from "lucide-react";
import React from "react";
import {
	type IncomingCallPayload,
	type TelephonyAgentState,
	formatDurationTimer,
} from "../../../store/telephonyStore";

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
	);
}
