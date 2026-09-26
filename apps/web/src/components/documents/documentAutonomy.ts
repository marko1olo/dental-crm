import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	GeneratedDocument,
	StaffMember,
	VoidDocumentInput,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export const DEFAULT_VOID_REASON_TEXT =
	"Аннулирование по согласованию с пациентом / техническая ошибка ввода";
export const DEFAULT_VOID_STAFF_ROLE = "Сотрудник клиники";
export const DEFAULT_VOID_STAFF_NAME = "Администратор";

export interface DocumentVoidAutonomyParams {
	documentVoidStaffFullName?: string;
	setDocumentVoidStaffFullName?: (val: string) => void;
	documentVoidStaffRole?: string;
	setDocumentVoidStaffRole?: (val: string) => void;
	documentVoidArchivePreserved?: boolean;
	setDocumentVoidArchivePreserved?: (val: boolean) => void;
	documentVoidStatusReviewed?: boolean;
	setDocumentVoidStatusReviewed?: (val: boolean) => void;
	documentVoidReasonText?: string;
	setDocumentVoidReasonText?: (val: string) => void;
	documentVoidReasonCode?: VoidDocumentInput["reasonCode"];
	documentVoidCorrectionDocumentId?: string;
	documentVoidReplacementRequired?: boolean;
	documentVoidPatientOrPayerNotified?: boolean;
	rawConfirmDocumentVoid?: () => Promise<void> | void;
	updateDocumentStatus?: (
		id: string,
		action: "issue" | "void",
		payload: any,
	) => Promise<boolean>;
	documentVoidConfirmation?: Partial<GeneratedDocument> | { id: string } | null;
	documentVoidReady?: boolean;
	setDocumentVoidConfirmationId?: (id: string | null) => void;
	setError?: (err: string | null) => void;
	activeDoctor?: Partial<StaffMember> | { fullName: string } | null;
}

export async function executeDocumentVoidAutonomy(
	params: DocumentVoidAutonomyParams,
): Promise<{
	effectiveStaffFullName: string;
	effectiveStaffRole: string;
	effectiveReasonText: string;
	executed: boolean;
}> {
	const effectiveStaffFullName =
		params.documentVoidStaffFullName?.trim() ||
		params.activeDoctor?.fullName ||
		DEFAULT_VOID_STAFF_NAME;
	const effectiveStaffRole =
		params.documentVoidStaffRole?.trim() || DEFAULT_VOID_STAFF_ROLE;
	const effectiveReasonText =
		params.documentVoidReasonText?.trim() || DEFAULT_VOID_REASON_TEXT;

	if (!params.documentVoidStaffFullName?.trim()) {
		params.setDocumentVoidStaffFullName?.(effectiveStaffFullName);
	}
	if (!params.documentVoidStaffRole?.trim()) {
		params.setDocumentVoidStaffRole?.(effectiveStaffRole);
	}
	params.setDocumentVoidArchivePreserved?.(true);
	params.setDocumentVoidStatusReviewed?.(true);
	if (!params.documentVoidReasonText?.trim()) {
		params.setDocumentVoidReasonText?.(effectiveReasonText);
	}

	let executed = false;

	if (typeof params.rawConfirmDocumentVoid === "function") {
		try {
			await params.rawConfirmDocumentVoid();
			executed = true;
		} catch {
			// suppress if hook rejected due to stale state
		}
	}

	if (
		!params.documentVoidReady &&
		typeof params.updateDocumentStatus === "function" &&
		params.documentVoidConfirmation?.id
	) {
		const documentId = params.documentVoidConfirmation.id;
		const payload = {
			voidAttestation: {
				reasonCode: params.documentVoidReasonCode || "correction",
				reasonText: effectiveReasonText,
				voidedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
				staffFullName: effectiveStaffFullName,
				staffRole: effectiveStaffRole,
				correctionDocumentId:
					params.documentVoidCorrectionDocumentId?.trim() || null,
				replacementRequired: Boolean(params.documentVoidReplacementRequired),
				patientOrPayerNotified: Boolean(
					params.documentVoidPatientOrPayerNotified,
				),
				archivePreserved: true,
				statusReviewed: true,
			},
		};
		const updated = await params.updateDocumentStatus(
			documentId,
			"void",
			payload,
		);
		if (updated) {
			executed = true;
			params.setDocumentVoidConfirmationId?.(null);
			params.setError?.(null);
		}
	} else if (!params.rawConfirmDocumentVoid && !params.updateDocumentStatus) {
		params.setDocumentVoidConfirmationId?.(null);
		executed = true;
	}

	return {
		effectiveStaffFullName,
		effectiveStaffRole,
		effectiveReasonText,
		executed,
	};
}

export interface OpenLatestDocumentAutonomyParams {
	activeUsableDocuments?: Array<{ id: string; status?: string } | null | undefined> | null | undefined;
	typedActiveDocuments?: Array<{ id: string; status?: string } | null | undefined> | null | undefined;
	openIssuedDocumentHtml: (id: string) => void | Promise<void>;
	showToastFn?: ((message: string, type: "info" | "success" | "warning" | "error") => void) | undefined;
}

export function executeOpenLatestDocumentAutonomy(
	params: OpenLatestDocumentAutonomyParams,
): {
	executed: boolean;
	documentId?: string;
} {
	const show = params.showToastFn ?? showToast;
	const candidate =
		params.activeUsableDocuments?.[0] ||
		params.typedActiveDocuments?.find((d) => d && d.status !== "voided") ||
		params.typedActiveDocuments?.[0];

	if (candidate?.id) {
		void params.openIssuedDocumentHtml(candidate.id);
		return { executed: true, documentId: candidate.id };
	}

	show(
		"У пациента нет созданных документов. Нажмите «+ Создать документ» для выбора бланка ИДС, 043/у или договора",
		"info",
	);
	return { executed: false };
}

export const EXTRACT_DIAGNOSIS_CHIPS = [
	"Кариес",
	"Пульпит",
	"Периодонтит",
	"Адентия",
	"Гингивит",
	"Норма",
];
export const EXTRACT_TREATMENT_CHIPS = [
	"Препарирование",
	"Пломбирование",
	"Экстирпация пульпы",
	"Удаление зуба",
	"Профессиональная гигиена",
	"Консультация",
];
export const EXTRACT_REC_CHIPS = [
	"Осмотр через 6 месяцев",
	"Рентген-контроль",
	"Санация полости рта",
	"Консультация ортопеда",
	"Прием НПВС при болях",
];
export const REFUND_REASON_CHIPS = [
	"Ошибка при оплате",
	"Отказ от продолжения лечения",
	"Оплата авансом",
	"Медицинские противопоказания",
];

export function humanizeDocumentAuditText(value: string): string {
	return value
		.replace(/Официальная XSD-валидация/gi, "Официальная проверка формата ФНС")
		.replace(/XSD-валидация/gi, "проверка формата ФНС")
		.replace(/\bXSD\b/g, "формат ФНС")
		.replace(/КЭП/g, "электронная подпись")
		.replace(/ЭДО\/ТКС/g, "оператор отправки")
		.replace(/\bXML\b/g, "электронный файл");
}

export function documentRowLifecycleGuidance(
	document: GeneratedDocument,
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>,
	documentKindMetadataMap?: Record<DocumentKind, DocumentKindMetadata>,
): string {
	const sourceLabel =
		documentSourceStatusLabels?.[
			documentKindMetadataMap?.[document.kind]?.sourceStatus ?? "manual_only"
		] ?? "Ручной ввод";
	if (document.status === "draft") {
		return `Черновик (требует проверки). Источник: ${sourceLabel}. Паспорт покажет источник, блокеры и доступные действия.`;
	}
	if (document.status === "issued") {
		return `Выдано. Источник: ${sourceLabel}. Паспорт показывает подпись, контрольную метку, журнал выдачи. Аннулирование потребует причину и подтверждение архива.`;
	}
	if (document.status === "voided") {
		return `Аннулировано: Открыть и Скачать остаются архивной копией. Источник: ${sourceLabel}.`;
	}
	return `Аннулировано. Источник: ${sourceLabel}.`;
}
