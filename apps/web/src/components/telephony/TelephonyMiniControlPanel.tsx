import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck,
	Check,
	ChevronDown,
	FileText,
	Headphones,
	MessageSquare,
	MoreHorizontal,
	Pause,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneOff,
	PhoneOutgoing,
	Play,
	RotateCcw,
	RotateCw,
	User,
	UserCheck,
	Zap,
} from "lucide-react";
import React from "react";
import type {
	IncomingCallPayload,
	PlaybackSpeed,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	SpeechTranscriptUtterance,
} from "../../store/telephonyTypes";
import {
	formatDurationTimer,
	formatPhoneDisplay,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { TelephonyWidgetMoreMenu } from "./TelephonyWidgetMoreMenu";
import type { CallAttribution } from "./telephonyAttribution";

export interface TelephonyMiniControlPanelProps {
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	callAttribution: CallAttribution | null;
	whatsappSent: boolean;
	onSendWhatsApp: () => void;
	audioRef: React.RefObject<HTMLAudioElement | null>;
	waveformRef: React.RefObject<HTMLDivElement | null>;
	waveformBars: number[];
	isPlayingAudio: boolean;
	audioCurrentTime: number;
	audioDuration: number;
	onTogglePlayAudio: () => void;
	onSkipAudio: (delta: number) => void;
	onWaveformClick: (e: React.MouseEvent<HTMLDivElement>) => void;
	playbackSpeed: PlaybackSpeed;
	onSetPlaybackSpeed: (speed: PlaybackSpeed) => void;
	showTranscript: boolean;
	onToggleTranscript: () => void;
	transcriptUtterances: SpeechTranscriptUtterance[];
	copiedTranscript: boolean;
	onCopyTranscript: () => void;
	onSeekToUtterance: (sec: number) => void;
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSetTransferType: (t: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	onOpenCard: () => void;
	showWidgetMoreMenu: boolean;
	onToggleWidgetMoreMenu: () => void;
	onCloseWidgetMoreMenu: () => void;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
	isWsConnected: boolean;
	onSwitchToDialer: () => void;
	onAudioTimeUpdate: () => void;
	onAudioEnded: () => void;
}

export function TelephonyMiniControlPanel({
	activeCall,
	resolvedPatient,
	callerName,
	formattedPhone,
	initials,
	avatarColors,
	allergyAlerts,
	acutePainAlerts,
	upcomingAppointment,
	callAttribution,
	whatsappSent,
	onSendWhatsApp,
	audioRef,
	waveformRef,
	waveformBars,
	isPlayingAudio,
	audioCurrentTime,
	audioDuration,
	onTogglePlayAudio,
	onSkipAudio,
	onWaveformClick,
	playbackSpeed,
	onSetPlaybackSpeed,
	showTranscript,
	onToggleTranscript,
	transcriptUtterances,
	copiedTranscript,
	onCopyTranscript,
	onSeekToUtterance,
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSetTransferType,
	onStartTransfer,
	onQuickBook,
	onOpenCard,
	showWidgetMoreMenu,
	onToggleWidgetMoreMenu,
	onCloseWidgetMoreMenu,
	isCapturingLead,
	onCaptureLead,
	isHeld,
	onToggleHold,
	onCopyPhone,
	isCreatingPatient,
	onQuickCreatePatient,
	isWsConnected,
	onSwitchToDialer,
	onAudioTimeUpdate,
	onAudioEnded,
}: TelephonyMiniControlPanelProps) {
	const speeds: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

	if (!activeCall) {
		return (
			<div
				className="py-8 px-4 text-center space-y-3"
				data-testid="telephony-fallback-waiting-webhook"
			>
				<div className="w-14 h-14 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center mx-auto">
					<Phone size={24} />
				</div>
				<div>
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)]">
						Ожидание вебхука АТС UIS/Mango/Zadarma/Asterisk
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1 max-w-xs mx-auto">
						Шлюз АТС (UIS / Mango / Zadarma / Asterisk) подключен и ожидает
						входящих звонков. При поступлении вызова карточка пациента и быстрая
						запись откроются автоматически.
					</p>
					<div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] border border-[var(--line,#e2e8f0)] text-[11px] font-medium text-[var(--ink,#0f172a)]">
						<span
							className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
						/>
						<span>
							{isWsConnected
								? "Шлюз АТС: Онлайн (WebSocket)"
								: "Шлюз АТС: Ожидание вебхука (UIS / Mango / Zadarma / Asterisk)"}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onSwitchToDialer}
					className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
				>
					<PhoneOutgoing size={14} />
					<span>Набрать номер</span>
				</button>
			</div>
		);
	}

	return (
		<>
			{/* Patient Profile Header */}
			<div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)]">
				<div
					className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border"
					style={{
						backgroundColor: avatarColors.bg,
						color: avatarColors.text,
						borderColor: avatarColors.border,
					}}
				>
					{resolvedPatient ? initials : <User size={18} />}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-1.5">
						<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] leading-snug break-words line-clamp-2 max-w-full">
							{callerName}
						</span>
						{resolvedPatient ? (
							<span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-1.5 py-0.2 rounded shrink-0 self-start">
								<UserCheck size={10} /> Пациент
							</span>
						) : (
							<span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 px-1.5 py-0.2 rounded shrink-0 self-start">
								<AlertCircle size={10} /> Новый лид
							</span>
						)}
					</div>
					<div className="text-[11px] font-mono text-[var(--muted,#64748b)] mt-0.5">
						{formattedPhone}
					</div>
				</div>
			</div>

			{/* 1. Critical Allergy Alert Banner */}
			{allergyAlerts.length > 0 && (
				<div
					className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in"
					data-testid="telephony-widget-allergy-alert"
				>
					<AlertTriangle
						size={15}
						className="text-rose-600 dark:text-rose-400 shrink-0"
					/>
					<div className="min-w-0 flex-1">
						<span className="font-bold text-rose-700 dark:text-rose-300 uppercase text-[9px] tracking-wider block">
							Внимание: Аллергия в анамнезе
						</span>
						<span className="break-words line-clamp-2 text-[11px]">
							{allergyAlerts.map((a) => a.label).join("; ")}
						</span>
					</div>
				</div>
			)}

			{/* 2. Critical Acute Pain / Emergency Banner */}
			{(acutePainAlerts.length > 0 ||
				(activeCall as unknown as { acutePain?: boolean })?.acutePain) && (
				<div
					className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in"
					data-testid="telephony-widget-acute-pain-alert"
				>
					<Zap size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<div className="min-w-0 flex-1">
						<span className="font-bold text-rose-700 dark:text-rose-300 uppercase text-[9px] tracking-wider block">
							Экстренно: Острая боль
						</span>
						<span className="break-words line-clamp-2 text-[11px]">
							{acutePainAlerts.length > 0
								? acutePainAlerts.map((a) => a.label).join("; ")
								: "Пациент с острой болью. Требуется экстренная помощь."}
						</span>
					</div>
				</div>
			)}

			{/* Upcoming Appointment & 1-Click WhatsApp */}
			{upcomingAppointment && (
				<div className="p-2.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex flex-col gap-2">
					<div className="flex flex-wrap items-center justify-between text-xs gap-1">
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal)] min-w-0">
							<CalendarCheck
								size={14}
								className="text-[var(--teal)] flex-shrink-0"
							/>
							<span className="break-words">
								{upcomingAppointment.isToday
									? "Запись сегодня"
									: upcomingAppointment.isTomorrow
										? "Запись завтра"
										: upcomingAppointment.formattedDate}
								{" в "}
								{upcomingAppointment.formattedTime}
							</span>
						</div>
						{upcomingAppointment.doctorName && (
							<span className="text-[11px] text-[var(--ink,#0f172a)] font-medium break-words">
								{upcomingAppointment.doctorName}
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={onSendWhatsApp}
						className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
					>
						{whatsappSent ? <Check size={14} /> : <MessageSquare size={14} />}
						<span>
							{whatsappSent ? "Отправлено в WhatsApp" : "1-Click WhatsApp"}
						</span>
					</button>
				</div>
			)}

			{/* Audio Recording Player Strip with Waveform & Speed Toggles */}
			{activeCall.recordingUrl && (
				<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] flex flex-col gap-2 shadow-xs">
					<audio
						ref={audioRef}
						src={activeCall.recordingUrl}
						onTimeUpdate={onAudioTimeUpdate}
						onLoadedMetadata={onAudioTimeUpdate}
						onEnded={onAudioEnded}
					>
						<track kind="captions" />
					</audio>

					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onTogglePlayAudio}
								className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
								title={isPlayingAudio ? "Пауза" : "Воспроизвести запись"}
								aria-label={isPlayingAudio ? "Пауза" : "Воспроизвести запись"}
							>
								{isPlayingAudio ? (
									<Pause size={18} />
								) : (
									<Play size={18} className="ml-0.5" />
								)}
							</button>

							<button
								type="button"
								onClick={() => onSkipAudio(-10)}
								className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors cursor-pointer"
								title="Назад на 10 сек"
							>
								<RotateCcw size={16} />
							</button>

							<button
								type="button"
								onClick={() => onSkipAudio(10)}
								className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors cursor-pointer"
								title="Вперед на 10 сек"
							>
								<RotateCw size={16} />
							</button>
						</div>

						<div className="flex items-center bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-xl p-1 border border-[var(--line,#e2e8f0)] gap-2">
							{speeds.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => onSetPlaybackSpeed(s)}
									className={`min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
										playbackSpeed === s
											? "bg-[var(--teal)] text-white shadow-xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))]"
									}`}
									title={`Скорость ${s}x`}
								>
									{s}x
								</button>
							))}
						</div>
					</div>

					{/* Waveform Scrubber */}
					<div
						ref={waveformRef}
						onClick={onWaveformClick}
						className="relative h-9 rounded-lg bg-[var(--paper-soft,rgba(0,0,0,0.03))] flex items-end justify-between px-1.5 py-1 gap-[2px] cursor-pointer group"
						title="Перемотка аудио (кликните на дорожку)"
					>
						{waveformBars.map((heightPct, idx) => {
							const progress = (idx / waveformBars.length) * 100;
							const currentProgress = (audioCurrentTime / (audioDuration || 1)) * 100;
							const isPassed = progress <= currentProgress;
							return (
								<div
									key={idx}
									className="flex-1 rounded-sm transition-all"
									style={{
										height: `${Math.max(15, heightPct)}%`,
										backgroundColor: isPassed
											? "var(--teal)"
											: "var(--line, #cbd5e1)",
									}}
								/>
							);
						})}
					</div>

					<div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted,#64748b)]">
						<span>{formatDurationTimer(audioCurrentTime)}</span>
						<span>{formatDurationTimer(audioDuration)}</span>
					</div>

					{/* Transcript Toggle */}
					{transcriptUtterances.length > 0 && (
						<div className="pt-2 border-t border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={onToggleTranscript}
								className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between shadow-xs cursor-pointer"
							>
								<div className="flex items-center gap-1.5">
									<FileText size={14} />
									<span>
										{showTranscript
											? "Скрыть стенограмму разговора"
											: `Стенограмма разговора (${transcriptUtterances.length} реплик)`}
									</span>
								</div>
								<ChevronDown
									size={14}
									className={`transition-transform duration-200 ${showTranscript ? "rotate-180" : ""}`}
								/>
							</button>

							{showTranscript && (
								<div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)]">
									<div className="flex items-center justify-between pb-1 border-b border-[var(--line,#e2e8f0)] text-[10px] text-[var(--muted,#64748b)]">
										<span>Реплики диалога:</span>
										<button
											type="button"
											onClick={onCopyTranscript}
											className="hover:text-[var(--teal)] font-semibold inline-flex items-center gap-1 cursor-pointer"
										>
											{copiedTranscript ? <Check size={11} /> : null}
											<span>{copiedTranscript ? "Скопировано" : "Копировать всё"}</span>
										</button>
									</div>

									{transcriptUtterances.map((u, i) => (
										<div
											key={i}
											onClick={() => onSeekToUtterance(u.startTimeSeconds)}
											className={`p-2 rounded-lg cursor-pointer transition-all border ${
												audioCurrentTime >= u.startTimeSeconds && audioCurrentTime <= u.endTimeSeconds
													? "bg-[var(--teal-surface)] border-[var(--teal-soft)] shadow-xs"
													: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]"
											}`}
											title="Кликните для перехода к реплике"
										>
											<div className="flex items-center justify-between text-[10px] mb-1">
												<div className="flex items-center gap-1.5 font-bold">
													<span
														className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
															u.speaker === "operator"
																? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]"
																: "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border border-[var(--info-fg,rgba(2,132,199,0.3))]"
														}`}
													>
														{u.speaker === "operator" ? "Оператор" : "Пациент"}
													</span>
													<span className="font-mono text-[var(--muted,#64748b)]">
														{formatDurationTimer(u.startTimeSeconds)} - {formatDurationTimer(u.endTimeSeconds)}
													</span>
												</div>
												<span className="text-[9px] text-[var(--muted,#64748b)]">
													{(u.confidence * 100).toFixed(0)}%
												</span>
											</div>
											<p className="text-[var(--ink,#0f172a)] text-[11px] leading-relaxed">
												{u.text}
											</p>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* WebRTC SIP Call Transfer Panel */}
			<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex flex-col gap-2.5 text-xs">
				<button
					type="button"
					onClick={onToggleTransferPanel}
					className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between shadow-xs active:scale-[0.99] cursor-pointer"
				>
					<div className="flex items-center gap-2">
						<PhoneForwarded size={16} className="text-[var(--teal)] flex-shrink-0" />
						<span>
							{showTransferPanel ? "Скрыть перевод звонка" : "Перевод звонка (SIP Transfer)"}
						</span>
					</div>
					<ChevronDown
						size={16}
						className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`}
					/>
				</button>

				{showTransferPanel && (
					<div className="space-y-2.5 pt-1 animate-fade-in">
						<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)] text-xs">
							<button
								type="button"
								onClick={() => onSetTransferType("blind")}
								className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
									transferType === "blind"
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Слепой
							</button>
							<button
								type="button"
								onClick={() => onSetTransferType("attended")}
								className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
									transferType === "attended"
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								С консультацией
							</button>
						</div>

						<div className="grid grid-cols-4 gap-1.5">
							{[
								{ ext: "101", label: "101 Терапевт" },
								{ ext: "102", label: "102 Хирург" },
								{ ext: "103", label: "103 Ортопед" },
								{ ext: "104", label: "104 Ресепшн" },
							].map((item) => (
								<button
									key={item.ext}
									type="button"
									onClick={() => onStartTransfer(item.ext, transferType)}
									className="min-h-[48px] px-1.5 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
								>
									<span className="font-mono text-[var(--teal)]">{item.ext}</span>
									<span className="text-[9px] font-normal text-[var(--muted,#64748b)] truncate w-full">
										{item.label.split(" ")[1]}
									</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Strictly <= 2 Primary Direct Actions + Context Menu (Miller's Law / Mandates 8d, 8e, 8n) */}
			<div className="relative pt-1 border-t border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2">
					{/* Action 1: Создать запись */}
					<button
						type="button"
						onClick={() => onQuickBook("urgent")}
						className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
						title="Создать запись на приём в 1 клик (соло-врач: без обязательного ассистента и филиала)"
						data-testid="widget-action-book"
					>
						<CalendarCheck size={16} />
						<span>Создать запись</span>
					</button>

					{/* Action 2: Открыть карту / Создать пациента */}
					<button
						type="button"
						onClick={onOpenCard}
						className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
						title={
							resolvedPatient
								? "Открыть карточку в боковой шторке (визит 043/у сохранён)"
								: "Создать пациента в боковой шторке"
						}
						data-testid="widget-action-open-card"
					>
						<UserCheck size={16} className="text-[var(--teal)]" />
						<span>{resolvedPatient ? "Открыть карту" : "Создать"}</span>
					</button>

					{/* Action 3: Menu ... */}
					<button
						type="button"
						onClick={onToggleWidgetMoreMenu}
						className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer border border-[var(--line,#e2e8f0)]"
						title="Дополнительные действия (слоты записи, WhatsApp, перевод, удержание)"
						aria-label="Дополнительные действия"
						data-testid="widget-more-menu-btn"
					>
						<MoreHorizontal size={18} />
					</button>
				</div>

				{/* Popover Menu Dropdown */}
				<TelephonyWidgetMoreMenu
					isOpen={showWidgetMoreMenu}
					onClose={onCloseWidgetMoreMenu}
					activeCall={activeCall}
					resolvedPatient={resolvedPatient}
					callAttribution={callAttribution}
					isCapturingLead={isCapturingLead}
					onCaptureLead={onCaptureLead}
					onQuickBook={onQuickBook}
					isCreatingPatient={isCreatingPatient}
					onQuickCreatePatient={onQuickCreatePatient}
					onSendWhatsApp={onSendWhatsApp}
					onToggleTransferPanel={onToggleTransferPanel}
					isHeld={isHeld}
					onToggleHold={onToggleHold}
					onCopyPhone={onCopyPhone}
				/>
			</div>
		</>
	);
}
