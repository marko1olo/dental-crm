import type { GeneratedDocument } from "@dental/shared";

export interface OutpatientDocumentCardProps {
	doc: GeneratedDocument;
	isDropdownOpen: boolean;
	onToggleDropdown: () => void;
	onOpen: () => void;
	onPrint: () => void;
	onDownloadHtml?: (() => void) | undefined;
}

export interface DocumentsOutpatientArchiveProps {
	patientId?: string | undefined;
	onOpenDocument?: ((documentId: string) => void) | undefined;
	onPrintDocument?: ((documentId: string) => void) | undefined;
	onOpenBlankContract?: (() => void) | undefined;
	onOpenBlankConsent?: (() => void) | undefined;
	onOpenBlankMedicalCard?: (() => void) | undefined;
	onOpenBlankForm043?: (() => void) | undefined;
	className?: string | undefined;
}
