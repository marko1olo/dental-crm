import {
	MEDICAL_REFUSAL_COMPLICATIONS_PRESET,
	generateMedicalInterventionRefusal1051nHtml,
} from "@dental/shared";
import React, { useEffect, useState } from "react";
import {
	Activity,
	Copy,
	FileEdit,
	FileText,
	Printer,
	ShieldCheck,
	Tablet,
	Zap,
} from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { appendChipToText } from "../documentChipText";
import { QuickChipsRow } from "../QuickChipsRow";
import type { DocumentVisitHints } from "./documentFormTypes";
import { printHtmlViaWindowOrIframe } from "../../consents/consentTemplates.js";
import { InformedConsentModal } from "../../consents/InformedConsentModal.js";

/** Готовые формулировки для отказа: причина, риски, альтернативы, тревожные признаки. */
const REFUSAL_REASON_CHIPS = [
	"Страх перед процедурой",
	"Нехватка времени",
	"Финансовые причины",
	"Желание получить второе мнение",
];
const REFUSAL_RISK_CHIPS = [
	"Обострение воспаления",
	"Потеря зуба",
	"Развитие абсцесса",
	"Распространение инфекции",
];
const REFUSAL_ALT_CHIPS = [
	"Удаление зуба",
	"Отсроченное лечение",
	"Консультация другого специалиста",
	"Наблюдение",
];
const REFUSAL_WARNING_CHIPS = [
	"Острая пульсирующая боль",
	"Отек десны или щеки",
	"Повышение температуры тела",
	"Гнойные выделения",
];

/**
 * Отказ от медицинского вмешательства.
 *
 * Перенесено из DocumentsView.tsx без изменений разметки. Оболочка карточки у
 * этой формы своя (классы Tailwind вместо inline-стилей, наведение на сводке и
 * фокус-обводка на кнопках-подсказках), поэтому она НЕ переведена на
 * DocumentPayloadCard: перевод убрал бы наведение и обводку, то есть изменил бы
 * экран. Расхождение оболочки и hex-подстановки внутри
 * `bg-[var(--surface-100,#f8fafc)]` — долг, записанный в отчёте пакета.
 */
export const MedicalInterventionRefusalForm = React.memo(
	function MedicalInterventionRefusalForm({
		activeDoctorFullName,
		activeVisitComplaint,
		inferredTreatmentArea,
	}: DocumentVisitHints) {
		const refusalAlternatives = useDocumentStore(
			(state) => state.refusalAlternatives,
		);
		const setRefusalAlternatives = useDocumentStore(
			(state) => state.setRefusalAlternatives,
		);
		const refusalClinicalIndication = useDocumentStore(
			(state) => state.refusalClinicalIndication,
		);
		const setRefusalClinicalIndication = useDocumentStore(
			(state) => state.setRefusalClinicalIndication,
		);
		const refusalConfirmedAt = useDocumentStore(
			(state) => state.refusalConfirmedAt,
		);
		const setRefusalConfirmedAt = useDocumentStore(
			(state) => state.setRefusalConfirmedAt,
		);
		const refusalConsequencesUnderstood = useDocumentStore(
			(state) => state.refusalConsequencesUnderstood,
		);
		const setRefusalConsequencesUnderstood = useDocumentStore(
			(state) => state.setRefusalConsequencesUnderstood,
		);
		const refusalDoctorFullName = useDocumentStore(
			(state) => state.refusalDoctorFullName,
		);
		const setRefusalDoctorFullName = useDocumentStore(
			(state) => state.setRefusalDoctorFullName,
		);
		const refusalEmergencyCareExplained = useDocumentStore(
			(state) => state.refusalEmergencyCareExplained,
		);
		const setRefusalEmergencyCareExplained = useDocumentStore(
			(state) => state.setRefusalEmergencyCareExplained,
		);
		const refusalExplainedRisks = useDocumentStore(
			(state) => state.refusalExplainedRisks,
		);
		const setRefusalExplainedRisks = useDocumentStore(
			(state) => state.setRefusalExplainedRisks,
		);
		const refusalIntervention = useDocumentStore(
			(state) => state.refusalIntervention,
		);
		const setRefusalIntervention = useDocumentStore(
			(state) => state.setRefusalIntervention,
		);
		const refusalPatientReason = useDocumentStore(
			(state) => state.refusalPatientReason,
		);
		const setRefusalPatientReason = useDocumentStore(
			(state) => state.setRefusalPatientReason,
		);
		const refusalSecondOpinionOffered = useDocumentStore(
			(state) => state.refusalSecondOpinionOffered,
		);
		const setRefusalSecondOpinionOffered = useDocumentStore(
			(state) => state.setRefusalSecondOpinionOffered,
		);
		const refusalUrgentWarningSigns = useDocumentStore(
			(state) => state.refusalUrgentWarningSigns,
		);
		const setRefusalUrgentWarningSigns = useDocumentStore(
			(state) => state.setRefusalUrgentWarningSigns,
		);

		const patientCoreDraft = usePatientStore((state) => state.patientCoreDraft);
		const patientAdministrativeProfileDraft = usePatientStore(
			(state) => state.patientAdministrativeProfileDraft,
		);
		const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);

		useEffect(() => {
			if (!refusalDoctorFullName && activeDoctorFullName) {
				setRefusalDoctorFullName(activeDoctorFullName);
			}
			if (!refusalConfirmedAt) {
				setRefusalConfirmedAt(new Date().toLocaleDateString("ru-RU"));
			}
		}, [activeDoctorFullName, refusalDoctorFullName, refusalConfirmedAt, setRefusalDoctorFullName, setRefusalConfirmedAt]);

		const handlePrintRefusal = () => {
			const html = generateMedicalInterventionRefusal1051nHtml({
				patientFullName:
					patientCoreDraft.fullName?.trim() || "________________________________________",
				patientBirthDate:
					patientCoreDraft.birthDate?.trim() || "____.____.________",
				patientPassport:
					patientAdministrativeProfileDraft.identityDocument?.trim() ||
					"Паспорт гражданина РФ: _________________________",
				patientAddress:
					patientAdministrativeProfileDraft.registrationAddress?.trim() ||
					"__________________________________________________",
				patientPhone: patientCoreDraft.phone?.trim() || "+7 (___) ___-__-__",
				patientSnils: patientAdministrativeProfileDraft.snils?.trim() || null,
				doctorFullName:
					refusalDoctorFullName?.trim() ||
					activeDoctorFullName?.trim() ||
					"Врач-стоматолог",
				refusedIntervention:
					refusalIntervention?.trim() ||
					"Стоматологическое медицинское вмешательство",
				clinicalIndication:
					refusalClinicalIndication?.trim() ||
					activeVisitComplaint?.trim() ||
					"Клинические показания",
				patientReason: refusalPatientReason?.trim() || "Не указана",
				explainedRisks: refusalExplainedRisks
					? refusalExplainedRisks.split("\n").filter(Boolean)
					: undefined,
				alternativesOffered: refusalAlternatives
					? refusalAlternatives.split("\n").filter(Boolean)
					: undefined,
				urgentWarningSigns: refusalUrgentWarningSigns
					? refusalUrgentWarningSigns.split("\n").filter(Boolean)
					: undefined,
				refusalDate:
					refusalConfirmedAt?.trim() ||
					new Date().toLocaleDateString("ru-RU"),
				toothNumbers: inferredTreatmentArea || undefined,
				isSigned: Boolean(refusalConsequencesUnderstood),
				watermarkText: refusalConsequencesUnderstood
					? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ"
					: "ЧЕРНОВИК",
			});
			printHtmlViaWindowOrIframe(html);
			showToast(
				"Официальный бланк Отказа от вмешательства (1051н, А4) отправлен на печать",
				"info",
				3000,
			);
		};

		const handlePrintBlankRefusal = () => {
			const html = generateMedicalInterventionRefusal1051nHtml({
				refusalDate: "«___» _________ 20___ г.",
				watermarkText: "ЧЕРНОВИК",
			});
			printHtmlViaWindowOrIframe(html);
			showToast(
				"Чистый бланк Отказа со строками «________» отправлен на печать",
				"info",
				3000,
			);
		};

		const handleCopySummary = () => {
			const summary = [
				"Отказ от медицинского вмешательства (Приказ МЗ РФ № 1051н, ст. 20 323-ФЗ):",
				`Пациент: ${patientCoreDraft.fullName?.trim() || "Пациент"}`,
				`Вмешательство: ${refusalIntervention?.trim() || "Стоматологическое лечение"}`,
				`Показания: ${refusalClinicalIndication?.trim() || "По клиническим показаниям"}`,
				`Врач: ${refusalDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Лечащий врач"}`,
				`Причина отказа: ${refusalPatientReason?.trim() || "Не указана"}`,
				"Последствия: пациенту разъяснен риск прогрессирования процесса, одонтогенных осложнений и потери зуба.",
			].join("\n");
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				navigator.clipboard.writeText(summary).catch(() => {});
			}
			showToast("Выжимка отказа скопирована в буфер обмена", "success", 3000);
		};

		return (
			<article className="document-payload-card">
				<div>
					<h3>Отказ от вмешательства</h3>
					<p>
						Что предложено, почему нужно, какие риски объяснены и когда срочно
						обращаться.
					</p>
				</div>

				{/* ═══ ОФИЦИАЛЬНЫЙ СТАТУТНЫЙ БАННЕР 1051н И 1-КЛИК ПЕЧАТЬ ═══ */}
				<div className="flex flex-wrap items-center justify-between gap-3 my-3 p-3 bg-[var(--surface-subtle,#f1f5f9)] border border-[var(--border,#cbd5e1)] rounded-lg">
					<div className="flex items-center gap-2">
						<ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<div>
							<div className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
								Приказ Минздрава РФ № 1051н (Приложение № 2) • ч. 3 ст. 20 323-ФЗ
							</div>
							<div className="text-xs text-[var(--muted,#64748b)]">
								Официальный бланк отказа от вмешательства • Защита врача и клиники
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							className="secondary-button inline-flex items-center gap-1.5"
							onClick={handlePrintRefusal}
							title="Быстрая печать официального бланка Отказа А4"
						>
							<Printer size={13} />
							<span>Печать А4 (Отказ)</span>
						</button>
						<button
							type="button"
							className="secondary-button inline-flex items-center gap-1.5"
							onClick={handlePrintBlankRefusal}
							title="Печать чистого бланка для заполнения шариковой ручкой"
						>
							<FileText size={13} />
							<span>Чистый бланк</span>
						</button>
						<button
							type="button"
							className="secondary-button inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-medium"
							onClick={() => setIsConsentModalOpen(true)}
							title="Открыть в планшете для подписания стилусом / пальцем"
						>
							<Tablet size={13} />
							<span>Планшет / стилус</span>
						</button>
						<button
							type="button"
							className="secondary-button inline-flex items-center gap-1.5"
							onClick={handleCopySummary}
							title="Копировать выжимку для медкарты или передачи пациенту"
						>
							<Copy size={13} />
							<span>Выжимка</span>
						</button>
					</div>
				</div>

				<details className="document-manual-override bg-[var(--surface-100,#f8fafc)] p-3 rounded-lg border border-[var(--line,#e2e8f0)] mt-2">
					<summary className="cursor-pointer font-semibold text-[var(--brand-700,#0f766e)] select-none hover:opacity-80 transition-opacity inline-flex items-center gap-1.5">
						<FileEdit size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>Ручная корректировка полей (развернуть)</span>
					</summary>
					<div className="document-payload-collapsed-content mt-4 flex flex-col gap-4">
						<div style={{ marginBottom: "8px" }}>
							<span style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
								<Zap size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
								<span>Пресеты клинических осложнений отказа (1 клик):</span>
							</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
								<button
									type="button"
									className="secondary-button inline-flex items-center gap-1"
									style={{ fontSize: "11.5px", padding: "3px 8px" }}
									onClick={() => {
										const p = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.caries_endo_refusal;
										setRefusalIntervention(p.refusedIntervention);
										setRefusalClinicalIndication(p.clinicalIndication);
										setRefusalExplainedRisks(p.explainedRisks.join("\n"));
										setRefusalAlternatives(p.alternativesOffered.join("\n"));
										setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
									}}
								>
									<Activity size={12} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
									<span>Отказ от терапии/эндодонтии</span>
								</button>
								<button
									type="button"
									className="secondary-button"
									style={{ fontSize: "11.5px", padding: "3px 8px" }}
									onClick={() => {
										const p = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.surgery_extraction_refusal;
										setRefusalIntervention(p.refusedIntervention);
										setRefusalClinicalIndication(p.clinicalIndication);
										setRefusalExplainedRisks(p.explainedRisks.join("\n"));
										setRefusalAlternatives(p.alternativesOffered.join("\n"));
										setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
									}}
								>
									Отказ от удаления/хирургии
								</button>
								<button
									type="button"
									className="secondary-button"
									style={{ fontSize: "11.5px", padding: "3px 8px" }}
									onClick={() => {
										const p = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.prosthetics_implant_refusal;
										setRefusalIntervention(p.refusedIntervention);
										setRefusalClinicalIndication(p.clinicalIndication);
										setRefusalExplainedRisks(p.explainedRisks.join("\n"));
										setRefusalAlternatives(p.alternativesOffered.join("\n"));
										setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
									}}
								>
									Отказ от протезирования/имплантации
								</button>
								<button
									type="button"
									className="secondary-button"
									style={{ fontSize: "11.5px", padding: "3px 8px" }}
									onClick={() => {
										const p = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.anesthesia_refusal;
										setRefusalIntervention(p.refusedIntervention);
										setRefusalClinicalIndication(p.clinicalIndication);
										setRefusalExplainedRisks(p.explainedRisks.join("\n"));
										setRefusalAlternatives(p.alternativesOffered.join("\n"));
										setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
									}}
								>
									Отказ от анестезии
								</button>
								<button
									type="button"
									className="secondary-button"
									style={{ fontSize: "11.5px", padding: "3px 8px" }}
									onClick={() => {
										const p = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.orthodontics_refusal;
										setRefusalIntervention(p.refusedIntervention);
										setRefusalClinicalIndication(p.clinicalIndication);
										setRefusalExplainedRisks(p.explainedRisks.join("\n"));
										setRefusalAlternatives(p.alternativesOffered.join("\n"));
										setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
									}}
								>
									Отказ от ортодонтии
								</button>
							</div>
						</div>
						<label>
							Предложенное вмешательство
							<input
								value={refusalIntervention}
								onChange={(event) => setRefusalIntervention(event.target.value)}
								placeholder={
									inferredTreatmentArea
										? `например: лечение или удаление ${inferredTreatmentArea}`
										: "процедура или вмешательство"
								}
							/>
						</label>
						<label>
							Клиническое показание
							<textarea
								value={refusalClinicalIndication}
								onChange={(event) =>
									setRefusalClinicalIndication(event.target.value)
								}
								placeholder={
									activeVisitComplaint ??
									"показания и причина рекомендации врача"
								}
								rows={2}
							/>
						</label>
						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center">
								<span className="text-xs font-semibold text-[var(--ink,#334155)]">
									Причина отказа со слов пациента
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) =>
										setRefusalPatientReason(
											refusalPatientReason
												? `${refusalPatientReason}, ${t}`
												: t,
										)
									}
								/>
							</div>
							<textarea
								value={refusalPatientReason}
								onChange={(event) =>
									setRefusalPatientReason(event.target.value)
								}
								rows={2}
								className="mt-0"
							/>
							<QuickChipsRow chips={REFUSAL_REASON_CHIPS}
								onPick={(chip) =>
									setRefusalPatientReason(
										appendChipToText(refusalPatientReason, chip),
									)
								}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center">
								<span className="text-xs font-semibold text-[var(--ink,#334155)]">
									Разъясненные риски
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) =>
										setRefusalExplainedRisks(
											refusalExplainedRisks
												? `${refusalExplainedRisks}, ${t}`
												: t,
										)
									}
								/>
							</div>
							<textarea
								value={refusalExplainedRisks}
								onChange={(event) =>
									setRefusalExplainedRisks(event.target.value)
								}
								rows={3}
								className="mt-0"
							/>
							<QuickChipsRow chips={REFUSAL_RISK_CHIPS}
								onPick={(chip) =>
									setRefusalExplainedRisks(
										appendChipToText(refusalExplainedRisks, chip),
									)
								}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center">
								<span className="text-xs font-semibold text-[var(--ink,#334155)]">
									Предложенные альтернативы
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) =>
										setRefusalAlternatives(
											refusalAlternatives
												? `${refusalAlternatives}, ${t}`
												: t,
										)
									}
								/>
							</div>
							<textarea
								value={refusalAlternatives}
								onChange={(event) =>
									setRefusalAlternatives(event.target.value)
								}
								rows={3}
								className="mt-0"
							/>
							<QuickChipsRow chips={REFUSAL_ALT_CHIPS}
								onPick={(chip) =>
									setRefusalAlternatives(
										appendChipToText(refusalAlternatives, chip),
									)
								}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center">
								<span className="text-xs font-semibold text-[var(--ink,#334155)]">
									Тревожные признаки
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) =>
										setRefusalUrgentWarningSigns(
											refusalUrgentWarningSigns
												? `${refusalUrgentWarningSigns}, ${t}`
												: t,
										)
									}
								/>
							</div>
							<textarea
								value={refusalUrgentWarningSigns}
								onChange={(event) =>
									setRefusalUrgentWarningSigns(event.target.value)
								}
								rows={3}
								className="mt-0"
							/>
							<QuickChipsRow chips={REFUSAL_WARNING_CHIPS}
								onPick={(chip) =>
									setRefusalUrgentWarningSigns(
										appendChipToText(refusalUrgentWarningSigns, chip),
									)
								}
							/>
						</div>
						<div className="document-payload-row">
							<label>
								Врач
								<input
									value={refusalDoctorFullName}
									onChange={(event) =>
										setRefusalDoctorFullName(event.target.value)
									}
									placeholder={
										activeDoctorFullName ?? "врач, проводивший разъяснение"
									}
								/>
							</label>
							<label>
								Дата подтверждения
								<input
									value={refusalConfirmedAt}
									onChange={(event) => setRefusalConfirmedAt(event.target.value)}
								/>
							</label>
						</div>
						<label className="document-payload-checkbox">
							<input
								checked={refusalConsequencesUnderstood}
								type="checkbox"
								onChange={(event) =>
									setRefusalConsequencesUnderstood(event.target.checked)
								}
							/>
							Пациент понял последствия отказа
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={refusalSecondOpinionOffered}
								type="checkbox"
								onChange={(event) =>
									setRefusalSecondOpinionOffered(event.target.checked)
								}
							/>
							Пациенту предложено второе мнение или альтернатива
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={refusalEmergencyCareExplained}
								type="checkbox"
								onChange={(event) =>
									setRefusalEmergencyCareExplained(event.target.checked)
								}
							/>
							Пациенту объяснено, когда нужна экстренная помощь
						</label>
					</div>
				</details>

				{isConsentModalOpen && (
					<InformedConsentModal
						isOpen={isConsentModalOpen}
						onClose={() => setIsConsentModalOpen(false)}
						initialMode="single"
						initialTemplateKey="CONSENT_TREATMENT_REFUSAL"
						initialVerificationMethod="tablet_stylus"
						patient={{
							fullName: patientCoreDraft.fullName || null,
							birthDate: patientCoreDraft.birthDate || null,
							passport: patientAdministrativeProfileDraft.identityDocument || null,
							phone: patientCoreDraft.phone || null,
							snils: patientAdministrativeProfileDraft.snils || null,
							address: patientAdministrativeProfileDraft.registrationAddress || null,
						}}
						doctorName={refusalDoctorFullName || activeDoctorFullName || "Врач-стоматолог"}
						toothNumbers={inferredTreatmentArea || null}
						diagnosisIcd={refusalClinicalIndication || activeVisitComplaint || null}
						onConsentSigned={() => {
							setRefusalConsequencesUnderstood(true);
							setRefusalConfirmedAt(new Date().toLocaleDateString("ru-RU"));
							showToast("Отказ от вмешательства успешно подписан пациентом на планшете", "success", 3000);
						}}
					/>
				)}
			</article>
		);
	},
);

MedicalInterventionRefusalForm.displayName = "MedicalInterventionRefusalForm";
