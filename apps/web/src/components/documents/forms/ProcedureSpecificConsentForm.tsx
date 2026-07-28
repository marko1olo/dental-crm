import type { ProcedureSpecificConsentProcedure } from "@dental/shared";
import type { ReactNode } from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { AnamnesisField } from "../AnamnesisField";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentSelectOption, DocumentVisitHints } from "./documentFormTypes";

export interface ProcedureSpecificConsentFormProps extends DocumentVisitHints {
	/** Блоки процедур из справочника согласий. */
	procedureOptions: readonly DocumentSelectOption<ProcedureSpecificConsentProcedure>[];
	/** Приведение значения списка к известному блоку процедуры. */
	normalizeProcedure: (value: string) => ProcedureSpecificConsentProcedure;
	/** Редактор строк зубов: он живёт в контексте приложения и приходит сверху. */
	renderToothRowsEditor: () => ReactNode;
}

/**
 * Процедурное согласие: приложение к согласию для конкретной процедуры.
 * Вынесено из DocumentsView.tsx дословно.
 */
export function ProcedureSpecificConsentForm({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
	normalizeProcedure,
	procedureOptions,
	renderToothRowsEditor,
}: ProcedureSpecificConsentFormProps) {
	const {
		procedureConsentAftercare,
		procedureConsentAlternatives,
		procedureConsentAnesthesia,
		procedureConsentConfirmedAt,
		procedureConsentDiagnosisOrIndication,
		procedureConsentDoctorFullName,
		procedureConsentExactProcedureConfirmed,
		procedureConsentLocalFormAttached,
		procedureConsentMaterials,
		procedureConsentPatientRiskFactors,
		procedureConsentProcedureName,
		procedureConsentProcedureType,
		procedureConsentQuestionsAnswered,
		procedureConsentRisksUnderstood,
		procedureConsentSpecificRisks,
		procedureConsentToothOrArea,
		setProcedureConsentAftercare,
		setProcedureConsentAlternatives,
		setProcedureConsentAnesthesia,
		setProcedureConsentConfirmedAt,
		setProcedureConsentDiagnosisOrIndication,
		setProcedureConsentDoctorFullName,
		setProcedureConsentExactProcedureConfirmed,
		setProcedureConsentLocalFormAttached,
		setProcedureConsentMaterials,
		setProcedureConsentPatientRiskFactors,
		setProcedureConsentProcedureName,
		setProcedureConsentProcedureType,
		setProcedureConsentQuestionsAnswered,
		setProcedureConsentRisksUnderstood,
		setProcedureConsentSpecificRisks,
		setProcedureConsentToothOrArea,
	} = useDocumentStore();

	return (
		<DocumentPayloadCard
			title="Процедурное согласие"
			description="Приложение к согласию для конкретной процедуры: тип, зона, материалы, риски, альтернативы и послеоперационные ограничения."
		>
			<div className="document-payload-row">
				<label>
					Блок процедуры
					<select
						value={procedureConsentProcedureType}
						onChange={(event) => setProcedureConsentProcedureType(normalizeProcedure(event.target.value))}
					>
						{procedureOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label>
					Врач
					<input
						value={procedureConsentDoctorFullName}
						onChange={(event) => setProcedureConsentDoctorFullName(event.target.value)}
						placeholder={activeDoctorFullName ?? "врач, проводивший разъяснение"}
					/>
				</label>
			</div>
			<label>
				Процедура или этап
				<textarea
					value={procedureConsentProcedureName}
					onChange={(event) => setProcedureConsentProcedureName(event.target.value)}
					placeholder="название процедуры: например, удаление зуба 48"
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Область или зубы
					<input
						value={procedureConsentToothOrArea}
						onChange={(event) => setProcedureConsentToothOrArea(event.target.value)}
						placeholder={inferredTreatmentArea || "FDI / зона лечения"}
					/>
				</label>
				<label>
					Дата подтверждения
					<input value={procedureConsentConfirmedAt} onChange={(event) => setProcedureConsentConfirmedAt(event.target.value)} />
				</label>
			</div>
			<label>
				Диагноз или клиническое показание
				<textarea
					value={procedureConsentDiagnosisOrIndication}
					onChange={(event) => setProcedureConsentDiagnosisOrIndication(event.target.value)}
					placeholder={activeVisitComplaint ?? "показание к процедуре"}
					rows={2}
				/>
			</label>
			{renderToothRowsEditor()}
			<div className="document-payload-row">
				<label>
					Анестезия
					<input value={procedureConsentAnesthesia} onChange={(event) => setProcedureConsentAnesthesia(event.target.value)} />
				</label>
				<label>
					Материалы, системы, конструкции
					<input value={procedureConsentMaterials} onChange={(event) => setProcedureConsentMaterials(event.target.value)} />
				</label>
			</div>
			<AnamnesisField
				label="Персональные факторы риска пациента"
				value={procedureConsentPatientRiskFactors}
				onChange={setProcedureConsentPatientRiskFactors}
				placeholder="что именно у этого пациента: аллергия, антикоагулянты, диабет, беременность"
				denialText="Аллергии, постоянные препараты, хронические заболевания, беременность, антикоагулянты и инфекционные риски уточнены перед процедурой, значимых факторов не выявлено."
				denialLabel="Опрошен, значимых факторов нет"
				rows={3}
			/>
			<label>
				Процедурные риски
				<textarea
					value={procedureConsentSpecificRisks}
					onChange={(event) => setProcedureConsentSpecificRisks(event.target.value)}
					rows={4}
				/>
			</label>
			<label>
				Альтернативы и отказ
				<textarea value={procedureConsentAlternatives} onChange={(event) => setProcedureConsentAlternatives(event.target.value)} rows={4} />
			</label>
			<label>
				После процедуры
				<textarea value={procedureConsentAftercare} onChange={(event) => setProcedureConsentAftercare(event.target.value)} rows={4} />
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={procedureConsentLocalFormAttached}
					type="checkbox"
					onChange={(event) => setProcedureConsentLocalFormAttached(event.target.checked)}
				/>
				Локальная форма клиники приложена или включена в пакет
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={procedureConsentQuestionsAnswered}
					type="checkbox"
					onChange={(event) => setProcedureConsentQuestionsAnswered(event.target.checked)}
				/>
				Пациент получил ответы на вопросы по процедуре
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={procedureConsentExactProcedureConfirmed}
					type="checkbox"
					onChange={(event) => setProcedureConsentExactProcedureConfirmed(event.target.checked)}
				/>
				Конкретная процедура, зона и объем названы пациенту
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={procedureConsentRisksUnderstood}
					type="checkbox"
					onChange={(event) => setProcedureConsentRisksUnderstood(event.target.checked)}
				/>
				Пациент понял процедурные риски и ограничения
			</label>
		</DocumentPayloadCard>
	);
}
