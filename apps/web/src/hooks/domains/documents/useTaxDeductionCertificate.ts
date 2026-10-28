import {
	requestFailureMessage,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";

export interface UseTaxDeductionCertificateProps {
	auth: ReturnType<typeof useAuthLogic>;
	setError: (err: string | null) => void;
}

export function useTaxDeductionCertificate({
	auth,
	setError,
}: UseTaxDeductionCertificateProps) {
	async function downloadTaxDocumentXml(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/tax-xml`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Файл справки для налоговой не выгружен",
					),
				);
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName = quotedFileName?.trim() || `dente-tax-${documentId}.xml`;
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
					"Файл справки для налоговой не выгружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				requestFailureMessage("Файл справки для налоговой не выгружен", error),
			);
		}
	}

	return {
		downloadTaxDocumentXml,
	};
}
