import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
	SickLeaveClosingCode,
	RegimeViolationCode,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES
} from "../sickLeaveElnPresets";
import type { SickLeaveFormState } from "../sickLeaveElnEngine";

interface Props {
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
}

export function ClosingStatusFields({ formState, setFormState }: Props) {
	return (
		<div className="sick-leave-section">
			<h4 className="sick-leave-section-title">
				<CheckCircle2 size={16} />
				Закрытие листка и выход на работу
			</h4>
			<div className="sick-leave-grid-3">
				<div className="sick-leave-field">
					<label className="sick-leave-label">Итоговый статус</label>
					<select
						className="sick-leave-select"
						value={formState.closingCode}
						onChange={(e) =>
							setFormState((prev) => ({
								...prev,
								closingCode: e.target.value as SickLeaveClosingCode
							}))
						}
					>
						{Object.values(SICK_LEAVE_CLOSING_CODES).map((c) => (
							<option key={c.code} value={c.code}>
								{c.titleRu}
							</option>
						))}
					</select>
				</div>

				{formState.closingCode === '31' && (
					<div className="sick-leave-field">
						<label className="sick-leave-label">Приступить к работе с</label>
						<input
							type="date"
							className="sick-leave-input"
							value={formState.workResumeDate || ''}
							onChange={(e) =>
								setFormState((prev) => ({ ...prev, workResumeDate: e.target.value }))
							}
						/>
					</div>
				)}

				<div className="sick-leave-field">
					<label className="sick-leave-label">Отметка о нарушении режима</label>
					<select
						className="sick-leave-select"
						value={formState.violationCode || ''}
						onChange={(e) =>
							setFormState((prev) => ({
								...prev,
								violationCode: (e.target.value || undefined) as RegimeViolationCode | undefined
							}))
						}
					>
						<option value="">Без нарушений</option>
						{Object.values(REGIME_VIOLATION_CODES).map((v) => (
							<option key={v.code} value={v.code}>
								{v.titleRu}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
