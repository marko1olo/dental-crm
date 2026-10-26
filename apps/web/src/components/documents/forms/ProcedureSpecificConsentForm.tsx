/**
 * forms/ProcedureSpecificConsentForm.tsx
 * Procedure specific informed consent form (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import type { ReactNode } from "react";
import { CLINICAL_CONSENT_PRESETS, type ProcedureSpecificConsentProcedure } from "@dental/shared";
import { AnamnesisField } from "../AnamnesisField";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentSelectOption, DocumentVisitHints } from "./documentFormTypes";
import { useProcedureConsentState } from "./procedureConsent/useProcedureConsentState";
import { ProcedureConsentPresetSelector } from "./procedureConsent/ProcedureConsentPresetSelector";
import { ProcedureConsentCheckboxes } from "./procedureConsent/ProcedureConsentCheckboxes";

export interface ProcedureSpecificConsentFormProps extends DocumentVisitHints {
	procedureOptions: readonly DocumentSelectOption<ProcedureSpecificConsentProcedure>[];
	normalizeProcedure: (value: string) => ProcedureSpecificConsentProcedure;
	renderToothRowsEditor: () => ReactNode;
}

export const ProcedureSpecificConsentForm = React.memo(
	function ProcedureSpecificConsentForm({
		activeDoctorFullName,
		activeVisitComplaint,
		inferredTreatmentArea,
		normalizeProcedure,
		procedureOptions,
		renderToothRowsEditor,
	}: ProcedureSpecificConsentFormProps) {
		const s = useProcedureConsentState();

		const allProcedureOptions = React.useMemo(() => {
			const existingValues = new Set(procedureOptions.map((opt) => opt.value));
			const extraOptions: DocumentSelectOption<ProcedureSpecificConsentProcedure>[] = [];
			for (const [key, preset] of Object.entries(CLINICAL_CONSENT_PRESETS)) {
				if (!existingValues.has(key as ProcedureSpecificConsentProcedure)) {
					extraOptions.push({ value: key as ProcedureSpecificConsentProcedure, label: preset.procedureName });
				}
			}
			return [...procedureOptions, ...extraOptions];
		}, [procedureOptions]);

		return (
			<DocumentPayloadCard
				title="Процедурное согласие"
				description="Приложение к согласию для конкретной процедуры: тип, зона, материалы, риски, альтернативы и ограничения."
				notice={<ProcedureConsentPresetSelector selectedType={s.procedureConsentProcedureType} onSelectPreset={s.applyClinicalPreset} />}
			>
				<div className="document-payload-row">
					<label>
						Блок процедуры
						<select value={s.procedureConsentProcedureType} onChange={(e) => s.setProcedureConsentProcedureType(normalizeProcedure(e.target.value))}>
							{allProcedureOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
						</select>
					</label>
					<label>
						Врач
						<input value={s.procedureConsentDoctorFullName} onChange={(e) => s.setProcedureConsentDoctorFullName(e.target.value)} placeholder={activeDoctorFullName ?? "врач, проводивший разъяснение"} />
					</label>
				</div>
				<label>
					Процедура или этап
					<textarea value={s.procedureConsentProcedureName} onChange={(e) => s.setProcedureConsentProcedureName(e.target.value)} placeholder="название процедуры: например, удаление зуба 48" rows={2} />
				</label>
				<div className="document-payload-row">
					<label>
						Область или зубы
						<input value={s.procedureConsentToothOrArea} onChange={(e) => s.setProcedureConsentToothOrArea(e.target.value)} placeholder={inferredTreatmentArea || "FDI / зона лечения"} />
					</label>
					<label>
						Дата подтверждения
						<input value={s.procedureConsentConfirmedAt} onChange={(e) => s.setProcedureConsentConfirmedAt(e.target.value)} />
					</label>
				</div>
				<label>
					Диагноз или клиническое показание
					<textarea value={s.procedureConsentDiagnosisOrIndication} onChange={(e) => s.setProcedureConsentDiagnosisOrIndication(e.target.value)} placeholder={activeVisitComplaint ?? "показание к процедуре"} rows={2} />
				</label>
				{renderToothRowsEditor()}
				<div className="document-payload-row">
					<label>
						Анестезия
						<input value={s.procedureConsentAnesthesia} onChange={(e) => s.setProcedureConsentAnesthesia(e.target.value)} />
					</label>
					<label>
						Материалы, системы, конструкции
						<input value={s.procedureConsentMaterials} onChange={(e) => s.setProcedureConsentMaterials(e.target.value)} />
					</label>
				</div>
				<AnamnesisField
					label="Персональные факторы риска пациента" value={s.procedureConsentPatientRiskFactors} onChange={s.setProcedureConsentPatientRiskFactors}
					placeholder="что именно у этого пациента: аллергия, антикоагулянты, диабет, беременность"
					denialText="Аллергии, постоянные препараты, хронические заболевания, беременность, антикоагулянты и инфекционные риски уточнены перед процедурой, значимых факторов не выявлено."
					denialLabel="Опрошен, значимых факторов нет" rows={3}
				/>
				<label>Процедурные риски<textarea value={s.procedureConsentSpecificRisks} onChange={(e) => s.setProcedureConsentSpecificRisks(e.target.value)} rows={3} /></label>
				<label>Альтернативы и отказ<textarea value={s.procedureConsentAlternatives} onChange={(e) => s.setProcedureConsentAlternatives(e.target.value)} rows={3} /></label>
				<label>После процедуры<textarea value={s.procedureConsentAftercare} onChange={(e) => s.setProcedureConsentAftercare(e.target.value)} rows={3} /></label>
				<ProcedureConsentCheckboxes
					localFormAttached={s.procedureConsentLocalFormAttached} setLocalFormAttached={s.setProcedureConsentLocalFormAttached}
					questionsAnswered={s.procedureConsentQuestionsAnswered} setQuestionsAnswered={s.setProcedureConsentQuestionsAnswered}
					exactProcedureConfirmed={s.procedureConsentExactProcedureConfirmed} setExactProcedureConfirmed={s.setProcedureConsentExactProcedureConfirmed}
					risksUnderstood={s.procedureConsentRisksUnderstood} setRisksUnderstood={s.setProcedureConsentRisksUnderstood}
				/>
			</DocumentPayloadCard>
		);
	},
);

ProcedureSpecificConsentForm.displayName = "ProcedureSpecificConsentForm";
