/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U MODAL TAB SECTIONS (PASSPORT, ANAMNESIS, ODONTOGRAM, DIARIES, EPICRISIS)
 * Order of the Ministry of Health of the USSR № 1030 / Order № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	User,
	HeartPulse,
	Activity,
	Calendar,
	Award,
	Sparkles,
	ShieldCheck,
} from "lucide-react";
import type { MedicalCardForm043uData } from "./emr043Types";
import type { calculateDmftIndex, calculateCpitnIndex } from "./emr043Math";
import { toothStatusCodeShortMap, dentalBiteTypeLabels } from "@dental/shared";

// ── Вкладка 2: Паспортная часть ──
export interface Form043PassportTabProps {
	formData: MedicalCardForm043uData;
	ageText: string;
}

export const Form043PassportTab: React.FC<Form043PassportTabProps> = React.memo(
	function Form043PassportTab({ formData, ageText }) {
		return (
			<div>
				<div className="emr043-section-card">
					<h3 className="emr043-section-card-title">
						<User className="w-4 h-4 text-sky-600" />
						1. Паспортная часть и регистрационные данные (Приказ Минздрава СССР от 04.10.1980 № 1030)
					</h3>
					<div className="emr043-grid-2">
						<div>
							<div className="emr043-field-label">ФИО Пациента:</div>
							<div className="emr043-field-value">{formData.passport.patientFullName}</div>
						</div>
						<div>
							<div className="emr043-field-label">Пол и Дата рождения:</div>
							<div className="emr043-field-value">
								{formData.passport.patientSex === "male" ? "Мужской" : "Женский"}, {formData.passport.patientBirthDate} ({ageText})
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Номер медицинской карты:</div>
							<div className="emr043-field-value font-bold text-sky-700">{formData.passport.medicalCardNumber}</div>
						</div>
						<div>
							<div className="emr043-field-label">Дата открытия карты:</div>
							<div className="emr043-field-value">{formData.passport.cardOpenedDate}</div>
						</div>
						<div>
							<div className="emr043-field-label">Документ, удостоверяющий личность:</div>
							<div className="emr043-field-value">{formData.passport.patientIdentityDocument}</div>
						</div>
						<div>
							<div className="emr043-field-label">СНИЛС пациента:</div>
							<div className="emr043-field-value">{formData.passport.patientSnils || "—"}</div>
						</div>
						<div>
							<div className="emr043-field-label">Полис ОМС / ДМС:</div>
							<div className="emr043-field-value">
								{formData.passport.patientInsurancePolicy || "—"}{" "}
								{formData.passport.patientInsuranceCompany ? `(${formData.passport.patientInsuranceCompany})` : ""}
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Контактный телефон:</div>
							<div className="emr043-field-value">{formData.passport.patientPhone || "—"}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Адрес регистрации и фактического проживания:</div>
							<div className="emr043-field-value">{formData.passport.patientAddressRegistration}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Диагноз при первичном обращении:</div>
							<div className="emr043-field-value font-bold text-sky-800">
								{formData.passport.primaryDiagnosisText} [МКБ-10: {formData.passport.primaryDiagnosisIcd10}]
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Лечащий врач:</div>
							<div className="emr043-field-value font-semibold">
								{formData.passport.attendingDoctorFullName} ({formData.passport.attendingDoctorSpecialty})
							</div>
						</div>
						<div>
							<div className="emr043-field-label">СНИЛС лечащего врача:</div>
							<div className="emr043-field-value">{formData.passport.attendingDoctorSnils || "—"}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

// ── Вкладка 3: Анамнез ──
export interface Form043AnamnesisTabProps {
	formData: MedicalCardForm043uData;
	onApplyNorm: () => void;
}

export const Form043AnamnesisTab: React.FC<Form043AnamnesisTabProps> = React.memo(
	function Form043AnamnesisTab({ formData, onApplyNorm }) {
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<HeartPulse className="w-4 h-4 text-sky-600" />
							2. Анамнез жизни и заболевания (Anamnesis vitae et morbi)
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-043-anamnesis-norm"
							className="emr043-btn emr043-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
							title="Заполнить незаполненные графы анамнеза нормой (Мандат 8e)"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							<span>Норма анамнеза</span>
						</button>
					</div>
					<div className="emr043-grid-2">
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Жалобы при обращении:</div>
							<div className="emr043-field-value">{formData.anamnesis.chiefComplaint}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Анамнез развития настоящего заболевания (Anamnesis morbi):</div>
							<div className="emr043-field-value">{formData.anamnesis.historyOfPresentIllness}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Анамнез жизни (Anamnesis vitae):</div>
							<div className="emr043-field-value">{formData.anamnesis.medicalHistoryVitae}</div>
						</div>
						<div>
							<div className="emr043-field-label">Аллергологический статус:</div>
							<div className="emr043-field-value">{formData.anamnesis.allergologicalHistory}</div>
						</div>
						<div>
							<div className="emr043-field-label">Сопутствующие соматические патологии:</div>
							<div className="emr043-field-value">{formData.anamnesis.concomitantSomaticDiseases}</div>
						</div>
						<div>
							<div className="emr043-field-label">Постоянный прием медикаментов:</div>
							<div className="emr043-field-value">{formData.anamnesis.currentSystemicMedications}</div>
						</div>
						<div>
							<div className="emr043-field-label">Переносимость анестезии и стоматологических вмешательств:</div>
							<div className="emr043-field-value">{formData.anamnesis.pastDentalInterventions}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

// ── Вкладка 4: Зубная формула и индексы ──
export interface Form043OdontogramTabProps {
	formData: MedicalCardForm043uData;
	dmft: ReturnType<typeof calculateDmftIndex>;
	cpitn: ReturnType<typeof calculateCpitnIndex>;
	onApplyNorm: () => void;
}

export const Form043OdontogramTab: React.FC<Form043OdontogramTabProps> = React.memo(
	function Form043OdontogramTab({ formData, dmft, cpitn, onApplyNorm }) {
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Activity className="w-4 h-4 text-sky-600" />
							3. Стоматологический статус, зубная формула FDI и клинические индексы
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-043-status-norm"
							className="emr043-btn emr043-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
							title="Зафиксировать физиологическую норму СОПР и прикуса (Мандат 8e)"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							<span>Норма статуса</span>
						</button>
					</div>

					<div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
						Зубная формула постоянного прикуса (FDI 11–48):
					</div>
					<div className="emr043-formula-matrix">
						{formData.dentalStatus.odontogramTeeth.slice(0, 16).map((t) => {
							const isPath = t.statusCode !== "healthy" && t.statusCode !== "filled_satisfactory";
							const isFilled = t.statusCode === "filled_satisfactory";
							return (
								<div
									key={t.toothNumber}
									className={`emr043-tooth-cell ${isPath ? "pathology" : isFilled ? "filled" : ""}`}
								>
									<div style={{ fontWeight: "bold" }}>{t.toothNumber}</div>
									<div style={{ fontSize: "10px", marginTop: "2px" }}>
										{(t.statusCode && t.statusCode in toothStatusCodeShortMap
											? toothStatusCodeShortMap[t.statusCode as keyof typeof toothStatusCodeShortMap]
											: null) || "Norm"}
									</div>
								</div>
							);
						})}
					</div>
					<div className="emr043-formula-matrix">
						{formData.dentalStatus.odontogramTeeth.slice(16, 32).map((t) => {
							const isPath = t.statusCode !== "healthy" && t.statusCode !== "filled_satisfactory";
							const isFilled = t.statusCode === "filled_satisfactory";
							return (
								<div
									key={t.toothNumber}
									className={`emr043-tooth-cell ${isPath ? "pathology" : isFilled ? "filled" : ""}`}
								>
									<div style={{ fontWeight: "bold" }}>{t.toothNumber}</div>
									<div style={{ fontSize: "10px", marginTop: "2px" }}>
										{(t.statusCode && t.statusCode in toothStatusCodeShortMap
											? toothStatusCodeShortMap[t.statusCode as keyof typeof toothStatusCodeShortMap]
											: null) || "Norm"}
									</div>
								</div>
							);
						})}
					</div>

					<div className="emr043-grid-3" style={{ marginTop: "16px" }}>
						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Индекс интенсивности КПУ(з):</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)" }}>
								КПУ = {dmft.totalDmft}
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								К = {dmft.decayed}, П = {dmft.filled}, У = {dmft.missing}
								<br />Уровень: <strong>{dmft.intensityLevelLabel}</strong>
							</div>
						</div>

						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Пародонтальный статус (CPITN):</div>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>{cpitn.treatmentNeedLabel}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{cpitn.treatmentRecommendations}
							</div>
						</div>

						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Индекс гигиены и прикус:</div>
							<div style={{ fontSize: "13px", fontWeight: 600 }}>{formData.dentalStatus.hygieneIndexOhiS.ratingText}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Прикус: {dentalBiteTypeLabels[formData.dentalStatus.biteType]}
							</div>
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr043-field-label">Состояние СОПР, лимфоузлов и ВНЧС:</div>
						<div className="emr043-field-value">
							Слизистая оболочка полости рта: {formData.dentalStatus.oralMucosaStatus.color === "pale_pink_normal" ? "бледно-розовая, умеренно влажная" : "гиперемирована"}.
							Язык: {formData.dentalStatus.oralMucosaStatus.tongueStatus}.
							Лимфатические узлы: {formData.dentalStatus.oralMucosaStatus.regionalLymphNodes}.
							ВНЧС: {formData.dentalStatus.oralMucosaStatus.tmjFunction}.
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr043-field-label">Рентгенологическое обследование:</div>
						<div className="emr043-field-value">
							{formData.dentalStatus.xrayFindingsDescription}
							{formData.dentalStatus.xrayRadiationDoseMsv ? ` (Лучевая нагрузка: ${formData.dentalStatus.xrayRadiationDoseMsv} мЗв)` : ""}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

// ── Вкладка 5: Дневники визитов ──
export interface Form043DiariesTabProps {
	formData: MedicalCardForm043uData;
	onOpenProtocolGenerator?: (() => void) | undefined;
	onOpenInternalProtocolGenerator: () => void;
}

export const Form043DiariesTab: React.FC<Form043DiariesTabProps> = React.memo(
	function Form043DiariesTab({
		formData,
		onOpenProtocolGenerator,
		onOpenInternalProtocolGenerator,
	}) {
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Calendar className="w-4 h-4 text-sky-600" />
							4. Дневники клинических приёмов (Форма 043/у)
						</h3>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
							<button
								type="button"
								className="emr043-btn emr043-btn-primary touch-manipulation"
								style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", color: "white", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
								onClick={() => {
									if (onOpenProtocolGenerator) {
										onOpenProtocolGenerator();
									} else {
										onOpenInternalProtocolGenerator();
									}
								}}
								data-testid="form043-synthesize-diary-btn"
								title="Сформировать дневник 043/у по МКБ-10 и формуле зубов"
							>
								<Sparkles className="w-4 h-4" />
								<span>Сформировать дневник 043/у по МКБ-10 и формуле</span>
							</button>
						</div>
					</div>

					{formData.visitDiaries.map((diary, index) => (
						<div key={diary.id || index} className="emr043-soap-card">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid var(--glass-border, #e2e8f0)", paddingBottom: "6px" }}>
								<div>
									<span className="emr043-soap-badge">Визит #{index + 1}</span>
									<strong>{diary.entryDate}</strong> {diary.entryTime ? `в ${diary.entryTime}` : ""}
									{diary.toothNumber && <span style={{ marginLeft: "8px", fontWeight: 600, color: "var(--teal)" }}>• Зуб FDI № {diary.toothNumber}</span>}
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Врач: <strong>{diary.doctorFullName}</strong>
								</div>
							</div>

							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>S (Subjective):</span> {diary.subjectiveComplaints}
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>O (Objective):</span> {diary.objectiveStatusLocalis}
								{diary.eodMicroamperes ? ` [ЭОД: ${diary.eodMicroamperes} мкА]` : ""}
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>A (Assessment):</span> <strong>{diary.assessmentDiagnosisText}</strong> [{diary.assessmentIcd10Code}]
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>P (Plan & Protocol):</span> {diary.procedureProtocol}
							</div>
							{diary.anesthesiaDetails && (
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>
									• Анестезия: {diary.anesthesiaDetails}
								</div>
							)}
							{diary.appliedMaterials && (
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>
									• Материалы: {diary.appliedMaterials}
								</div>
							)}
							{diary.digitalSignatureHash && (
								<div style={{ marginTop: "8px", fontSize: "11px", color: "var(--ok-fg)", display: "flex", alignItems: "center", gap: "4px" }}>
									<ShieldCheck className="w-3.5 h-3.5" />
									<span>Заверено УКЭП (ГОСТ Р 34.10): {diary.digitalSignatureHash.slice(0, 20)}…</span>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		);
	},
);

// ── Вкладка 6: Эпикриз ──
export interface Form043EpicrisisTabProps {
	formData: MedicalCardForm043uData;
}

export const Form043EpicrisisTab: React.FC<Form043EpicrisisTabProps> = React.memo(
	function Form043EpicrisisTab({ formData }) {
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Award className="w-4 h-4 text-sky-600" />
							5. Эпикриз, результаты лечения и план диспансерного наблюдения
						</h3>
					</div>
					<div className="emr043-grid-2">
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Сводка проведенного лечения (Эпикриз):</div>
							<div className="emr043-field-value">{formData.epicrisis.treatmentSummary}</div>
						</div>
						<div>
							<div className="emr043-field-label">Исход лечения:</div>
							<div className="emr043-field-value font-bold text-[var(--ok-fg,#059669)]">{formData.epicrisis.treatmentOutcomeLabel}</div>
						</div>
						<div>
							<div className="emr043-field-label">Диспансерная группа:</div>
							<div className="emr043-field-value font-bold text-sky-700">{formData.epicrisis.dispensaryGroupLabel}</div>
						</div>
						<div>
							<div className="emr043-field-label">Сроки планового контрольного осмотра:</div>
							<div className="emr043-field-value">Через {formData.epicrisis.plannedRecallIntervalMonths} месяцев</div>
						</div>
						<div>
							<div className="emr043-field-label">Дата завершения курса лечения:</div>
							<div className="emr043-field-value">{formData.epicrisis.dateCompleted}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">План профилактических мероприятий и вторичной профилактики:</div>
							<div className="emr043-field-value">{formData.epicrisis.preventivePlanRecommendations}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);
