import {
	Check,
	Copy,
	Download,
	FileQuestion,
	Pause,
	Play,
	RotateCcw,
	RotateCw,
	Sparkles,
	Volume2,
	VolumeX,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	formatDurationTimer,
	generateWaveformBars,
	type SpeechTranscriptUtterance,
	useTelephonyStore,
} from "../../store/telephonyStore";

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2;

export interface CallAudioPlayerProps {
	recordingUrl?: string | null | undefined;
	durationSeconds?: number | undefined;
	seed?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
}

export interface CallAudioPlaybackControlsProps {
	isPlaying: boolean;
	onTogglePlay: () => void;
	currentTime: number;
	audioDuration: number;
	onSkip: (deltaSeconds: number) => void;
	playbackSpeed: PlaybackSpeed;
	onSetPlaybackSpeed: (speed: PlaybackSpeed) => void;
	isMuted: boolean;
	onToggleMute: () => void;
	recordingUrl?: string | null | undefined;
}

export interface CallAudioWaveformBarProps {
	waveformBars: number[];
	progressPct: number;
	currentTime: number;
	audioDuration: number;
	onSeek: (targetTime: number) => void;
	onSkip: (deltaSeconds: number) => void;
}

export interface CallAudioTranscriptDrawerProps {
	transcriptUtterances: SpeechTranscriptUtterance[];
	currentTime: number;
	onSeekToUtterance: (startSec: number) => void;
	showTranscript: boolean;
	onToggleShowTranscript: () => void;
	copiedTranscript: boolean;
	onCopyTranscript: () => void;
}

const SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

export function useCallAudioPlayback(
	recordingUrl?: string | null,
	durationSeconds = 0,
	seed?: string,
	transcript?: SpeechTranscriptUtterance[],
) {
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(durationSeconds);
	const [playbackError, setPlaybackError] = useState(false);
	const [showTranscript, setShowTranscript] = useState(false);
	const [copiedTranscript, setCopiedTranscript] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const waveformBars = useMemo(
		() => generateWaveformBars(seed || recordingUrl, 44),
		[seed, recordingUrl],
	);
	const transcriptUtterances = useMemo(() => transcript || [], [transcript]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed;
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [playbackSpeed, isMuted, volumeLevel]);

	useEffect(() => {
		const prevUrl = recordingUrl;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setAudioDuration(durationSeconds);
		setPlaybackError(false);
		return () => {
			if (prevUrl?.startsWith("blob:")) {
				try {
					URL.revokeObjectURL(prevUrl);
				} catch {}
			}
		};
	}, [recordingUrl, durationSeconds]);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			setPlaybackError(false);
			audioRef.current
				.play()
				.then(() => setIsPlaying(true))
				.catch((err: unknown) => {
					if (err instanceof Error && err.name === "AbortError") return;
					console.warn("[CallAudioPlayer] Audio playback failed:", err);
					setIsPlaying(false);
					setPlaybackError(true);
				});
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
			if (audioRef.current.duration > 0 && Number.isFinite(audioRef.current.duration)) {
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

	const handleSeek = (targetTime: number) => {
		setCurrentTime(targetTime);
		if (audioRef.current) audioRef.current.currentTime = targetTime;
	};

	const handleSeekToUtterance = (startSec: number) => {
		setCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlaying) {
				audioRef.current
					.play()
					.then(() => setIsPlaying(true))
					.catch(() => setIsPlaying(false));
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances
			.map(
				(u) =>
					`[${u.startTimeSeconds}s] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`,
			)
			.join("\n");
		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

	return {
		audioRef,
		isPlaying,
		setIsPlaying,
		currentTime,
		audioDuration,
		playbackError,
		setPlaybackError,
		showTranscript,
		setShowTranscript,
		copiedTranscript,
		waveformBars,
		transcriptUtterances,
		playbackSpeed,
		setPlaybackSpeed,
		isMuted,
		toggleMute,
		togglePlay,
		handleTimeUpdate,
		handleSkip,
		handleSeek,
		handleSeekToUtterance,
		handleCopyTranscript,
		progressPct,
	};
}

export function CallAudioPlaybackControls({
	isPlaying,
	onTogglePlay,
	currentTime,
	audioDuration,
	onSkip,
	playbackSpeed,
	onSetPlaybackSpeed,
	isMuted,
	onToggleMute,
	recordingUrl,
}: CallAudioPlaybackControlsProps) {
	const handleDownload = () => {
		if (!recordingUrl) return;
		const a = document.createElement("a");
		a.href = recordingUrl;
		a.download = `call-record-${Date.now()}.mp3`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5">
			<div className="flex items-center gap-2">
				{/* Apple HIG Touch Target >= 44x44px with desktop clinical density classes */}
				<button
					type="button"
					onClick={onTogglePlay}
					className="dnt-player-play-btn min-h-[44px] min-w-[44px] w-11 h-11 sm:min-h-[36px] sm:min-w-[36px] sm:w-9 sm:h-9 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					title={isPlaying ? "Пауза" : "Воспроизвести запись"}
					aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
					data-testid="call-audio-player-toggle"
				>
					{/* Desktop density literal: min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] */}
					{isPlaying ? (
						<Pause size={18} className="text-white fill-white" />
					) : (
						<Play size={18} className="ml-0.5 text-white fill-white" />
					)}
				</button>

				{/* Skip buttons: min-h-[32px] min-w-[32px] h-8 w-8 with 44px mobile touch targets */}
				<button
					type="button"
					onClick={() => onSkip(-10)}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-colors cursor-pointer"
					title="Назад на 10 сек"
					aria-label="Назад на 10 секунд"
				>
					<RotateCcw size={16} />
				</button>
				<button
					type="button"
					onClick={() => onSkip(10)}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-colors cursor-pointer"
					title="Вперед на 10 сек"
					aria-label="Вперед на 10 секунд"
				>
					<RotateCw size={16} />
				</button>

				<span className="font-mono text-xs text-[var(--ink,#0f172a)] font-bold pl-1">
					{formatDurationTimer(currentTime)} / {formatDurationTimer(audioDuration)}
				</span>
			</div>

			<div className="flex items-center gap-1.5">
				<div className="dente-segmented-bar" role="group" aria-label="Скорость воспроизведения">
					{SPEEDS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onSetPlaybackSpeed(s)}
							className={`dente-segmented-item min-h-[32px] sm:min-h-[28px] px-2.5 py-1 text-xs font-bold cursor-pointer ${
								playbackSpeed === s ? "is-active active" : ""
							}`}
							title={`Скорость ${s}x`}
						>
							{s}x
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={onToggleMute}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-all cursor-pointer"
					title={isMuted ? "Включить звук" : "Выключить звук"}
					aria-label={isMuted ? "Включить звук" : "Выключить звук"}
				>
					{isMuted ? (
						<VolumeX size={16} className="text-rose-500" />
					) : (
						<Volume2 size={16} />
					)}
				</button>
				{recordingUrl && (
					<button
						type="button"
						onClick={handleDownload}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-all cursor-pointer"
						title="Скачать запись разговора (MP3)"
						aria-label="Скачать запись разговора"
					>
						<Download size={16} />
					</button>
				)}
			</div>
		</div>
	);
}

export function CallAudioWaveformBar({
	waveformBars,
	progressPct,
	currentTime,
	audioDuration,
	onSeek,
	onSkip,
}: CallAudioWaveformBarProps) {
	const waveformRef = useRef<HTMLDivElement | null>(null);
	const [hoverTime, setHoverTime] = useState<number | null>(null);

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = clickX / rect.width;
		const targetTime = progress * (audioDuration || 1);
		onSeek(targetTime);
	};

	const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = hoverX / rect.width;
		setHoverTime(progress * (audioDuration || 1));
	};

	return (
		<div className="relative flex flex-col gap-1">
			<div
				ref={waveformRef}
				onClick={handleWaveformClick}
				onKeyDown={(e) => {
					if (e.key === "ArrowLeft") {
						e.preventDefault();
						onSkip(-5);
					} else if (e.key === "ArrowRight") {
						e.preventDefault();
						onSkip(5);
					}
				}}
				onMouseMove={handleWaveformMouseMove}
				onMouseLeave={() => setHoverTime(null)}
				className="h-10 w-full flex items-center justify-between gap-[2px] px-2 py-1 rounded-xl bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] cursor-pointer relative overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
				role="slider"
				tabIndex={0}
				aria-valuemin={0}
				aria-valuemax={audioDuration}
				aria-valuenow={currentTime}
				aria-label="Интерактивная волновая форма аудиозаписи разговора"
			>
				{waveformBars.map((amp, idx) => {
					const barProgress = (idx / waveformBars.length) * 100;
					const isPast = barProgress <= progressPct;
					const barHeight = Math.max(4, Math.round(amp * 30));

					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed count bars
							key={idx}
							style={{ height: `${barHeight}px` }}
							className={`flex-1 rounded-full transition-colors ${
								isPast
									? "bg-[var(--teal,#0d9488)] shadow-[0_0_4px_rgba(13,148,136,0.5)]"
									: "bg-[var(--line-strong,#cbd5e1)] hover:bg-[var(--muted,#94a3b8)]"
							}`}
						/>
					);
				})}

				<div
					className="absolute top-0 bottom-0 w-[2px] bg-[var(--teal,#0d9488)] pointer-events-none transition-all shadow-[0_0_6px_var(--teal-soft,rgba(13,148,136,0.5))]"
					style={{ left: `${progressPct}%` }}
				/>
			</div>

			{hoverTime !== null && (
				<div className="text-[10px] text-[var(--teal,#0d9488)] font-mono self-end font-bold">
					Перемотка: {formatDurationTimer(hoverTime)}
				</div>
			)}
		</div>
	);
}

export function CallAudioTranscriptDrawer({
	transcriptUtterances,
	currentTime,
	onSeekToUtterance,
	showTranscript,
	onToggleShowTranscript,
	copiedTranscript,
	onCopyTranscript,
}: CallAudioTranscriptDrawerProps) {
	return (
		<div className="pt-1.5 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onToggleShowTranscript}
					data-testid="audio-transcript-toggle"
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-bold text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					aria-expanded={showTranscript}
				>
					<Sparkles size={14} className="text-amber-500" />
					<span>
						{showTranscript
							? "Скрыть расшифровку речи"
							: "Показать расшифровку речи (AI STT)"}
					</span>
				</button>

				{showTranscript && transcriptUtterances.length > 0 && (
					<button
						type="button"
						onClick={onCopyTranscript}
						className="min-h-[44px] sm:min-h-[32px] text-xs font-bold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
						title="Скопировать текст диалога"
					>
						{copiedTranscript ? (
							<Check size={14} className="text-emerald-500" />
						) : (
							<Copy size={14} />
						)}
						<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
					</button>
				)}
			</div>

			{showTranscript && (
				<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1 animate-fade-in">
					{transcriptUtterances.length === 0 ? (
						<div className="py-6 px-4 text-center rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
							<FileQuestion size={24} className="text-[var(--muted,#94a3b8)]" />
							<span className="text-xs font-medium">
								Транскрипция аудиозаписи отсутствует
							</span>
						</div>
					) : (
						transcriptUtterances.map((u) => {
							const isCurrent =
								currentTime >= (u.startTimeSeconds || 0) &&
								currentTime <= (u.endTimeSeconds || 0);
							return (
								<div
									key={`${u.speaker}-${u.startTimeSeconds}`}
									role="button"
									tabIndex={0}
									onClick={() => onSeekToUtterance(u.startTimeSeconds || 0)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onSeekToUtterance(u.startTimeSeconds || 0);
										}
									}}
									className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
										isCurrent
											? "bg-[var(--teal-surface)] border-[var(--teal-soft)] shadow-xs"
											: "bg-[var(--paper-strong,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title="Кликните для перехода к реплике"
								>
									<div className="flex items-center justify-between text-[11px] mb-1">
										<div className="flex items-center gap-1.5 font-bold">
											<span
												className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
													u.speaker === "operator"
														? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]"
														: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
												}`}
											>
												{u.speaker === "operator" ? "Оператор" : "Пациент"}
											</span>
											<span className="font-mono text-[var(--muted,#64748b)]">
												{formatDurationTimer(u.startTimeSeconds || 0)} -{" "}
												{formatDurationTimer(u.endTimeSeconds || 0)}
											</span>
										</div>
										{typeof u.confidence === "number" && !Number.isNaN(u.confidence) && (
											<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
												{(u.confidence * 100).toFixed(0)}% уверенность
											</span>
										)}
									</div>
									<p className="text-[var(--ink,#0f172a)] text-xs leading-relaxed">
										{u.text || ""}
									</p>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

export function CallAudioEmptyState({
	transcriptUtterances,
	currentTime,
	onSeekToUtterance,
	showTranscript,
	onToggleShowTranscript,
	copiedTranscript,
	onCopyTranscript,
}: CallAudioTranscriptDrawerProps) {
	return (
		<div
			data-testid="call-audio-player-empty"
			className="p-3.5 rounded-2xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs flex flex-col gap-2.5 shadow-xs"
		>
			<div className="flex items-center justify-center gap-3 py-3 text-[var(--muted,#64748b)]">
				<VolumeX size={20} className="text-[var(--muted,#94a3b8)] shrink-0" />
				<div className="flex flex-col items-center text-center">
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">
						Запись обрабатывается АТС
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Запись звонка не подключена или недоступна
					</span>
				</div>
			</div>
			{transcriptUtterances.length > 0 && (
				<CallAudioTranscriptDrawer
					transcriptUtterances={transcriptUtterances}
					currentTime={currentTime}
					onSeekToUtterance={onSeekToUtterance}
					showTranscript={showTranscript}
					onToggleShowTranscript={onToggleShowTranscript}
					copiedTranscript={copiedTranscript}
					onCopyTranscript={onCopyTranscript}
				/>
			)}
		</div>
	);
}

/**
 * CallAudioPlayer — Canonical SSOT Recording Player (Mandates 8b sweet spot, 8e, Apple HIG).
 * Single Primary CTA teal, Touch Targets >= 44x44px, Zero-mock empty states.
 */
export function CallAudioPlayer({
	recordingUrl,
	durationSeconds = 0,
	seed,
	transcript,
}: CallAudioPlayerProps): React.JSX.Element {
	const p = useCallAudioPlayback(recordingUrl, durationSeconds, seed, transcript);

	useEffect(() => {
		return () => {
			if (p.audioRef.current) {
				p.audioRef.current.pause();
				p.audioRef.current.currentTime = 0;
				p.audioRef.current.src = "";
				try {
					p.audioRef.current.removeAttribute("src");
				} catch {}
				p.audioRef.current.load();
			}
		};
	}, [p.audioRef]);

	if (!recordingUrl || recordingUrl.trim() === "") {
		return (
			<CallAudioEmptyState
				transcriptUtterances={p.transcriptUtterances}
				currentTime={p.currentTime}
				onSeekToUtterance={p.handleSeekToUtterance}
				showTranscript={p.showTranscript}
				onToggleShowTranscript={() => p.setShowTranscript((prev) => !prev)}
				copiedTranscript={p.copiedTranscript}
				onCopyTranscript={p.handleCopyTranscript}
			/>
		);
	}

	return (
		<div
			data-testid="call-audio-player"
			className="p-3.5 rounded-2xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-3 shadow-xs"
		>
			<audio
				ref={p.audioRef}
				src={recordingUrl}
				onTimeUpdate={p.handleTimeUpdate}
				onLoadedMetadata={p.handleTimeUpdate}
				onEnded={() => p.setIsPlaying(false)}
				onError={() => {
					p.setIsPlaying(false);
					p.setPlaybackError(true);
				}}
			>
				<track kind="captions" />
			</audio>

			{p.playbackError && (
				<div
					data-testid="call-audio-playback-error"
					className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold"
				>
					Запись временно недоступна или поток повреждён (404/ошибка сети)
				</div>
			)}

			<CallAudioPlaybackControls
				isPlaying={p.isPlaying}
				onTogglePlay={p.togglePlay}
				currentTime={p.currentTime}
				audioDuration={p.audioDuration}
				onSkip={p.handleSkip}
				playbackSpeed={p.playbackSpeed}
				onSetPlaybackSpeed={p.setPlaybackSpeed}
				isMuted={p.isMuted}
				onToggleMute={p.toggleMute}
				recordingUrl={recordingUrl}
			/>

			<CallAudioWaveformBar
				waveformBars={p.waveformBars}
				progressPct={p.progressPct}
				currentTime={p.currentTime}
				audioDuration={p.audioDuration}
				onSeek={p.handleSeek}
				onSkip={p.handleSkip}
			/>

			<CallAudioTranscriptDrawer
				transcriptUtterances={p.transcriptUtterances}
				currentTime={p.currentTime}
				onSeekToUtterance={p.handleSeekToUtterance}
				showTranscript={p.showTranscript}
				onToggleShowTranscript={() => p.setShowTranscript((prev) => !prev)}
				copiedTranscript={p.copiedTranscript}
				onCopyTranscript={p.handleCopyTranscript}
			/>
		</div>
	);
}

export default CallAudioPlayer;
