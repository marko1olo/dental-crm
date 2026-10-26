import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface SanpinRegistryPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onOpenSickLeaveEln: () => void;
	/** Семантический обработчик открытия журнала автоклавирования (Мандат 8ap) */
	readonly onOpenAutoclaveLog?: () => void;
	/** @deprecated Обратная совместимость с устаревшими вызовами */
	readonly onOpenAutoclaveLog257?: () => void;
	readonly onOpenEgiszRemd: () => void;
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenPsoJournal366?: (() => void) | undefined;
	readonly onOpenSanpinRegisters?: (() => void) | undefined;
}
