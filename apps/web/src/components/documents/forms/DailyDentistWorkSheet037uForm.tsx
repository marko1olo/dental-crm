import React, { useState, useMemo } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { calculateDaily037uTotals, type DailyPatientRecord037u } from "@dental/shared";
import type { DailyDentistWorkSheet037uFormProps } from "./dailyWorkSheet/DailyWorkSheetTypes";
import { DailyWorkSheetHeader } from "./dailyWorkSheet/DailyWorkSheetHeader";
import { DailyWorkSheetSummaryBar } from "./dailyWorkSheet/DailyWorkSheetSummaryBar";
import { DailyWorkSheetTable } from "./dailyWorkSheet/DailyWorkSheetTable";

export type { DailyDentistWorkSheet037uFormProps };

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

		const totals = useMemo(() => calculateDaily037uTotals(records), [records]);

		const addPatientRow = () => {
			setRecords((prev) => [
				...prev,
				{
					sequenceNumber: prev.length + 1,
					patientFullName: "Новый пациент",
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

		const handleUpdateRecord = (idx: number, patch: Partial<DailyPatientRecord037u>) => {
			setRecords((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
		};

		return (
			<div className="document-form-container form-037u-wrapper">
				<DocumentPayloadCard
					title="Журнал учета процедур за смену"
					description="Ежедневный учет оказанных стоматологических услуг с автоматическим подсчетом показателей"
				>
					<DailyWorkSheetHeader
						workDate={workDate}
						setWorkDate={setWorkDate}
						doctorName={doctorName}
						setDoctorName={setDoctorName}
						disabled={disabled}
					/>
					<DailyWorkSheetSummaryBar totals={totals} />
					<DailyWorkSheetTable
						records={records}
						onUpdateRecord={handleUpdateRecord}
						onAddPatient={addPatientRow}
						disabled={disabled}
					/>
				</DocumentPayloadCard>
			</div>
		);
	},
);
