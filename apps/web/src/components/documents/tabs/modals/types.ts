import type {
	DocumentKind,
	GeneratedDocument,
	Patient,
} from "@dental/shared";
import type { ClinicProfileDraft } from "../../../../AppHelpers";
import type { Egisz043uPayload } from "../../../egisz/egiszRemdEngine";
import type { ProfessionalA4DocumentTab } from "../../types";

export interface DocumentModalsContainerProps {
	isA4PrintPreviewOpen?: boolean;
	setIsA4PrintPreviewOpen?: (open: boolean) => void;
	a4InitialTab?: ProfessionalA4DocumentTab;
	isPrimaryIntakeOpen: boolean;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	isPatientConsentSignDrawerOpen?: boolean;
	setIsPatientConsentSignDrawerOpen?: (open: boolean) => void;
	isSurgicalPackageOpen: boolean;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	isClinicalVisitOpen?: boolean;
	setIsClinicalVisitOpen?: (open: boolean) => void;
	isTaxAccountingOpen: boolean;
	setIsTaxAccountingOpen: (open: boolean) => void;
	isSanpinRegistryOpen: boolean;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	isAutoclaveLogOpen: boolean;
	setIsAutoclaveLogOpen: (open: boolean) => void;
	/** Семантический обработчик открытия журнала автоклавирования (Мандат 8ap) */
	onOpenAutoclaveLog?: () => void;
	isFnsNdflXmlOpen: boolean;
	setIsFnsNdflXmlOpen: (open: boolean) => void;
	isEgiszRemdOpen: boolean;
	setIsEgiszRemdOpen: (open: boolean) => void;
	isSickLeaveElnOpen: boolean;
	setIsSickLeaveElnOpen: (open: boolean) => void;
	activePatient?: Patient | null;
	activeDoctor?: { fullName?: string; role?: string; specialties?: string[]; [key: string]: unknown } | null | undefined;
	clinicProfileDraft?: ClinicProfileDraft;
	typedActiveDocuments?: GeneratedDocument[];
	createDocument: (kind: DocumentKind) => void | Promise<void>;
	openIssuedDocumentHtml: (id: string) => void | Promise<void>;
	setSelectedDocumentKind: (kind: DocumentKind) => void;
	taxDocumentYear: number;
	setTaxDocumentYear: (year: number) => void;
	typedTaxDocumentPayerOptions: Array<{
		key: string;
		inn: string;
		label: string;
		amountRub: number;
		paymentCount: number;
	}>;
	selectedTaxDocumentPayerKey?: string;
	setTaxDocumentPayerInn: (inn: string) => void;
	egiszInitialPayload?: Egisz043uPayload;
	requestDocumentIssue?: (doc: GeneratedDocument) => void;
}
