import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	CalendarCheck,
	CalendarPlus,
	Check,
	ChevronDown,
	Clock,
	Copy,
	CreditCard,
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
	Sliders,
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
					className="text-xs font-bold text-[var(--teal)] hover:opacity-90 inline-flex items-center gap-1.5 min-h-[36px] py-1 transition-colors"
					aria-expanded={showTranscript}
				>
					<Sparkles size={13} className="text-amber-500" />
					<span>{showTranscript ? "Скрыть расшифровку речи" : "Показать расшифровку речи (AI STT)"}</span>
				</button>

				{showTranscript && (
					<button
						type="button"
						onClick={handleCopyTranscript}
						className="text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] transition-colors"
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
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const transferState = useTelephonyStore((s) => s.transferState);
	const cancelCallTransfer = useTelephonyStore((s) => s.cancelCallTransfer);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const openSimulator = useTelephonyStore((s) => s.openSimulator);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const { lastMessage } = useWebsocket(resolveTelephonyWsUrl());
	const audioCtxRef = useRef<AudioContext | null>(null);

	const [whatsappSent, setWhatsappSent] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isExpanded, setIsExpanded] = useState(true);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferTarget, setTransferTarget] = useState("");
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");

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

	// Ringtone playback loop while active call is ringing
	useEffect(() => {
		if (!activeCall || activeCall.status === "answered" || isMuted) return;

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
		};
	}, [activeCall, isMuted, volumeLevel]);

	// Auto-dismiss call after 45 seconds if unhandled and still ringing
	useEffect(() => {
		if (!activeCall || activeCall.status === "answered") return;

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

	if (!activeCall) return null;

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

	const isCallAnswered = activeCall.status === "answered";

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

	// Handlers
	const handleOpenCard = () => {
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			acceptCall();
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else {
			setNewPatientPhone(activeCall.phone);
			setCurrentView("patients");
			acceptCall();
			showToast(`Регистрация нового пациента с номером ${formattedPhone}`, "info");
		}
	};

	// Touch-First 1-Click Quick Booking Flow
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
			setCurrentView("schedule");
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
			setCurrentView("schedule");
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
		<div
			className="dnt-incoming-call-overlay fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-end justify-center sm:justify-end p-3 sm:p-6"
			style={{ zIndex: 9999 }}
		>
			<div
				className="dnt-incoming-call-popup w-full sm:w-[460px] max-w-[calc(100vw-24px)] max-h-[88vh] flex flex-col gap-3 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl p-4 sm:p-5 backdrop-blur-xl animate-slide-in overflow-y-auto overscroll-contain"
				style={{
					boxShadow:
						"0 20px 40px -15px rgba(0,0,0,0.3), 0 0 20px 2px rgba(15,118,110,0.18)",
					maxHeight: "88vh",
					overflowY: "auto",
					overscrollBehavior: "contain",
					paddingBottom: "24px",
				}}
				role="dialog"
				aria-labelledby="incoming-call-title"
				aria-modal="true"
				data-testid="incoming-call-popup"
			>
			{/* Top Bar: WebRTC / SIP Status, Live Duration Timer & Controls */}
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2">
					<span className="relative flex h-3 w-3">
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
								isCallAnswered ? "bg-emerald-400" : "bg-[var(--teal)]"
							}`}
						/>
						<span
							className={`relative inline-flex rounded-full h-3 w-3 ${
								isCallAnswered ? "bg-emerald-500" : "bg-[var(--teal)]"
							}`}
						/>
					</span>

					<div
						className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider ${
							isCallAnswered ? "text-emerald-500 dark:text-emerald-400" : "text-[var(--teal)]"
						}`}
					>
						{isCallAnswered ? (
							<PhoneCall size={14} className="animate-pulse" />
						) : (
							<PhoneIncoming size={14} className="animate-pulse" />
						)}
						<span id="incoming-call-title">
							{isCallAnswered ? "Разговор (WebRTC)" : "Входящий (SIP)"}
						</span>
					</div>

					{/* Live Duration Timer */}
					<span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] flex items-center gap-1">
						<Clock size={10} className="text-[var(--teal)]" />
						<span>{formatDurationTimer(elapsedSeconds)}</span>
					</span>

					<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] hidden sm:inline">
						{providerLabel}
					</span>
				</div>

				<div className="flex items-center gap-1">
					{/* Mute Ringtone Toggle >= 44x44px */}
					<button
						type="button"
						onClick={toggleMute}
						className="text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors rounded-lg p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						title={isMuted ? "Включить звонок" : "Отключить звук"}
						aria-label={isMuted ? "Включить звонок" : "Отключить звук"}
					>
						{isMuted ? (
							<VolumeX size={17} className="text-rose-500" />
						) : (
							<Volume2 size={17} />
						)}
					</button>

					{/* Simulator Modal Launcher >= 44x44px */}
					<button
						type="button"
						onClick={openSimulator}
						className="text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors rounded-lg p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						title="Открыть симулятор телефонии"
						aria-label="Симулятор SIP телефонии"
					>
						<Sliders size={17} />
					</button>

					{/* Dismiss X >= 44x44px */}
					<button
						type="button"
						onClick={dismissCall}
						className="text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors rounded-lg p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						aria-label="Свернуть уведомление"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			{/* Patient Profile Card */}
			<div className="flex items-start gap-3.5 pt-1">
				{/* Avatar */}
				<div
					className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner border"
					style={{
						backgroundColor: avatarColors.bg,
						color: avatarColors.text,
						borderColor: avatarColors.border,
					}}
				>
					{isKnownPatient ? (
						initials
					) : (
						<User size={22} className="opacity-80" />
					)}
				</div>

				{/* Identity Info - Clean 2-Line Name Wrap */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] leading-snug break-words line-clamp-2 max-w-full">
							{callerName}
						</h3>
						{isKnownPatient ? (
							<span
								className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-md self-start"
								title="Пациент зарегистрирован в клинике"
							>
								<UserCheck size={11} /> Пациент
							</span>
						) : (
							<span
								className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md self-start"
								title="Номер не найден в базе пациентов"
							>
								<AlertCircle size={11} /> Новый лид
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--muted,#64748b)] mt-0.5">
						<Phone size={13} className="text-[var(--teal)] shrink-0" />
						<span className="font-mono">{formattedPhone}</span>
					</div>
				</div>
			</div>

			{/* 1-Click Upcoming Appointment Confirmation Card */}
			{upcomingAppointment && (
				<div className="p-3 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex flex-col gap-2 shadow-xs">
					<div className="flex flex-wrap items-center justify-between text-xs gap-1.5">
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal)] min-w-0">
							<CalendarCheck size={14} className="text-[var(--teal)] flex-shrink-0" />
							<span className="break-words">
								{upcomingAppointment.isToday
									? "Запись сегодня"
									: upcomingAppointment.isTomorrow
										? "Запись завтра"
										: `Запись: ${upcomingAppointment.formattedDate}`}
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

					<div className="flex items-center gap-2 mt-1 shrink-0">
						{/* 1-Click WhatsApp Trigger >= 44px */}
						<button
							type="button"
							onClick={handleSendWhatsAppConfirmation}
							className="flex-1 min-h-[44px] h-11 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0 truncate cursor-pointer"
							title="Отправить сообщение с подтверждением записи в WhatsApp"
						>
							<MessageSquare size={14} className="shrink-0" />
							<span className="truncate">{whatsappSent ? "Отправлено ✓" : "1-Click WhatsApp"}</span>
						</button>

						{/* 1-Click SMS Copy/Trigger >= 44px */}
						<button
							type="button"
							onClick={handleCopySmsConfirmation}
							className="min-h-[44px] h-11 px-3 py-2 rounded-lg bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-semibold border border-[var(--line,#e2e8f0)] transition-all inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
							title="Скопировать текст SMS-подтверждения"
						>
							{smsCopied ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="shrink-0" />}
							<span>{smsCopied ? "Скопировано" : "SMS"}</span>
						</button>
					</div>
				</div>
			)}

			{/* Softphone Audio Recording Playback with Waveform Scrubbing (if recordingUrl present) */}
			{activeCall.recordingUrl && (
				<CallAudioPlayer
					recordingUrl={activeCall.recordingUrl}
					durationSeconds={activeCall.durationSeconds || 45}
					seed={activeCall.callId || activeCall.phone}
				/>
			)}

			{/* Clinical & Financial Summary Panel */}
			<div className="grid grid-cols-2 gap-2 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] rounded-xl p-3 border border-[var(--line,#e2e8f0)] text-xs">
				{/* Financial Balance */}
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
						<CreditCard size={11} className="text-[var(--teal)]" />
						Баланс / Долг:
					</span>
					<div className="flex items-baseline gap-1.5">
						<span
							className={`font-black text-sm ${
								financialSummary.balanceRub < 0
									? "text-rose-600 dark:text-rose-400"
									: financialSummary.balanceRub > 0
										? "text-emerald-600 dark:text-emerald-400"
										: "text-[var(--ink,#0f172a)]"
							}`}
						>
							{financialSummary.formattedBalance}
						</span>
						{hasDebt && (
							<span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-300 dark:border-rose-800/40">
								Долг {financialSummary.formattedDebt}
							</span>
						)}
					</div>
				</div>

				{/* Insurance Status */}
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
						<Shield size={11} className="text-[var(--info-fg,#0284c7)]" />
						Страховка / ДМС:
					</span>
					<span className="font-semibold text-[11px] leading-tight text-[var(--ink,#0f172a)] break-words">
						{hasDms
							? financialSummary.insuranceName || "Полис ДМС активен"
							: "Без полиса ДМС"}
					</span>
				</div>

				{/* Last Visit */}
				<div className="col-span-2 pt-2 mt-1 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
					<div className="flex items-start gap-1.5 text-[11px] min-w-0">
						<Calendar
							size={13}
							className="text-[var(--teal)] mt-0.5 flex-shrink-0"
						/>
						<div className="min-w-0">
							<span className="text-[var(--muted,#64748b)]">Последний визит: </span>
							<strong className="text-[var(--ink,#0f172a)] font-semibold break-words">
								{lastVisitSummary.formattedLastVisit}
							</strong>
						</div>
					</div>

					{lastVisitSummary.doctorName && (
						<div className="flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)] flex-wrap">
							<Stethoscope
								size={12}
								className="text-[var(--teal)] flex-shrink-0"
							/>
							<span className="font-medium text-[var(--ink,#0f172a)] break-words">{lastVisitSummary.doctorName}</span>
						</div>
					)}
				</div>
			</div>

			{/* Smart Telephony Script & Clinical Warnings */}
			<div className="space-y-1.5 text-xs">
				{!isKnownPatient && (
					<div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
						<AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
						<span>
							Новое обращение! Уточните причину и предложите первичную диагностику.
						</span>
					</div>
				)}

				{hasDebt && (
					<div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200 px-2.5 py-1.5 rounded-lg font-medium">
						<AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
						<span>
							Внимание: у пациента задолженность {financialSummary.formattedDebt}.
							Согласуйте погашение.
						</span>
					</div>
				)}

				{isHighRisk && (
					<div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-700/30 text-rose-900 dark:text-rose-300 px-2.5 py-1.5 rounded-lg font-medium">
						<ShieldAlert size={14} className="text-rose-500 flex-shrink-0" />
						<span>Риск неявки (No-Show). Подтвердите запись и время дважды!</span>
					</div>
				)}

				{hasNotes && (
					<div className="flex items-start gap-2 bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] border border-[var(--line,#e2e8f0)] px-2.5 py-1.5 rounded-lg text-[var(--muted,#64748b)] italic">
						<FileText
							size={13}
							className="mt-0.5 text-[var(--teal)] flex-shrink-0 not-italic"
						/>
						<span className="line-clamp-2">«{resolvedPatient?.notes}»</span>
					</div>
				)}
			</div>

			{/* Touch-First 1-Click Booking Flow Presets (>=44px touch targets) */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					<span className="flex items-center gap-1">
						<Zap size={11} className="text-amber-500" />
						Быстрая запись в 1 касание:
					</span>
				</div>
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={() => handleQuickBook("today_urgent")}
						className="min-h-[44px] px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight shadow-xs active:scale-95"
						title="Записать сегодня на 10:00 (Острая боль)"
					>
						<span>⚡ Сегодня 10:00</span>
						<span className="text-[9px] font-normal text-amber-700 dark:text-amber-300">
							Острая боль
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleQuickBook("today_standard")}
						className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal-soft)] text-[var(--teal)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight shadow-xs active:scale-95"
						title="Записать сегодня на 14:30 (Консультация)"
					>
						<span>📅 Сегодня 14:30</span>
						<span className="text-[9px] font-normal text-[var(--teal)]">
							Консультация
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleQuickBook("tomorrow")}
						className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight shadow-xs active:scale-95"
						title="Записать завтра на 11:00 (Плановый визит)"
					>
						<span>🗓️ Завтра 11:00</span>
						<span className="text-[9px] font-normal text-[var(--muted,#64748b)]">
							Плановый
						</span>
					</button>
				</div>
			</div>

			{/* WebRTC SIP Call Transfer Panel (when call is answered) */}
			{isCallAnswered && (
				<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex flex-col gap-2.5 text-xs">
					<button
						type="button"
						onClick={() => setShowTransferPanel((prev) => !prev)}
						className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between shadow-xs active:scale-[0.99]"
					>
						<div className="flex items-center gap-2">
							<PhoneForwarded size={16} className="text-[var(--teal)] flex-shrink-0" />
							<span>{showTransferPanel ? "Скрыть перевод звонка" : "Перевод звонка (SIP Transfer)"}</span>
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
									onClick={() => setTransferType("blind")}
									className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
										transferType === "blind"
											? "bg-[var(--teal)] text-white shadow-xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Слепой (Blind)
								</button>
								<button
									type="button"
									onClick={() => setTransferType("attended")}
									className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
										transferType === "attended"
											? "bg-[var(--teal)] text-white shadow-xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									С консультацией (Attended)
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
										className="min-h-[48px] px-1.5 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs"
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

			{/* Quick Actions Action Bar with prominent >= 48x48px Answer/Hangup/Accept buttons */}
			<div className="flex items-center gap-2.5 pt-1.5">
				{/* Reject Call Button (Hangup >= 48x48px) */}
				<button
					type="button"
					onClick={handleReject}
					className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 active:scale-[0.98] border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 text-sm font-bold transition-all inline-flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-rose-500"
					aria-label="Отклонить входящий звонок"
				>
					<PhoneOff size={18} />
					<span>Отклонить</span>
				</button>

				{/* Answer / WebRTC Call Button (Answer >= 48x48px if ringing) */}
				{!isCallAnswered && (
					<button
						type="button"
						onClick={handleAnswerCall}
						className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] shadow-lg shadow-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-400"
						aria-label="Ответить на звонок"
					>
						<PhoneCall size={18} className="animate-pulse" />
						<span>Ответить</span>
					</button>
				)}

				{/* Accept / Open Card Button (>= 48px) */}
				<button
					type="button"
					onClick={handleOpenCard}
					className="flex-1 px-5 py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-[0.98] text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 min-h-[48px] shadow-lg shadow-teal-950/40 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					aria-label={
						isKnownPatient
							? "Принять звонок и открыть карту пациента"
							: "Принять звонок и зарегистрировать пациента"
					}
				>
					<UserCheck size={18} />
					<span>{isKnownPatient ? "Открыть карту" : "Создать пациента"}</span>
				</button>
			</div>
		</div>
	</div>,
	document.body,
);
}
