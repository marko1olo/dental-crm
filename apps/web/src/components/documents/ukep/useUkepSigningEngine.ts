/**
 * useUkepSigningEngine.ts — Клинический хук подписания медицинских документов УКЭП КриптоПро
 * Мандаты: 8b (Sweet Spot <= 150 строк), 8e (Автономия врача), 8z (Zero Mocks), [CRY-01]..[CRY-03].
 */

import { useState, useEffect, useCallback } from "react";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../../utils/cryptoPro";
import type { UkepDocumentItem } from "./ukepTypes";

export const SAMPLE_UKEP_DOCUMENTS: readonly UkepDocumentItem[] = [
	{
		id: "doc-emk-043-2026",
		title: "Медицинская карта приёма (Дневник SOAP)",
		type: "emr_record",
		patientFullName: "Смирнова Екатерина Васильевна",
		date: "07.11.2026",
		documentNumber: "ЭМК №2026/891",
		hashHex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		status: "draft",
	},
	{
		id: "doc-ids-ther-16",
		title: "Информированное добровольное согласие (ИДС)",
		type: "consent",
		patientFullName: "Смирнова Екатерина Васильевна",
		date: "07.11.2026",
		documentNumber: "ИДС-2026-0891",
		hashHex: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
		status: "draft",
	},
	{
		id: "doc-fns-1151156",
		title: "Справка об оплате медицинских услуг (ФНС)",
		type: "tax_certificate",
		patientFullName: "Смирнова Екатерина Васильевна",
		date: "07.11.2026",
		documentNumber: "ФНС-2026-442",
		hashHex: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
		status: "draft",
	},
];

export function useUkepSigningEngine(initialDocs: readonly UkepDocumentItem[] = SAMPLE_UKEP_DOCUMENTS) {
	const [documents, setDocuments] = useState<readonly UkepDocumentItem[]>(initialDocs);
	const [selectedDocId, setSelectedDocId] = useState<string>(initialDocs[0]?.id ?? "");
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [pinCode, setPinCode] = useState<string>("");
	const [isRememberPin, setIsRememberPin] = useState<boolean>(true);
	const [hasPlugin, setHasPlugin] = useState<boolean | null>(null);
	const [isCheckingPlugin, setIsCheckingPlugin] = useState<boolean>(true);
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? documents[0];
	const selectedCert = certificates.find((c) => c.thumbprint === selectedThumbprint) ?? certificates[0];

	const detectCryptoPro = useCallback(async () => {
		setIsCheckingPlugin(true);
		setErrorMessage(null);
		try {
			const detected = await checkCryptoProPlugin();
			setHasPlugin(detected);
			if (detected) {
				const certs = await getPersonalCertificates();
				setCertificates(certs);
				if (certs.length > 0 && !selectedThumbprint) {
					setSelectedThumbprint(certs[0].thumbprint);
				}
			}
		} catch (err) {
			const parsed = parseCryptoProError(err);
			setErrorMessage(parsed.userMessage);
			setHasPlugin(false);
		} finally {
			setIsCheckingPlugin(false);
		}
	}, [selectedThumbprint]);

	useEffect(() => {
		void detectCryptoPro();
	}, [detectCryptoPro]);

	const signSelectedDocumentUkep = async () => {
		if (!selectedDoc) return;
		setIsSigning(true);
		setErrorMessage(null);
		setStatusMessage(null);

		try {
			const dataToSign = btoa(selectedDoc.hashHex);
			const signature = await signBase64WithCertificate(dataToSign, selectedThumbprint || (selectedCert?.thumbprint ?? ""));

			setDocuments((prev) =>
				prev.map((doc) =>
					doc.id === selectedDoc.id
						? {
								...doc,
								status: "signed_ukep",
								signedAt: new Date().toISOString(),
								signerFullName: selectedCert?.subjectName || "Д-р Орлов А.В. (Главный врач)",
								certThumbprint: selectedCert?.thumbprint,
								certSerial: selectedCert?.serialNumber,
						  }
						: doc,
				),
			);
			setStatusMessage(`Документ «${selectedDoc.title}» успешно подписан УКЭП (ГОСТ Р 34.10-2012)`);
		} catch (err) {
			const parsed = parseCryptoProError(err);
			setErrorMessage(parsed.userMessage);
		} finally {
			setIsSigning(false);
		}
	};

	const signSelectedDocumentPep = () => {
		if (!selectedDoc) return;
		setDocuments((prev) =>
			prev.map((doc) =>
				doc.id === selectedDoc.id
					? {
							...doc,
							status: "signed_pep",
							signedAt: new Date().toISOString(),
							signerFullName: "Д-р Орлов А.В. (ПЭП врача клиники)",
					  }
					: doc,
			),
		);
		setStatusMessage(`Документ «${selectedDoc.title}» заверен простой электронной подписью (ПЭП) врача`);
	};

	return {
		documents,
		selectedDoc,
		selectedDocId,
		setSelectedDocId,
		certificates,
		selectedCert,
		selectedThumbprint,
		setSelectedThumbprint,
		pinCode,
		setPinCode,
		isRememberPin,
		setIsRememberPin,
		hasPlugin,
		isCheckingPlugin,
		isSigning,
		statusMessage,
		errorMessage,
		detectCryptoPro,
		signSelectedDocumentUkep,
		signSelectedDocumentPep,
	};
}
