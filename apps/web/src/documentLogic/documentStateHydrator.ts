import type { GeneratedDocument } from "@dental/shared";
import { documentPayloadValidators } from "../documentValidators";
import { createClinicalSlice } from "../store/documentStore/slices/clinicalSlice";
import { createDocumentSlice } from "../store/documentStore/slices/documentSlice";
import { createFinancialSlice } from "../store/documentStore/slices/financialSlice";
import { createIntakeAndConsentSlice } from "../store/documentStore/slices/intakeConsentSlice";
import { createMiscSlice } from "../store/documentStore/slices/miscSlice";
import { createTaxSlice } from "../store/documentStore/slices/taxSlice";
import { structuredPayloadDocumentKinds } from "../workspaceUiLabels";
import type {
	DocumentState,
	DocumentTextLinesInput,
	ResolvedDocumentState,
} from "./types";

const noopStoreSet = () => {};
const EMPTY_STRING_FN = () => "";
const EMPTY_ZERO_FN = () => 0;
const EMPTY_STR_ARRAY_FN = (): string[] => [];

function defaultDocumentTextLines(
	value: DocumentTextLinesInput | null | undefined,
): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => String(item).trim()).filter(Boolean);
	}
	if (typeof value === "string") {
		return value
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	}
	return [];
}

const baseStoreSlices = {
	...createDocumentSlice(noopStoreSet),
	...createTaxSlice(noopStoreSet),
	...createIntakeAndConsentSlice(noopStoreSet),
	...createFinancialSlice(noopStoreSet),
	...createClinicalSlice(noopStoreSet),
	...createMiscSlice(noopStoreSet),
};

const DEFAULT_RESOLVED_DOCUMENT_STATE: ResolvedDocumentState = {
	...baseStoreSlices,
	activeDoctor: null,
	allowBlankForPrint: false,
	clinicProfileDraft: null,
	dashboard: null,
	documentPatient: null,
	inferredTreatmentArea: null,
	selectedCompletedActContractDocumentId: "",
	selectedReleaseSourceRequestDocumentId: "",
	releaseProtectionNote: "",
	selectedPaymentReceiptPayments: [],
	selectedPaymentReceiptTotalRub: 0,
	documentTextLines: defaultDocumentTextLines,
	requiredDocumentField,
	confirmedDocumentLiteral,
	clinicalToothRowsValue: () => [],
	treatmentPlanStageRows: () => [],
	treatmentAcceptanceStageRows: () => [],
	installmentScheduleInstallmentRows: () => [],
	plannedServiceLinesForFinancialPayload: () => [],
	dentalMedicalCard043uPayloadValue: () => ({
		formNumber: "043/у",
		organization: {
			fullName: "Клиника",
			shortName: null,
			address: null,
			phone: null,
			ogrn: null,
			inn: null,
			licenseNumber: null,
			licenseIssueDate: null,
			licenseAuthority: null,
		},
		patient: {
			fullName: "",
			birthDate: null,
			sex: null,
			phone: null,
			address: null,
			documentSeriesNumber: null,
			snils: null,
			medicalCardNumber: null,
		},
		doctor: {
			fullName: "",
			specialty: null,
			position: null,
		},
		visitDate: "",
	}),
	completedActFiscalReceiptLines: EMPTY_STR_ARRAY_FN,
	paymentReceiptFiscalReceiptLines: EMPTY_STR_ARRAY_FN,
	selectedTaxPaymentIdsForCurrentDocument: EMPTY_STR_ARRAY_FN,
	attendanceEndedAtValue: EMPTY_STRING_FN,
	attendanceSignedByValue: EMPTY_STRING_FN,
	attendanceStartedAtValue: EMPTY_STRING_FN,
	completedActDoctorFullNameValue: EMPTY_STRING_FN,
	completedActServicesSummaryValue: EMPTY_STRING_FN,
	installmentScheduleBaseDocumentTitleValue: EMPTY_STRING_FN,
	installmentSchedulePayerFullNameValue: EMPTY_STRING_FN,
	installmentScheduleResponsibleFullNameValue: EMPTY_STRING_FN,
	minorConsentDiagnosisOrIndicationValue: EMPTY_STRING_FN,
	minorConsentDoctorFullNameValue: EMPTY_STRING_FN,
	minorConsentInterventionScopeValue: EMPTY_STRING_FN,
	minorConsentPatientBirthDateValue: EMPTY_STRING_FN,
	minorConsentPatientFullNameValue: EMPTY_STRING_FN,
	minorRepresentativeFullNameValue: EMPTY_STRING_FN,
	minorRepresentativeIdentityDocumentValue: EMPTY_STRING_FN,
	minorRepresentativePhoneValue: EMPTY_STRING_FN,
	minorRepresentativeRelationshipValue: EMPTY_STRING_FN,
	paidContractCareReasonValue: EMPTY_STRING_FN,
	paidContractCustomerFullNameValue: EMPTY_STRING_FN,
	paidContractDoctorFullNameValue: EMPTY_STRING_FN,
	paidContractServiceScopeValue: EMPTY_STRING_FN,
	paymentInvoiceBankDetailsValue: EMPTY_STRING_FN,
	paymentInvoicePayerFullNameValue: EMPTY_STRING_FN,
	paymentReceiptIssuedByValue: EMPTY_STRING_FN,
	paymentReceiptPayerBirthDateValue: EMPTY_STRING_FN,
	paymentReceiptPayerFullNameValue: EMPTY_STRING_FN,
	paymentReceiptPayerIdentityDocumentValue: EMPTY_STRING_FN,
	paymentReceiptPayerInnValue: EMPTY_STRING_FN,
	paymentReceiptPayerRelationshipValue: EMPTY_STRING_FN,
	postVisitDoctorFullNameValue: EMPTY_STRING_FN,
	postVisitProcedureNameValue: EMPTY_STRING_FN,
	postVisitToothOrAreaValue: EMPTY_STRING_FN,
	recordExtractComplaintAndAnamnesisValue: EMPTY_STRING_FN,
	recordExtractDiagnosisValue: EMPTY_STRING_FN,
	recordExtractObjectiveStatusValue: EMPTY_STRING_FN,
	recordExtractTreatmentProvidedValue: EMPTY_STRING_FN,
	treatmentEstimateDoctorFullNameValue: EMPTY_STRING_FN,
	treatmentEstimatePatientOrPayerFullNameValue: EMPTY_STRING_FN,
	treatmentEstimateTreatmentBasisValue: EMPTY_STRING_FN,
	treatmentPlanClinicalReasonValue: EMPTY_STRING_FN,
	treatmentPlanDiagnosisSummaryValue: EMPTY_STRING_FN,
	treatmentPlanDoctorFullNameValue: EMPTY_STRING_FN,
	treatmentPlanTeethOrAreaValue: EMPTY_STRING_FN,
	warrantyDoctorFullNameValue: EMPTY_STRING_FN,
	warrantyLinkedActOrContractValue: EMPTY_STRING_FN,
	warrantyServiceOrWorkNameValue: EMPTY_STRING_FN,
	warrantyTeethOrAreaValue: EMPTY_STRING_FN,
	completedActPaidRubValue: EMPTY_ZERO_FN,
	completedActTotalRubValue: EMPTY_ZERO_FN,
	installmentSchedulePrepaidRubValue: EMPTY_ZERO_FN,
	installmentScheduleRemainingRubValue: EMPTY_ZERO_FN,
	installmentScheduleTotalRubValue: EMPTY_ZERO_FN,
	paidContractTotalRubValue: EMPTY_ZERO_FN,
	paymentInvoiceTotalRubValue: EMPTY_ZERO_FN,
	treatmentAcceptanceTotalRubValue: EMPTY_ZERO_FN,
	treatmentEstimateTotalRubValue: EMPTY_ZERO_FN,
	treatmentPlanTotalRubValue: EMPTY_ZERO_FN,
};

export function resolveDocumentState(
	state: DocumentState | Record<string, unknown> | null | undefined,
): ResolvedDocumentState {
	if (!state) return DEFAULT_RESOLVED_DOCUMENT_STATE;
	return new Proxy(DEFAULT_RESOLVED_DOCUMENT_STATE, {
		get(target, prop, receiver) {
			if (
				typeof prop === "string" &&
				Object.prototype.hasOwnProperty.call(state, prop)
			) {
				const val = Reflect.get(state, prop, state);
				if (val !== undefined) return val;
			}
			return Reflect.get(target, prop, receiver);
		},
	});
}

/**
 * Чистые помощники, которых валидаторы и сборщики ждут прямо в состоянии.
 *
 * ЧТО БЫЛО. Все 55 валидаторов в documentValidators.ts достают
 * requiredDocumentField и confirmedDocumentLiteral ИЗ ОБЪЕКТА СОСТОЯНИЯ:
 * `const { paidContractNumber, ..., requiredDocumentField } = state;`. А
 * состояние — это хранилище документов (useDocumentStore), и таких функций в нём
 * нет и никогда не было: они объявлены внутри useAppLogic.
 *
 * Что видел пользователь: нажимает «Создать выбранный документ» — и не
 * происходит НИЧЕГО. В консоли «requiredDocumentField is not a function»,
 * документ не создаётся, сообщения об ошибке нет. Проверено живьём на виде
 * «Согласие» (scratch/verify-document-timestamps.mjs): число документов в базе не
 * менялось. Через структурные валидаторы проходят 31 вид документов из 71 — то
 * есть договор, акт, смета, счёт, расписка, анкета, налоговое заявление и все
 * согласия.
 *
 * ПОЧЕМУ ТАК, А НЕ ПРАВКОЙ 55 ФУНКЦИЙ. Обе функции чистые: одна возвращает текст
 * «Заполните поле», другая бросает исключение при неподтверждённом условии.
 * Держать их в состоянии не было причины. Подставляем их на входе — состояние
 * перечисляется ПОСЛЕ, поэтому если однажды их начнут передавать явно, переданное
 * победит и здесь ничего менять не придётся.
 *
 * ЧТО ЭТИМ НЕ ЛЕЧИТСЯ. Валидаторы и сборщики ждут из состояния ещё и десятки
 * вычисляемых значений вида completedActTotalRubValue — они действительно живут в
 * useAppLogic и подставить их здесь нечем. Виды документов, которым они нужны,
 * упрутся в ту же ошибку, только с другим именем. Это отдельная работа, и она
 * записана долгом.
 */
export function requiredDocumentField(
	value: string | null | undefined,
	label: string,
): string | null {
	return String(value ?? "").trim() ? null : `Заполните поле: ${label}.`;
}

export function confirmedDocumentLiteral(
	value: boolean,
	label: string,
): true {
	if (!value) {
		throw new Error(
			`Не подтверждено обязательное условие документа: ${label}.`,
		);
	}
	return true;
}

export function withDocumentHelpers<T extends DocumentState>(
	state: T,
): T & Pick<ResolvedDocumentState, "requiredDocumentField" | "confirmedDocumentLiteral"> {
	return { requiredDocumentField, confirmedDocumentLiteral, ...state };
}

export function validateDocumentPayloadForKind(
	kind: GeneratedDocument["kind"],
	state: DocumentState,
): string[] | string | null {
	if (!structuredPayloadDocumentKinds.has(kind)) return null;
	const validator = documentPayloadValidators[kind];
	if (validator) {
		return validator(withDocumentHelpers(state));
	}
	return null;
}

/**
 * Безопасная гидратация состояния формы документа профилями клиники, врача и пациента.
 */
export function hydrateDocumentStateWithProfiles<T extends DocumentState>(
	state: T,
	context: {
		clinicProfileDraft?: DocumentState["clinicProfileDraft"];
		documentPatient?: DocumentState["documentPatient"];
		activeDoctor?: DocumentState["activeDoctor"];
		dashboard?: DocumentState["dashboard"];
	},
): T & {
	clinicProfileDraft?: DocumentState["clinicProfileDraft"] | undefined;
	documentPatient?: DocumentState["documentPatient"] | undefined;
	activeDoctor?: DocumentState["activeDoctor"] | undefined;
	dashboard?: DocumentState["dashboard"] | undefined;
} {
	return {
		...state,
		clinicProfileDraft: context.clinicProfileDraft ?? state.clinicProfileDraft,
		documentPatient: context.documentPatient ?? state.documentPatient,
		activeDoctor: context.activeDoctor ?? state.activeDoctor,
		dashboard: context.dashboard ?? state.dashboard,
	};
}
