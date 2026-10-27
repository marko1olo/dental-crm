/**
 * DocumentTemplateCardMobile.tsx
 * Apple HIG Mobile Grouped List Card for document templates.
 * Mandates 8b, 8e, Apple HIG: Touch targets >= 44x44px, min-h >= 52px.
 */

import type { DocumentKind } from "@dental/shared";
import { Eye, FilePlus, FileText, Printer } from "lucide-react";
import React from "react";
import type { DocumentCardItemProps } from "./documentTemplateTypes";

export const DocumentTemplateCardMobile: React.FC<DocumentCardItemProps> = ({
	template,
	isSaving,
	onSelectDocumentKind,
	onCreateDocument,
	onOpenFocusEditor,
	onOpenPrimaryIntakePackage,
}) => {
	const isPackage = template.id === "primary_intake_package_quick";

	const handleEditor = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isPackage && onOpenPrimaryIntakePackage) {
			onOpenPrimaryIntakePackage();
			return;
		}
		onOpenFocusEditor(template.kind as DocumentKind);
	};

	const handlePrimary = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isPackage && onOpenPrimaryIntakePackage) {
			onOpenPrimaryIntakePackage();
			return;
		}
		onSelectDocumentKind(template.kind as DocumentKind);
		void onCreateDocument(template.kind as DocumentKind);
	};

	return (
		<div className="flex items-center justify-between p-3.5 min-h-[56px] transition-colors bg-[var(--paper,#ffffff)] active:bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-start gap-3 min-w-0 pr-2">
				<div className="w-10 h-10 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0 mt-0.5">
					<FileText size={18} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h4 className="text-[14px] font-semibold text-[var(--ink,#0f172a)] leading-snug">
							{template.titleRu}
						</h4>
						<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)]">
							{template.badgeRu}
						</span>
					</div>
					<p className="text-[12px] text-[var(--muted,#64748b)] line-clamp-1 mt-0.5">
						{template.descriptionRu}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={handleEditor}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] active:scale-95 transition-transform"
					title="Редактор"
					aria-label="Редактор"
				>
					<Eye size={18} />
				</button>
				<button
					type="button"
					disabled={false}
					onClick={handlePrimary}
					className="min-h-[44px] h-11 px-3.5 rounded-xl primary-button flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-transform"
					title={isPackage ? "Распечатать" : "Создать"}
				>
					{isPackage ? <Printer size={16} /> : <FilePlus size={16} />}
					<span>
						{isPackage ? "Печать" : isSaving ? "Создаю..." : "Создать"}
					</span>
				</button>
			</div>
		</div>
	);
};
