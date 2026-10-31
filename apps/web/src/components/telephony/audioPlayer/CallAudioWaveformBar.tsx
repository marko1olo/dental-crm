import React, { useRef, useState } from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import type { CallAudioWaveformBarProps } from "./types";

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
		<div className="relative flex flex-col gap-1 w-full select-none">
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
				className="h-10 w-full flex items-center justify-between gap-[2px] px-2 py-1 rounded-xl bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] cursor-pointer relative overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--teal)] touch-manipulation"
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
							// biome-ignore lint/suspicious/noArrayIndexKey: deterministic 44-bar distribution
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
