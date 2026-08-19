import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDaily037uTotals,
	type DailyDentistDiary037uPayload,
	type DailyPatientRecord037u,
} from "@dental/shared";

export interface DailyDentistWorkSheet037uFormProps {
	initialPayload?: Partial<DailyDentistDiary037uPayload>;
	onChange?: (payload: DailyDentistDiary037uPayload) => void;
	disabled?: boolean;
}

export const DailyDentistWorkSheet037uForm: React.FC<DailyDentistWorkSheet037uFormProps> = React.memo(
	function DailyDentistWorkSheet037uForm({ initialPayload, onChange, disabled }) {
		const [workDate, setWorkDate] = useState(
			initialPayload?.workDate ?? new Date().toISOString().slice(0, 10),
		);
		const [doctorName, setDoctorName] = useState(
			initialPayload?.doctor?.fullName ?? "Иванов Иван Иванович",
		);
		const [records, setRecords] = useState<DailyPatientRecord037u[]>(() => {
			return (
				initialPayload?.patientRecords ?? [
					{
						entryNumber: 1,
						patientFullName: "Смирнов Алексей Петрович",
						birthYear: 1988,
						isRuralResident: false,
						isChildUnder18: false,
						visitPurpose: "treatment",
						diagnosisIcd10: "K02.1",
						treatedTeethNumbers: [46],
						proceduresPerformed: "Препарирование, медобработка, пломбирование светоотверждаемым композитом",
						anesthesiaCount: 1,
						fillingsCompositeCount: 1,
						fillingsCementCount: 0,
						endodonticsCanalsCount: 0,
						extractionsSimpleCount: 0,
						extractionsComplicatedCount: 0,
						isSanated: true,
						uetEarned: {
							therapeuticUet: 2.5,
							surgicalUet: 0,
							orthopedicUet: 0,
							orthodonticUet: 0,
							childrenUet: 0,
							totalUet: 2.5,
						},
					},
				]
			);
		});

		// Auto calculate totals
		const totals = useMemo(() => {
			return calculateDaily037uTotals(records);
		}, [records]);

		const addPatientRow = () => {
			if (disabled) return;
			setRecords((prev) => [
				...prev,
				{
					entryNumber: prev.length + 1,
					patientFullName: "Новый Пациент",
					birthYear: 1995,
					isRuralResident: false,
					isChildUnder18: false,
					visitPurpose: "treatment",
					diagnosisIcd10: "K02.0",
					treatedTeethNumbers: [16],
					proceduresPerformed: "Лечение кариеса эмали, фторирование",
					anesthesiaCount: 0,
					fillingsCompositeCount: 1,
					fillingsCementCount: 0,
					endodonticsCanalsCount: 0,
					extractionsSimpleCount: 0,
					extractionsComplicatedCount: 0,
					isSanated: false,
					uetEarned: {
						therapeuticUet: 1.5,
						surgicalUet: 0,
						orthopedicUet: 0,
						orthodonticUet: 0,
						childrenUet: 0,
						totalUet: 1.5,
					},
				},
			]);
		};

		return (
			<div className="document-form-container form-037u-wrapper">
				<DocumentPayloadCard
					title="Листок ежедневного учета работы врача-стоматолога (Форма № 037/у-88)"
					description="Ежедневный журнал приёма с автоматическим расчетом трудоемкости в УЕТ (Приказ № 50 / № 804н)"
				>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
						<div>
							<label style={{ fontWeight: 600 }}>Дата смены</label>
							<input
								type="date"
								className="form-control"
								value={workDate}
								onChange={(e) => setWorkDate(e.target.value)}
							/>
						</div>
						<div>
							<label style={{ fontWeight: 600 }}>Врач-стоматолог</label>
							<input
								type="text"
								className="form-control"
								value={doctorName}
								onChange={(e) => setDoctorName(e.target.value)}
							/>
						</div>
					</div>

					<div className="alert alert-success" style={{ marginBottom: "16px", padding: "10px" }}>
						<div style={{ fontWeight: 700, marginBottom: "4px" }}>Итоги рабочей смены:</div>
						<div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
							<span>Всего пациентов: <strong>{totals.totalPatientsSeen}</strong></span>
							<span>Первичных: <strong>{totals.primaryVisitsCount}</strong></span>
							<span>Санировано: <strong>{totals.sanatedPatientsCount}</strong></span>
							<span>Всего пломб: <strong>{totals.totalFillingsPlaced}</strong></span>
							<span>Удалено зубов: <strong>{totals.totalTeethExtracted}</strong></span>
							<span><strong>ИТОГО УЕТ: {totals.uetTotals.totalUet.toFixed(2)}</strong></span>
						</div>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
						<h4 style={{ margin: 0 }}>Журнал принятых пациентов ({records.length})</h4>
						<button
							type="button"
							className="btn btn-sm btn-primary"
							onClick={addPatientRow}
							disabled={disabled}
						>
							+ Добавить пациента
						</button>
					</div>

					<div style={{ overflowX: "auto" }}>
						<table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
							<thead>
								<tr>
									<th>№</th>
									<th>ФИО пациента</th>
									<th>Диагноз (МКБ-10)</th>
									<th>Зубы</th>
									<th>Процедура</th>
									<th>Пломбы</th>
									<th>УЕТ</th>
								</tr>
							</thead>
							<tbody>
								{records.map((r, idx) => (
									<tr key={idx}>
										<td>{r.entryNumber}</td>
										<td>
											<input
												type="text"
												className="form-control form-control-sm"
												value={r.patientFullName}
												onChange={(e) => {
													const val = e.target.value;
													setRecords((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, patientFullName: val } : item,
														),
													);
												}}
											/>
										</td>
										<td>
											<input
												type="text"
												style={{ width: "80px" }}
												className="form-control form-control-sm"
												value={r.diagnosisIcd10}
												onChange={(e) => {
													const val = e.target.value;
													setRecords((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, diagnosisIcd10: val } : item,
														),
													);
												}}
											/>
										</td>
										<td>{r.treatedTeethNumbers.join(", ")}</td>
										<td>{r.proceduresPerformed}</td>
										<td>{r.fillingsCompositeCount + r.fillingsCementCount}</td>
										<td>
											<strong>{r.uetEarned.totalUet.toFixed(1)}</strong>
										</td>
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
