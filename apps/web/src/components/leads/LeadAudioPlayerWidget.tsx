/**
 * DENTE Dental CRM — Compact Inline Call Audio Player Widget
 *
 * Mandate 8n (Clinical Ergonomics, Zero Bloat & Solo Doctor Autonomy):
 * - 0-click audio preview directly on lead card and expanded focus table
 * - Compact inline button [▶ 0:42] / [⏸ 0:18]
 * - First-phrase transcription tooltip on hover
 * - Zero blocking modals, stops click propagation
 */

import React, { useEffect, useRef, useState } from "react";
import { MessageSquareQuote, Pause, Play, Volume2 } from "lucide-react";
import { formatAudioDuration } from "./leadsKanbanTypes";

export interface LeadAudioPlayerWidgetProps {
	audioUrl?: string | null | undefined;
	transcriptionSnippet?: string | null | undefined;
	durationSeconds?: number | null | undefined;
	compact?: boolean | undefined;
}

export const LeadAudioPlayerWidget: React.FC<LeadAudioPlayerWidgetProps> = ({
	audioUrl,
	transcriptionSnippet,
	durationSeconds,
	compact = false,
}) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState<number>(durationSeconds || 0);
	const [hasError, setHasError] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (durationSeconds && durationSeconds > 0) {
			setDuration(durationSeconds);
		}
	}, [durationSeconds]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setHasError(false);
	}, [audioUrl]);

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	if (!audioUrl || !audioUrl.trim()) return null;

	const handleTogglePlay = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (hasError) return;

		if (!audioRef.current) {
			const audio = new Audio(audioUrl);
			audioRef.current = audio;

			audio.addEventListener("timeupdate", () => {
				setCurrentTime(Math.floor(audio.currentTime));
			});

			audio.addEventListener("loadedmetadata", () => {
				if (!Number.isNaN(audio.duration) && audio.duration > 0) {
					setDuration(Math.floor(audio.duration));
				}
			});

			audio.addEventListener("ended", () => {
				setIsPlaying(false);
				setCurrentTime(0);
			});

			audio.addEventListener("error", () => {
				setHasError(true);
				setIsPlaying(false);
			});
		}

		const audio = audioRef.current;
		if (isPlaying) {
			audio.pause();
			setIsPlaying(false);
		} else {
			audio
				.play()
				.then(() => setIsPlaying(true))
				.catch(() => {
					setHasError(true);
					setIsPlaying(false);
				});
		}
	};

	const displayTime = isPlaying
		? formatAudioDuration(currentTime)
		: formatAudioDuration(duration || durationSeconds || 0);

	const tooltipTitle = transcriptionSnippet
		? `Стенограмма: «${transcriptionSnippet}»`
		: "Аудиозапись входящего звонка АТС";

	return (
		<div
			className="lead-audio-player-wrapper"
			onClick={(e) => e.stopPropagation()}
			data-testid="lead-audio-player"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				position: "relative",
			}}
		>
			<button
				type="button"
				onClick={handleTogglePlay}
				disabled={hasError}
				title={hasError ? "Запись недоступна" : tooltipTitle}
				aria-label={isPlaying ? "Приостановить запись звонка" : "Прослушать запись звонка"}
				data-testid="lead-audio-play-btn"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					padding: compact ? "2px 6px" : "3px 8px",
					fontSize: compact ? 11 : 11.5,
					fontWeight: 600,
					borderRadius: 6,
					border: isPlaying ? "1px solid var(--teal)" : "1px solid var(--line)",
					background: isPlaying ? "var(--teal-soft)" : "var(--paper-soft)",
					color: isPlaying ? "var(--teal-dark, var(--teal))" : hasError ? "var(--muted)" : "var(--ink)",
					cursor: hasError ? "not-allowed" : "pointer",
					transition: "all 0.15s ease",
					lineHeight: 1,
					height: compact ? 22 : 26,
					whiteSpace: "nowrap",
					opacity: hasError ? 0.6 : 1,
				}}
			>
				{isPlaying ? (
					<Pause size={compact ? 11 : 12} className="shrink-0 animate-pulse" />
				) : (
					<Play size={compact ? 11 : 12} className="shrink-0" fill={isPlaying ? "currentColor" : "none"} />
				)}
				<span>{hasError ? "Ошибка аудио" : displayTime}</span>
				{transcriptionSnippet && !compact && (
					<span
						title={`«${transcriptionSnippet}»`}
						style={{ display: "inline-flex", alignItems: "center" }}
					>
						<MessageSquareQuote
							size={11}
							className="shrink-0"
							style={{ color: "var(--teal)", opacity: 0.85 }}
						/>
					</span>
				)}
			</button>
		</div>
	);
};
