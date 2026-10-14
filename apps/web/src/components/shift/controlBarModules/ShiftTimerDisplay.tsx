import React, { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

export interface ShiftTimerDisplayProps {
	readonly isShiftOpen: boolean;
	readonly startTimeIso?: string | undefined;
	readonly initialSeconds?: number | undefined;
	readonly className?: string | undefined;
}

function formatDuration(totalSeconds: number): string {
	const safeSec = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(safeSec / 3600);
	const minutes = Math.floor((safeSec % 3600) / 60);
	const seconds = safeSec % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const ShiftTimerDisplay: React.FC<ShiftTimerDisplayProps> = React.memo(
	({ isShiftOpen, startTimeIso, initialSeconds = 0, className = "" }) => {
		const [seconds, setSeconds] = useState<number>(() => {
			if (!isShiftOpen) return 0;
			if (startTimeIso) {
				const start = new Date(startTimeIso).getTime();
				if (Number.isFinite(start)) {
					return Math.max(0, Math.floor((Date.now() - start) / 1000));
				}
			}
			return initialSeconds;
		});

		const startTimestampRef = useRef<number>(Date.now() - seconds * 1000);

		useEffect(() => {
			if (!isShiftOpen) {
				setSeconds(0);
				return;
			}

			// Sync anchor with current time
			if (startTimeIso) {
				const start = new Date(startTimeIso).getTime();
				if (Number.isFinite(start)) {
					startTimestampRef.current = start;
				} else {
					startTimestampRef.current = Date.now() - initialSeconds * 1000;
				}
			} else {
				startTimestampRef.current = Date.now() - initialSeconds * 1000;
			}

			// Drift-free 1-second timer with tab throttling resilience
			const updateTimer = () => {
				const now = Date.now();
				const elapsed = Math.max(0, Math.floor((now - startTimestampRef.current) / 1000));
				setSeconds(elapsed);
			};

			updateTimer();
			const intervalId = window.setInterval(updateTimer, 1000);

			return () => {
				window.clearInterval(intervalId);
			};
		}, [isShiftOpen, startTimeIso, initialSeconds]);

		if (!isShiftOpen) {
			return null;
		}

		return (
			<div
				className={`shift-timer-display ${className}`.trim()}
				role="timer"
				aria-label="Время текущей рабочей смены"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					fontSize: "11px",
					fontWeight: 600,
					color: "var(--teal)",
					background: "var(--teal-soft, rgba(13, 148, 136, 0.08))",
					border: "1px solid var(--teal-ring, rgba(13, 148, 136, 0.25))",
					borderRadius: "6px",
					padding: "2px 7px",
					fontVariantNumeric: "tabular-nums",
					whiteSpace: "nowrap",
					flexShrink: 0,
				}}
				data-testid="shift-timer-display"
			>
				<span
					style={{
						width: "6px",
						height: "6px",
						borderRadius: "50%",
						background: "var(--teal)",
						boxShadow: "0 0 0 2px rgba(13, 148, 136, 0.25)",
						flexShrink: 0,
					}}
					aria-hidden="true"
				/>
				<Clock size={11} style={{ flexShrink: 0 }} aria-hidden="true" />
				<span>{formatDuration(seconds)}</span>
			</div>
		);
	},
);

ShiftTimerDisplay.displayName = "ShiftTimerDisplay";
