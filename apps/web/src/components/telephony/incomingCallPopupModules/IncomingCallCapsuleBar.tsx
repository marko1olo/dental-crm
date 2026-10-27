import { CalendarCheck, Check, ChevronDown, ChevronUp, Clock, PhoneCall, PhoneOff, UserCheck, X } from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import { formatShortCallerName } from "./incomingCallUtils";
import type { IncomingCallHeaderBarProps } from "./types";

export function IncomingCallCapsuleBar({ ctrl }: IncomingCallHeaderBarProps): React.JSX.Element {
	const {
		isCallAnswered, isCallEnded, elapsedSeconds, callerName, formattedPhone,
		secondaryLine, handleSwitchAndAnswerSecondaryLine, handleResumeSecondaryLine,
		handleAnswerCall, handleReject, handleEndCall, dismissCall, closeCallDrawer, setIsExpanded,
		lastVisitSummary, isKnownPatient, handleToggleCardDrawer, handleQuickBook,
	} = ctrl;

	const hasAcutePain = Boolean(ctrl.acutePainAlerts?.length) || Boolean((ctrl.currentCall as any)?.acutePain);
	const lastVisitText = lastVisitSummary?.date
		? `Визит: ${lastVisitSummary.date}`
		: isKnownPatient ? "Карта создана" : "Первичный";

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
					<span className="text-xs font-black text-[var(--ink,#0f172a)] truncate max-w-[110px] sm:max-w-[200px] whitespace-nowrap" title={callerName}>
						{isCallAnswered ? `РАЗГОВОР ${formatDurationTimer(elapsedSeconds)} • ${formatShortCallerName(callerName)}` : formatShortCallerName(callerName)}
					</span>
					{!isCallAnswered && <span className="text-[11px] font-mono text-[var(--muted,#64748b)] hidden lg:inline shrink-0 whitespace-nowrap">{formattedPhone}</span>}
				</div>
				<span className="hidden xl:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0" data-testid="capsule-last-visit-badge">
					{lastVisitText}
				</span>
				{hasAcutePain && (
					<span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 px-1.5 py-0.5 rounded-full shrink-0" data-testid="capsule-acute-pain-chip" title="Острая боль!">
						<span>⚡</span><span className="hidden sm:inline">Острая боль</span>
					</span>
				)}
			</div>
			{!isCallAnswered && (
				<span className="font-mono text-[11px] font-bold text-[var(--teal,#0d9488)] hidden sm:inline-flex items-center gap-0.5 bg-[var(--paper-soft)] px-1.5 py-0.5 rounded-lg border border-[var(--line)] shrink-0">
					<Clock size={11} />{formatDurationTimer(elapsedSeconds)}
				</span>
			)}
			<div className="flex items-center gap-1 shrink-0">
				{secondaryLine?.call && secondaryLine.state === "ringing" && (
					<button type="button" onClick={() => handleSwitchAndAnswerSecondaryLine("capsule")} className="px-2 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold inline-flex items-center gap-1 min-h-[32px] cursor-pointer" data-testid="capsule-switch-secondary-line-btn">
						<PhoneCall size={12} /><span>Л{secondaryLine.lineId}: Ответить</span>
					</button>
				)}
				{secondaryLine?.call && secondaryLine.state === "held" && (
					<button type="button" onClick={handleResumeSecondaryLine} className="px-2 py-1 rounded-full bg-[var(--paper-soft)] text-xs font-bold min-h-[32px] cursor-pointer" data-testid="capsule-resume-secondary-line-btn">
						<span>Л{secondaryLine.lineId}</span>
					</button>
				)}
				{!isCallAnswered ? (
					<>
						<button type="button" onClick={handleAnswerCall} className="px-2 sm:px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 min-h-[32px] shadow-xs cursor-pointer active:scale-95" title="Принять вызов" data-testid="capsule-answer-call-btn">
							<PhoneCall size={12} className="animate-pulse" /><span>Ответить</span>
						</button>
						<button type="button" onClick={handleReject} className="px-2 sm:px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-200 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 min-h-[32px] cursor-pointer" title="Сбросить вызов" data-testid="capsule-reject-call-btn">
							<PhoneOff size={12} /><span className="hidden sm:inline">Сброс</span>
						</button>
					</>
				) : isCallEnded ? (
					<button type="button" onClick={dismissCall} className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold min-h-[32px] cursor-pointer" data-testid="capsule-close-ended-btn">
						<Check size={12} /><span>Закрыть</span>
					</button>
				) : (
					<button type="button" onClick={handleEndCall} className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold min-h-[32px] cursor-pointer" data-testid="capsule-hangup-call-btn">
						<PhoneOff size={12} /><span>Завершить</span>
					</button>
				)}
				<button type="button" onClick={handleToggleCardDrawer} className="px-2 py-1 rounded-full bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] text-[11px] sm:text-xs font-bold hidden md:inline-flex items-center gap-1 min-h-[32px] cursor-pointer" title="Открыть карточку пациента" data-testid="capsule-open-card-btn">
					<UserCheck size={12} className="text-[var(--teal)]" /><span>Карта</span>
				</button>
				<button type="button" onClick={() => handleQuickBook("today_standard")} className="px-2 py-1 rounded-full bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] text-[11px] sm:text-xs font-bold hidden md:inline-flex items-center gap-1 min-h-[32px] cursor-pointer" title="Быстрая запись на приём" data-testid="capsule-quick-book-btn">
					<CalendarCheck size={12} className="text-emerald-600" /><span>Запись</span>
				</button>
				<button type="button" onClick={() => { closeCallDrawer(); setIsExpanded(true); }} className="min-h-[32px] min-w-[32px] p-1 rounded-full hover:bg-[var(--paper-soft)] text-[var(--muted)] flex items-center justify-center cursor-pointer" title="Развернуть детали" aria-label="Развернуть звонок" data-testid="capsule-expand-btn">
					<ChevronDown size={16} />
				</button>
				<button type="button" onClick={dismissCall} className="min-h-[32px] min-w-[32px] p-1 rounded-full hover:bg-rose-50 text-[var(--muted)] hover:text-rose-600 flex items-center justify-center cursor-pointer" title="Свернуть" aria-label="Свернуть звонок" data-testid="capsule-collapse-btn">
					<ChevronUp size={15} />
				</button>
			</div>
		</section>
	);
}
