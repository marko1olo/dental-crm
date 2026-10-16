import React from "react";
import { FileSignature, X } from "lucide-react";
import type { GeneratedDocument, Patient } from "@dental/shared";

export interface DocumentIssueModalHeaderProps {
	doc: GeneratedDocument;
	documentLabels?: Record<string, string> | undefined;
	patientName?: ((patients: Patient[] | undefined, id: string | null | undefined) => string) | undefined;
	patients?: Patient[] | undefined;
	onClose: () => void;
}

export const DocumentIssueModalHeader: React.FC<DocumentIssueModalHeaderProps> = React.memo(
	function DocumentIssueModalHeader({ doc, documentLabels, patientName, patients, onClose }) {
		return (
			<div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
						<FileSignature className="w-5 h-5" />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]" id="document-issue-confirmation-title">
							Подтверждение выдачи официального документа
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							{documentLabels?.[doc.kind] ?? doc.kind} · Пациент:{" "}
							{typeof patientName === "function" ? patientName(patients, doc.patientId) : "Пациент"}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть подтверждение выдачи"
					title="Закрыть"
					data-testid="btn-close-issue-modal"
					className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
				>
					<X className="w-4.5 h-4.5" />
				</button>
			</div>
		);
	},
);
