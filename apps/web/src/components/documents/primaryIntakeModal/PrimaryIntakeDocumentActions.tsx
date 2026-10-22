import React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { Sparkles, Zap } from "lucide-react";

interface PrimaryIntakeDocumentActionsProps {
	kind: DocumentKind;
	latestDoc?: GeneratedDocument | undefined;
	isDraft: boolean;
	isQuestionnaire: boolean;
	isNormApplied: boolean;
	onFillSomaticNorm: () => void;
	onOpenDocument: (documentId: string) => void;
	onSelectDocumentKind: (kind: DocumentKind) => void;
	onCreateDocument: (kind: DocumentKind) => void;
	onClose: () => void;
}

export function PrimaryIntakeDocumentActions({
	kind,
	latestDoc,
	isDraft,
	isQuestionnaire,
	isNormApplied,
	onFillSomaticNorm,
	onOpenDocument,
	onSelectDocumentKind,
	onCreateDocument,
	onClose,
}: PrimaryIntakeDocumentActionsProps) {
	return (
		<div className="document-package-item-actions">
			{isQuestionnaire && (
				<button
					type="button"
					className="secondary-button"
					data-testid="questionnaire-row-norm-btn"
					onClick={onFillSomaticNorm}
					style={{
						fontSize: "12px",
						minHeight: "32px",
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						color: "var(--teal, #0d9488)",
						fontWeight: 600,
					}}
					title="Заполнить анкету соматической нормой"
				>
					<Sparkles size={13} aria-hidden="true" />
					<span>{isNormApplied ? "Норма" : "Заполнить нормой"}</span>
				</button>
			)}

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
							onSelectDocumentKind(kind);
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
						onSelectDocumentKind(kind);
						onCreateDocument(kind);
					}}
				>
					<Zap size={14} aria-hidden="true" />
					Создать
				</button>
			)}
		</div>
	);
}
