/**
 * documentTemplateTypes.ts
 * Clean typing for DocumentsTemplateGrid modules.
 * Architecture: Mandates 8b, 8e, 8n, Apple HIG.
 */

import type { DocumentKind } from "@dental/shared";
import type {
	DocumentCategoryTab,
	DocumentTemplateItem,
	DocumentsTemplateGridProps,
} from "../types";

export type {
	DocumentCategoryTab,
	DocumentTemplateItem,
	DocumentsTemplateGridProps,
};

export interface TemplateActionHandlers {
	readonly onSelectDocumentKind: (kind: DocumentKind | (string & {})) => void;
	readonly onCreateDocument: (kind: DocumentKind | (string & {})) => void | Promise<void>;
	readonly onOpenFocusEditor: (kind: DocumentKind | (string & {})) => void;
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
}

export interface DocumentCardItemProps extends TemplateActionHandlers {
	readonly template: DocumentTemplateItem;
	readonly isSelected: boolean;
	readonly isSaving: boolean;
}
