import { useCallback, useEffect, useState } from "react";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../../utils/cryptoPro";
import { responseErrorMessage } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import type { CertificatesState } from "./types";
import { SIGN_FAILURE_TAIL } from "./types";
import { loadIssuedPdfBase64 } from "./loadIssuedPdf";
import { submitUkepSignature } from "./submitUkepSignature";

export function useUkepSignLogic(documentId: string, onSuccess?: () => void) {
	const [isSigning, setIsSigning] = useState(false);
	const [hasPlugin, setHasPlugin] = useState<boolean | null>(null);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [certificatesState, setCertificatesState] = useState<CertificatesState>("loading");
	const [certificatesFailureDetail, setCertificatesFailureDetail] = useState("");
	const [signFailure, setSignFailure] = useState("");

	const loadCertificates = useCallback(async () => {
		setCertificatesState("loading");
		setCertificatesFailureDetail("");
		try {
			const list = await getPersonalCertificates();
			setCertificates(list);
			setSelectedThumbprint(list[0]?.thumbprint ?? "");
			setCertificatesState("ready");
		} catch (error) {
			setCertificates([]);
			setSelectedThumbprint("");
			const parsed = parseCryptoProError(error);
			setCertificatesFailureDetail(parsed.userMessage);
			setCertificatesState("failed");
		}
	}, []);

	const detectPlugin = useCallback(async () => {
		setHasPlugin(null);
		const detected = await checkCryptoProPlugin();
		setHasPlugin(detected);
		if (detected) await loadCertificates();
	}, [loadCertificates]);

	useEffect(() => {
		void detectPlugin();
	}, [detectPlugin]);

	function failSigning(reason: string): void {
		setSignFailure(reason);
		showToast(reason, "error", 9000);
	}

	const selectedCert = certificates.find((c) => c.thumbprint === selectedThumbprint);
	const isSelectedCertExpired = selectedCert ? new Date(selectedCert.validTo).getTime() < Date.now() : false;
	const isSelectedCertNonGost = selectedCert ? selectedCert.isGost === false : false;

	const handleSign = async () => {
		if (!selectedThumbprint || !selectedCert) {
			failSigning("Подписывать нечем: сертификат не выбран. Выберите сертификат в списке.");
			return;
		}
		if (isSelectedCertExpired) {
			failSigning(`Срок действия сертификата истек (${new Date(selectedCert.validTo).toLocaleDateString("ru-RU")}).`);
			return;
		}
		if (isSelectedCertNonGost) {
			failSigning("Выбранный сертификат не соответствует ГОСТ Р 34.10-2012.");
			return;
		}

		setIsSigning(true);
		setSignFailure("");
		try {
			const pdf = await loadIssuedPdfBase64(documentId);
			if (!pdf.ok) {
				failSigning(pdf.reason);
				return;
			}
			const signature = await signBase64WithCertificate(pdf.base64, selectedThumbprint);
			const response = await submitUkepSignature(documentId, signature, selectedCert);
			if (!response.ok) {
				const reason = await responseErrorMessage(response, "Подпись УКЭП не сохранена");
				failSigning(`${reason}. ${SIGN_FAILURE_TAIL}`);
				return;
			}
			showToast("Документ успешно подписан УКЭП (КриптоПро)", "success");
			onSuccess?.();
		} catch (error) {
			const parsed = parseCryptoProError(error);
			showToast(parsed.userMessage, parsed.isCancellation ? "warning" : "error", 8000);
			failSigning(`${parsed.userMessage}. ${SIGN_FAILURE_TAIL}`);
		} finally {
			setIsSigning(false);
		}
	};

	return {
		isSigning,
		hasPlugin,
		certificates,
		selectedThumbprint,
		setSelectedThumbprint,
		certificatesState,
		certificatesFailureDetail,
		signFailure,
		selectedCert,
		isSelectedCertExpired,
		isSelectedCertNonGost,
		detectPlugin,
		loadCertificates,
		handleSign,
	};
}
