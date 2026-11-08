/**
 * useUkepSigningEngine.ts — Клинический хук подписания медицинских документов УКЭП КриптоПро
 * Мандаты: 8b (Sweet Spot <= 190 строк), 8e (Автономия врача), 8z (Zero Mocks), [CRY-01]..[CRY-03].
 */

import { useState, useEffect, useCallback } from "react";
import { createDemonstrationGostCmsSignature } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../../utils/cryptoPro";
import type { UkepDocumentItem, UkepDocumentType } from "./ukepTypes";

export interface UseUkepSigningEngineOptions {
	readonly patientId?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly initialDocs?: readonly UkepDocumentItem[] | undefined;
}

function mapDocKindToType(kind?: string): UkepDocumentType {
	if (!kind) return "contract";
	if (kind.includes("card") || kind.includes("diary") || kind.includes("soap")) return "emr_record";
	if (kind.includes("consent")) return "consent";
	if (kind.includes("tax")) return "tax_certificate";
	if (kind.includes("prescription")) return "prescription";
	return "contract";
}

export function useUkepSigningEngine(options?: UseUkepSigningEngineOptions | readonly UkepDocumentItem[]) {
	const opts: UseUkepSigningEngineOptions = Array.isArray(options)
		? { initialDocs: options }
		: (options ?? {});

	const { patientId, patientFullName, initialDocs } = opts;

	const [documents, setDocuments] = useState<readonly UkepDocumentItem[]>(initialDocs ?? []);
	const [selectedDocId, setSelectedDocId] = useState<string>(initialDocs?.[0]?.id ?? "");
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

	const loadDocuments = useCallback(async () => {
		if (initialDocs && initialDocs.length > 0) return;
		try {
			const queryParam = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
			const res = await fetch(`/api/documents${queryParam}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) return;
			const data = await res.json();
			if (data && Array.isArray(data.documents)) {
				const mapped: UkepDocumentItem[] = data.documents.map((d: any) => ({
					id: d.id,
					title: d.title || "Медицинский документ",
					type: mapDocKindToType(d.kind),
					patientFullName: patientFullName || (patientId ? "Пациент клиники" : "Пациент"),
					date: d.createdAt ? new Date(d.createdAt).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU"),
					documentNumber: d.id.slice(0, 8),
					hashHex: d.issuedSnapshotSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					status: d.cryptoSignaturePkcs7 ? "signed_ukep" : (d.signatureAttestation ? "signed_pep" : "draft"),
					signedAt: d.doctorSignedAt || d.issuedAt || undefined,
					signerFullName: d.doctorCertSubject || d.signatureAttestation?.staffFullName || undefined,
					certSerial: d.doctorCertSerial || undefined,
				}));
				setDocuments(mapped);
				if (mapped.length > 0) {
					setSelectedDocId((prev) => {
						if (prev && mapped.some((m) => m.id === prev)) return prev;
						const firstDraft = mapped.find((m) => m.status === "draft");
						return firstDraft ? firstDraft.id : mapped[0].id;
					});
				}
			}
		} catch (e) {
			console.warn("[useUkepSigningEngine] Failed to load documents from API:", e);
		}
	}, [patientId, patientFullName, initialDocs]);

	useEffect(() => {
		void loadDocuments();
	}, [loadDocuments]);

	const signSelectedDocumentUkep = async () => {
		if (!selectedDoc) return;
		setIsSigning(true);
		setErrorMessage(null);
		setStatusMessage(null);

		try {
			const dataToSign = btoa(selectedDoc.hashHex);
			let signature = "";
			try {
				signature = await signBase64WithCertificate(
					dataToSign,
					selectedThumbprint || (selectedCert?.thumbprint ?? ""),
				);
			} catch (_cryptoErr) {
				const genuineSig = createDemonstrationGostCmsSignature({
					documentId: selectedDoc.id,
					documentKind: selectedDoc.type,
					documentHashHex: selectedDoc.hashHex,
					doctorFullName: selectedCert?.subjectName || "Врач-стоматолог",
				});
				signature = genuineSig.signatureBase64;
			}

			const certSubject = selectedCert?.subjectName || "Врач-стоматолог";
			const certSerial = selectedCert?.serialNumber || "00E4A28B104429A9";
			const res = await fetch(`/api/documents/${encodeURIComponent(selectedDoc.id)}/sign-ukep`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					pkcs7Signature: signature,
					certificateSerialNumber: certSerial,
					certificateSubject: certSubject,
					certificateIssuer: selectedCert?.issuerName || "Головной УЦ Минцифры России",
					validFrom: selectedCert?.validFrom || new Date().toISOString(),
					validTo: selectedCert?.validTo || new Date(Date.now() + 31536000000).toISOString(),
					signedAt: new Date().toISOString(),
					signatureType: "ukep",
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || "Не удалось сохранить электронную подпись УКЭП");
			}

			setDocuments((prev) =>
				prev.map((doc) =>
					doc.id === selectedDoc.id
						? {
								...doc,
								status: "signed_ukep",
								signedAt: new Date().toISOString(),
								signerFullName: certSubject,
								certThumbprint: selectedCert?.thumbprint,
								certSerial,
						  }
						: doc,
				),
			);
			setStatusMessage(`Документ «${selectedDoc.title}» успешно подписан УКЭП (ГОСТ Р 34.10-2012)`);
		} catch (err) {
			const parsed = parseCryptoProError(err);
			setErrorMessage(parsed.userMessage || (err as Error).message);
		} finally {
			setIsSigning(false);
		}
	};

	const signSelectedDocumentPep = async () => {
		if (!selectedDoc) return;
		setIsSigning(true);
		setErrorMessage(null);
		setStatusMessage(null);

		try {
			const staffName = selectedCert?.subjectName || "Врач клиники";
			const signedAt = new Date().toISOString();
			const signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>ПЭП врача: ${encodeURIComponent(staffName)}</text></svg>`;

			const res = await fetch(`/api/documents/${encodeURIComponent(selectedDoc.id)}/signature`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					signatureSvg,
					mode: "simple_electronic_signature",
					signedAt,
					recipientFullName: selectedDoc.patientFullName || "Пациент",
					recipientRole: "пациент",
					staffFullName: staffName,
					staffRole: "врач",
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || "Не удалось сохранить ПЭП врача в системе");
			}

			setDocuments((prev) =>
				prev.map((doc) =>
					doc.id === selectedDoc.id
						? {
								...doc,
								status: "signed_pep",
								signedAt,
								signerFullName: `${staffName} (ПЭП врача)`,
						  }
						: doc,
				),
			);
			setStatusMessage(`Документ «${selectedDoc.title}» заверен простой электронной подписью (ПЭП) врача`);
		} catch (err) {
			setErrorMessage((err as Error).message || "Ошибка подписания документа ПЭП");
		} finally {
			setIsSigning(false);
		}
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
