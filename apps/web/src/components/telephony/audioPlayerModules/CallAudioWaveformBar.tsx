import React, { useRef, useState } from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import type { CallAudioWaveformBarProps } from "./callAudioPlayerTypes";

/**
 * Interactive Audio Waveform Bar with scrubbing, keyboard control, and hover preview.
 */
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

	const handleWaveformMouseLeave = () => {
		setHoverTime(null);
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
	);
}
