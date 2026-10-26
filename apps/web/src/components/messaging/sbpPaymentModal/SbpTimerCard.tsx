import React from "react";
import { Clock } from "lucide-react";

export interface SbpTimerCardProps {
	readonly remainingSeconds: number;
	readonly defaultTtlMinutes: number;
}

export const SbpTimerCard: React.FC<SbpTimerCardProps> = ({
	remainingSeconds,
	defaultTtlMinutes,
}) => {
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;
	const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	const progressPct = Math.max(0, Math.min(100, (remainingSeconds / (defaultTtlMinutes * 60)) * 100));
	const isWarning = remainingSeconds < 120;

	return (
		<div className="sbp-timer-card">
			<div className="sbp-timer-header">
				<span className="sbp-timer-label">
					<Clock size={14} /> Срок действия QR-кода:
				</span>
				<span className={`sbp-timer-digits ${isWarning ? "timer-warning" : ""}`}>
					{formattedTime}
				</span>
			</div>
			<div className="sbp-progress-track">
				<div
					className={`sbp-progress-fill ${isWarning ? "progress-warning" : ""}`}
					style={{ width: `${progressPct}%` }}
				/>
			</div>
		</div>
	);
};
