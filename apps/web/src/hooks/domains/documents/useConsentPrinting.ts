import type { DocumentAuditFacts } from "@dental/shared";
import {
	requestFailureMessage,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";

export interface UseConsentPrintingProps {
	auth: ReturnType<typeof useAuthLogic>;
	clinicalAdminSecretSession: string;
	setDocumentAuditFacts: (facts: DocumentAuditFacts | null) => void;
	setDocumentAuditFactsLoadingId: (id: string | null) => void;
	setError: (err: string | null) => void;
}

export function useConsentPrinting({
	auth,
	clinicalAdminSecretSession,
	setDocumentAuditFacts,
	setDocumentAuditFactsLoadingId,
	setError,
}: UseConsentPrintingProps) {
	async function loadDocumentAuditFacts(documentId: string) {
		setDocumentAuditFactsLoadingId(documentId);
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/audit-facts`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Журнал проверки документа не загружен",
					),
				);
				return;
			}
			setDocumentAuditFacts((await response.json()) as DocumentAuditFacts);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Журнал проверки документа не загружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				requestFailureMessage("Журнал проверки документа не загружен", error),
			);
		} finally {
			setDocumentAuditFactsLoadingId(null);
		}
	}

	function issuedDocumentHtmlPreviewUrl(documentId: string): string {
		return `/api/documents/${encodeURIComponent(documentId)}/html`;
	}

	function issuedDocumentHtmlDownloadUrl(documentId: string): string {
		return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;
	}

	async function downloadIssuedDocumentHtml(
		documentId: string,
		options: { preserveError?: boolean } = {},
	) {
		try {
			const response = await fetchWithHandling(
				issuedDocumentHtmlDownloadUrl(documentId),
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Архивная копия документа не скачана"),
				);
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.html`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			if (!options.preserveError) setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Архивная копия документа не скачана",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Архивная копия документа не скачана", error));
		}
	}

	async function openIssuedDocumentHtml(documentId: string) {
		try {
			const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
			if (clinicalAdminSecretSession.trim()) {
				setError(
					"Предпросмотр в новом окне не может передать ключ сессии. Запускается защищенное скачивание копии документа.",
				);
				await downloadIssuedDocumentHtml(documentId, { preserveError: true });
				return;
			}

			const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
			if (opened) {
				setError(null);
				return;
			}

			setError(
				"Браузер заблокировал новое окно документа. Запускается скачивание копии документа.",
			);
			await downloadIssuedDocumentHtml(documentId, { preserveError: true });
		} catch (error) {
			showToast(
				actionFailureToast(
					"Документ не открыт",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Документ не открыт", error));
		}
	}

	async function downloadIssuedDocumentPdf(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/pdf`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(await responseErrorMessage(response, "PDF не сформирован"));
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.pdf`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"PDF не сформирован",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("PDF не сформирован", error));
		}
	}

	return {
		loadDocumentAuditFacts,
		issuedDocumentHtmlPreviewUrl,
		issuedDocumentHtmlDownloadUrl,
		downloadIssuedDocumentHtml,
		openIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
	};
}
