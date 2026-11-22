import type {
	DocumentKind,
	GeneratedDocument,
	Patient,
} from "@dental/shared";
import type { ClinicProfileDraft } from "../../../../AppHelpers";
import type { Egisz043uPayload } from "../../../egisz/egiszRemdEngine";
import type { ProfessionalA4DocumentTab } from "../../types";

export interface DocumentModalsContainerProps {
	isA4PrintPreviewOpen?: boolean | undefined;
	setIsA4PrintPreviewOpen?: ((open: boolean) => void) | undefined;
	a4InitialTab?: ProfessionalA4DocumentTab | undefined;
	isPrimaryIntakeOpen: boolean;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	isPatientConsentSignDrawerOpen?: boolean | undefined;
	setIsPatientConsentSignDrawerOpen?: ((open: boolean) => void) | undefined;
	isSurgicalPackageOpen: boolean;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	isClinicalVisitOpen?: boolean | undefined;
	setIsClinicalVisitOpen?: ((open: boolean) => void) | undefined;
	isTaxAccountingOpen: boolean;
	setIsTaxAccountingOpen: (open: boolean) => void;
	isSanpinRegistryOpen: boolean;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	isAutoclaveLogOpen: boolean;
	setIsAutoclaveLogOpen: (open: boolean) => void;
	/** Семантический обработчик открытия журнала автоклавирования (Мандат 8ap) */
	onOpenAutoclaveLog?: (() => void) | undefined;
	isFnsNdflXmlOpen: boolean;
	setIsFnsNdflXmlOpen: (open: boolean) => void;
	isEgiszRemdOpen: boolean;
	setIsEgiszRemdOpen: (open: boolean) => void;
	isSickLeaveElnOpen: boolean;
	setIsSickLeaveElnOpen: (open: boolean) => void;
	activePatient?: Patient | null | undefined;
	activeDoctor?: { fullName?: string; role?: string; specialties?: string[]; [key: string]: unknown } | null | undefined;
	clinicProfileDraft?: ClinicProfileDraft | undefined;
	typedActiveDocuments?: GeneratedDocument[] | undefined;
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
	selectedTaxDocumentPayerKey?: string | undefined;
	setTaxDocumentPayerInn: (inn: string) => void;
	egiszInitialPayload?: Egisz043uPayload | undefined;
	requestDocumentIssue?:
		| ((doc: GeneratedDocument | { id: string } | string) => void)
		| ((document: GeneratedDocument) => void)
		| ((id: string) => void)
		| undefined;
}
