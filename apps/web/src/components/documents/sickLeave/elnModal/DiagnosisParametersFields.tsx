import React from "react";
import { Stethoscope } from "lucide-react";
import { IncapacityReasonCode, INCAPACITY_REASON_CODES } from "../sickLeaveElnPresets";
import type { SickLeaveFormState } from "../sickLeaveElnEngine";

interface Props {
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
}

export function DiagnosisParametersFields({ formState, setFormState }: Props) {
	return (
		<div className="sick-leave-section">
			<h4 className="sick-leave-section-title">
				<Stethoscope size={16} />
				Клинические параметры освобождения от работы
			</h4>
			<div className="sick-leave-grid-3">
				<div className="sick-leave-field">
					<label className="sick-leave-label">Причина нетрудоспособности</label>
					<select
						className="sick-leave-select"
						value={formState.reasonCode}
						onChange={(e) =>
							setFormState((prev) => ({
								...prev,
								reasonCode: e.target.value as IncapacityReasonCode
							}))
						}
					>
						{Object.values(INCAPACITY_REASON_CODES).map((r) => (
							<option key={r.code} value={r.code}>
								{r.titleRu}
							</option>
						))}
					</select>
				</div>

				<div className="sick-leave-field">
					<label className="sick-leave-label">Режим лечения</label>
					<select className="sick-leave-select" value={formState.regimeType} disabled>
						<option value="ambulatory">01 - Амбулаторный</option>
					</select>
				</div>

				<div className="sick-leave-field">
					<label className="sick-leave-label">Код МКБ-10</label>
					<input
						type="text"
						className="sick-leave-input"
						value={formState.icd10Code}
						placeholder="K10.2"
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, icd10Code: e.target.value }))
						}
					/>
				</div>
			</div>

			<div className="sick-leave-field">
				<label className="sick-leave-label">Клиническое описание диагноза</label>
				<textarea
					className="sick-leave-textarea"
					value={formState.diagnosisText}
					onChange={(e) =>
						setFormState((prev) => ({ ...prev, diagnosisText: e.target.value }))
					}
					rows={2}
				/>
			</div>
		</div>
	);
}
