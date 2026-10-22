import { Check, ChevronDown, Clock, PhoneCall, PhoneOff, X } from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import { formatShortCallerName } from "./incomingCallUtils";
import type { IncomingCallHeaderBarProps } from "./types";

export function IncomingCallCapsuleBar({ ctrl }: IncomingCallHeaderBarProps): React.JSX.Element {
	const {
		isCallAnswered, isCallEnded, elapsedSeconds, callerName, formattedPhone,
		secondaryLine, handleSwitchAndAnswerSecondaryLine, handleResumeSecondaryLine,
		handleAnswerCall, handleReject, handleEndCall, dismissCall, closeCallDrawer, setIsExpanded,
	} = ctrl;

	const hasAcutePain =
		Boolean(ctrl.acutePainAlerts && ctrl.acutePainAlerts.length > 0) ||
		Boolean((ctrl.currentCall as any)?.acutePain);

	return (
		<section
			className="dnt-incoming-call-capsule pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 h-9 max-h-[36px] px-2 sm:px-3 py-1 rounded-full border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xl backdrop-blur-xl animate-badge-drop w-auto max-w-full box-border overflow-hidden"
			aria-label="Входящий звонок телефонии (компактный режим)"
			data-testid="incoming-call-capsule"
		>
			<div className="flex items-center gap-1.5 min-w-0 shrink-0">
				<span className="relative flex h-2.5 w-2.5 ml-0.5 shrink-0">
					<span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCallAnswered ? "bg-teal-400" : "bg-emerald-400"}`} />
					<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCallAnswered ? "bg-teal-500" : "bg-emerald-500"}`} />
				</span>
				<div className="flex items-center gap-1 min-w-0 shrink-0">
					<span className="text-xs font-black text-[var(--ink,#0f172a)] truncate max-w-[180px] sm:max-w-[320px] whitespace-nowrap" title={callerName}>
						{isCallAnswered ? `РАЗГОВОР ${formatDurationTimer(elapsedSeconds)} • ${formatShortCallerName(callerName)}` : formatShortCallerName(callerName)}
					</span>
					{!isCallAnswered && <span className="text-[11px] font-mono text-[var(--muted,#64748b)] hidden md:inline shrink-0 whitespace-nowrap">{formattedPhone}</span>}
				</div>
				{hasAcutePain && (
					<span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" data-testid="capsule-acute-pain-chip" title="Острая боль!">
						<span>⚡</span>
						<span className="hidden sm:inline">Острая боль</span>
					</span>
				)}
			</div>
			{!isCallAnswered && (
				<span className="font-mono text-[11px] sm:text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-0.5 sm:gap-1 bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] px-1.5 sm:px-2 py-0.5 rounded-lg border border-[var(--line,#e2e8f0)] shrink-0">
					<Clock size={11} />{formatDurationTimer(elapsedSeconds)}
				</span>
			)}
			<div className="flex items-center gap-1 shrink-0">
				{secondaryLine?.call && secondaryLine.state === "ringing" && (
					<button type="button" onClick={() => handleSwitchAndAnswerSecondaryLine("capsule")} className="px-2 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95 animate-pulse shrink-0" title={`Ответить со 2-й линии (${secondaryLine.call.phone}) с удержанием 1-й`} data-testid="capsule-switch-secondary-line-btn">
						<PhoneCall size={12} /><span className="hidden xs:inline">Л{secondaryLine.lineId}: </span><span>Ответить</span>
					</button>
				)}
				{secondaryLine?.call && secondaryLine.state === "held" && (
					<button type="button" onClick={handleResumeSecondaryLine} className="px-2 py-1 rounded-full bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] cursor-pointer active:scale-95 shrink-0" title={`Вернуться к удерживаемой Линии ${secondaryLine.lineId}`} data-testid="capsule-resume-secondary-line-btn">
						<span>Л{secondaryLine.lineId}</span>
					</button>
				)}
				{!isCallAnswered ? (
					<>
						<button type="button" onClick={handleAnswerCall} className="px-2 sm:px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Принять вызов" data-testid="capsule-answer-call-btn">
							<PhoneCall size={12} className="animate-pulse" /><span>Ответить</span>
						</button>
						<button type="button" onClick={handleReject} className="px-2 sm:px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] cursor-pointer active:scale-95" title="Сбросить вызов" data-testid="capsule-reject-call-btn">
							<PhoneOff size={12} /><span>Сброс</span>
						</button>
					</>
				) : isCallEnded ? (
					<button type="button" onClick={dismissCall} className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Закрыть уведомление о завершённом звонке" data-testid="capsule-close-ended-btn">
						<Check size={12} /><span>Закрыть</span>
					</button>
				) : (
					<button type="button" onClick={handleEndCall} className="px-2.5 sm:px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Завершить разговор" data-testid="capsule-hangup-call-btn">
						<PhoneOff size={12} /><span>Завершить</span>
					</button>
				)}
				<button type="button" onClick={() => { closeCallDrawer(); setIsExpanded(true); }} className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1 rounded-full hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer" title="Развернуть карточку звонка" aria-label="Развернуть звонок" data-testid="capsule-expand-btn">
					<ChevronDown size={16} />
				</button>
				<button type="button" onClick={dismissCall} className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 hidden sm:flex items-center justify-center transition-colors cursor-pointer" title="Скрыть бейдж" aria-label="Скрыть звонок">
					<X size={15} />
				</button>
			</div>
		</section>
	);
}
