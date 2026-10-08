import {
	ChevronUp,
	Headphones,
	History,
	PhoneCall,
	PhoneIncoming,
	PhoneOff,
	PhoneOutgoing,
	Volume2,
	VolumeX,
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
	isHeld,
	onToggleHold,
	isMuted,
	onToggleMute,
	onAnswerCall,
	onRejectCall,
	onCollapse,
	onClose,
	activeTab,
	onSelectTab,
	callHistoryCount,
}: TelephonyWidgetHeaderProps) {
	return (
		<>
			{/* Header Topbar (Dense 36px) */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] flex-shrink-0">
						{activeCall ? <PhoneCall size={15} /> : <Headphones size={15} />}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h4 className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] truncate">
								{activeCall
									? isCallAnswered
										? "Разговор"
										: "Входящий вызов"
									: "Софтфон клиники"}
							</h4>
							{activeCall && (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									{formatDurationTimer(elapsedSeconds)}
								</span>
							)}
						</div>
						<div className="flex items-center gap-1.5 text-[10px] text-[var(--muted,#64748b)]">
							<span
								className={`w-1.5 h-1.5 rounded-full ${
									agentState === "online"
										? "bg-emerald-400"
										: agentState === "dnd"
											? "bg-rose-400"
											: "bg-amber-400"
								}`}
							/>
							<span className="truncate">
								{agentState === "online"
									? "Оператор онлайн"
									: agentState === "dnd"
										? "Занят"
										: "Перерыв"}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1">
					{activeCall &&
						(!isCallAnswered ? (
							<>
								<button
									type="button"
									onClick={onAnswerCall}
									className="min-h-[36px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer"
									title="Принять входящий звонок"
									data-testid="widget-header-answer-btn"
								>
									<PhoneCall size={13} className="animate-pulse" />
									<span>Ответить</span>
								</button>
								<button
									type="button"
									onClick={onRejectCall}
									className="min-h-[36px] px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
									title="Сбросить вызов"
									data-testid="widget-header-reject-btn"
								>
									<PhoneOff size={13} />
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={onRejectCall}
								className="min-h-[36px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer"
								title="Завершить разговор"
								data-testid="widget-header-hangup-btn"
							>
								<PhoneOff size={13} />
								<span>Завершить</span>
							</button>
						))}

					<button
						type="button"
						onClick={onToggleMute}
						className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
						title={isMuted ? "Включить звук звонка" : "Выключить звук звонка"}
						aria-label={isMuted ? "Включить звук звонка" : "Выключить звук звонка"}
					>
						{isMuted ? (
							<VolumeX size={16} className="text-rose-500" />
						) : (
							<Volume2 size={16} />
						)}
					</button>

					<button
						type="button"
						onClick={onCollapse}
						className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
						title="Свернуть в верхнюю капсулу"
						aria-label="Свернуть в верхнюю капсулу"
					>
						<ChevronUp size={18} />
					</button>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-500 hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
						title="Закрыть софтфон"
						aria-label="Закрыть софтфон"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			{/* Operator State & Line Switcher Bar */}
			<div className="flex items-center justify-between px-3.5 py-1 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border-b border-[var(--line,#e2e8f0)] gap-1 text-xs">
				<div className="flex items-center gap-1">
					{(
						[
							{ id: "online", label: "Онлайн" },
							{ id: "dnd", label: "Занят" },
							{ id: "pause", label: "Пауза" },
						] as const
					).map((st) => (
						<button
							key={st.id}
							type="button"
							onClick={() => onSetAgentState(st.id)}
							className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-bold border transition-all inline-flex items-center justify-center cursor-pointer ${
								agentState === st.id
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] border-[var(--line,#cbd5e1)] shadow-xs"
									: "text-[var(--muted,#64748b)] border-transparent hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							{st.label}
						</button>
					))}
				</div>

				<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-0.5 border border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						onClick={() => onSwitchLine(1)}
						className={`min-h-[36px] px-2.5 py-1.5 rounded text-xs font-mono font-bold transition-all inline-flex items-center justify-center gap-1 cursor-pointer ${
							activeLineId === 1
								? "bg-[var(--teal)] text-white shadow-xs"
								: line1?.state === "ringing"
									? "bg-amber-100 text-amber-900 animate-pulse border border-amber-300"
									: line1?.state === "held"
										? "bg-amber-50 text-amber-700 border border-amber-200"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						title={line1?.call ? `Линия 1: ${line1.call.patientName || line1.call.phone} (${line1.state})` : "Линия 1 свободна"}
					>
						Л1 {line1?.call ? "●" : "○"}
						{line1?.state === "held" && <span className="text-[9px] font-normal">[Hold]</span>}
					</button>
					<button
						type="button"
						onClick={() => onSwitchLine(2)}
						className={`min-h-[36px] px-2.5 py-1.5 rounded text-xs font-mono font-bold transition-all inline-flex items-center justify-center gap-1 cursor-pointer ${
							activeLineId === 2
								? "bg-[var(--teal)] text-white shadow-xs"
								: line2?.state === "ringing"
									? "bg-amber-100 text-amber-900 animate-pulse border border-amber-300"
									: line2?.state === "held"
										? "bg-amber-50 text-amber-700 border border-amber-200"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						title={line2?.call ? `Линия 2: ${line2.call.patientName || line2.call.phone} (${line2.state})` : "Линия 2 свободна"}
					>
						Л2 {line2?.call ? "●" : "○"}
						{line2?.state === "held" && <span className="text-[9px] font-normal">[Hold]</span>}
					</button>
					{activeCall && (
						<button
							type="button"
							onClick={onToggleHold}
							className={`min-h-[36px] px-2.5 py-1.5 rounded text-xs font-bold border transition-all inline-flex items-center justify-center cursor-pointer ${
								isHeld
									? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs"
									: "text-amber-500 border-transparent hover:bg-amber-500/10"
							}`}
							title={isHeld ? "Снять с удержания" : "Поставить на удержание"}
						>
							{isHeld ? "Удержание" : "Hold"}
						</button>
					)}
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="p-1 bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] border-b border-[var(--line,#e2e8f0)] flex items-center gap-1">
				<button
					type="button"
					onClick={() => onSelectTab("call")}
					className={`flex-1 min-h-[44px] px-2 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max cursor-pointer ${
						activeTab === "call"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
					}`}
				>
					<PhoneIncoming size={14} className="flex-shrink-0" />
					<span className="whitespace-nowrap flex-shrink-0 min-w-max">Вызов</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("dialer")}
					className={`flex-1 min-h-[44px] px-2 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max cursor-pointer ${
						activeTab === "dialer"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
					}`}
				>
					<PhoneOutgoing size={14} className="flex-shrink-0" />
					<span className="whitespace-nowrap flex-shrink-0 min-w-max">Набор</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("history")}
					className={`flex-1 min-h-[44px] px-2 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max cursor-pointer ${
						activeTab === "history"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
					}`}
				>
					<History size={14} className="flex-shrink-0" />
					<span className="whitespace-nowrap flex-shrink-0 min-w-max">
						Журнал{callHistoryCount > 0 ? ` (${callHistoryCount})` : ""}
					</span>
				</button>
			</div>
		</>
	);
}
