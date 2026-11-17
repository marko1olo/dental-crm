import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateAnnualRadiationDose,
	type RadiationDoseSheetPayload,
	type PatientRadiationExposureRecord,
	type DentalRadiologyStudyType,
	DEFAULT_EFFECTIVE_DOSES_MSV,
} from "@dental/shared";
import { RadiationDoseTable } from "./radiationDose/RadiationDoseTable";

export interface RadiationDoseSheetFormProps {
	initialPayload?: Partial<RadiationDoseSheetPayload>;
	onChange?: (payload: RadiationDoseSheetPayload) => void;
	disabled?: boolean;
}

export const RadiationDoseSheetForm: React.FC<RadiationDoseSheetFormProps> = React.memo(
	function RadiationDoseSheetForm({ initialPayload, onChange, disabled }) {
		const rawPayload = initialPayload as (Partial<RadiationDoseSheetPayload> & {
			summaryAnnualDose?: { currentYear?: number };
			exposureRecords?: PatientRadiationExposureRecord[];
		}) | undefined;

		const [currentYear, setCurrentYear] = useState<number>(
			rawPayload?.summaryAnnualDose?.currentYear ?? rawPayload?.reportingYear ?? new Date().getFullYear(),
		);

		const [records, setRecords] = useState<PatientRadiationExposureRecord[]>(() => {
			return rawPayload?.exposureRecords ?? [];
		});

		const doseAssessment = useMemo(() => {
			return calculateAnnualRadiationDose(records, currentYear);
		}, [records, currentYear]);

		const addStudyRow = (studyType: DentalRadiologyStudyType) => {
			if (disabled) return;
			const standardDose = DEFAULT_EFFECTIVE_DOSES_MSV[studyType] ?? 0.003;
			setRecords((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					studyDate: new Date().toISOString().slice(0, 10),
					studyType,
					anatomicalArea: "Зона обследования",
					apparatusModel: "Рентгеновский аппарат DENTE",
					tubeVoltageKv: 70,
					tubeCurrentMa: 8,
					exposureTimeSeconds: 0.1,
					effectiveDoseMsv: standardDose,
					effectiveDoseMicrosieverts: standardDose * 1000,
					radiologistFullName: "Врач клиники",
					notes: null,
				},
			]);
		};

		return (
			<div className="document-form-container radiation-dose-sheet-wrapper">
				<DocumentPayloadCard
					title="Учёт рентгенологических исследований"
					description="Регистрация параметров экспозиции и дозиметрии"
				>
					<div className="p-3 mb-4 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
						<div className="flex items-center justify-between flex-wrap gap-3">
							<span>Отчётный период: <strong className="text-[var(--ink)]">{currentYear} год</strong></span>
							<span>Всего исследований: <strong className="text-[var(--ink)]">{records.length}</strong></span>
							<span>Суммарная расчётная доза: <strong className="text-[var(--ink)]">{doseAssessment.totalDoseMsv.toFixed(4)} мЗв</strong></span>
						</div>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
						<h4 style={{ margin: 0 }}>История рентгенологических исследований ({records.length})</h4>
						<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
							<button type="button" className={`dente-btn-secondary px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => addStudyRow("intraoral_radiovisiography")} aria-disabled={disabled}>
								+ Визиография
							</button>
							<button type="button" className={`dente-btn-secondary px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => addStudyRow("optg_digital_panoramic")} aria-disabled={disabled}>
								+ ОПТГ
							</button>
							<button type="button" className={`dente-btn-secondary px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => addStudyRow("cbct_segment_5x5")} aria-disabled={disabled}>
								+ КЛКТ 5x5
							</button>
							<button type="button" className={`dente-btn-secondary px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => addStudyRow("cbct_jaw_8x8")} aria-disabled={disabled}>
								+ КЛКТ 8x8
							</button>
						</div>
					</div>

					<RadiationDoseTable records={records} />
				</DocumentPayloadCard>
			</div>
		);
	},
);
