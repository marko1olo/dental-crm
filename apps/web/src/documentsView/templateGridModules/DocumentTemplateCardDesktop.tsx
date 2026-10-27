/**
 * DocumentTemplateCardDesktop.tsx
 * Desktop grid card view for document template catalog.
 * Mandates 8b, 8e, 8am: Clean tokens, zero cartoon emojis, doctor autonomy.
 */

import { FileText } from "lucide-react";
import React from "react";
import { DocumentTemplateActions } from "./DocumentTemplateActions";
import type { DocumentCardItemProps } from "./documentTemplateTypes";

export const DocumentTemplateCardDesktop: React.FC<DocumentCardItemProps> = ({
	template,
	isSelected,
	isSaving,
	onSelectDocumentKind,
	onCreateDocument,
	onOpenFocusEditor,
	onOpenPrimaryIntakePackage,
}) => {
	return (
		<article
			className={`document-template-card relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-150 bg-[var(--paper,#ffffff)] ${
				isSelected
					? "border-[var(--teal,#0d9488)] ring-2 ring-[var(--teal,#0d9488)]/15 shadow-xs"
					: "border-[var(--line,#e2e8f0)] hover:border-[var(--line-strong,#cbd5e1)] hover:shadow-2xs"
			}`}
		>
			<div>
				<div className="flex items-start justify-between gap-2 mb-2">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<FileText size={16} />
						</div>
						<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
							{template.badgeRu}
						</span>
					</div>
					{template.regulationRu && (
						<span
							className="text-[10px] font-medium text-[var(--muted,#64748b)] truncate max-w-[120px]"
							title={template.regulationRu}
						>
							{template.regulationRu}
						</span>
					)}
				</div>

				<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] leading-snug mb-1">
					{template.titleRu}
				</h3>
				<p className="text-[11px] text-[var(--muted,#64748b)] leading-normal line-clamp-2 mb-3">
					{template.descriptionRu}
				</p>
			</div>

			<DocumentTemplateActions
				template={template}
				isSaving={isSaving}
				onSelectDocumentKind={onSelectDocumentKind}
				onCreateDocument={onCreateDocument}
				onOpenFocusEditor={onOpenFocusEditor}
				onOpenPrimaryIntakePackage={onOpenPrimaryIntakePackage}
			/>
		</article>
	);
};
