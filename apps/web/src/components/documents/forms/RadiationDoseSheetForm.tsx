import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateAnnualRadiationDose,
	type RadiationDoseSheetPayload,
	type PatientRadiationExposureRecord,
	type DentalRadiologyStudyType,
	DEFAULT_EFFECTIVE_DOSES_MSV,
	dentalRadiologyStudyLabels,
} from "@dental/shared";

export interface RadiationDoseSheetFormProps {
	initialPayload?: Partial<RadiationDoseSheetPayload>;
	onChange?: (payload: RadiationDoseSheetPayload) => void;
	disabled?: boolean;
}

export const RadiationDoseSheetForm: React.FC<RadiationDoseSheetFormProps> = React.memo(
	function RadiationDoseSheetForm({ initialPayload, onChange, disabled }) {
		const [currentYear, setCurrentYear] = useState<number>(
			(initialPayload as any)?.summaryAnnualDose?.currentYear ?? new Date().getFullYear(),
		);

		const [records, setRecords] = useState<PatientRadiationExposureRecord[]>(() => {
			return (
				(initialPayload as any)?.exposureRecords ?? [
					{
						studyDate: "2026-03-12",
						studyType: "intraoral_radiovisiography",
						anatomicalArea: "Зуб 26",
						effectiveDoseMsv: 0.003,
						effectiveDoseMicrosv: 3.0,
						apparatusName: "Planmeca ProX",
						voltageKv: 66,
						currentMa: 8,
						exposureTimeSec: 0.08,
						technicianOrDoctorFullName: "Иванов И.И.",
					},
					{
						studyDate: "2026-08-01",
						studyType: "cbct_jaw_8x8",
						anatomicalArea: "Обе челюсти 8x8 см",
						effectiveDoseMsv: 0.055,
						effectiveDoseMicrosv: 55.0,
						apparatusName: "Planmeca ProMax 3D",
						voltageKv: 90,
						currentMa: 10,
						exposureTimeSec: 12.0,
						technicianOrDoctorFullName: "Петрова С.А.",
					},
				]
			);
		});

		// Calculate annual dose assessment
		const doseAssessment = useMemo(() => {
			return calculateAnnualRadiationDose(records, currentYear);
		}, [records, currentYear]);

		const addStudyRow = (studyType: DentalRadiologyStudyType) => {
			if (disabled) return;
			const standardDose = DEFAULT_EFFECTIVE_DOSES_MSV[studyType] ?? 0.003;
			setRecords((prev) => [
				...prev,
				{
					studyDate: new Date().toISOString().slice(0, 10),
					studyType,
					anatomicalArea: "Зона обследования",
					effectiveDoseMsv: standardDose,
					effectiveDoseMicrosv: standardDose * 1000,
					apparatusName: "Рентгеновский аппарат DENTE",
					voltageKv: 70,
					currentMa: 8,
					exposureTimeSec: 0.1,
					technicianOrDoctorFullName: "Врач клиники",
				},
			]);
		};

		return (
			<div className="document-form-container radiation-dose-sheet-wrapper">
				<DocumentPayloadCard
					title="Лист учета дозовых нагрузок при рентгенологических исследованиях"
					description="Радиационный паспорт пациента по СанПиН 2.6.1.1192-03 с контролем годовой эффективной дозы"
				>
					<div
						className={`alert ${
							doseAssessment.riskCategory === "safe"
								? "alert-success"
								: doseAssessment.riskCategory === "moderate"
									? "alert-warning"
									: "alert-danger"
						}`}
						style={{ marginBottom: "16px", padding: "12px" }}
					>
						<div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
							Радиационная безопасность ({currentYear} год):
						</div>
						<div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
							<span>
								Суммарная доза за год: <strong>{doseAssessment.totalDoseMsv.toFixed(4)} мЗв</strong> ({doseAssessment.totalDoseMicrosv.toFixed(1)} мкЗв)
							</span>
							<span>
								Допустимый лимит (проф.): <strong>{doseAssessment.sanpinLimitMsv.toFixed(1)} мЗв</strong>
							</span>
							<span>
								Использовано от нормы: <strong>{doseAssessment.percentageOfSanpinLimit.toFixed(1)}%</strong>
							</span>
							<span>
								Статус: <strong>{doseAssessment.interpretation}</strong>
							</span>
						</div>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
						<h4 style={{ margin: 0 }}>История рентгенологических исследований ({records.length})</h4>
						<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
							<button
								type="button"
								className="btn btn-sm btn-outline-primary"
								onClick={() => addStudyRow("intraoral_radiovisiography")}
								disabled={disabled}
							>
								+ Визиография
							</button>
							<button
								type="button"
								className="btn btn-sm btn-outline-primary"
								onClick={() => addStudyRow("optg_digital_panoramic")}
								disabled={disabled}
							>
								+ ОПТГ
							</button>
							<button
								type="button"
								className="btn btn-sm btn-outline-primary"
								onClick={() => addStudyRow("cbct_segment_5x5")}
								disabled={disabled}
							>
								+ КЛКТ 5x5
							</button>
							<button
								type="button"
								className="btn btn-sm btn-outline-primary"
								onClick={() => addStudyRow("cbct_jaw_8x8")}
								disabled={disabled}
							>
								+ КЛКТ 8x8
							</button>
						</div>
					</div>

					<div style={{ overflowX: "auto" }}>
						<table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
							<thead>
								<tr>
									<th>Дата</th>
									<th>Вид исследования</th>
									<th>Область</th>
									<th>Аппарат</th>
									<th>Доза (мЗв)</th>
									<th>Доза (мкЗв)</th>
									<th>Исполнитель</th>
								</tr>
							</thead>
							<tbody>
								{records.map((r, idx) => (
									<tr key={idx}>
										<td>{r.studyDate}</td>
										<td>{(dentalRadiologyStudyLabels as Record<string, string>)[r.studyType] ?? r.studyType}</td>
										<td>{r.anatomicalArea}</td>
										<td>{r.apparatusName}</td>
										<td>
											<strong>{Number(r.effectiveDoseMsv ?? 0).toFixed(4)}</strong>
										</td>
										<td>{Number(r.effectiveDoseMicrosv ?? 0).toFixed(1)}</td>
										<td>{r.technicianOrDoctorFullName}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</DocumentPayloadCard>
			</div>
		);
	},
);
