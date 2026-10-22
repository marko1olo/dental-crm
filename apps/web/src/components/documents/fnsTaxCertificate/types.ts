import type { Patient } from "@dental/shared";
import type { TaxPaymentRecord } from "../taxCertificateEngine";

export interface FnsTaxCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly payments?: TaxPaymentRecord[] | undefined;
	readonly initialYear?: number | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onDownloadPdf?: (() => void) | undefined;
}
