import {
	Check,
	Copy,
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
	type PlaybackSpeed,
	type SpeechTranscriptUtterance,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export interface CallAudioPlayerProps {
	recordingUrl: string;
	durationSeconds?: number | undefined;
	seed?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
}

/**
 * Call Audio Recording Player with Volume Normalization, Speed Toggles (1.0x, 1.25x, 1.5x, 2.0x)
 * and interactive Waveform Scrubbing.
 */
export function CallAudioPlayer({
	recordingUrl,
	durationSeconds = 0,
	seed,
	transcript,
}: CallAudioPlayerProps) {
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);

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
		return transcript || [];
	}, [transcript]);

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

	// Track change reset: clean up previous playback, reset timer, and revoke blob URL
	useEffect(() => {
		const prevUrl = recordingUrl;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setHoverTime(null);
		setAudioDuration(durationSeconds);

		return () => {
			if (prevUrl?.startsWith("blob:")) {
				try {
					URL.revokeObjectURL(prevUrl);
				} catch {}
			}
		};
	}, [recordingUrl, durationSeconds]);

	// Audio cleanup on unmount to prevent audio leaks (Mandate 8b & 8l contract)
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
				audioRef.current.src = "";
				try {
					audioRef.current.removeAttribute("src");
				} catch {}
				audioRef.current.load();
			}
		};
	}, []);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current
				.play()
				.then(() => setIsPlaying(true))
				.catch((err: unknown) => {
					if (err instanceof Error && err.name === "AbortError") {
						// Ignored: intentional interruption by user pause/switch
						return;
					}
					console.warn("[CallAudioPlayer] Audio playback failed:", err);
					setIsPlaying(false);
				});
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
			if (
				audioRef.current.duration &&
				Number.isFinite(audioRef.current.duration) &&
				audioRef.current.duration > 0
			) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkip = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const nextTime = Math.max(
			0,
			Math.min(audioDuration, currentTime + deltaSeconds),
		);
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
					`[${formatDurationTimer(u.startTimeSeconds)}] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`,
			)
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

	const progressPct =
		audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
	const speeds: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

	// Zero-Mock Fallback: Honest empty state when call recording is not available/configured
	if (!recordingUrl || recordingUrl.trim() === "") {
		return (
			<div
				data-testid="call-audio-player-empty"
				className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-xs flex flex-col gap-2 shadow-xs"
			>
				<div className="flex items-center justify-center gap-2 py-3 text-[var(--muted,#64748b)]">
					<VolumeX size={18} className="text-[var(--muted,#94a3b8)]" />
					<span className="font-medium">Запись звонка не подключена или недоступна</span>
				</div>
				{transcriptUtterances.length > 0 && (
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => setShowTranscript((prev) => !prev)}
							className="text-xs font-bold text-[var(--teal)] hover:opacity-90 inline-flex items-center gap-1.5 min-h-[32px] py-1 transition-colors cursor-pointer"
						>
							<Sparkles size={13} className="text-amber-500" />
							<span>
								{showTranscript
									? "Скрыть расшифровку речи"
									: "Показать расшифровку речи (AI STT)"}
							</span>
						</button>
						{showTranscript && (
							<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-2">
								{transcriptUtterances.map((u) => (
									<div
										key={`${u.speaker}-${u.startTimeSeconds}`}
										className="p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]"
									>
										<div className="flex items-center justify-between text-[10px] mb-1 font-bold">
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
												{formatDurationTimer(u.startTimeSeconds)} -{" "}
												{formatDurationTimer(u.endTimeSeconds)}
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
		);
	}

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-2.5 shadow-xs">
			<audio
				ref={audioRef}
				src={recordingUrl}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleTimeUpdate}
				onEnded={() => setIsPlaying(false)}
				onError={(e) => {
					console.warn("[CallAudioPlayer] Audio element error:", e);
					setIsPlaying(false);
				}}
			>
				<track kind="captions" />
			</audio>

			{/* Top Bar: Playback Controls & Waveform Info */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={togglePlay}
						className="min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						title={isPlaying ? "Пауза" : "Воспроизвести запись"}
						aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
					>
						{isPlaying ? (
							<Pause size={18} />
						) : (
							<Play size={18} className="ml-0.5" />
						)}
					</button>

					{/* Skip -10s */}
					<button
						type="button"
						onClick={() => handleSkip(-10)}
						className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
						title="Назад на 10 сек"
						aria-label="Назад на 10 секунд"
					>
						<RotateCcw size={16} />
					</button>

					{/* Skip +10s */}
					<button
						type="button"
						onClick={() => handleSkip(10)}
						className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
						title="Вперед на 10 сек"
						aria-label="Вперед на 10 секунд"
					>
						<RotateCw size={16} />
					</button>

					<span className="font-mono text-xs text-[var(--ink,#0f172a)] font-semibold pl-1">
						{formatDurationTimer(currentTime)} /{" "}
						{formatDurationTimer(audioDuration)}
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					{/* Speed Toggle Pills (1x, 1.25x, 1.5x, 2x) */}
					<div className="flex items-center bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-xl p-0.5 border border-[var(--line,#e2e8f0)] gap-1">
						{speeds.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setPlaybackSpeed(s)}
								className={`min-h-[28px] min-w-[28px] h-7 px-2 py-0.5 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center ${
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
						className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-all"
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
					onKeyDown={(e) => {
						if (e.key === "ArrowLeft") {
							e.preventDefault();
							handleSkip(-5);
						} else if (e.key === "ArrowRight") {
							e.preventDefault();
							handleSkip(5);
						}
					}}
					onMouseMove={handleWaveformMouseMove}
					onMouseLeave={handleWaveformMouseLeave}
					className="h-9 w-full flex items-center justify-between gap-[2px] px-1.5 py-1 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] cursor-pointer relative overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					role="slider"
					tabIndex={0}
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
					className="text-xs font-bold text-[var(--teal)] hover:opacity-90 inline-flex items-center gap-1.5 min-h-[32px] py-1 transition-colors cursor-pointer"
					aria-expanded={showTranscript}
				>
					<Sparkles size={13} className="text-amber-500" />
					<span>
						{showTranscript
							? "Скрыть расшифровку речи"
							: "Показать расшифровку речи (AI STT)"}
					</span>
				</button>

				{showTranscript && transcriptUtterances.length > 0 && (
					<button
						type="button"
						onClick={handleCopyTranscript}
						className="min-h-[32px] text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] transition-colors cursor-pointer"
						title="Скопировать текст диалога"
					>
						{copiedTranscript ? (
							<Check size={12} className="text-emerald-500" />
						) : (
							<Copy size={12} />
						)}
						<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
					</button>
				)}
			</div>

			{/* Expanded Speech Transcript Dialogue Utterances */}
			{showTranscript && (
				<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1 animate-fade-in">
					{transcriptUtterances.length === 0 ? (
						<div className="py-6 px-4 text-center rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
							<FileQuestion size={24} className="text-[var(--muted,#94a3b8)]" />
							<span className="text-xs font-medium">
								Транскрипция аудиозаписи отсутствует
							</span>
						</div>
					) : (
						transcriptUtterances.map((u) => (
							<div
								key={`${u.speaker}-${u.startTimeSeconds}`}
								role="button"
								tabIndex={0}
								onClick={() => handleSeekToUtterance(u.startTimeSeconds)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSeekToUtterance(u.startTimeSeconds);
									}
								}}
								className={`p-2 rounded-lg cursor-pointer transition-all border ${
									currentTime >= u.startTimeSeconds &&
									currentTime <= u.endTimeSeconds
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
											{formatDurationTimer(u.startTimeSeconds)} -{" "}
											{formatDurationTimer(u.endTimeSeconds)}
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
						))
					)}
				</div>
			)}
		</div>
	);
}
