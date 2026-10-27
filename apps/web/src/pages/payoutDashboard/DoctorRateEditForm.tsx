/**
 * apps/web/src/pages/payoutDashboard/DoctorRateEditForm.tsx
 * Inline form for updating doctor piece-rate percentage.
 * Mandates 8b, 8e. File <= 120 lines.
 */

import React from "react";
import type { CommissionSaveState } from "./types";

export interface DoctorRateEditFormProps {
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly rateDraft: string;
	readonly rateSave: CommissionSaveState;
	readonly onRateDraftChange: (draft: string) => void;
	readonly onSaveRate: (doctorId: string, raw: string) => void;
	readonly onCancelEditRate: () => void;
}

export function DoctorRateEditForm({
	doctorUserId,
	doctorName,
	rateDraft,
	rateSave,
	onRateDraftChange,
	onSaveRate,
	onCancelEditRate,
}: DoctorRateEditFormProps) {
	return (
		<form
			className="ops-field"
			onSubmit={(event) => {
				event.preventDefault();
				onSaveRate(doctorUserId, rateDraft);
			}}
		>
			<label htmlFor={`rate-${doctorUserId}`}>
				Процент от кассы для {doctorName}
			</label>
			<input
				id={`rate-${doctorUserId}`}
				type="number"
				inputMode="decimal"
				min={0}
				max={100}
				step={0.01}
				value={rateDraft}
				onChange={(event) => onRateDraftChange(event.target.value)}
			/>
			<button
				className="primary-button"
				type="submit"
				disabled={rateSave.kind === "saving"}
			>
				{rateSave.kind === "saving" ? "Сохраняю…" : "Сохранить"}
			</button>
			<button
				className="secondary-button"
				type="button"
				onClick={onCancelEditRate}
			>
				Отмена
			</button>
		</form>
	);
}
