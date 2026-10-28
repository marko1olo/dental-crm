import React from "react";
import type { DocumentKind, DocumentStatus, DocumentVoidAttestation, GeneratedDocument } from "@dental/shared";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documentAutonomy";

export interface DocumentVoidAttestationGridProps {
	documentId: string;
	documentVoidReasonCode: DocumentVoidAttestation["reasonCode"];
	setDocumentVoidReasonCode: (code: any) => void;
	normalizedDocumentVoidReasonCode: (val: string) => any;
	documentVoidReasonLabels: Record<string, string>;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (val: string) => void;
	activeDoctor?: { fullName?: string } | null | undefined;
	documentVoidStaffRole: string;
	setDocumentVoidStaffRole: (val: string) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (val: string) => void;
	activeUsableDocuments: GeneratedDocument[];
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (val: string) => void;
}

export const DocumentVoidAttestationGrid: React.FC<DocumentVoidAttestationGridProps> = ({
	documentId,
	documentVoidReasonCode,
	setDocumentVoidReasonCode,
	normalizedDocumentVoidReasonCode,
	documentVoidReasonLabels,
	documentVoidStaffFullName,
	setDocumentVoidStaffFullName,
	activeDoctor,
	documentVoidStaffRole,
	setDocumentVoidStaffRole,
	documentVoidCorrectionDocumentId,
	setDocumentVoidCorrectionDocumentId,
	activeUsableDocuments,
	documentLabels,
	documentStatusLabels,
	documentVoidReasonText,
	setDocumentVoidReasonText,
}) => {
	return (
		<div className="document-issue-attestation-grid">
			<label>
				<span>Причина</span>
				<select
					value={documentVoidReasonCode}
					style={{ minHeight: "44px" }}
					onChange={(e) => setDocumentVoidReasonCode(normalizedDocumentVoidReasonCode(e.target.value))}
				>
					{(Object.entries(documentVoidReasonLabels) as Array<[string, string]>)?.map(([code, label]) => (
						<option key={code} value={code}>
							{label}
						</option>
					))}
				</select>
			</label>
			<label>
				<span>Ответственный сотрудник</span>
				<input
					value={documentVoidStaffFullName}
					style={{ minHeight: "44px" }}
					onChange={(e) => setDocumentVoidStaffFullName(e.target.value)}
					placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
				/>
			</label>
			<label>
				<span>Роль сотрудника</span>
				<input
					value={documentVoidStaffRole}
					style={{ minHeight: "44px" }}
					onChange={(e) => setDocumentVoidStaffRole(e.target.value)}
					placeholder="врач, администратор"
				/>
			</label>
			<label>
				<span>Исправляющий документ</span>
				<select
					value={documentVoidCorrectionDocumentId}
					style={{ minHeight: "44px" }}
					onChange={(e) => setDocumentVoidCorrectionDocumentId(e.target.value)}
				>
					<option value="">Не выбран</option>
					{activeUsableDocuments
						.filter((doc) => doc.id !== documentId)
						?.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{documentLabels?.[doc.kind] ?? doc.kind} ·{" "}
								{documentStatusLabels?.[doc.status] ?? CANONICAL_DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
							</option>
						))}
				</select>
			</label>
			<label className="document-issue-attestation-note">
				<span>Подробная причина</span>
				<textarea
					value={documentVoidReasonText}
					style={{ minHeight: "64px" }}
					onChange={(e) => setDocumentVoidReasonText(e.target.value)}
					placeholder="Например: в справке указан неверный плательщик, нужна новая годовая справка после проверки чеков."
				/>
			</label>
		</div>
	);
};
