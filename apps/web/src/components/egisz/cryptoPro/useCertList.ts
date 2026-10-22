/**
 * useCertList.ts — Hook managing CryptoPro CSP certificate enumeration and selection.
 * Mandate 8b compliant (<= 120 lines).
 */

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import { type CertificateInfo, signatureService } from "../../../lib/cryptopro";
import { parseCryptoProError } from "../../../utils/cryptoPro";

export function useCertList() {
	const [selectedCert, setSelectedCert] = useState<CertificateInfo | null>(null);
	const [availableCerts, setAvailableCerts] = useState<CertificateInfo[]>([]);
	const [isCheckingCerts, setIsCheckingCerts] = useState<boolean>(false);

	const refreshCerts = useCallback(async (isManual: boolean = false) => {
		setIsCheckingCerts(true);
		try {
			const certs = await signatureService.getCertificates();
			setAvailableCerts(certs);
			if (certs.length > 0 && !selectedCert) {
				setSelectedCert(certs[0] || null);
			}
		} catch (e) {
			setAvailableCerts([]);
			const parsed = parseCryptoProError(e);
			if (isManual) {
				showToast(`КриптоПро CSP: ${parsed.userMessage}`, "warning");
			}
		} finally {
			setIsCheckingCerts(false);
		}
	}, [selectedCert]);

	useEffect(() => {
		refreshCerts(false);
	}, [refreshCerts]);

	return {
		selectedCert,
		setSelectedCert,
		availableCerts,
		isCheckingCerts,
		refreshCerts,
	};
}
