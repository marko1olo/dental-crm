import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	DocumentVoidAttestation,
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
	documentVoidReasonCode?: DocumentVoidAttestation["reasonCode"];
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
		"У пациента нет созданных документов. Нажмите «+ Создать документ» для выбора согласия, медкарты или договора",
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

export const CANONICAL_DOCUMENT_STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	issued: "Выдан",
	voided: "Аннулирован",
	pending: "В обработке",
	signed: "Подписан",
	archived: "В архиве",
};

export function filterDocumentsForRegistry(params: {
	typedActiveDocuments: GeneratedDocument[];
	activeCategoryTab: string;
	intakeKinds: Set<DocumentKind>;
	clinicalKinds: Set<DocumentKind>;
	financeTaxKinds: Set<DocumentKind>;
	certificatesSanpinKinds: Set<DocumentKind>;
	registrySearchQuery: string;
	registryStatusFilter: string;
	registryEdsFilter: string;
	registryKindFilter: "all" | DocumentKind;
	documentLabels?: Record<string, string>;
}): GeneratedDocument[] {
	let list = params.typedActiveDocuments;
	if (params.activeCategoryTab === "intake") {
		list = list.filter((doc) => params.intakeKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "clinical") {
		list = list.filter((doc) => params.clinicalKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "finance_tax") {
		list = list.filter((doc) => params.financeTaxKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "certificates_sanpin") {
		list = list.filter((doc) => params.certificatesSanpinKinds.has(doc.kind));
	}
	if (params.registrySearchQuery.trim()) {
		const query = params.registrySearchQuery.toLowerCase().trim();
		list = list.filter(
			(doc) =>
				doc.title?.toLowerCase().includes(query) ||
				doc.kind?.toLowerCase().includes(query) ||
				(params.documentLabels?.[doc.kind] ?? "").toLowerCase().includes(query),
		);
	}
	if (params.registryStatusFilter !== "all") {
		list = list.filter((doc) => doc.status === params.registryStatusFilter);
	}
	if (params.registryEdsFilter !== "all") {
		list = list.filter((doc) => {
			const isSignedEds = Boolean(doc.doctorSignedAt || (doc as any).signedAt);
			const isSignedPaper = Boolean(doc.signatureAttestation && !isSignedEds);
			if (params.registryEdsFilter === "signed_eds") return isSignedEds;
			if (params.registryEdsFilter === "signed_paper") return isSignedPaper;
			if (params.registryEdsFilter === "unsigned") return !isSignedEds && !isSignedPaper;
			return true;
		});
	}
	if (params.registryKindFilter !== "all") {
		list = list.filter((doc) => doc.kind === params.registryKindFilter);
	}
	return list;
}

export function computeAvailableRegistryKinds(
	typedActiveDocuments: GeneratedDocument[],
	documentLabels?: Record<string, string>,
): Array<{ key: DocumentKind; label: string; count: number }> {
	const counts: Record<string, number> = {};
	for (const doc of typedActiveDocuments) {
		counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
	}
	return (Object.keys(counts) as DocumentKind[]).map((kind) => ({
		key: kind,
		label: documentLabels?.[kind] ?? kind,
		count: counts[kind] ?? 0,
	}));
}

export function computeNavCategoryCounts(params: {
	typedActiveDocuments: GeneratedDocument[];
	intakeKinds: Set<DocumentKind>;
	clinicalKinds: Set<DocumentKind>;
	financeTaxKinds: Set<DocumentKind>;
	certificatesSanpinKinds: Set<DocumentKind>;
}) {
	return {
		all: params.typedActiveDocuments.length,
		intake: params.typedActiveDocuments.filter((d) => params.intakeKinds.has(d.kind)).length,
		clinical: params.typedActiveDocuments.filter((d) => params.clinicalKinds.has(d.kind)).length,
		finance_tax: params.typedActiveDocuments.filter((d) => params.financeTaxKinds.has(d.kind)).length,
		certificates_sanpin: params.typedActiveDocuments.filter((d) =>
			params.certificatesSanpinKinds.has(d.kind),
		).length,
	};
}

export function computeDocumentIssueMissingSteps(params: {
	documentIssueSignedAt?: string;
	documentIssueRecipientFullName?: string;
	documentIssueRecipientRole?: string;
}): string[] {
	return [
		!String(params.documentIssueSignedAt || "").trim() ? "укажите дату и время подписи" : null,
		!String(params.documentIssueRecipientFullName || "").trim() ? "укажите получателя" : null,
		!String(params.documentIssueRecipientRole || "").trim() ? "укажите статус получателя" : null,
	].filter(Boolean) as string[];
}

export function computeDocumentVoidMissingSteps(params: {
	documentVoidArchivePreserved?: boolean;
	documentVoidPatientOrPayerNotified?: boolean;
	documentVoidStatusReviewed?: boolean;
	documentVoidStaffFullName?: string;
	documentVoidStaffRole?: string;
}): string[] {
	return [
		!params.documentVoidArchivePreserved ? "подтвердите сохранение архивной копии" : null,
		!params.documentVoidPatientOrPayerNotified ? "подтвердите уведомление пациента/плательщика" : null,
		!params.documentVoidStatusReviewed ? "подтвердите проверку последствий аннулирования" : null,
		!String(params.documentVoidStaffFullName || "").trim() ? "укажите ответственного сотрудника" : null,
		!String(params.documentVoidStaffRole || "").trim() ? "укажите должность сотрудника" : null,
	].filter(Boolean) as string[];
}

