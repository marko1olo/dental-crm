/**
 * DENTE Dental CRM — Native HTML5 Call Audio Player Widget
 * Mandate 8b (<= 120 lines), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Fakes)
 * Standard native HTML5 audio controls without artificial canvas waves
 */

import { MessageSquareQuote } from "lucide-react";
import React from "react";

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
	if (!audioUrl?.trim()) return null;

	const tooltipTitle = transcriptionSnippet
		? `Стенограмма звонка: «${transcriptionSnippet}»`
		: "Аудиозапись входящего звонка АТС";

	return (
		<div
			className="lead-audio-player-wrapper"
			onClick={(e) => e.stopPropagation()}
			data-testid="lead-audio-player"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				maxWidth: "100%",
				verticalAlign: "middle",
			}}
		>
			<audio
				controls
				preload="metadata"
				src={audioUrl}
				data-testid="lead-audio-play-btn"
				title={tooltipTitle}
				style={{
					height: compact ? 26 : 30,
					maxHeight: 32,
					maxWidth: compact ? 190 : 230,
					borderRadius: 8,
				}}
			/>
			{transcriptionSnippet && !compact && (
				<span
					title={`«${transcriptionSnippet}»`}
					style={{
						display: "inline-flex",
						alignItems: "center",
						cursor: "help",
					}}
				>
					<MessageSquareQuote
						size={13}
						className="shrink-0 text-[var(--teal)]"
					/>
				</span>
			)}
		</div>
	);
};
