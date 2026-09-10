import {
	CLINICAL_CONSENT_PRESETS,
	type ProcedureSpecificConsentProcedure,
} from "@dental/shared";
import type { ReactNode } from "react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { AnamnesisField } from "../AnamnesisField";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type {
	DocumentSelectOption,
	DocumentVisitHints,
} from "./documentFormTypes";

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
export const ProcedureSpecificConsentForm = React.memo(
	function ProcedureSpecificConsentForm({
		activeDoctorFullName,
		activeVisitComplaint,
		inferredTreatmentArea,
		normalizeProcedure,
		procedureOptions,
		renderToothRowsEditor,
	}: ProcedureSpecificConsentFormProps) {
		const procedureConsentAftercare = useDocumentStore(
			(state) => state.procedureConsentAftercare,
		);
		const setProcedureConsentAftercare = useDocumentStore(
			(state) => state.setProcedureConsentAftercare,
		);
		const procedureConsentAlternatives = useDocumentStore(
			(state) => state.procedureConsentAlternatives,
		);
		const setProcedureConsentAlternatives = useDocumentStore(
			(state) => state.setProcedureConsentAlternatives,
		);
		const procedureConsentAnesthesia = useDocumentStore(
			(state) => state.procedureConsentAnesthesia,
		);
		const setProcedureConsentAnesthesia = useDocumentStore(
			(state) => state.setProcedureConsentAnesthesia,
		);
		const procedureConsentConfirmedAt = useDocumentStore(
			(state) => state.procedureConsentConfirmedAt,
		);
		const setProcedureConsentConfirmedAt = useDocumentStore(
			(state) => state.setProcedureConsentConfirmedAt,
		);
		const procedureConsentDiagnosisOrIndication = useDocumentStore(
			(state) => state.procedureConsentDiagnosisOrIndication,
		);
		const setProcedureConsentDiagnosisOrIndication = useDocumentStore(
			(state) => state.setProcedureConsentDiagnosisOrIndication,
		);
		const procedureConsentDoctorFullName = useDocumentStore(
			(state) => state.procedureConsentDoctorFullName,
		);
		const setProcedureConsentDoctorFullName = useDocumentStore(
			(state) => state.setProcedureConsentDoctorFullName,
		);
		const procedureConsentExactProcedureConfirmed = useDocumentStore(
			(state) => state.procedureConsentExactProcedureConfirmed,
		);
		const setProcedureConsentExactProcedureConfirmed = useDocumentStore(
			(state) => state.setProcedureConsentExactProcedureConfirmed,
		);
		const procedureConsentLocalFormAttached = useDocumentStore(
			(state) => state.procedureConsentLocalFormAttached,
		);
		const setProcedureConsentLocalFormAttached = useDocumentStore(
			(state) => state.setProcedureConsentLocalFormAttached,
		);
		const procedureConsentMaterials = useDocumentStore(
			(state) => state.procedureConsentMaterials,
		);
		const setProcedureConsentMaterials = useDocumentStore(
			(state) => state.setProcedureConsentMaterials,
		);
		const procedureConsentPatientRiskFactors = useDocumentStore(
			(state) => state.procedureConsentPatientRiskFactors,
		);
		const setProcedureConsentPatientRiskFactors = useDocumentStore(
			(state) => state.setProcedureConsentPatientRiskFactors,
		);
		const procedureConsentProcedureName = useDocumentStore(
			(state) => state.procedureConsentProcedureName,
		);
		const setProcedureConsentProcedureName = useDocumentStore(
			(state) => state.setProcedureConsentProcedureName,
		);
		const procedureConsentProcedureType = useDocumentStore(
			(state) => state.procedureConsentProcedureType,
		);
		const setProcedureConsentProcedureType = useDocumentStore(
			(state) => state.setProcedureConsentProcedureType,
		);
		const procedureConsentQuestionsAnswered = useDocumentStore(
			(state) => state.procedureConsentQuestionsAnswered,
		);
		const setProcedureConsentQuestionsAnswered = useDocumentStore(
			(state) => state.setProcedureConsentQuestionsAnswered,
		);
		const procedureConsentRisksUnderstood = useDocumentStore(
			(state) => state.procedureConsentRisksUnderstood,
		);
		const setProcedureConsentRisksUnderstood = useDocumentStore(
			(state) => state.setProcedureConsentRisksUnderstood,
		);
		const procedureConsentSpecificRisks = useDocumentStore(
			(state) => state.procedureConsentSpecificRisks,
		);
		const setProcedureConsentSpecificRisks = useDocumentStore(
			(state) => state.setProcedureConsentSpecificRisks,
		);
		const procedureConsentToothOrArea = useDocumentStore(
			(state) => state.procedureConsentToothOrArea,
		);
		const setProcedureConsentToothOrArea = useDocumentStore(
			(state) => state.setProcedureConsentToothOrArea,
		);

interface PresetButtonDef {
	type: ProcedureSpecificConsentProcedure;
	label: string;
}

interface PresetCategoryDef {
	id: string;
	title: string;
	buttons: PresetButtonDef[];
}

const PRESET_CATEGORIES: PresetCategoryDef[] = [
	{
		id: "therapy",
		title: "Терапия & Эндодонтия",
		buttons: [
			{ type: "superficial_medium_caries", label: "Кариес (пов./средний)" },
			{ type: "deep_caries", label: "Глубокий кариес" },
			{ type: "pulpitis_endodontics", label: "Пульпит & Эндодонтия" },
			{ type: "therapy_endo_restoration", label: "Терапия / Реставрация" },
		],
	},
	{
		id: "surgery",
		title: "Хирургия & Имплантация",
		buttons: [
			{ type: "surgery_extraction", label: "Удаление зуба" },
			{ type: "implantation", label: "Имплантация" },
			{ type: "sinus_lifting", label: "Синус-лифтинг" },
			{ type: "sedation", label: "Седация (ЗАКС / в/в)" },
			{ type: "local_anesthesia", label: "Местная анестезия" },
		],
	},
	{
		id: "prosthetics",
		title: "Ортопедия & Эстетика",
		buttons: [
			{ type: "veneers", label: "Виниры" },
			{ type: "fixed_prosthetics", label: "Несъемные коронки/мосты" },
			{ type: "removable_prosthetics", label: "Съемные протезы" },
		],
	},
	{
		id: "periodontics_hygiene",
		title: "Пародонтология, Гигиена & Ортодонтия",
		buttons: [
			{ type: "professional_hygiene", label: "Проф.гигиена" },
			{ type: "teeth_whitening", label: "Отбеливание зубов" },
			{ type: "periodontology", label: "Пародонтология" },
			{ type: "orthodontics", label: "Ортодонтия (брекеты/элайнеры)" },
		],
	},
	{
		id: "diagnostics_legal",
		title: "Диагностика, Дети & Правовые формы",
		buttons: [
			{ type: "xray_cbct", label: "Рентген & КЛКТ" },
			{ type: "photoprotocol", label: "Фотопротокол" },
			{ type: "minor_general", label: "Несовершеннолетний (представитель)" },
			{ type: "egisz_refusal", label: "Отказ от передачи в ЕГИСЗ" },
			{ type: "medical_intervention_refusal", label: "Отказ от медвмешательства" },
			{ type: "warranty_policy", label: "Гарантийные обязательства" },
		],
	},
];

		const applyClinicalPreset = (procType: ProcedureSpecificConsentProcedure) => {
			const preset = CLINICAL_CONSENT_PRESETS[procType];
			if (!preset) return;
			setProcedureConsentProcedureType(procType);
			setProcedureConsentProcedureName(preset.procedureName);
			setProcedureConsentDiagnosisOrIndication(preset.diagnosisOrIndication);
			setProcedureConsentAnesthesia(preset.plannedAnesthesia ?? "");
			setProcedureConsentMaterials(preset.materialsAndSystems ?? "");
			setProcedureConsentPatientRiskFactors(preset.patientSpecificRiskFactors.join("\n"));
			setProcedureConsentSpecificRisks(preset.procedureSpecificRisks.join("\n"));
			setProcedureConsentAlternatives(preset.alternatives.join("\n"));
			setProcedureConsentAftercare(preset.aftercareAndLimits.join("\n"));
		};

		const allProcedureOptions = React.useMemo(() => {
			const existingValues = new Set(procedureOptions.map((opt) => opt.value));
			const extraOptions: DocumentSelectOption<ProcedureSpecificConsentProcedure>[] = [];
			for (const [key, preset] of Object.entries(CLINICAL_CONSENT_PRESETS)) {
				if (!existingValues.has(key as ProcedureSpecificConsentProcedure)) {
					extraOptions.push({
						value: key as ProcedureSpecificConsentProcedure,
						label: preset.procedureName,
					});
				}
			}
			return [...procedureOptions, ...extraOptions];
		}, [procedureOptions]);

		return (
			<DocumentPayloadCard
				title="Процедурное согласие"
				description="Приложение к согласию для конкретной процедуры: тип, зона, материалы, риски, альтернативы и послеоперационные ограничения."
			>
				<div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
					<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted, #64748b)", display: "block" }}>
						Быстрое заполнение по клиническому профилю (1 клик):
					</span>
					{PRESET_CATEGORIES.map((cat) => (
						<div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
							<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
								{cat.title}
							</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
								{cat.buttons.map((btn) => {
									const isActive = procedureConsentProcedureType === btn.type;
									return (
										<button
											key={btn.type}
											type="button"
											className={isActive ? "primary-button" : "secondary-button"}
											style={{
												minHeight: "44px",
												fontSize: "13px",
												padding: "8px 14px",
												borderRadius: "8px",
												fontWeight: isActive ? 600 : 500,
											}}
											onClick={() => applyClinicalPreset(btn.type)}
										>
											{btn.label}
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				<div className="document-payload-row">
					<label>
						Блок процедуры
						<select
							value={procedureConsentProcedureType}
							onChange={(event) => {
								const nextType = normalizeProcedure(event.target.value);
								setProcedureConsentProcedureType(nextType);
							}}
						>
							{allProcedureOptions.map((option) => (
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
							onChange={(event) =>
								setProcedureConsentDoctorFullName(event.target.value)
							}
							placeholder={
								activeDoctorFullName ?? "врач, проводивший разъяснение"
							}
						/>
					</label>
				</div>
				<label>
					Процедура или этап
					<textarea
						value={procedureConsentProcedureName}
						onChange={(event) =>
							setProcedureConsentProcedureName(event.target.value)
						}
						placeholder="название процедуры: например, удаление зуба 48"
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Область или зубы
						<input
							value={procedureConsentToothOrArea}
							onChange={(event) =>
								setProcedureConsentToothOrArea(event.target.value)
							}
							placeholder={inferredTreatmentArea || "FDI / зона лечения"}
						/>
					</label>
					<label>
						Дата подтверждения
						<input
							value={procedureConsentConfirmedAt}
							onChange={(event) =>
								setProcedureConsentConfirmedAt(event.target.value)
							}
						/>
					</label>
				</div>
				<label>
					Диагноз или клиническое показание
					<textarea
						value={procedureConsentDiagnosisOrIndication}
						onChange={(event) =>
							setProcedureConsentDiagnosisOrIndication(event.target.value)
						}
						placeholder={activeVisitComplaint ?? "показание к процедуре"}
						rows={2}
					/>
				</label>
				{renderToothRowsEditor()}
				<div className="document-payload-row">
					<label>
						Анестезия
						<input
							value={procedureConsentAnesthesia}
							onChange={(event) =>
								setProcedureConsentAnesthesia(event.target.value)
							}
						/>
					</label>
					<label>
						Материалы, системы, конструкции
						<input
							value={procedureConsentMaterials}
							onChange={(event) =>
								setProcedureConsentMaterials(event.target.value)
							}
						/>
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
						onChange={(event) =>
							setProcedureConsentSpecificRisks(event.target.value)
						}
						rows={4}
					/>
				</label>
				<label>
					Альтернативы и отказ
					<textarea
						value={procedureConsentAlternatives}
						onChange={(event) =>
							setProcedureConsentAlternatives(event.target.value)
						}
						rows={4}
					/>
				</label>
				<label>
					После процедуры
					<textarea
						value={procedureConsentAftercare}
						onChange={(event) =>
							setProcedureConsentAftercare(event.target.value)
						}
						rows={4}
					/>
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={procedureConsentLocalFormAttached}
						type="checkbox"
						onChange={(event) =>
							setProcedureConsentLocalFormAttached(event.target.checked)
						}
					/>
					Локальная форма клиники приложена или включена в пакет
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={procedureConsentQuestionsAnswered}
						type="checkbox"
						onChange={(event) =>
							setProcedureConsentQuestionsAnswered(event.target.checked)
						}
					/>
					Пациент получил ответы на вопросы по процедуре
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={procedureConsentExactProcedureConfirmed}
						type="checkbox"
						onChange={(event) =>
							setProcedureConsentExactProcedureConfirmed(
								event.target.checked,
							)
						}
					/>
					Конкретная процедура, зона и объем названы пациенту
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={procedureConsentRisksUnderstood}
						type="checkbox"
						onChange={(event) =>
							setProcedureConsentRisksUnderstood(event.target.checked)
						}
					/>
					Пациент понял процедурные риски и ограничения
				</label>
			</DocumentPayloadCard>
		);
	},
);

ProcedureSpecificConsentForm.displayName = "ProcedureSpecificConsentForm";
