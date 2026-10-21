import React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { CheckCircle2, Clock, PlusCircle, Zap } from "lucide-react";
import { CLINICAL_STATUTORY_ITEMS } from "./types";

export interface ClinicalPackageChecklistProps {
	readonly documentsByKind: Map<DocumentKind, GeneratedDocument[]>;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onClose: () => void;
}

export function ClinicalPackageChecklist({
	documentsByKind,
	onOpenDocument,
	onSelectDocumentKind,
	onCreateDocument,
	onClose,
}: ClinicalPackageChecklistProps): React.JSX.Element {
	return (
		<div className="document-package-checklist">
			{CLINICAL_STATUTORY_ITEMS.map((item) => {
				const existingList = documentsByKind.get(item.kind) ?? [];
				const latestDoc = existingList[0];
				const isIssued = latestDoc?.status === "issued";
				const isDraft = latestDoc?.status === "draft";

				return (
					<div className="document-package-item-card" key={item.kind}>
						<div className="document-package-item-info">
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								{isIssued ? (
									<CheckCircle2 size={18} color="var(--success-fg, #10b981)" aria-hidden="true" />
								) : isDraft ? (
									<Clock size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
								) : (
									<PlusCircle size={18} color="var(--muted, #94a3b8)" aria-hidden="true" />
								)}
								<span className="document-package-item-title">{item.title}</span>
							</div>
							<span className="document-package-item-sub">
								<strong>{item.statutoryRef}</strong> — {item.description}
							</span>
						</div>

						<div className="document-package-item-actions">
							{latestDoc ? (
								<>
									<button
										type="button"
										className="secondary-button"
										onClick={() => onOpenDocument(latestDoc.id)}
									>
										Открыть
									</button>
									<button
										type="button"
										className="secondary-button"
										onClick={() => {
											onSelectDocumentKind(item.kind);
											onClose();
										}}
									>
										{isDraft ? "Редактировать черновик" : "Параметры"}
									</button>
								</>
							) : (
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										onSelectDocumentKind(item.kind);
										onCreateDocument(item.kind);
									}}
								>
									<Zap size={14} aria-hidden="true" />
									Создать
								</button>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
