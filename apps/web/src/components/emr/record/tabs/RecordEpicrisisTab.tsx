import React from "react";
import { Award } from "lucide-react";
import type { MedicalCardForm043uData } from "../../emr043Types";

export interface Form043EpicrisisTabProps {
	formData: MedicalCardForm043uData;
}

export const Form043EpicrisisTab: React.FC<Form043EpicrisisTabProps> = React.memo(
	function Form043EpicrisisTab({ formData }) {
		const e = formData.epicrisis;
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Award className="w-4 h-4 text-sky-600" />
							5. Эпикриз, результаты лечения и план контрольного наблюдения
						</h3>
					</div>
					<div className="emr043-grid-2">
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Сводка проведенного лечения (Эпикриз):</div>
							<div className="emr043-field-value">{e.treatmentSummary}</div>
						</div>
						<div>
							<div className="emr043-field-label">Исход лечения:</div>
							<div className="emr043-field-value font-bold text-[var(--ok-fg,#059669)]">{e.treatmentOutcomeLabel}</div>
						</div>
						<div>
							<div className="emr043-field-label">Группа контрольного наблюдения:</div>
							<div className="emr043-field-value font-bold text-sky-700">{e.dispensaryGroupLabel}</div>
						</div>
						<div>
							<div className="emr043-field-label">Сроки планового контрольного осмотра:</div>
							<div className="emr043-field-value">Через {e.plannedRecallIntervalMonths} месяцев</div>
						</div>
						<div>
							<div className="emr043-field-label">Дата завершения курса лечения:</div>
							<div className="emr043-field-value">{e.dateCompleted}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">План профилактических мероприятий и вторичной профилактики:</div>
							<div className="emr043-field-value">{e.preventivePlanRecommendations}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const RecordEpicrisisTab = Form043EpicrisisTab;
