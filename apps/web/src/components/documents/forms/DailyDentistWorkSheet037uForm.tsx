import React, { useState, useMemo } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDaily037uTotals,
	type DailyDentistDiary037uPayload,
	type DailyPatientRecord037u,
} from "@dental/shared";

export interface DailyDentistWorkSheet037uFormProps {
	initialPayload?: Partial<DailyDentistDiary037uPayload> | undefined;
	onChange?: ((payload: DailyDentistDiary037uPayload) => void) | undefined;
	disabled?: boolean | undefined;
}

export const DailyDentistWorkSheet037uForm: React.FC<DailyDentistWorkSheet037uFormProps> = React.memo(
	function DailyDentistWorkSheet037uForm({ initialPayload, onChange, disabled }) {
		const [workDate, setWorkDate] = useState(
			initialPayload?.shiftDate ?? new Date().toISOString().slice(0, 10),
		);
		const [doctorName, setDoctorName] = useState(
			initialPayload?.doctorFullName ?? "",
		);
		const [records, setRecords] = useState<DailyPatientRecord037u[]>(() => {
			if ((initialPayload as any)?.patientRecords) {
				return (initialPayload as any).patientRecords;
			}
			if (isDemoShowcaseMode()) {
				return [
					{
						sequenceNumber: 1,
						patientFullName: "Смирнов Алексей Петрович",
						patientAge: 38,
						patientCategory: "adult",
						medicalCardNumber: "043-00124",
						isPrimaryVisit: true,
						isSanatedInVisit: true,
						diagnosisIcd10: "K02.1",
						diagnosisText: "Средний кариес зуба 4.6",
						performedProceduresSummary: "Препарирование, медобработка, пломбирование светоотверждаемым композитом",
						uetCaries: 2.0,
						uetPulpitisPeriodontitis: 0,
						uetSurgeryExtractions: 0,
						uetHygienePeriodontology: 0,
						uetProstheticsOrthodontics: 0,
						uetAnesthesia: 0.5,
						totalUetForVisit: 2.5,
					},
				];
			}
			return [];
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
					sequenceNumber: prev.length + 1,
					patientFullName: "Новый Пациент",
					patientAge: 30,
					patientCategory: "adult",
					medicalCardNumber: "043-00000",
					isPrimaryVisit: true,
					isSanatedInVisit: false,
					diagnosisIcd10: "K02.0",
					diagnosisText: "Начальный кариес",
					performedProceduresSummary: "Лечение кариеса эмали, фторирование",
					uetCaries: 1.5,
					uetPulpitisPeriodontitis: 0,
					uetSurgeryExtractions: 0,
					uetHygienePeriodontology: 0,
					uetProstheticsOrthodontics: 0,
					uetAnesthesia: 0,
					totalUetForVisit: 1.5,
				},
			]);
		};

		return (
			<div className="document-form-container form-037u-wrapper">
				<DocumentPayloadCard
					title="Дневник приёма"
					description="Ежедневный журнал приёма с автоматическим расчетом трудоемкости в УЕТ"
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
							<span>Всего пациентов: <strong>{totals.totalPatientsCount}</strong></span>
							<span>Первичных: <strong>{totals.totalPrimaryVisitsCount}</strong></span>
							<span>Санировано: <strong>{totals.totalSanatedCount}</strong></span>
							<span><strong>ИТОГО УЕТ: {totals.totalUetAccumulated.toFixed(2)}</strong></span>
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
									<th>Процедура</th>
									<th>УЕТ</th>
								</tr>
							</thead>
							<tbody>
								{records.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											style={{
												textAlign: "center",
												padding: "16px",
												color: "var(--muted, #64748b)",
											}}
										>
											Пациенты за смену ещё не добавлены. Нажмите «+ Добавить пациента»
										</td>
									</tr>
								) : (
									records.map((r, idx) => (
										<tr key={idx}>
											<td>{r.sequenceNumber}</td>
											<td>
												<input
													type="text"
													className="form-control form-control-sm"
													placeholder="ФИО пациента"
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
											<td>{r.performedProceduresSummary}</td>
											<td>
												<strong>{r.totalUetForVisit.toFixed(1)}</strong>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</DocumentPayloadCard>
			</div>
		);
	},
);
