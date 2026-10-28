import React from "react";
import type { DocumentKind, DocumentStatus, GeneratedDocument, Patient } from "@dental/shared";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documentAutonomy";

export interface DocumentVoidModalHeaderProps {
	document: GeneratedDocument;
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	patientName?: ((patients: Patient[] | undefined, id: string | null | undefined) => string) | undefined;
	patients?: Patient[] | undefined;
}

export const DocumentVoidModalHeader: React.FC<DocumentVoidModalHeaderProps> = ({
	document,
	documentLabels,
	documentStatusLabels,
	patientName,
	patients,
}) => {
	const docLabel = documentLabels?.[document.kind] ?? document.kind;
	const patientTitle = typeof patientName === "function" ? patientName(patients, document.patientId) : "Пациент";
	const statusTitle = documentStatusLabels?.[document.status] ?? CANONICAL_DOCUMENT_STATUS_LABELS[document.status] ?? document.status;

	return (
		<>
			<div>
				<span>Аннулирование без удаления архива</span>
				<strong>{docLabel}</strong>
				<p>
					Пациент: {patientTitle}
					{document.taxYear ? ` · год ${document.taxYear}` : ""} · {statusTitle}
				</p>
			</div>
			<div className="flex flex-col gap-1.5 my-3 text-[12.5px] text-[var(--ink-2,#64748b)]">
				<div className="flex items-center gap-2">
					<span className="w-1.5 h-1.5 rounded-full bg-[var(--warn-fg,#f59e0b)] shrink-0" />
					<span>Запись останется в журнале, архивная копия не удаляется.</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="w-1.5 h-1.5 rounded-full bg-[var(--warn-fg,#f59e0b)] shrink-0" />
					<span>Для налоговых и медицинских документов укажите, нужна ли замена или исправляющий документ.</span>
				</div>
			</div>
		</>
	);
};
