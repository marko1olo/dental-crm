/**
 * DENTE Dental CRM — Shift Custom Time Interval
 * Custom Start & End Time Input (Mandate 8e, 8n)
 */

import React from "react";
import { Clock } from "lucide-react";

export interface ShiftCustomTimeIntervalProps {
	startTime: string;
	endTime: string;
	onChangeStartTime: (time: string) => void;
	onChangeEndTime: (time: string) => void;
}

export const ShiftCustomTimeInterval: React.FC<ShiftCustomTimeIntervalProps> = ({
	startTime,
	endTime,
	onChangeStartTime,
	onChangeEndTime,
}) => {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="shift-editor-section-title flex items-center gap-1.5">
				<Clock size={14} className="text-[var(--muted,#64748b)]" />
				<span>Произвольное время смены</span>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="shift-custom-start-time"
						className="shift-editor-select-label"
					>
						Начало
					</label>
					<input
						id="shift-custom-start-time"
						type="time"
						value={startTime}
						onChange={(e) => onChangeStartTime(e.target.value)}
						className="shift-editor-select"
						style={{ minHeight: "44px" }}
					/>
				</div>
				<div>
					<label
						htmlFor="shift-custom-end-time"
						className="shift-editor-select-label"
					>
						Окончание
					</label>
					<input
						id="shift-custom-end-time"
						type="time"
						value={endTime}
						onChange={(e) => onChangeEndTime(e.target.value)}
						className="shift-editor-select"
						style={{ minHeight: "44px" }}
					/>
				</div>
			</div>
		</div>
	);
};
