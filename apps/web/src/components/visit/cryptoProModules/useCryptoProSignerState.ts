import { useCallback, useEffect, useState } from "react";
import type { CertificateInfo } from "../../../lib/cryptopro";
import type { CryptoProSignerProps } from "./cryptoProSigningTypes";
import { useCryptoProLockActions } from "./useCryptoProLockActions";

export function useCryptoProSignerState(props: CryptoProSignerProps) {
	const { diaryHash } = props;
	const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
	const [certificatesLoaded, setCertificatesLoaded] = useState(false);
	const [selectedCert, setSelectedCert] = useState("");
	const [isLoadingCerts, setIsLoadingCerts] = useState(false);
	const [showPinDialog, setShowPinDialog] = useState(false);
	const [pinCode, setPinCode] = useState("");
	// [CRY-01]: Дефолтом является сертифицированная подпись УКЭП ГОСТ Р 34.10-2012 (КриптоПро / Рутокен).
	// Подмена УКЭП на ПИН-код по умолчанию устранена (ч. 1 ст. 14 323-ФЗ, Приказ Минздрава 947н).
	const [signatureType, setSignatureType] = useState<"crypto" | "pin">("crypto");
	const [isSigning, setIsSigning] = useState(false);
	const [failureText, setFailureText] = useState<string | null>(null);
	const [awaitingLockConfirmation, setAwaitingLockConfirmation] = useState(false);

	const lockInProgress = isSigning || awaitingLockConfirmation;
	const cryptoSigningUnavailable = !diaryHash;

	const closeDialog = useCallback(() => {
		setShowPinDialog(false);
		setFailureText(null);
		setAwaitingLockConfirmation(false);
		setPinCode("");
	}, []);

	useEffect(() => {
		if (!showPinDialog) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !lockInProgress) closeDialog();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [showPinDialog, lockInProgress, closeDialog]);

	useEffect(() => {
		if (!awaitingLockConfirmation) return;
		const timer = setTimeout(() => {
			setAwaitingLockConfirmation(false);
			setFailureText("Запись НЕ подписана: сервер не подтвердил подпись вовремя. Нажмите «Сохранить черновик», затем повторите подписание.");
		}, 6000);
		return () => clearTimeout(timer);
	}, [awaitingLockConfirmation]);

	const selectedCertInfo = certificates.find((c) => c.thumbprint === selectedCert);
	const needsTokenPin = Boolean(selectedCertInfo);

	const { loadCertificates, handleSessionLock, handleConfirmLock } = useCryptoProLockActions({
		props, selectedCert, pinCode, setPinCode, signatureType,
		selectedCertInfo, needsTokenPin, cryptoSigningUnavailable,
		lockInProgress, setIsSigning, setFailureText,
		setAwaitingLockConfirmation, setCertificates,
		setCertificatesLoaded, setSelectedCert, setIsLoadingCerts,
	});

	// Автоматическая загрузка сертификатов при открытии диалога УКЭП
	useEffect(() => {
		if (showPinDialog && !certificatesLoaded && !isLoadingCerts && signatureType === "crypto") {
			loadCertificates();
		}
	}, [showPinDialog, certificatesLoaded, isLoadingCerts, signatureType, loadCertificates]);

	return {
		certificates, certificatesLoaded, selectedCert, setSelectedCert,
		isLoadingCerts, showPinDialog, setShowPinDialog, pinCode, setPinCode,
		signatureType, setSignatureType, failureText, setFailureText,
		lockInProgress, cryptoSigningUnavailable, needsTokenPin, closeDialog,
		loadCertificates, handleSessionLock, handleConfirmLock,
	};
}
