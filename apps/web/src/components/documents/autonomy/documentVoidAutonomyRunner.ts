import type {
	DocumentVoidAttestation,
	GeneratedDocument,
	StaffMember,
	VoidDocumentInput,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	DEFAULT_VOID_REASON_TEXT,
	DEFAULT_VOID_STAFF_NAME,
	DEFAULT_VOID_STAFF_ROLE,
} from "./documentAutonomyConstants";

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
		String(params.documentVoidStaffFullName || "").trim() ||
		String(params.activeDoctor?.fullName || "").trim() ||
		DEFAULT_VOID_STAFF_NAME;

	const effectiveStaffRole =
		String(params.documentVoidStaffRole || "").trim() ||
		DEFAULT_VOID_STAFF_ROLE;

	const effectiveReasonText =
		String(params.documentVoidReasonText || "").trim() ||
		DEFAULT_VOID_REASON_TEXT;

	params.setDocumentVoidStaffFullName?.(effectiveStaffFullName);
	params.setDocumentVoidStaffRole?.(effectiveStaffRole);
	params.setDocumentVoidReasonText?.(effectiveReasonText);
	params.setDocumentVoidArchivePreserved?.(true);
	params.setDocumentVoidStatusReviewed?.(true);

	let executed = false;
	const docId = params.documentVoidConfirmation?.id;

	if (typeof params.rawConfirmDocumentVoid === "function") {
		await params.rawConfirmDocumentVoid();
		executed = true;
	} else if (docId && typeof params.updateDocumentStatus === "function") {
		const payload: VoidDocumentInput = {
			voidAttestation: {
				reasonCode: params.documentVoidReasonCode ?? "draft_error",
				reasonText: effectiveReasonText,
				voidedAt: new Date().toISOString(),
				correctionDocumentId: params.documentVoidCorrectionDocumentId || undefined,
				replacementRequired: Boolean(params.documentVoidReplacementRequired),
				patientOrPayerNotified: Boolean(params.documentVoidPatientOrPayerNotified),
				archivePreserved: true,
				statusReviewed: true,
				staffFullName: effectiveStaffFullName,
				staffRole: effectiveStaffRole,
			},
		};
		const ok = await params.updateDocumentStatus(docId, "void", payload);
		if (ok) {
			params.setDocumentVoidConfirmationId?.(null);
			params.setError?.(null);
			showToast("Документ успешно аннулирован (архивная копия сохранена)", "info");
			executed = true;
		}
	}

	return {
		effectiveStaffFullName,
		effectiveStaffRole,
		effectiveReasonText,
		executed,
	};
}

export { computeDocumentVoidMissingSteps } from "./documentVoidMissingSteps";
