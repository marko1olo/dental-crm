/**
 * DENTE Dental CRM — Compact Inline Call Audio Player Widget
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquareQuote, Pause, Play } from "lucide-react";
import React from "react";
import { formatAudioDuration } from "./leadsKanbanTypes";
import { useLeadAudioPlayer } from "./useLeadAudioPlayer";

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
	const { isPlaying, currentTime, duration, hasError, togglePlay } =
		useLeadAudioPlayer(audioUrl, durationSeconds);
	if (!audioUrl?.trim()) return null;

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
				onClick={(e) => {
					e.stopPropagation();
					togglePlay();
				}}
				disabled={hasError}
				title={hasError ? "Запись недоступна" : tooltipTitle}
				aria-label={
					isPlaying ? "Приостановить запись звонка" : "Прослушать запись звонка"
				}
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
					color: isPlaying
						? "var(--teal-dark, var(--teal))"
						: hasError
							? "var(--muted)"
							: "var(--ink)",
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
					<Play
						size={compact ? 11 : 12}
						className="shrink-0"
						fill={isPlaying ? "currentColor" : "none"}
					/>
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
