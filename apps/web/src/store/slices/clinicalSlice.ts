export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
import { defaultClinicalToothRowsText } from "../../utils/draftDefaults";
import { loadUiPreferences } from "../../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createClinicalSlice = (set: any) => ({
	completedActNumber: "",
	setCompletedActNumber: createSetter(set, "completedActNumber"),
	completedActDate: "",
	setCompletedActDate: createSetter(set, "completedActDate"),
	completedActContractNumber: "",
	setCompletedActContractNumber: createSetter(
		set,
		"completedActContractNumber",
	),
	completedActLinkedContractDocumentId: "",
	setCompletedActLinkedContractDocumentId: createSetter(
		set,
		"completedActLinkedContractDocumentId",
	),
	completedActServicePeriodStart: "",
	setCompletedActServicePeriodStart: createSetter(
		set,
		"completedActServicePeriodStart",
	),
	completedActServicePeriodEnd: "",
	setCompletedActServicePeriodEnd: createSetter(
		set,
		"completedActServicePeriodEnd",
	),
	completedActDoctorFullName: "",
	setCompletedActDoctorFullName: createSetter(
		set,
		"completedActDoctorFullName",
	),
	completedActServicesSummary: "",
	setCompletedActServicesSummary: createSetter(
		set,
		"completedActServicesSummary",
	),
	completedActTotalRub: "",
	setCompletedActTotalRub: createSetter(set, "completedActTotalRub"),
	completedActPaidRub: "",
	setCompletedActPaidRub: createSetter(set, "completedActPaidRub"),
	completedActFiscalReceipts: "",
	setCompletedActFiscalReceipts: createSetter(
		set,
		"completedActFiscalReceipts",
	),
	completedActPatientClaims: "",
	setCompletedActPatientClaims: createSetter(set, "completedActPatientClaims"),
	completedActLinkedContract: false,
	setCompletedActLinkedContract: createSetter(
		set,
		"completedActLinkedContract",
	),
	completedActFinalScopeConfirmed: false,
	setCompletedActFinalScopeConfirmed: createSetter(
		set,
		"completedActFinalScopeConfirmed",
	),
	completedActFiscalReceiptsVerified: false,
	setCompletedActFiscalReceiptsVerified: createSetter(
		set,
		"completedActFiscalReceiptsVerified",
	),
	completedActAccepted: false,
	setCompletedActAccepted: createSetter(set, "completedActAccepted"),
	treatmentEstimateNumber: "",
	setTreatmentEstimateNumber: createSetter(set, "treatmentEstimateNumber"),
	treatmentEstimateDate: "",
	setTreatmentEstimateDate: createSetter(set, "treatmentEstimateDate"),
	treatmentEstimatePatientOrPayerFullName: "",
	setTreatmentEstimatePatientOrPayerFullName: createSetter(
		set,
		"treatmentEstimatePatientOrPayerFullName",
	),
	treatmentEstimateTreatmentBasis: "",
	setTreatmentEstimateTreatmentBasis: createSetter(
		set,
		"treatmentEstimateTreatmentBasis",
	),
	treatmentEstimateTotalRub: "",
	setTreatmentEstimateTotalRub: createSetter(set, "treatmentEstimateTotalRub"),
	treatmentEstimateValidUntil: "",
	setTreatmentEstimateValidUntil: createSetter(
		set,
		"treatmentEstimateValidUntil",
	),
	treatmentEstimatePriceChangeRules:
		"при изменении диагноза, объема вмешательства, материалов, лабораторного этапа или клинических условий стоимость согласуется до оказания дополнительных услуг",
	setTreatmentEstimatePriceChangeRules: createSetter(
		set,
		"treatmentEstimatePriceChangeRules",
	),
	treatmentEstimateExcludedItems:
		"услуги, не указанные в строках сметы\nдополнительная диагностика и лабораторные этапы при новых показаниях\nэкстренная помощь и лечение осложнений, не связанных с текущим планом",
	setTreatmentEstimateExcludedItems: createSetter(
		set,
		"treatmentEstimateExcludedItems",
	),
	treatmentEstimatePaymentMilestoneNotes:
		"оплата по этапам лечения или до оказания услуги; после фактической оплаты выдается кассовый чек",
	setTreatmentEstimatePaymentMilestoneNotes: createSetter(
		set,
		"treatmentEstimatePaymentMilestoneNotes",
	),
	treatmentEstimateDoctorFullName: "",
	setTreatmentEstimateDoctorFullName: createSetter(
		set,
		"treatmentEstimateDoctorFullName",
	),
	treatmentEstimateAdminFullName: "",
	setTreatmentEstimateAdminFullName: createSetter(
		set,
		"treatmentEstimateAdminFullName",
	),
	treatmentEstimateSignedAt: "",
	setTreatmentEstimateSignedAt: createSetter(set, "treatmentEstimateSignedAt"),
	treatmentEstimatePreliminaryConfirmed: false,
	setTreatmentEstimatePreliminaryConfirmed: createSetter(
		set,
		"treatmentEstimatePreliminaryConfirmed",
	),
	treatmentEstimateScopeConfirmed: false,
	setTreatmentEstimateScopeConfirmed: createSetter(
		set,
		"treatmentEstimateScopeConfirmed",
	),
	treatmentEstimateFiscalNoticeConfirmed: false,
	setTreatmentEstimateFiscalNoticeConfirmed: createSetter(
		set,
		"treatmentEstimateFiscalNoticeConfirmed",
	),
	treatmentEstimateChangeRulesConfirmed: false,
	setTreatmentEstimateChangeRulesConfirmed: createSetter(
		set,
		"treatmentEstimateChangeRulesConfirmed",
	),
	clinicalToothRowsText: defaultClinicalToothRowsText,
	setClinicalToothRowsText: createSetter(set, "clinicalToothRowsText"),
	treatmentPlanClinicalReason: "",
	setTreatmentPlanClinicalReason: createSetter(
		set,
		"treatmentPlanClinicalReason",
	),
	treatmentPlanDiagnosisSummary: "",
	setTreatmentPlanDiagnosisSummary: createSetter(
		set,
		"treatmentPlanDiagnosisSummary",
	),
	treatmentPlanTeethOrArea: "",
	setTreatmentPlanTeethOrArea: createSetter(set, "treatmentPlanTeethOrArea"),
	treatmentPlanGoals:
		"устранить жалобы пациента\nвосстановить функцию и герметичность\nснизить риск осложнений и повторного обращения",
	setTreatmentPlanGoals: createSetter(set, "treatmentPlanGoals"),
	/*
	 * Сумма этапа не подставляется — ячейка пустая.
	 *
	 * Каждая строка оканчивалась на «| 0», и вред не только в том, что в плане
	 * печаталось «0 руб.». Ноль ОБЕЗВРЕЖИВАЛ единственный предохранитель выдачи:
	 * сервер не даёт выдать документ, в котором остались незаполненные места
	 * (documentHasUnresolvedPlaceholders ищет среди прочего «не указана»), а
	 * пустая сумма этапа печатается ровно как «не указана». Пустое поле выдачу
	 * остановило бы, подставленный ноль проходил молча — и пациент получал план
	 * лечения, где каждый этап стоит ноль рублей.
	 *
	 * Разборщик treatmentPlanStageRows (useAppLogic.tsx) отдаёт
	 * estimatedAmountRub: null, когда ячейка суммы пуста, и 0, когда в ней стоит
	 * «0»: защиты рядом нет, ?? стоит только на названии этапа, услугах, сроке и
	 * заметках.
	 *
	 * Скелет этапов оставлен: это заготовка структуры, а не утверждение о
	 * деньгах, и валидатор требует хотя бы одну строку. Замыкающая «|» показывает,
	 * куда вписать сумму; формат строки подсказан под полем в DocumentsView.tsx.
	 */
	treatmentPlanStages:
		"Диагностика и подготовка | осмотр, снимки, фото-протокол, согласование объема | до начала лечения | уточнить диагноз и ограничения |\nОсновной этап | услуги по выбранному плану лечения | по расписанию клиники | объем корректируется по клинической ситуации |\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | оценка результата и гигиены |",
	setTreatmentPlanStages: createSetter(set, "treatmentPlanStages"),
	treatmentPlanEstimatedTotalRub: "",
	setTreatmentPlanEstimatedTotalRub: createSetter(
		set,
		"treatmentPlanEstimatedTotalRub",
	),
	treatmentPlanAlternatives:
		"наблюдение без активного лечения\nальтернативный материал или метод лечения\nпоэтапное лечение с переносом части работ\nполучение второго мнения\nотказ от лечения с фиксацией рисков",
	setTreatmentPlanAlternatives: createSetter(set, "treatmentPlanAlternatives"),
	treatmentPlanRisks:
		"изменение плана при новых клинических данных или снимках\nнеобходимость дополнительного визита, консультации или смежного специалиста\nизменение стоимости при изменении объема, материалов или сроков\nограниченный прогноз при исходном состоянии зубов и тканей",
	setTreatmentPlanRisks: createSetter(set, "treatmentPlanRisks"),
	treatmentPlanPrognosis:
		"прогноз зависит от исходного состояния зубов, тканей, гигиены, выполнения рекомендаций и явки на контрольные визиты",
	setTreatmentPlanPrognosis: createSetter(set, "treatmentPlanPrognosis"),
	treatmentPlanControlPlan:
		"контрольный осмотр после завершения этапа и далее по индивидуальному графику",
	setTreatmentPlanControlPlan: createSetter(set, "treatmentPlanControlPlan"),
	treatmentPlanDoctorFullName: "",
	setTreatmentPlanDoctorFullName: createSetter(
		set,
		"treatmentPlanDoctorFullName",
	),
	treatmentPlanPlannedAt: "",
	setTreatmentPlanPlannedAt: createSetter(set, "treatmentPlanPlannedAt"),
	treatmentPlanQuestionsAnswered: false,
	setTreatmentPlanQuestionsAnswered: createSetter(
		set,
		"treatmentPlanQuestionsAnswered",
	),
	treatmentPlanSeparateConsentAcknowledged: false,
	setTreatmentPlanSeparateConsentAcknowledged: createSetter(
		set,
		"treatmentPlanSeparateConsentAcknowledged",
	),
	treatmentPlanNewApprovalAcknowledged: false,
	setTreatmentPlanNewApprovalAcknowledged: createSetter(
		set,
		"treatmentPlanNewApprovalAcknowledged",
	),
	treatmentPlanPatientFriendlyExplanation: "",
	setTreatmentPlanPatientFriendlyExplanation: createSetter(
		set,
		"treatmentPlanPatientFriendlyExplanation",
	),
	treatmentPlanPatientHygieneAdvice: "",
	setTreatmentPlanPatientHygieneAdvice: createSetter(
		set,
		"treatmentPlanPatientHygieneAdvice",
	),
	treatmentPlanCustomHygieneTextOverride: "",
	setTreatmentPlanCustomHygieneTextOverride: createSetter(
		set,
		"treatmentPlanCustomHygieneTextOverride",
	),
	treatmentAcceptanceVariant: "standard",
	setTreatmentAcceptanceVariant: createSetter(
		set,
		"treatmentAcceptanceVariant",
	),
	treatmentAcceptanceClinicalGoal:
		"санация, восстановление функции и профилактика осложнений",
	setTreatmentAcceptanceClinicalGoal: createSetter(
		set,
		"treatmentAcceptanceClinicalGoal",
	),
	treatmentAcceptanceDiagnosisSummary: "",
	setTreatmentAcceptanceDiagnosisSummary: createSetter(
		set,
		"treatmentAcceptanceDiagnosisSummary",
	),
	treatmentAcceptanceTeethOrArea: "",
	setTreatmentAcceptanceTeethOrArea: createSetter(
		set,
		"treatmentAcceptanceTeethOrArea",
	),
	/*
	 * То же, что у treatmentPlanStages выше, и здесь цена важнее: этот документ
	 * пациент подписывает как согласие на СУММУ. Строки оканчивались на «| 0», и
	 * согласование уходило с этапами по нулю рублей, минуя проверку выдачи, —
	 * пустая ячейка печатается как «не указана» и выдачу останавливает.
	 */
	treatmentAcceptanceStages:
		"Диагностика и подготовка | осмотр, снимки, фотопротокол, согласование объема | до начала лечения |\nОсновной этап лечения | услуги по выбранному плану лечения | по расписанию клиники |\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа |",
	setTreatmentAcceptanceStages: createSetter(set, "treatmentAcceptanceStages"),
	treatmentAcceptanceEstimatedTotalRub: "",
	setTreatmentAcceptanceEstimatedTotalRub: createSetter(
		set,
		"treatmentAcceptanceEstimatedTotalRub",
	),
	treatmentAcceptanceEstimateValidUntil: "",
	setTreatmentAcceptanceEstimateValidUntil: createSetter(
		set,
		"treatmentAcceptanceEstimateValidUntil",
	),
	treatmentAcceptancePaymentTerms:
		"оплата по кассовому чеку до или в день оказания услуг; рассрочка или кредит оформляются отдельным соглашением",
	setTreatmentAcceptancePaymentTerms: createSetter(
		set,
		"treatmentAcceptancePaymentTerms",
	),
	treatmentAcceptanceRejectedAlternatives:
		"наблюдение без активного лечения\nперенос лечения\nальтернативный материал или конструкция\nполучение второго мнения",
	setTreatmentAcceptanceRejectedAlternatives: createSetter(
		set,
		"treatmentAcceptanceRejectedAlternatives",
	),
	treatmentAcceptanceRisks:
		"изменение плана при новых клинических данных или снимках\nизменение стоимости при изменении объема, материалов или сроков\nнеобходимость дополнительных визитов, коррекции или смежного специалиста\nограниченный прогноз при исходном состоянии зубов и тканей",
	setTreatmentAcceptanceRisks: createSetter(set, "treatmentAcceptanceRisks"),
	treatmentAcceptanceWarrantyTerms:
		"контрольные визиты обязательны; гарантийные условия действуют в пределах выбранного плана, соблюдения рекомендаций, гигиены и сроков контрольных посещений",
	setTreatmentAcceptanceWarrantyTerms: createSetter(
		set,
		"treatmentAcceptanceWarrantyTerms",
	),
	treatmentAcceptanceDoctorFullName: "",
	setTreatmentAcceptanceDoctorFullName: createSetter(
		set,
		"treatmentAcceptanceDoctorFullName",
	),
	treatmentAcceptanceAcceptedAt: "",
	setTreatmentAcceptanceAcceptedAt: createSetter(
		set,
		"treatmentAcceptanceAcceptedAt",
	),
	treatmentAcceptanceQuestionsAnswered: false,
	setTreatmentAcceptanceQuestionsAnswered: createSetter(
		set,
		"treatmentAcceptanceQuestionsAnswered",
	),
	treatmentAcceptanceAlternativesUnderstood: false,
	setTreatmentAcceptanceAlternativesUnderstood: createSetter(
		set,
		"treatmentAcceptanceAlternativesUnderstood",
	),
	treatmentAcceptanceCostChangeUnderstood: false,
	setTreatmentAcceptanceCostChangeUnderstood: createSetter(
		set,
		"treatmentAcceptanceCostChangeUnderstood",
	),
	treatmentAcceptanceRevisionAcknowledged: false,
	setTreatmentAcceptanceRevisionAcknowledged: createSetter(
		set,
		"treatmentAcceptanceRevisionAcknowledged",
	),
	postVisitCareTopic: initialUiPreferences.postVisitCareTopic,
	setPostVisitCareTopic: createSetter(set, "postVisitCareTopic"),
	/* Девять полей ниже — пресет ВЫБРАННОЙ темы; пояснение у initialPostVisitCarePreset. */
	postVisitProcedureName: initialPostVisitCarePreset.procedureName,
	setPostVisitProcedureName: createSetter(set, "postVisitProcedureName"),
	postVisitToothOrArea: "",
	setPostVisitToothOrArea: createSetter(set, "postVisitToothOrArea"),
	postVisitPerformedAt: "",
	setPostVisitPerformedAt: createSetter(set, "postVisitPerformedAt"),
	postVisitDoctorFullName: "",
	setPostVisitDoctorFullName: createSetter(set, "postVisitDoctorFullName"),
	postVisitManualEdited: false,
	setPostVisitManualEdited: createSetter(set, "postVisitManualEdited"),
	postVisitPresetFeedback: "",
	setPostVisitPresetFeedback: createSetter(set, "postVisitPresetFeedback"),
	postVisitAllowedAfter: initialPostVisitCarePreset.allowedAfter,
	setPostVisitAllowedAfter: createSetter(set, "postVisitAllowedAfter"),
	postVisitRestrictions: initialPostVisitCarePreset.temporaryRestrictions,
	setPostVisitRestrictions: createSetter(set, "postVisitRestrictions"),
	postVisitMedicationAndRinsePlan:
		initialPostVisitCarePreset.medicationAndRinsePlan,
	setPostVisitMedicationAndRinsePlan: createSetter(
		set,
		"postVisitMedicationAndRinsePlan",
	),
	postVisitHygieneInstructions: initialPostVisitCarePreset.hygieneInstructions,
	setPostVisitHygieneInstructions: createSetter(
		set,
		"postVisitHygieneInstructions",
	),
	postVisitNutritionInstructions:
		initialPostVisitCarePreset.nutritionInstructions,
	setPostVisitNutritionInstructions: createSetter(
		set,
		"postVisitNutritionInstructions",
	),
	postVisitUrgentWarningSigns: initialPostVisitCarePreset.urgentWarningSigns,
	setPostVisitUrgentWarningSigns: createSetter(
		set,
		"postVisitUrgentWarningSigns",
	),
	postVisitFollowUpAt: initialPostVisitCarePreset.plannedFollowUpAt,
	setPostVisitFollowUpAt: createSetter(set, "postVisitFollowUpAt"),
	postVisitClinicContactInstruction:
		"связаться с клиникой по телефону или через Telegram-бот клиники",
	setPostVisitClinicContactInstruction: createSetter(
		set,
		"postVisitClinicContactInstruction",
	),
	postVisitTelegramSummary: initialPostVisitCarePreset.telegramSummary,
	setPostVisitTelegramSummary: createSetter(set, "postVisitTelegramSummary"),
	postVisitPrintedCopyReceived: false,
	setPostVisitPrintedCopyReceived: createSetter(
		set,
		"postVisitPrintedCopyReceived",
	),
	postVisitUrgentSignsUnderstood: false,
	setPostVisitUrgentSignsUnderstood: createSetter(
		set,
		"postVisitUrgentSignsUnderstood",
	),
	postVisitTelegramSafe: false,
	setPostVisitTelegramSafe: createSetter(set, "postVisitTelegramSafe"),
	/*
	 * Журнал анестезии начинается пустым.
	 *
	 * Здесь стояли конкретный препарат «Артикаин 4%», вазоконстриктор
	 * «1:100000», доза «1.7» мл, метод и запись «Без особенностей» в графе
	 * реакции. Врач мог не открыть форму — и получал протокол с препаратом,
	 * который не вводил, дозой, которую не набирал, и оценкой реакции,
	 * выставленной до инъекции. При разборе осложнения такой протокол хуже, чем
	 * его отсутствие.
	 *
	 * Время тоже вычислялось один раз при загрузке страницы и больше никогда не
	 * обновлялось: вкладку открыли утром — вечерний протокол уносил утренний час
	 * как время введения. Пусть врач впишет фактическое.
	 *
	 * Все прежние формулировки остались подсказками в пустых полях
	 * (DocumentsView.tsx), аллергоанамнез — кнопкой в AnamnesisField.
	 */
	anesthesiaMethod: "",
	setAnesthesiaMethod: createSetter(set, "anesthesiaMethod"),
	anesthesiaAnesthetic: "",
	setAnesthesiaAnesthetic: createSetter(set, "anesthesiaAnesthetic"),
	anesthesiaVasoconstrictor: "",
	setAnesthesiaVasoconstrictor: createSetter(set, "anesthesiaVasoconstrictor"),
	anesthesiaZone: "",
	setAnesthesiaZone: createSetter(set, "anesthesiaZone"),
	anesthesiaAllergyStatus: "",
	setAnesthesiaAllergyStatus: createSetter(set, "anesthesiaAllergyStatus"),
	anesthesiaRestrictionNotes: "",
	setAnesthesiaRestrictionNotes: createSetter(
		set,
		"anesthesiaRestrictionNotes",
	),
	anesthesiaDoseTime: "",
	setAnesthesiaDoseTime: createSetter(set, "anesthesiaDoseTime"),
	anesthesiaDoseMl: "",
	setAnesthesiaDoseMl: createSetter(set, "anesthesiaDoseMl"),
	anesthesiaReaction: "",
	setAnesthesiaReaction: createSetter(set, "anesthesiaReaction"),
	anesthesiaRisksExplained: false,
	setAnesthesiaRisksExplained: createSetter(set, "anesthesiaRisksExplained"),
	anesthesiaAllergyRestrictionsChecked: false,
	setAnesthesiaAllergyRestrictionsChecked: createSetter(
		set,
		"anesthesiaAllergyRestrictionsChecked",
	),
	anesthesiaConsentConfirmed: false,
	setAnesthesiaConsentConfirmed: createSetter(
		set,
		"anesthesiaConsentConfirmed",
	),
	prescriptionMedication: "",
	setPrescriptionMedication: createSetter(set, "prescriptionMedication"),
	prescriptionDosage: "",
	setPrescriptionDosage: createSetter(set, "prescriptionDosage"),
	prescriptionInstructions: "",
	setPrescriptionInstructions: createSetter(set, "prescriptionInstructions"),
	prescriptionDuration: "",
	setPrescriptionDuration: createSetter(set, "prescriptionDuration"),
	prescriptionSafetyNotes:
		"Проверить аллергоанамнез до выдачи.\nОбъяснить режим приема, ограничения и действия при нежелательной реакции.",
	setPrescriptionSafetyNotes: createSetter(set, "prescriptionSafetyNotes"),
	prescriptionUrgentContactReason:
		"Связаться с клиникой при отеке, сыпи, нарастающей боли, кровотечении или температуре.",
	setPrescriptionUrgentContactReason: createSetter(
		set,
		"prescriptionUrgentContactReason",
	),
	labWorkType: "",
	setLabWorkType: createSetter(set, "labWorkType"),
	labTeethOrArea: "",
	setLabTeethOrArea: createSetter(set, "labTeethOrArea"),
	labMaterial: "",
	setLabMaterial: createSetter(set, "labMaterial"),
	labShade: "",
	setLabShade: createSetter(set, "labShade"),
	labSource: "",
	setLabSource: createSetter(set, "labSource"),
	labDeadline: "",
	setLabDeadline: createSetter(set, "labDeadline"),
	labTechnicianNotes: "",
	setLabTechnicianNotes: createSetter(set, "labTechnicianNotes"),
	xrayStudyType: "cbct",
	setXrayStudyType: createSetter(set, "xrayStudyType"),
	xrayArea: "",
	setXrayArea: createSetter(set, "xrayArea"),
	xrayClinicalQuestion: "",
	setXrayClinicalQuestion: createSetter(set, "xrayClinicalQuestion"),
	xrayIndication: "",
	setXrayIndication: createSetter(set, "xrayIndication"),
	xrayPregnancyStatus: "unknown",
	setXrayPregnancyStatus: createSetter(set, "xrayPregnancyStatus"),
	xraySafetyNotes:
		"Перед исследованием уточнить беременность, ограничения и необходимость средств защиты.",
	setXraySafetyNotes: createSetter(set, "xraySafetyNotes"),
	xrayPriority: "routine",
	setXrayPriority: createSetter(set, "xrayPriority"),
	xrayIncludeDicomExport: true,
	setXrayIncludeDicomExport: createSetter(set, "xrayIncludeDicomExport"),
	xrayIncludeRadiologistReport: true,
	setXrayIncludeRadiologistReport: createSetter(
		set,
		"xrayIncludeRadiologistReport",
	),
	xrayRequestedBy: "",
	setXrayRequestedBy: createSetter(set, "xrayRequestedBy"),
	xrayRecipientClinic: "",
	setXrayRecipientClinic: createSetter(set, "xrayRecipientClinic"),
	xrayDueDate: "",
	setXrayDueDate: createSetter(set, "xrayDueDate"),
	outpatient025uMedicalCardNumber: "",
	setOutpatient025uMedicalCardNumber: createSetter(
		set,
		"outpatient025uMedicalCardNumber",
	),
	outpatient025uOpenedAt: "",
	setOutpatient025uOpenedAt: createSetter(set, "outpatient025uOpenedAt"),
	outpatient025uPatientSexCode: "unknown",
	setOutpatient025uPatientSexCode: createSetter(
		set,
		"outpatient025uPatientSexCode",
	),
	outpatient025uCitizenship: "",
	setOutpatient025uCitizenship: createSetter(set, "outpatient025uCitizenship"),
	outpatient025uRegistrationUrbanRuralCode: "unknown",
	setOutpatient025uRegistrationUrbanRuralCode: createSetter(
		set,
		"outpatient025uRegistrationUrbanRuralCode",
	),
	outpatient025uStayUrbanRuralCode: "unknown",
	setOutpatient025uStayUrbanRuralCode: createSetter(
		set,
		"outpatient025uStayUrbanRuralCode",
	),
	outpatient025uOmsIssuedAt: "",
	setOutpatient025uOmsIssuedAt: createSetter(set, "outpatient025uOmsIssuedAt"),
	outpatient025uInsurerName: "",
	setOutpatient025uInsurerName: createSetter(set, "outpatient025uInsurerName"),
	outpatient025uSocialSupportCode: "",
	setOutpatient025uSocialSupportCode: createSetter(
		set,
		"outpatient025uSocialSupportCode",
	),
	outpatient025uHealthStatusDisclosureContact: "",
	setOutpatient025uHealthStatusDisclosureContact: createSetter(
		set,
		"outpatient025uHealthStatusDisclosureContact",
	),

	outpatient025uEmploymentCode: "",
	setOutpatient025uEmploymentCode: createSetter(
		set,
		"outpatient025uEmploymentCode",
	),
	outpatient025uDisabilityGroup: "",
	setOutpatient025uDisabilityGroup: createSetter(
		set,
		"outpatient025uDisabilityGroup",
	),
	outpatient025uWorkOrStudyPlace: "",
	setOutpatient025uWorkOrStudyPlace: createSetter(
		set,
		"outpatient025uWorkOrStudyPlace",
	),
	outpatient025uPalliativeCareNeedCode: "",
	setOutpatient025uPalliativeCareNeedCode: createSetter(
		set,
		"outpatient025uPalliativeCareNeedCode",
	),
	outpatient025uBloodGroup: "",
	setOutpatient025uBloodGroup: createSetter(set, "outpatient025uBloodGroup"),
	outpatient025uRhFactor: "",
	setOutpatient025uRhFactor: createSetter(set, "outpatient025uRhFactor"),
	outpatient025uKellK1: "",
	setOutpatient025uKellK1: createSetter(set, "outpatient025uKellK1"),
	outpatient025uOtherBloodData: "",
	setOutpatient025uOtherBloodData: createSetter(
		set,
		"outpatient025uOtherBloodData",
	),
	outpatient025uAllergyHistory: "",
	setOutpatient025uAllergyHistory: createSetter(
		set,
		"outpatient025uAllergyHistory",
	),
	outpatient025uFinalEpicrisis: "",
	setOutpatient025uFinalEpicrisis: createSetter(
		set,
		"outpatient025uFinalEpicrisis",
	),
	outpatient025uOfficialForm274nChecked: false,
	setOutpatient025uOfficialForm274nChecked: createSetter(
		set,
		"outpatient025uOfficialForm274nChecked",
	),
	outpatient025uThirdPartyDataChecked: false,
	setOutpatient025uThirdPartyDataChecked: createSetter(
		set,
		"outpatient025uThirdPartyDataChecked",
	),
});

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
