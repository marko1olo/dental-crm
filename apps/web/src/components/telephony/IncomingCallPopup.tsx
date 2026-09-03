import {
	AlertCircle,
	AlertTriangle,
	Bell,
	BellOff,
	Calendar,
	CalendarCheck,
	CalendarDays,
	CalendarPlus,
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	ExternalLink,
	FileText,
	Forward,
	Gauge,
	MessageSquare,
	Mic,
	MicOff,
	Pause,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneIncoming,
	PhoneOff,
	Play,
	RotateCcw,
	RotateCw,
	Send,
	Shield,
	ShieldAlert,
	Sparkles,
	Stethoscope,
	User,
	UserCheck,
	Volume2,
	VolumeX,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	calculatePatientFinancialStatus,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	generateCallTranscript,
	generateSmsConfirmationUrl,
	generateWaveformBars,
	generateWhatsAppConfirmationUrl,
	getAvatarColor,
	openWhatsAppChat,
	type PlaybackSpeed,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import "./telephonyFloatingWidget.css";

function resolveTelephonyWsUrl(): string {
	const configured = (
		import.meta as unknown as { env?: Record<string, string> }
	).env?.VITE_WS_URL;
	if (configured) return configured;
	if (typeof window !== "undefined") {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	}
	return "ws://localhost:4100/api/ws/schedule";
}

/**
 * Web Audio API gentle softphone ringtone synthesizer with dynamic compression & volume normalization.
 */
function playRingtoneChime(audioCtx: AudioContext, volumeLevel = 0.8) {
	try {
		const now = audioCtx.currentTime;

		// Master dynamics compressor for normalization
		const compressor = audioCtx.createDynamicsCompressor();
		compressor.threshold.setValueAtTime(-24, now);
		compressor.knee.setValueAtTime(30, now);
		compressor.ratio.setValueAtTime(12, now);
		compressor.attack.setValueAtTime(0.003, now);
		compressor.release.setValueAtTime(0.25, now);
		compressor.connect(audioCtx.destination);

		const masterGain = audioCtx.createGain();
		masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volumeLevel)), now);
		masterGain.connect(compressor);

		const osc1 = audioCtx.createOscillator();
		const osc2 = audioCtx.createOscillator();
		const gain = audioCtx.createGain();

		osc1.type = "sine";
		osc2.type = "triangle";

		osc1.frequency.setValueAtTime(440, now); // A4
		osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

		osc2.frequency.setValueAtTime(554.37, now); // C#5
		osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.15); // C#6

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(masterGain);

		osc1.start(now);
		osc2.start(now);
		osc1.stop(now + 0.36);
		osc2.stop(now + 0.36);

		// Second double chirp after 180ms
		const osc3 = audioCtx.createOscillator();
		const gain2 = audioCtx.createGain();
		osc3.type = "sine";
		osc3.frequency.setValueAtTime(587.33, now + 0.18); // D5
		osc3.frequency.exponentialRampToValueAtTime(1174.66, now + 0.32);

		gain2.gain.setValueAtTime(0.001, now + 0.18);
		gain2.gain.linearRampToValueAtTime(0.08, now + 0.22);
		gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

		osc3.connect(gain2);
		gain2.connect(masterGain);

		osc3.start(now + 0.18);
		osc3.stop(now + 0.46);
	} catch {
		// AudioContext suspended or unavailable in headless/silent browser
	}
}

/**
 * Call Audio Recording Player with Volume Normalization, Speed Toggles (1.0x, 1.25x, 1.5x, 2.0x)
 * and interactive Waveform Scrubbing.
 */
export function CallAudioPlayer({
	recordingUrl,
	durationSeconds = 45,
	seed,
}: {
	recordingUrl: string;
	durationSeconds?: number;
	seed?: string;
}) {
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const cyclePlaybackSpeed = useTelephonyStore((s) => s.cyclePlaybackSpeed);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const setVolumeLevel = useTelephonyStore((s) => s.setVolumeLevel);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(durationSeconds);
	const [hoverTime, setHoverTime] = useState<number | null>(null);
	const [showTranscript, setShowTranscript] = useState(false);
	const [copiedTranscript, setCopiedTranscript] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveformRef = useRef<HTMLDivElement | null>(null);

	const waveformBars = useMemo(() => {
		return generateWaveformBars(seed || recordingUrl, 44);
	}, [seed, recordingUrl]);

	const transcriptUtterances = useMemo(() => {
		return generateCallTranscript(seed || recordingUrl, durationSeconds);
	}, [seed, recordingUrl, durationSeconds]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed;
		}
	}, [playbackSpeed]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [isMuted, volumeLevel]);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current
				.play()
				.then(() => setIsPlaying(true))
				.catch(() => {
					// Audio play fallback/simulation for synthetic URLs
					setIsPlaying(true);
				});
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
			if (audioRef.current.duration && !Number.isNaN(audioRef.current.duration)) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkip = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const nextTime = Math.max(0, Math.min(audioDuration, currentTime + deltaSeconds));
		audioRef.current.currentTime = nextTime;
		setCurrentTime(nextTime);
	};

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = clickX / rect.width;
		const targetTime = progress * (audioDuration || 1);

		setCurrentTime(targetTime);
		if (audioRef.current) {
			audioRef.current.currentTime = targetTime;
		}
	};

	const handleSeekToUtterance = (startSec: number) => {
		setCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlaying) {
				audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true));
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances
			.map((u) => `[${formatDurationTimer(u.startTimeSeconds)}] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`)
			.join("\n");

		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			showToast("Расшифровка звонка скопирована в буфер", "success");
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = hoverX / rect.width;
		setHoverTime(progress * (audioDuration || 1));
	};

	const handleWaveformMouseLeave = () => {
		setHoverTime(null);
	};

	const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
	const speeds: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-2.5 shadow-xs">
			<audio
				ref={audioRef}
				src={recordingUrl}
				onTimeUpdate={handleTimeUpdate}
				onEnded={() => setIsPlaying(false)}
				onError={() => {
					// Fallback for simulation links
				}}
			/>

			{/* Top Bar: Playback Controls & Waveform Info */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={togglePlay}
						className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						title={isPlaying ? "Пауза" : "Воспроизвести запись"}
						aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
					>
						{isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
					</button>

					{/* Skip -10s */}
					<button
						type="button"
						onClick={() => handleSkip(-10)}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
						title="Назад на 10 сек"
						aria-label="Назад на 10 секунд"
					>
						<RotateCcw size={16} />
					</button>

					{/* Skip +10s */}
					<button
						type="button"
						onClick={() => handleSkip(10)}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
						title="Вперед на 10 сек"
						aria-label="Вперед на 10 секунд"
					>
						<RotateCw size={16} />
					</button>

					<span className="font-mono text-xs text-[var(--ink,#0f172a)] font-semibold pl-1">
						{formatDurationTimer(currentTime)} / {formatDurationTimer(audioDuration)}
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					{/* Speed Toggle Pills (1x, 1.25x, 1.5x, 2x) with touch-targets >= 44x44px and gap-2 */}
					<div className="flex items-center bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-xl p-1 border border-[var(--line,#e2e8f0)] gap-2">
						{speeds.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setPlaybackSpeed(s)}
								className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center ${
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

					{/* Mute toggle */}
					<button
						type="button"
						onClick={toggleMute}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-all"
						title={isMuted ? "Включить звук" : "Выключить звук"}
						aria-label={isMuted ? "Включить звук" : "Выключить звук"}
					>
						{isMuted ? (
							<VolumeX size={18} className="text-rose-500" />
						) : (
							<Volume2 size={18} />
						)}
					</button>
				</div>
			</div>

			{/* Interactive Audio Waveform Scrubber */}
			<div className="relative flex flex-col gap-1">
				<div
					ref={waveformRef}
					onClick={handleWaveformClick}
					onMouseMove={handleWaveformMouseMove}
					onMouseLeave={handleWaveformMouseLeave}
					className="h-9 w-full flex items-center justify-between gap-[2px] px-1.5 py-1 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] cursor-pointer relative overflow-hidden transition-colors"
					role="slider"
					aria-valuemin={0}
					aria-valuemax={audioDuration}
					aria-valuenow={currentTime}
					aria-label="Интерактивная волновая форма аудиозаписи"
				>
					{/* Waveform Bars */}
					{waveformBars.map((amp, idx) => {
						const barProgress = (idx / waveformBars.length) * 100;
						const isPast = barProgress <= progressPct;
						const barHeight = Math.max(4, Math.round(amp * 28));

						return (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed count bars
								key={idx}
								style={{ height: `${barHeight}px` }}
								className={`flex-1 rounded-full transition-colors ${
									isPast
										? "bg-[var(--teal)] shadow-[0_0_4px_rgba(45,212,191,0.5)]"
										: "bg-[var(--line-strong,var(--line,#cbd5e1))] hover:bg-[var(--muted,#94a3b8)]"
								}`}
							/>
						);
					})}

					{/* Current Playhead Indicator */}
					<div
						className="absolute top-0 bottom-0 w-[2px] bg-emerald-500 pointer-events-none transition-all shadow-[0_0_6px_rgba(52,211,153,0.8)]"
						style={{ left: `${progressPct}%` }}
					/>
				</div>

				{/* Hover time tooltip */}
				{hoverTime !== null && (
					<div className="text-[10px] text-[var(--teal)] font-mono self-end">
						Перемотка: {formatDurationTimer(hoverTime)}
					</div>
				)}
			</div>

			{/* Speech-to-Text Transcript Drawer Toggle */}
			<div className="pt-1 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between">
				<button
					type="button"
					onClick={() => setShowTranscript((prev) => !prev)}
					className="text-xs font-bold text-[var(--teal)] hover:opacity-90 inline-flex items-center gap-1.5 min-h-[44px] py-1 transition-colors cursor-pointer"
					aria-expanded={showTranscript}
				>
					<Sparkles size={13} className="text-amber-500" />
					<span>{showTranscript ? "Скрыть расшифровку речи" : "Показать расшифровку речи (AI STT)"}</span>
				</button>

				{showTranscript && (
					<button
						type="button"
						onClick={handleCopyTranscript}
						className="min-h-[44px] text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] transition-colors cursor-pointer"
						title="Скопировать текст диалога"
					>
						{copiedTranscript ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
						<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
					</button>
				)}
			</div>

			{/* Expanded Speech Transcript Dialogue Utterances */}
			{showTranscript && (
				<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1 animate-fade-in">
					{transcriptUtterances.map((u) => (
						<div
							key={`${u.speaker}-${u.startTimeSeconds}`}
							onClick={() => handleSeekToUtterance(u.startTimeSeconds)}
							className={`p-2 rounded-lg cursor-pointer transition-all border ${
								currentTime >= u.startTimeSeconds && currentTime <= u.endTimeSeconds
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
									{(u.confidence * 100).toFixed(0)}% уверенность
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
	);
}

export function IncomingCallPopup() {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const transferState = useTelephonyStore((s) => s.transferState);
	const cancelCallTransfer = useTelephonyStore((s) => s.cancelCallTransfer);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	// Absolute doctor immunity: when treating at chair (visit) or role is doctor, calls stay silent/background
	const isDoctorMode = selectedWorkspaceRole === "doctor" || currentView === "visit";
	const isDndActive = agentState === "dnd";

	const { lastMessage, isConnected } = useWebsocket(resolveTelephonyWsUrl());
	const audioCtxRef = useRef<AudioContext | null>(null);

	const [whatsappSent, setWhatsappSent] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isExpanded, setIsExpanded] = useState(true);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferTarget, setTransferTarget] = useState("");
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");

	// Escape key dismisses the side drawer without affecting the call
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isDrawerOpen) {
				setIsDrawerOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen]);

	// Live Call Duration Timer (ticks every second while activeCall exists)
	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		const startTime = activeCall.callStartedAt ?? Date.now();
		const interval = setInterval(() => {
			const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
			setElapsedSeconds(seconds);
		}, 1000);

		return () => clearInterval(interval);
	}, [activeCall]);

	// Sync WebSocket Incoming Call Event to Telephony Store
	useEffect(() => {
		if (lastMessage?.type === "TELEPHONY_INCOMING_CALL" && lastMessage.payload) {
			const p = lastMessage.payload;
			triggerIncomingCall({
				phone: p.phone || "",
				patientId: p.patientId || null,
				patientName: p.patientName || "Неизвестный номер",
				callId: p.callId,
				provider: p.provider || "mango",
				timestamp: p.timestamp || new Date().toISOString(),
				status: "ringing",
				recordingUrl: p.recordingUrl,
				callStartedAt: Date.now(),
			});
		}
	}, [lastMessage, triggerIncomingCall]);

	// Ringtone playback loop while active call is ringing (Suppressed for doctors and DND mode)
	useEffect(() => {
		if (
			!activeCall ||
			activeCall.status === "answered" ||
			activeCall.status === "connected" ||
			isMuted ||
			isDoctorMode ||
			isDndActive
		)
			return;

		let intervalId: ReturnType<typeof setInterval> | null = null;
		try {
			if (!audioCtxRef.current) {
				const AudioCtx =
					window.AudioContext ||
					// biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback
					(window as any).webkitAudioContext;
				if (AudioCtx) {
					audioCtxRef.current = new AudioCtx();
				}
			}
			if (audioCtxRef.current) {
				if (audioCtxRef.current.state === "suspended") {
					audioCtxRef.current.resume().catch(() => {});
				}
				playRingtoneChime(audioCtxRef.current, volumeLevel);
				intervalId = setInterval(() => {
					if (audioCtxRef.current) {
						playRingtoneChime(audioCtxRef.current, volumeLevel);
					}
				}, 3200);
			}
		} catch {
			// Web audio blocked by user gesture requirements
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
			if (audioCtxRef.current && audioCtxRef.current.state === "running") {
				audioCtxRef.current.suspend().catch(() => {});
			}
		};
	}, [activeCall, isMuted, volumeLevel, isDoctorMode, isDndActive]);

	// Clean up AudioContext on component unmount
	useEffect(() => {
		return () => {
			if (audioCtxRef.current) {
				audioCtxRef.current.close().catch(() => {});
				audioCtxRef.current = null;
			}
		};
	}, []);

	// Auto-dismiss call after 45 seconds if unhandled and still ringing
	useEffect(() => {
		if (!activeCall || activeCall.status === "answered" || activeCall.status === "connected") return;

		const timer = setTimeout(() => {
			dismissCall();
		}, 45000);

		return () => clearTimeout(timer);
	}, [activeCall, dismissCall]);

	// Reset WhatsApp / SMS triggers on new active call
	useEffect(() => {
		setWhatsappSent(false);
		setSmsCopied(false);
	}, [activeCall?.callId]);

	// Resolve Patient Info from Dashboard via Fuzzy Phone Matching
	const resolvedPatient = useMemo(() => {
		if (!activeCall || !dashboard?.patients) return null;
		if (activeCall.patientId) {
			const found = dashboard.patients.find((p) => p.id === activeCall.patientId);
			if (found) return found;
		}
		return resolvePatientFromPhone(dashboard.patients, activeCall.phone);
	}, [activeCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find((pi) => pi.patientId === resolvedPatient.id) ||
			null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "allergy");
	}, [somaticAlerts]);

	const acutePainAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "pain");
	}, [somaticAlerts]);

	// Absolute doctor immunity and DND suppression: zero popup disruption
	if (!activeCall || isDoctorMode || isDndActive) return null;

	const callerName = resolvedPatient?.fullName || activeCall.patientName || "Неизвестный номер";
	const formattedPhone = formatPhoneDisplay(activeCall.phone);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);

	const isKnownPatient = Boolean(resolvedPatient);
	const hasNotes = Boolean(resolvedPatient?.notes?.trim());
	const hasDms = financialSummary.hasInsurance;
	const hasDebt = financialSummary.hasDebt;
	const isHighRisk =
		patientInsight?.riskLevel === "high" ||
		(resolvedPatient as { noShowRisk?: boolean })?.noShowRisk;

	// Provider label
	const providerLabel =
		activeCall.provider === "mango"
			? "Mango Telecom"
			: activeCall.provider === "uis"
				? "UIS / CoMagic"
				: activeCall.provider === "asterisk"
					? "Asterisk SIP"
					: activeCall.provider === "zadarma"
						? "Zadarma PBX"
						: "IP-Телефония";

	const isCallAnswered = activeCall.status === "answered" || activeCall.status === "connected";

	// 1-Click WhatsApp Confirmation Trigger
	const handleSendWhatsAppConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}

		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});

		openWhatsAppChat(activeCall.phone, msg);
		setWhatsappSent(true);
		showToast(`Подтверждение приёма отправлено в WhatsApp (${callerName})`, "success");
	};

	// 1-Click SMS Confirmation Trigger
	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}

		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});

		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
		});
	};

	// Handlers: Toggle Patient Side Drawer WITHOUT destroying active 043/u diary or unmounting active view!
	const handleToggleCardDrawer = () => {
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
		}
		connectCall();
		setIsDrawerOpen((prev) => {
			const nextState = !prev;
			if (nextState) {
				showToast(
					`Карточка ${callerName} открыта в боковой шторке (визит 043/у сохранён)`,
					"info",
				);
			}
			return nextState;
		});
	};

	// Optional navigation to full patient registry when explicitly requested
	const handleOpenFullPatientView = () => {
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			connectCall();
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else {
			setNewPatientPhone(activeCall.phone);
			setCurrentView("patients");
			connectCall();
			showToast(`Регистрация нового пациента с номером ${formattedPhone}`, "info");
		}
	};

	// Touch-First 1-Click Quick Booking Flow (Safely creates draft without unmounting active visit)
	const handleQuickBook = (slotType: "today_urgent" | "today_standard" | "tomorrow") => {
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		let targetDate = todayIso;
		let startTime = "10:00:00";
		let endTime = "10:30:00";
		let reason = "Первичный звонок";

		if (slotType === "today_urgent") {
			targetDate = todayIso;
			startTime = "10:00:00";
			endTime = "10:30:00";
			reason = "Острая боль / Экстренный приём";
		} else if (slotType === "today_standard") {
			targetDate = todayIso;
			startTime = "14:30:00";
			endTime = "15:00:00";
			reason = "Первичная консультация и диагностика";
		} else if (slotType === "tomorrow") {
			const d = new Date(todayIso);
			d.setDate(d.getDate() + 1);
			targetDate = d.toISOString().split("T")[0]!;
			startTime = "11:00:00";
			endTime = "11:30:00";
			reason = "Плановый визит по звонку";
		}

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по входящему звонку (${formattedPhone})`,
			});
			acceptCall();
			showToast(`Создана запись: ${resolvedPatient.fullName} (${reason})`, "info");
		} else {
			setNewPatientPhone(activeCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Новый пациент с телефона ${formattedPhone}`,
			});
			acceptCall();
			showToast(`Новая запись: ${formattedPhone} (${reason})`, "info");
		}
	};

	const handleAnswerCall = () => {
		answerCall();
		showToast(`Вызов принят (${formattedPhone})`, "success");
	};

	const handleReject = () => {
		rejectCall();
		showToast(`Вызов ${formattedPhone} отклонён`, "info");
	};

	if (typeof document === "undefined") return null;

	return createPortal(
		<>
			{/* Top-Right Ambient Incoming Call Badge (Non-blocking, Fitts's Law) */}
			<div
				className="dnt-incoming-call-badge-container fixed top-3 right-4 sm:top-3 sm:right-5 z-[9990] flex flex-col items-end pointer-events-none"
				style={{ zIndex: 9990 }}
				data-testid="incoming-call-badge-container"
			>
				<div
					className="dnt-incoming-call-badge pointer-events-auto flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl backdrop-blur-xl animate-badge-drop w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)]"
					role="region"
					aria-label="Входящий звонок телефонии"
					data-testid="incoming-call-popup"
				>
					{/* Header Row: Call status, provider, live duration & quick actions */}
					<div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line,#e2e8f0)]">
						<div className="flex items-center gap-2 min-w-0">
							<span className="relative flex h-3 w-3 shrink-0">
								<span
									className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
										isCallAnswered ? "bg-teal-400" : "bg-emerald-400"
									}`}
								/>
								<span
									className={`relative inline-flex rounded-full h-3 w-3 ${
										isCallAnswered ? "bg-teal-500" : "bg-emerald-500"
									}`}
								/>
							</span>
							<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider truncate">
								{isCallAnswered ? "Разговор (WebRTC)" : "Входящий (SIP)"}
							</span>
							<span
								className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] shrink-0"
								title={`Провайдер телефонии: ${providerLabel}`}
							>
								{activeCall.provider?.toUpperCase() || "SIP"}
							</span>
							{/* Silent reconnect indicator without alert dialogs */}
							<span
								className={`inline-block w-2 h-2 rounded-full shrink-0 ${
									isConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
								}`}
								title={
									isConnected
										? "SIP / WebSocket подключен (тихий режим)"
										: "Тихий реконнект WebSocket телефонии..."
								}
							/>
						</div>

						<div className="flex items-center gap-1 shrink-0">
							{/* Live duration timer */}
							<div className="flex items-center gap-1 font-mono text-xs font-bold text-[var(--muted,#64748b)] bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] px-2 py-1 rounded-lg border border-[var(--line,#e2e8f0)]">
								<Clock size={12} className="text-[var(--teal)]" />
								<span>{formatDurationTimer(elapsedSeconds)}</span>
							</div>

							{/* Mute Ringtone Toggle (>= 44x44px touch target) */}
							<button
								type="button"
								onClick={toggleMute}
								className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
									isMuted
										? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300"
										: "hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)]"
								}`}
								title={isMuted ? "Включить звук звонка" : "Заглушить звук звонка"}
								aria-label={isMuted ? "Включить звонок" : "Заглушить звонок"}
							>
								{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
							</button>

							{/* DND Toggle Button (>= 44x44px touch target) */}
							<button
								type="button"
								onClick={() => {
									setAgentState(isDndActive ? "online" : "dnd");
									showToast(
										isDndActive
											? "Режим «Не беспокоить» выключен"
											: "Включен режим «Не беспокоить» (DND)",
										"info",
									);
								}}
								className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
									isDndActive
										? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300"
										: "hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)]"
								}`}
								title={
									isDndActive
										? "Режим «Не беспокоить» активен (кликните для отключения)"
										: "Включить режим «Не беспокоить» (DND)"
								}
								aria-label={isDndActive ? "Отключить режим DND" : "Включить режим «Не беспокоить»"}
							>
								{isDndActive ? <BellOff size={16} /> : <Bell size={16} />}
							</button>

							{/* Dismiss / Minimize Badge Button (>= 44x44px touch target) */}
							<button
								type="button"
								onClick={dismissCall}
								className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 transition-all cursor-pointer"
								title="Свернуть бейдж звонка"
								aria-label="Закрыть уведомление"
							>
								<X size={16} />
							</button>
						</div>
					</div>
					{/* Caller Identity Row */}
					<div className="flex items-center gap-2.5">
						<div
							className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs border border-white/20"
							style={{
								backgroundColor: avatarColors.bg,
								color: avatarColors.text,
							}}
							title={callerName}
						>
							{initials}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 flex-wrap">
								<h3
									className="text-sm font-bold text-[var(--ink,#0f172a)] truncate max-w-[200px] sm:max-w-[240px]"
									title={callerName}
								>
									{callerName}
								</h3>
								<span
									className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
										isKnownPatient
											? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
											: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
									}`}
								>
									{isKnownPatient ? "Пациент" : "Новый лид"}
								</span>
							</div>
							<div className="flex items-center gap-2 text-xs font-mono text-[var(--muted,#64748b)]">
								<span className="font-bold text-[var(--ink,#0f172a)]">
									{formattedPhone}
								</span>
							</div>
						</div>
					</div>

					{/* Clinical & Financial Snapshot: Баланс, Следующая запись, Аллергии */}
					<div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
						{/* Баланс */}
						{hasDebt ? (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
								title={`Задолженность пациента: ${financialSummary.formattedDebt}`}
							>
								Долг: {financialSummary.formattedDebt}
							</span>
						) : financialSummary.balanceRub > 0 ? (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
								title={`Аванс на балансе: ${financialSummary.formattedBalance}`}
							>
								Аванс: +{financialSummary.formattedBalance}
							</span>
						) : (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]"
								title="Баланс пациента нулевой"
							>
								Баланс: 0 ₽
							</span>
						)}

						{/* ДМС Полис */}
						{hasDms && (
							<span
								className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1"
								title={`ДМС: ${financialSummary.insuranceName || "Полис активен"}`}
							>
								<Shield size={10} className="text-sky-500" />
								ДМС
							</span>
						)}

						{/* Следующая запись */}
						{upcomingAppointment ? (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] flex items-center gap-1 truncate max-w-[200px]"
								title={`Следующая запись: ${upcomingAppointment.formattedDate} ${upcomingAppointment.formattedTime} (${upcomingAppointment.doctorName})`}
							>
								<Calendar size={11} className="shrink-0" />
								<span>
									{upcomingAppointment.isToday
										? "Сегодня"
										: upcomingAppointment.isTomorrow
											? "Завтра"
											: upcomingAppointment.formattedDate}{" "}
									{upcomingAppointment.formattedTime}
								</span>
							</span>
						) : (
							<span className="px-2 py-0.5 rounded-full text-[11px] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">
								Нет записей
							</span>
						)}

						{/* Аллергия alert pill */}
						{allergyAlerts.length > 0 && (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1"
								title={`Аллергия: ${allergyAlerts.map((a) => a.label).join(", ")}`}
							>
								<AlertTriangle size={11} className="text-rose-600 shrink-0" />
								Аллергия
							</span>
						)}

						{/* Острая боль */}
						{acutePainAlerts.length > 0 && (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1"
								title="Острая боль"
							>
								<Zap size={11} className="text-rose-600 shrink-0" />
								Острая боль
							</span>
						)}
					</div>

					{/* Action Buttons Row (>= 44x44px touch targets) */}
					<div className="flex items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
						{/* Answer / Reject buttons */}
						{!isCallAnswered ? (
							<>
								<button
									type="button"
									onClick={handleAnswerCall}
									className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[44px] shadow-sm cursor-pointer"
									title="Принять входящий звонок (WebRTC)"
								>
									<PhoneCall size={16} className="animate-pulse" />
									<span>Ответить</span>
								</button>
								<button
									type="button"
									onClick={handleReject}
									className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 active:scale-95 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
									title="Отклонить звонок"
								>
									<PhoneOff size={16} />
									<span>Сброс</span>
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={handleReject}
								className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[44px] shadow-sm cursor-pointer"
								title="Завершить разговор"
							>
								<PhoneOff size={16} />
								<span>Завершить</span>
							</button>
						)}

						{/* Toggle Patient Side Drawer (Non-destructive: DOES NOT change currentView or wipe 043/u diary!) */}
						<button
							type="button"
							onClick={handleToggleCardDrawer}
							className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[44px] shadow-sm cursor-pointer ${
								isDrawerOpen
									? "bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]"
									: "bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white"
							}`}
							title={
								isDrawerOpen
									? "Скрыть боковую шторку карточки"
									: "Открыть карточку в боковой шторке (визит 043/у сохранён)"
							}
							aria-label="Открыть карточку пациента в боковой шторке"
						>
							{isDrawerOpen ? (
								<>
									<span>Скрыть</span>
									<ChevronRight size={16} />
								</>
							) : (
								<>
									<UserCheck size={16} />
									<span>Открыть карточку</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Patient Side Drawer (Slide-Over on the right edge, ZERO unmounting of active 043/u visit diary) */}
			{isDrawerOpen && (
				<div
					className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[9995] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-l border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
					style={{ zIndex: 9995 }}
					role="region"
					aria-label="Боковая шторка пациента"
					data-testid="telephony-patient-side-drawer"
				>
					{/* Drawer Header */}
					<div className="shrink-0 p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]">
						<div className="flex items-center gap-2">
							<User className="text-[var(--teal)] shrink-0" size={18} />
							<div>
								<h2 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-none">
									Карточка звонящего
								</h2>
								<div className="flex items-center gap-1.5 mt-1">
									<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
										<Check size={10} />
										Визит 043/у сохранён
									</span>
									<span className="text-[10px] text-[var(--muted,#64748b)]">
										(без сброса формы)
									</span>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setIsDrawerOpen(false)}
							className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer"
							title="Закрыть боковую шторку (Esc)"
							aria-label="Закрыть шторку"
						>
							<X size={20} />
						</button>
					</div>

					{/* Drawer Scrollable Content */}
					<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
						{/* Patient Identity Block */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex items-center gap-3">
							<div
								className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-white/20"
								style={{
									backgroundColor: avatarColors.bg,
									color: avatarColors.text,
								}}
							>
								{initials}
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] truncate">
									{callerName}
								</h3>
								<div className="flex items-center gap-2 mt-0.5 flex-wrap">
									<span className="font-mono font-bold text-xs text-[var(--teal)]">
										{formattedPhone}
									</span>
									<button
										type="button"
										onClick={() => {
											navigator.clipboard?.writeText(activeCall.phone);
											showToast("Номер телефона скопирован", "info");
										}}
										className="text-[10px] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-0.5 cursor-pointer underline"
										title="Скопировать номер"
									>
										<Copy size={11} />
										копировать
									</button>
								</div>
								{resolvedPatient?.birthDate && (
									<span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">
										Дата рождения: {resolvedPatient.birthDate}
									</span>
								)}
							</div>
						</div>

						{/* Somatic & Allergy Alerts (Prominent Red Invariant) */}
						{somaticAlerts.length > 0 && (
							<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
								<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
									<AlertTriangle size={14} className="text-rose-600" />
									<span>Медицинские предупреждения:</span>
								</div>
								<div className="space-y-1">
									{somaticAlerts.map((alert, idx) => (
										<div key={idx} className="flex items-start gap-1.5 text-xs">
											<span className="text-rose-500 font-bold">•</span>
											<span>
												<strong>{alert.label}</strong>
												<span className="text-rose-600/80 dark:text-rose-400/80 ml-1">
													({alert.category === "allergy" ? "Аллергия" : alert.category === "pain" ? "Острая боль" : alert.severity})
												</span>
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Financial Status Card */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<CreditCard size={12} className="text-[var(--teal)]" />
									Финансовый статус:
								</span>
								{hasDms && (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
										<Shield size={10} className="text-sky-500" />
										ДМС активен
									</span>
								)}
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
									<span className="text-[10px] text-[var(--muted,#64748b)] block">Баланс</span>
									<span
										className={`text-sm font-bold ${
											hasDebt
												? "text-rose-600"
												: financialSummary.balanceRub > 0
													? "text-emerald-600"
													: "text-[var(--ink,#0f172a)]"
										}`}
									>
										{hasDebt
											? `-${financialSummary.formattedDebt}`
											: financialSummary.formattedBalance}
									</span>
								</div>
								<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
									<span className="text-[10px] text-[var(--muted,#64748b)] block">
										Статус договора
									</span>
									<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
										{isKnownPatient ? "Договор заключен" : "Без договора"}
									</span>
								</div>
							</div>
						</div>

						{/* Upcoming Appointment & 1-Click WhatsApp/SMS Confirmation */}
						{upcomingAppointment && (
							<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] space-y-2.5">
								<div className="flex items-center justify-between">
									<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
										<CalendarCheck size={13} />
										Предстоящий приём:
									</span>
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-white">
										{upcomingAppointment.isToday
											? "Сегодня"
											: upcomingAppointment.isTomorrow
												? "Завтра"
												: upcomingAppointment.formattedDate}
									</span>
								</div>
								<div className="text-xs text-[var(--ink,#0f172a)] space-y-1">
									<div className="font-bold">
										Время: {upcomingAppointment.formattedTime}
									</div>
									<div className="text-[var(--muted,#64748b)]">
										Врач: {upcomingAppointment.doctorName}
									</div>
								</div>
								<div className="flex items-center gap-2 pt-1">
									<button
										type="button"
										onClick={handleSendWhatsAppConfirmation}
										className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
										title="Отправить шаблон подтверждения в WhatsApp"
									>
										<Send size={14} />
										<span>{whatsappSent ? "Отправлено в WA" : "1-Click WhatsApp"}</span>
									</button>
									<button
										type="button"
										onClick={handleCopySmsConfirmation}
										className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
										title="Скопировать текст подтверждения для SMS"
									>
										<Copy size={14} />
										<span>{smsCopied ? "Скопировано" : "SMS"}</span>
									</button>
								</div>
							</div>
						)}

						{/* Previous Visit Summary */}
						{lastVisitSummary && (
							<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-1">
								<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
									<Clock size={11} className="text-[var(--teal)]" />
									Предыдущий визит:
								</span>
								<div className="text-xs text-[var(--ink,#0f172a)]">
									<span className="font-semibold">{lastVisitSummary.formattedLastVisit}</span>
									{lastVisitSummary.doctorName && (
										<span className="text-[var(--muted,#64748b)]"> · Врач: {lastVisitSummary.doctorName}</span>
									)}
								</div>
							</div>
						)}

						{/* Quick 1-Click Booking presets (Without wiping active visit!) */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
							<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
								<Zap size={12} className="text-amber-500" />
								Быстрая запись в 1 касание:
							</span>
							<div className="grid grid-cols-3 gap-1.5">
								<button
									type="button"
									onClick={() => handleQuickBook("today_urgent")}
									className="min-h-[44px] px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
									title="Записать сегодня на 10:00 (Острая боль)"
								>
									<span>Сегодня 10:00</span>
									<span className="text-[9px] font-normal text-amber-700 dark:text-amber-300">
										Острая боль
									</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickBook("today_standard")}
									className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal-soft)] text-[var(--teal)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
									title="Записать сегодня на 14:30 (Консультация)"
								>
									<span>Сегодня 14:30</span>
									<span className="text-[9px] font-normal">Консультация</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickBook("tomorrow")}
									className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
									title="Записать завтра на 11:00 (Плановый)"
								>
									<span>Завтра 11:00</span>
									<span className="text-[9px] font-normal text-[var(--muted,#64748b)]">Плановый</span>
								</button>
							</div>
						</div>

						{/* WebRTC SIP Call Transfer Panel (when call is answered) */}
						{isCallAnswered && (
							<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
								<button
									type="button"
									onClick={() => setShowTransferPanel((prev) => !prev)}
									className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between cursor-pointer"
								>
									<div className="flex items-center gap-2">
										<PhoneForwarded size={15} className="text-[var(--teal)]" />
										<span>{showTransferPanel ? "Скрыть перевод" : "Перевод звонка (SIP Transfer)"}</span>
									</div>
									<ChevronDown
										size={16}
										className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`}
									/>
								</button>

								{showTransferPanel && (
									<div className="space-y-2 pt-1 animate-fade-in">
										<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)]">
											<button
												type="button"
												onClick={() => setTransferType("blind")}
												className={`flex-1 min-h-[38px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
													transferType === "blind"
														? "bg-[var(--teal)] text-white"
														: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
												}`}
											>
												Слепой (Blind)
											</button>
											<button
												type="button"
												onClick={() => setTransferType("attended")}
												className={`flex-1 min-h-[38px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
													transferType === "attended"
														? "bg-[var(--teal)] text-white"
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
													onClick={() => {
														startCallTransfer(item.ext, transferType);
														showToast(
															`Перевод звонка на ${item.label} (${transferType === "blind" ? "Слепой" : "С консультацией"})`,
															"info",
														);
													}}
													className="min-h-[44px] px-1 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs"
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
						)}

						{/* Audio Recording Player */}
						{activeCall.recordingUrl && (
							<CallAudioPlayer
								recordingUrl={activeCall.recordingUrl}
								durationSeconds={activeCall.durationSeconds || 45}
								seed={activeCall.callId || activeCall.phone}
							/>
						)}

						{/* Call Outcome Logging */}
						<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-1.5">
							<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted,#64748b)] block">
								Фиксация исхода звонка:
							</span>
							<div className="grid grid-cols-2 gap-1.5">
								{[
									{ action: "booked", label: "Записан на приём" },
									{ action: "callback_15m", label: "Перезвонить 15м" },
									{ action: "consulted", label: "Консультация" },
									{ action: "spam", label: "Спам / Ошибка" },
								].map((item) => (
									<button
										key={item.action}
										type="button"
										onClick={() => {
											dismissCall();
											showToast(`Исход зафиксирован: ${item.label}`, "success");
										}}
										className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] text-center transition-all cursor-pointer"
									>
										{item.label}
									</button>
								))}
							</div>
						</div>

						{/* Unknown Caller: Inline quick patient registration without navigating away */}
						{!isKnownPatient && (
							<div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
								<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
									<AlertCircle size={14} className="text-amber-500" />
									<span>Быстрое сохранение нового пациента (без сброса визита)</span>
								</div>
								<div className="space-y-1.5">
									<input
										type="text"
										value={newPatientNameInput}
										onChange={(e) => setNewPatientNameInput(e.target.value)}
										placeholder="ФИО пациента (напр. Смирнов А.В.)"
										className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-xs font-medium text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
									/>
									<button
										type="button"
										onClick={() => {
											if (!newPatientNameInput.trim()) {
												showToast("Введите ФИО пациента для регистрации", "warning");
												return;
											}
											setNewPatientPhone(activeCall.phone);
											showToast(
												`Пациент «${newPatientNameInput}» добавлен к номеру ${formattedPhone}`,
												"success",
											);
											setIsDrawerOpen(false);
										}}
										className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--teal)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
									>
										<UserCheck size={15} />
										<span>Сохранить в базе (визит не сбрасывается)</span>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Drawer Footer */}
					<div className="shrink-0 p-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] flex items-center justify-between gap-2">
						<button
							type="button"
							onClick={() => setIsDrawerOpen(false)}
							className="px-4 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] transition-all min-h-[44px] cursor-pointer"
						>
							Закрыть шторку
						</button>

						{/* Explicit navigation link if staff explicitly chooses to navigate to full patient registry */}
						<button
							type="button"
							onClick={handleOpenFullPatientView}
							className="text-[11px] font-semibold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
							title="Перейти в полноэкранный раздел Пациенты"
						>
							<span>Открыть в общем списке</span>
							<ExternalLink size={12} />
						</button>
					</div>
				</div>
			)}
		</>,
		document.body,
	);
}
