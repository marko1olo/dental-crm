/**
 * DocumentTemplateActions.tsx
 * Action button group for document templates.
 * Mandate 8e: Doctor autonomy, buttons are never blocked (disabled={false}).
 * Mandate 8am: Exactly 1 Primary CTA per visible item.
 */

import type { DocumentKind } from "@dental/shared";
import { Eye, FilePlus, Printer } from "lucide-react";
import React from "react";
import type {
	DocumentTemplateItem,
	TemplateActionHandlers,
} from "./documentTemplateTypes";

export interface DocumentTemplateActionsProps extends TemplateActionHandlers {
	readonly template: DocumentTemplateItem;
	readonly isSaving: boolean;
}

export const DocumentTemplateActions: React.FC<
	DocumentTemplateActionsProps
> = ({
	template,
	isSaving,
	onSelectDocumentKind,
	onCreateDocument,
	onOpenFocusEditor,
	onOpenPrimaryIntakePackage,
}) => {
	const isPackage = template.id === "primary_intake_package_quick";

	const handleEditorClick = () => {
		if (isPackage && onOpenPrimaryIntakePackage) {
			onOpenPrimaryIntakePackage();
			return;
		}
		onOpenFocusEditor(template.kind as DocumentKind);
	};

	const handlePrimaryClick = () => {
		if (isPackage && onOpenPrimaryIntakePackage) {
			onOpenPrimaryIntakePackage();
			return;
		}
		onSelectDocumentKind(template.kind as DocumentKind);
		void onCreateDocument(template.kind as DocumentKind);
	};

	return (
		<div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-[var(--line-subtle,#f1f5f9)]">
			<button
				type="button"
				onClick={handleEditorClick}
				className="secondary-button button-sm h-7 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
				title="Открыть в редакторе"
			>
				<Eye size={13} />
				<span>Редактор</span>
			</button>

			<button
				type="button"
				disabled={false}
				onClick={handlePrimaryClick}
				className="primary-button button-sm h-7 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
				title={
					isPackage
						? "Распечатать комплект первичных документов"
						: "Сформировать и сохранить документ"
				}
			>
				{isPackage ? <Printer size={13} /> : <FilePlus size={13} />}
				<span>
					{isPackage ? "Распечатать" : isSaving ? "Создаю..." : "Создать"}
				</span>
			</button>
		</div>
	);
};
