export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
/*
 * dateInputValuePlusDays отсюда убран вместе со сроком оплаты счёта и графиком
 * рассрочки: в значении поля он считался при загрузке модуля и подсовывал в
 * документ дату, которую никто не вводил. Отметки времени подставляет
 * withDocumentCreationTimestamps в момент создания документа.
 */
import { currentLocalDateTimeInputValue } from "../../utils/dateUtils";
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
const _initialPostVisitCarePreset =
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
export const createDocumentSlice = (set: any) => ({
	documentCreateSavingKind: null,
	setDocumentCreateSavingKind: createSetter(set, "documentCreateSavingKind"),
	documentStatusSavingId: null,
	setDocumentStatusSavingId: createSetter(set, "documentStatusSavingId"),
	selectedTaxPaymentIds: [],
	setSelectedTaxPaymentIds: createSetter(set, "selectedTaxPaymentIds"),
	selectedPaymentReceiptIds: [],
	setSelectedPaymentReceiptIds: createSetter(set, "selectedPaymentReceiptIds"),
	documentIssueConfirmationId: null,
	setDocumentIssueConfirmationId: createSetter(
		set,
		"documentIssueConfirmationId",
	),
	documentIssueSignatureMode: initialUiPreferences.documentIssueSignatureMode,
	setDocumentIssueSignatureMode: createSetter(
		set,
		"documentIssueSignatureMode",
	),
	// БЫЛО: пропущены скобки — в состояние клалась сама ФУНКЦИЯ, а не строка.
	// При нажатии «Выдать документ» код делал documentIssueSignedAt.trim() и падал
	// с TypeError прямо в фазе рендера: приложение уходило в белый экран.
	// Чек-лист готовности при этом ничего не подсвечивал, потому что
	// String(функция) — непустая строка.
	documentIssueSignedAt: currentLocalDateTimeInputValue(),
	setDocumentIssueSignedAt: createSetter(set, "documentIssueSignedAt"),
	documentIssueRecipientFullName: "",
	setDocumentIssueRecipientFullName: createSetter(
		set,
		"documentIssueRecipientFullName",
	),
	documentIssueRecipientRole: "пациент/законный представитель",
	setDocumentIssueRecipientRole: createSetter(
		set,
		"documentIssueRecipientRole",
	),
	documentIssueStaffFullName:
		initialUiPreferences.documentIssueStaffFullName || "",
	setDocumentIssueStaffFullName: createSetter(
		set,
		"documentIssueStaffFullName",
	),
	documentIssueStaffRole: initialUiPreferences.documentIssueStaffRole || "",
	setDocumentIssueStaffRole: createSetter(set, "documentIssueStaffRole"),
	documentIssueNote: "",
	setDocumentIssueNote: createSetter(set, "documentIssueNote"),
	documentIssueIdentityChecked: false,
	setDocumentIssueIdentityChecked: createSetter(
		set,
		"documentIssueIdentityChecked",
	),
	documentIssueDocumentOpenedAndChecked: false,
	setDocumentIssueDocumentOpenedAndChecked: createSetter(
		set,
		"documentIssueDocumentOpenedAndChecked",
	),
	documentIssueRecipientSigned: false,
	setDocumentIssueRecipientSigned: createSetter(
		set,
		"documentIssueRecipientSigned",
	),
	documentIssueClinicSigned: false,
	setDocumentIssueClinicSigned: createSetter(set, "documentIssueClinicSigned"),
	documentVoidConfirmationId: null,
	setDocumentVoidConfirmationId: createSetter(
		set,
		"documentVoidConfirmationId",
	),
	documentVoidReasonCode: "draft_error",
	setDocumentVoidReasonCode: createSetter(set, "documentVoidReasonCode"),
	documentVoidReasonText: "",
	setDocumentVoidReasonText: createSetter(set, "documentVoidReasonText"),
	documentVoidStaffFullName:
		initialUiPreferences.documentIssueStaffFullName || "",
	setDocumentVoidStaffFullName: createSetter(set, "documentVoidStaffFullName"),
	documentVoidStaffRole: initialUiPreferences.documentIssueStaffRole || "",
	setDocumentVoidStaffRole: createSetter(set, "documentVoidStaffRole"),
	documentVoidCorrectionDocumentId: "",
	setDocumentVoidCorrectionDocumentId: createSetter(
		set,
		"documentVoidCorrectionDocumentId",
	),
	documentVoidReplacementRequired: false,
	setDocumentVoidReplacementRequired: createSetter(
		set,
		"documentVoidReplacementRequired",
	),
	documentVoidPatientOrPayerNotified: false,
	setDocumentVoidPatientOrPayerNotified: createSetter(
		set,
		"documentVoidPatientOrPayerNotified",
	),
	documentVoidArchivePreserved: false,
	setDocumentVoidArchivePreserved: createSetter(
		set,
		"documentVoidArchivePreserved",
	),
	documentVoidStatusReviewed: false,
	setDocumentVoidStatusReviewed: createSetter(
		set,
		"documentVoidStatusReviewed",
	),
	documentAuditFacts: null,
	selectedDocumentKind: "treatment_plan",
	setSelectedDocumentKind: (val) =>
		set((state) => ({
			selectedDocumentKind:
				typeof val === "function" ? val(state.selectedDocumentKind) : val,
		})),
	isDocumentIngesting: false,
	setIsDocumentIngesting: (val) =>
		set((state) => ({
			isDocumentIngesting:
				typeof val === "function" ? val(state.isDocumentIngesting) : val,
		})),
	setDocumentAuditFacts: createSetter(set, "documentAuditFacts"),
	documentAuditFactsLoadingId: null,
	setDocumentAuditFactsLoadingId: createSetter(
		set,
		"documentAuditFactsLoadingId",
	),
	documentIngestionTarget: initialUiPreferences.documentIngestionTarget,
	setDocumentIngestionTarget: createSetter(set, "documentIngestionTarget"),
	documentIngestion: null,
	setDocumentIngestion: createSetter(set, "documentIngestion"),
});

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
