import React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { CheckCircle2, Clock, PlusCircle } from "lucide-react";
import type { StatutoryIntakeItem } from "./types";
import { PrimaryIntakeDocumentBadges } from "./PrimaryIntakeDocumentBadges";
import { PrimaryIntakeDocumentActions } from "./PrimaryIntakeDocumentActions";

interface PrimaryIntakeDocumentItemProps {
	item: StatutoryIntakeItem;
	existingDocs: GeneratedDocument[];
	isSignedPep: boolean;
	isNormApplied: boolean;
	activeInterventionLabels: string;
	onFillSomaticNorm: () => void;
	onOpenDocument: (documentId: string) => void;
	onSelectDocumentKind: (kind: DocumentKind) => void;
	onCreateDocument: (kind: DocumentKind) => void;
	onClose: () => void;
}

export function PrimaryIntakeDocumentItem({
	item,
	existingDocs,
	isSignedPep,
	isNormApplied,
	activeInterventionLabels,
	onFillSomaticNorm,
	onOpenDocument,
	onSelectDocumentKind,
	onCreateDocument,
	onClose,
}: PrimaryIntakeDocumentItemProps) {
	const latestDoc = existingDocs[0];
	const isIssued = latestDoc?.status === "issued" || isSignedPep;
	const isDraft = latestDoc?.status === "draft" && !isSignedPep;
	const isQuestionnaire = item.kind === "patient_intake_questionnaire";
	const isConsent = item.kind === "informed_consent";

	return (
		<div className="document-package-item-card">
			<div className="document-package-item-info">
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					{isIssued ? (
						<CheckCircle2 size={18} color="var(--success-fg, #10b981)" aria-hidden="true" />
					) : isDraft ? (
						<Clock size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
					) : (
						<PlusCircle size={18} color="var(--muted, #94a3b8)" aria-hidden="true" />
					)}
					<span className="document-package-item-title">{item.title}</span>
					<PrimaryIntakeDocumentBadges kind={item.kind} isIssued={isIssued} />
				</div>
				<span className="document-package-item-sub">
					<strong>{item.statutoryRef}</strong> —{" "}
					{isConsent
						? `Согласие на виды вмешательств: ${activeInterventionLabels}.`
						: item.description}
				</span>
			</div>

			<PrimaryIntakeDocumentActions
				kind={item.kind}
				latestDoc={latestDoc}
				isDraft={isDraft}
				isQuestionnaire={isQuestionnaire}
				isNormApplied={isNormApplied}
				onFillSomaticNorm={onFillSomaticNorm}
				onOpenDocument={onOpenDocument}
				onSelectDocumentKind={onSelectDocumentKind}
				onCreateDocument={onCreateDocument}
				onClose={onClose}
			/>
		</div>
	);
}
