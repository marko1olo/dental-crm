import { BASE_INFORMED_CONSENT_PRESET } from "@dental/shared";
import React, { useMemo, useState } from "react";
import {
	Copy,
	FileCheck,
	FileText,
	MoreHorizontal,
	Printer,
	ShieldCheck,
} from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { informedConsentBlockersReview } from "../informedConsentBlockers";
import type { DocumentVisitHints } from "./documentFormTypes";
import {
	generateConsentPrintHtml,
	printHtmlViaWindowOrIframe,
} from "../../consents/consentTemplates.js";
import { InformedConsentModal } from "../../consents/InformedConsentModal.js";

export interface InformedConsentFormProps extends DocumentVisitHints {
	isVisitClosed?: boolean;
	visitStatus?: string;
}

/**
 * Информированное согласие: поля формы до создания документа.
 *
 * Вынесено из DocumentsView.tsx как есть. Значения и сеттеры форма берёт из
 * хранилища документов сама — их около двадцати, и протаскивать их пропсами
 * значило бы заменить монолит длинным списком аргументов. Сверху приходят
 * только подсказки активного визита.
 *
 * Сверху карточки — перечень невыполненных условий. Разбор и то, что видел врач
 * до него (четыре отказа подряд на каждом согласии, три из них про галочки в
 * самом низу свёрнутого блока), записаны в informedConsentBlockers.ts.
 */
export const InformedConsentForm = React.memo(function InformedConsentForm({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
	isVisitClosed,
	visitStatus,
}: InformedConsentFormProps) {
	const informedConsentAftercare = useDocumentStore(
		(state) => state.informedConsentAftercare,
	);
	const setInformedConsentAftercare = useDocumentStore(
		(state) => state.setInformedConsentAftercare,
	);
	const informedConsentAlternatives = useDocumentStore(
		(state) => state.informedConsentAlternatives,
	);
	const setInformedConsentAlternatives = useDocumentStore(
		(state) => state.setInformedConsentAlternatives,
	);
	const informedConsentAnesthesia = useDocumentStore(
		(state) => state.informedConsentAnesthesia,
	);
	const setInformedConsentAnesthesia = useDocumentStore(
		(state) => state.setInformedConsentAnesthesia,
	);
	const informedConsentConfirmedAt = useDocumentStore(
		(state) => state.informedConsentConfirmedAt,
	);
	const setInformedConsentConfirmedAt = useDocumentStore(
		(state) => state.setInformedConsentConfirmedAt,
	);
	const informedConsentDiagnosisOrIndication = useDocumentStore(
		(state) => state.informedConsentDiagnosisOrIndication,
	);
	const setInformedConsentDiagnosisOrIndication = useDocumentStore(
		(state) => state.setInformedConsentDiagnosisOrIndication,
	);
	const informedConsentDoctorFullName = useDocumentStore(
		(state) => state.informedConsentDoctorFullName,
	);
	const setInformedConsentDoctorFullName = useDocumentStore(
		(state) => state.setInformedConsentDoctorFullName,
	);
	const informedConsentExpectedBenefit = useDocumentStore(
		(state) => state.informedConsentExpectedBenefit,
	);
	const setInformedConsentExpectedBenefit = useDocumentStore(
		(state) => state.setInformedConsentExpectedBenefit,
	);
	const informedConsentIntervention = useDocumentStore(
		(state) => state.informedConsentIntervention,
	);
	const setInformedConsentIntervention = useDocumentStore(
		(state) => state.setInformedConsentIntervention,
	);
	const informedConsentMaterialNotes = useDocumentStore(
		(state) => state.informedConsentMaterialNotes,
	);
	const setInformedConsentMaterialNotes = useDocumentStore(
		(state) => state.setInformedConsentMaterialNotes,
	);
	const informedConsentQuestionsAnswered = useDocumentStore(
		(state) => state.informedConsentQuestionsAnswered,
	);
	const setInformedConsentQuestionsAnswered = useDocumentStore(
		(state) => state.setInformedConsentQuestionsAnswered,
	);
	const informedConsentRisks = useDocumentStore(
		(state) => state.informedConsentRisks,
	);
	const setInformedConsentRisks = useDocumentStore(
		(state) => state.setInformedConsentRisks,
	);
	const informedConsentRisksUnderstood = useDocumentStore(
		(state) => state.informedConsentRisksUnderstood,
	);
	const setInformedConsentRisksUnderstood = useDocumentStore(
		(state) => state.setInformedConsentRisksUnderstood,
	);
	const informedConsentToothOrArea = useDocumentStore(
		(state) => state.informedConsentToothOrArea,
	);
	const setInformedConsentToothOrArea = useDocumentStore(
		(state) => state.setInformedConsentToothOrArea,
	);
	const informedConsentTrustedContact = useDocumentStore(
		(state) => state.informedConsentTrustedContact,
	);
	const setInformedConsentTrustedContact = useDocumentStore(
		(state) => state.setInformedConsentTrustedContact,
	);
	const informedConsentWithdrawUnderstood = useDocumentStore(
		(state) => state.informedConsentWithdrawUnderstood,
	);
	const setInformedConsentWithdrawUnderstood = useDocumentStore(
		(state) => state.setInformedConsentWithdrawUnderstood,
	);

	const patientCoreDraft = usePatientStore((state) => state.patientCoreDraft);
	const patientAdministrativeProfileDraft = usePatientStore(
		(state) => state.patientAdministrativeProfileDraft,
	);

	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	const isClosedOrSigned = Boolean(
		isVisitClosed ||
		visitStatus === "completed" ||
		visitStatus === "closed" ||
		visitStatus === "signed" ||
		(informedConsentConfirmedAt && informedConsentConfirmedAt.trim() !== "")
	);
	const effectiveWatermark = isClosedOrSigned
		? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ"
		: "ЧЕРНОВИК";

	const patientModalData = useMemo(
		() => ({
			fullName: patientCoreDraft.fullName || null,
			birthDate: patientCoreDraft.birthDate || null,
			passport: patientAdministrativeProfileDraft.identityDocument || null,
			phone: patientCoreDraft.phone || null,
			snils: patientAdministrativeProfileDraft.snils || null,
			address: patientAdministrativeProfileDraft.registrationAddress || null,
			cardNumber: patientAdministrativeProfileDraft.medicalCardNumber || null,
		}),
		[patientCoreDraft, patientAdministrativeProfileDraft],
	);

	const handlePrintConsent = () => {
		const html = generateConsentPrintHtml({
			patientName:
				patientCoreDraft.fullName?.trim() || "________________________________________",
			birthDate: patientCoreDraft.birthDate?.trim() || "«___» _________ _____ г.",
			passport:
				patientAdministrativeProfileDraft.identityDocument?.trim() ||
				"серия ______ № ________ выдан ____________________",
			snils: patientAdministrativeProfileDraft.snils?.trim() || "___-___-___ __",
			phone: patientCoreDraft.phone?.trim() || "+7 (___) ___-__-__",
			doctorName:
				informedConsentDoctorFullName?.trim() ||
				activeDoctorFullName?.trim() ||
				"Врач-стоматолог клиники",
			intervention:
				informedConsentIntervention?.trim() ||
				"Стоматологический осмотр, диагностика и согласованный объем вмешательств",
			toothOrArea:
				informedConsentToothOrArea?.trim() ||
				inferredTreatmentArea?.trim() ||
				"Полость рта (все квадранты)",
			diagnosisOrIndication:
				informedConsentDiagnosisOrIndication?.trim() ||
				activeVisitComplaint?.trim() ||
				"Санация полости рта",
			expectedBenefit: informedConsentExpectedBenefit,
			anesthesia: informedConsentAnesthesia,
			materialNotes: informedConsentMaterialNotes,
			risks: informedConsentRisks,
			alternatives: informedConsentAlternatives,
			aftercare: informedConsentAftercare,
			date:
				informedConsentConfirmedAt?.trim() ||
				new Date().toLocaleDateString("ru-RU"),
			isBlank: false,
			isSigned: isClosedOrSigned,
			watermarkText: effectiveWatermark,
		});
		printHtmlViaWindowOrIframe(html);
		showToast(
			isClosedOrSigned
				? "Бланк ИДС отправлен на печать (ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ, А4)"
				: "Бланк ИДС отправлен на печать (ЧЕРНОВИК, А4)",
			"info",
			3000,
		);
	};

	const handlePrintBlankConsent = () => {
		const html = generateConsentPrintHtml({
			isBlank: true,
			date: "«___» _________ 20___ г.",
			watermarkText: "ЧЕРНОВИК",
		});
		printHtmlViaWindowOrIframe(html);
		showToast(
			"Чистый бланк ИДС со строками «________» отправлен на печать",
			"info",
			3000,
		);
	};

	const handleCopyPatientSummary = () => {
		const lines = [
			"Информированное добровольное согласие (клиника «ООО «Стоматологическая клиника ДЕНТЕ»»):",
			`Пациент: ${patientCoreDraft.fullName?.trim() || "Пациент"}`,
			`Вмешательство: ${informedConsentIntervention?.trim() || "Стоматологический осмотр / лечение"}`,
			`Врач: ${informedConsentDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Лечащий врач"}`,
			`Область: ${informedConsentToothOrArea?.trim() || inferredTreatmentArea?.trim() || "По плану лечения"}`,
			`Диагноз: ${informedConsentDiagnosisOrIndication?.trim() || activeVisitComplaint?.trim() || "По клиническим показаниям"}`,
			"Памятка: после вмешательства возможно появление локальной чувствительности (1-3 дня). Строго соблюдайте рекомендации врача.",
		];
		const text = lines.join("\n");
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).catch(() => {});
		}
		showToast("Выжимка ИДС скопирована в буфер обмена для пациента", "success", 3000);
	};

	const review = useMemo(
		() =>
			informedConsentBlockersReview({
				intervention: informedConsentIntervention,
				toothOrArea: informedConsentToothOrArea,
				inferredTreatmentArea: inferredTreatmentArea ?? "",
				diagnosisOrIndication: informedConsentDiagnosisOrIndication,
				activeVisitComplaint: activeVisitComplaint ?? "",
				expectedBenefit: informedConsentExpectedBenefit,
				risks: informedConsentRisks,
				alternatives: informedConsentAlternatives,
				aftercare: informedConsentAftercare,
				doctorFullName: informedConsentDoctorFullName,
				activeDoctorFullName: activeDoctorFullName ?? "",
				questionsAnswered: informedConsentQuestionsAnswered,
				risksUnderstood: informedConsentRisksUnderstood,
				withdrawUnderstood: informedConsentWithdrawUnderstood,
			}, { allowBlankForPrint: true }),
		[
			informedConsentIntervention,
			informedConsentToothOrArea,
			inferredTreatmentArea,
			informedConsentDiagnosisOrIndication,
			activeVisitComplaint,
			informedConsentExpectedBenefit,
			informedConsentRisks,
			informedConsentAlternatives,
			informedConsentAftercare,
			informedConsentDoctorFullName,
			activeDoctorFullName,
			informedConsentQuestionsAnswered,
			informedConsentRisksUnderstood,
			informedConsentWithdrawUnderstood,
		],
	);

	return (
		<DocumentPayloadCard
			title="Информированное согласие"
			description="Конкретное вмешательство, область, показание, риски, альтернативы и рекомендации без пустого шаблона."
			notice={
				review.blockers.length > 0 ? (
					<div
						className="schedule-create-missing document-informed-consent-blockers"
						role="status"
						aria-live="polite"
						style={{ marginTop: "12px" }}
					>
						<strong>
							Согласие не создастся: осталось {review.blockers.length} условий
							из {review.requiredCount}:
						</strong>
						<ul>
							{review.blockers.map((blocker) => (
								<li key={blocker.field}>
									{blocker.label} — {blocker.hint}
								</li>
							))}
						</ul>
						<small>
							Всё это в блоке «Ручная корректировка полей» ниже, отметки — в
							самом его низу. Дату подтверждения программа поставит сама при
							создании.
						</small>
					</div>
				) : null}
		>
			{/* 1-строчный тулбар 32–36px (h-9) и Закон Миллера: не более 1–2 кнопок прямого действия (Мандаты 8d, 8e) */}
			<div
				className="informed-consent-toolbar"
				style={{
					marginBottom: "12px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					height: "36px",
					minHeight: "36px",
					maxHeight: "36px",
					gap: "8px",
					flexWrap: "nowrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					{/* Кнопка прямого действия 1 (Закон Миллера): Печать бланка ИДС в 1 клик */}
					<button
						type="button"
						className="secondary-button inline-flex items-center gap-1.5 font-semibold"
						style={{
							height: "32px",
							minHeight: "32px",
							fontSize: "12px",
							padding: "0 12px",
							borderRadius: "8px",
							whiteSpace: "nowrap",
						}}
						data-testid="btn-print-informed-consent"
						onClick={handlePrintConsent}
						title={
							isClosedOrSigned
								? "Печать бланка ИДС со штампом «ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ» (А4)"
								: "Печать бланка ИДС со штампом «ЧЕРНОВИК» (А4)"
						}
					>
						<Printer size={15} className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
						<span>Печать бланка ИДС (1 клик)</span>
					</button>

					{/* Кнопка прямого действия 2 (Закон Миллера): Открыть форму ИДС / планшет */}
					<button
						type="button"
						className="secondary-button inline-flex items-center gap-1.5 font-semibold"
						style={{
							height: "32px",
							minHeight: "32px",
							fontSize: "12px",
							padding: "0 12px",
							borderRadius: "8px",
							whiteSpace: "nowrap",
						}}
						data-testid="btn-open-consent-modal"
						onClick={() => setIsConsentModalOpen(true)}
						title="Открыть консоль ИДС: пакеты (терапия, ортопедия, хирургия) и подписание"
					>
						<FileCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
						<span>Подписать на планшете</span>
					</button>
				</div>

				{/* Меню дополнительных действий «...» по Закону Миллера (Мандат 8d) */}
				<div className="relative inline-flex items-center" style={{ flexShrink: 0 }}>
					<button
						type="button"
						className="secondary-button inline-flex items-center justify-center"
						style={{
							height: "32px",
							minHeight: "32px",
							width: "32px",
							padding: "0",
							borderRadius: "8px",
						}}
						onClick={() => setIsMoreMenuOpen((v) => !v)}
						title="Дополнительные действия (заполнить нормой, чистый бланк, памятка)"
						aria-label="Дополнительные действия ИДС"
						data-testid="btn-informed-consent-more-menu"
					>
						<MoreHorizontal size={16} />
					</button>

					{isMoreMenuOpen && (
						<div
							className="fixed inset-0 z-30 cursor-default"
							onClick={() => setIsMoreMenuOpen(false)}
							aria-hidden="true"
						/>
					)}

					<div
						className={`absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
							isMoreMenuOpen ? "block" : "hidden"
						}`}
						style={{
							background: "var(--paper, #ffffff)",
							border: "1px solid var(--line, #e2e8f0)",
						}}
						data-testid="informed-consent-dropdown-menu"
					>
						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] border-none bg-transparent cursor-pointer"
							data-testid="btn-informed-consent-fill-norm"
							onClick={() => {
								setIsMoreMenuOpen(false);
								setInformedConsentIntervention(BASE_INFORMED_CONSENT_PRESET.intervention);
								setInformedConsentDiagnosisOrIndication(BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication);
								setInformedConsentExpectedBenefit(BASE_INFORMED_CONSENT_PRESET.expectedBenefit);
								setInformedConsentAnesthesia(BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia ?? "");
								setInformedConsentMaterialNotes(BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes ?? "");
								setInformedConsentRisks(BASE_INFORMED_CONSENT_PRESET.explainedRisks.join("\n"));
								setInformedConsentAlternatives(BASE_INFORMED_CONSENT_PRESET.alternatives.join("\n"));
								setInformedConsentAftercare(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.join("\n"));
								if (!informedConsentToothOrArea.trim()) {
									setInformedConsentToothOrArea(inferredTreatmentArea || "Полость рта (все квадранты)");
								}
								if (!informedConsentDoctorFullName.trim()) {
									setInformedConsentDoctorFullName(activeDoctorFullName || "Врач-стоматолог клиники");
								}
								setInformedConsentQuestionsAnswered(true);
								setInformedConsentRisksUnderstood(true);
								setInformedConsentWithdrawUnderstood(true);
								showToast("ИДС заполнено по стандарту Минздрава РФ № 1051н (1 клик)", "success", 3000);
							}}
						>
							<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>Заполнить ИДС нормой (1 клик)</span>
						</button>

						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] border-none bg-transparent cursor-pointer"
							data-testid="btn-print-blank-informed-consent"
							onClick={() => {
								setIsMoreMenuOpen(false);
								handlePrintBlankConsent();
							}}
							title="Печать чистого бланка ИДС со строками «________» для ручного заполнения"
						>
							<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Печать чистого бланка («________»)</span>
						</button>

						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] border-none bg-transparent cursor-pointer"
							data-testid="btn-copy-consent-patient-summary"
							onClick={() => {
								setIsMoreMenuOpen(false);
								handleCopyPatientSummary();
							}}
							title="Скопировать выжимку ИДС для отправки пациенту в WhatsApp / SMS"
						>
							<Copy size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
							<span>Копировать выжимку для пациента</span>
						</button>
					</div>
				</div>
			</div>
			<label>
				Планируемое вмешательство
				<textarea
					value={informedConsentIntervention}
					onChange={(event) =>
						setInformedConsentIntervention(event.target.value)
					}
					placeholder="что именно делаем: например, лечение кариеса зуба 36 с постановкой пломбы"
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Область или зубы
					<input
						value={informedConsentToothOrArea}
						onChange={(event) =>
							setInformedConsentToothOrArea(event.target.value)
						}
						placeholder={inferredTreatmentArea || "FDI / зона лечения"}
					/>
				</label>
				<label>
					Врач
					<input
						value={informedConsentDoctorFullName}
						onChange={(event) =>
							setInformedConsentDoctorFullName(event.target.value)
						}
						placeholder={
							activeDoctorFullName ?? "врач, проводивший разъяснение"
						}
					/>
				</label>
			</div>
			<label>
				Диагноз или клиническое показание
				<textarea
					value={informedConsentDiagnosisOrIndication}
					onChange={(event) =>
						setInformedConsentDiagnosisOrIndication(event.target.value)
					}
					placeholder={activeVisitComplaint ?? "показание к вмешательству"}
					rows={2}
				/>
			</label>
			<label>
				Ожидаемая польза
				<textarea
					value={informedConsentExpectedBenefit}
					onChange={(event) =>
						setInformedConsentExpectedBenefit(event.target.value)
					}
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Анестезия
					<input
						value={informedConsentAnesthesia}
						onChange={(event) =>
							setInformedConsentAnesthesia(event.target.value)
						}
					/>
				</label>
				<label>
					Дата подтверждения
					<input
						value={informedConsentConfirmedAt}
						onChange={(event) =>
							setInformedConsentConfirmedAt(event.target.value)
						}
					/>
				</label>
			</div>
			<label>
				Материалы, препараты и ограничения
				<textarea
					value={informedConsentMaterialNotes}
					onChange={(event) =>
						setInformedConsentMaterialNotes(event.target.value)
					}
					rows={2}
				/>
			</label>
			<label>
				Кому можно сообщать медицинские сведения
				<input
					value={informedConsentTrustedContact}
					onChange={(event) =>
						setInformedConsentTrustedContact(event.target.value)
					}
					placeholder="кому пациент разрешил сообщать сведения, или «никому»"
				/>
			</label>
			<label>
				Разъясненные риски
				<textarea
					value={informedConsentRisks}
					onChange={(event) => setInformedConsentRisks(event.target.value)}
					rows={4}
				/>
			</label>
			<label>
				Альтернативы
				<textarea
					value={informedConsentAlternatives}
					onChange={(event) =>
						setInformedConsentAlternatives(event.target.value)
					}
					rows={4}
				/>
			</label>
			<label>
				После вмешательства
				<textarea
					value={informedConsentAftercare}
					onChange={(event) => setInformedConsentAftercare(event.target.value)}
					rows={4}
				/>
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentQuestionsAnswered}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentQuestionsAnswered(event.target.checked)
					}
				/>
				Пациент получил ответы на вопросы
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentRisksUnderstood}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentRisksUnderstood(event.target.checked)
					}
				/>
				Пациент понял риски, ограничения и прогноз
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentWithdrawUnderstood}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentWithdrawUnderstood(event.target.checked)
					}
				/>
				Пациенту объяснено право отказаться до вмешательства
			</label>

			{isConsentModalOpen && (
				<InformedConsentModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={patientModalData}
					doctorName={
						informedConsentDoctorFullName?.trim() ||
						activeDoctorFullName?.trim() ||
						"Врач-стоматолог клиники"
					}
					diagnosisIcd={
						informedConsentDiagnosisOrIndication?.trim() ||
						activeVisitComplaint?.trim() ||
						"Санация полости рта"
					}
					toothNumbers={
						informedConsentToothOrArea?.trim() ||
						inferredTreatmentArea?.trim() ||
						"Полость рта"
					}
					isSigned={isClosedOrSigned}
					status={visitStatus}
					watermarkText={effectiveWatermark}
				/>
			)}
		</DocumentPayloadCard>
	);
});

InformedConsentForm.displayName = "InformedConsentForm";
