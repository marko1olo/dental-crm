export interface DocumentUkepSignButtonProps {
	documentId: string;
	onSuccess?: () => void;
	onFallbackPepSign?: () => void;
	onPrintPaperFallback?: () => void;
}

export type CertificatesState = "loading" | "failed" | "ready";

export const CERTIFICATE_STORE_ADVICE =
	"Вставьте носитель с подписью (Рутокен или JaCarta), проверьте, что КриптоПро CSP запущен, и нажмите «Проверить снова».";

export const SIGN_FAILURE_TAIL =
	"Документ остался без крипто-подписи. Повторите подписание, а если отказ повторится — сообщите администратору клиники.";

export type PdfLoadResult =
	| { ok: true; base64: string }
	| { ok: false; reason: string };
