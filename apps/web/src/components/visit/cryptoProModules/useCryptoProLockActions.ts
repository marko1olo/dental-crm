import { type CertificateInfo, signatureService } from "../../../lib/cryptopro";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	CRYPTO_SIGNING_UNAVAILABLE_TEXT,
	type CryptoProSignerProps,
	readableSigningFailure,
} from "./cryptoProSigningTypes";

export interface UseCryptoProLockActionsParams {
	props: CryptoProSignerProps;
	selectedCert: string;
	pinCode: string;
	setPinCode: (pin: string) => void;
	signatureType: "crypto" | "pin";
	selectedCertInfo: CertificateInfo | undefined;
	needsTokenPin: boolean;
	cryptoSigningUnavailable: boolean;
	lockInProgress: boolean;
	setIsSigning: (val: boolean) => void;
	setFailureText: (val: string | null) => void;
	setAwaitingLockConfirmation: (val: boolean) => void;
	setCertificates: (certs: CertificateInfo[]) => void;
	setCertificatesLoaded: (val: boolean) => void;
	setSelectedCert: (cert: string) => void;
	setIsLoadingCerts: (val: boolean) => void;
}

export function useCryptoProLockActions(params: UseCryptoProLockActionsParams) {
	const {
		props, selectedCert, pinCode, setPinCode, signatureType,
		selectedCertInfo, needsTokenPin, cryptoSigningUnavailable,
		lockInProgress, setIsSigning, setFailureText,
		setAwaitingLockConfirmation, setCertificates,
		setCertificatesLoaded, setSelectedCert, setIsLoadingCerts,
	} = params;

	const loadCertificates = async () => {
		setIsLoadingCerts(true);
		setFailureText(null);
		try {
			const certs = await signatureService.getCertificates();
			setCertificates(certs);
			setCertificatesLoaded(true);
			if (certs.length > 0) setSelectedCert(certs[0]?.thumbprint ?? "");
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			logger.error("[ЭЦП] список сертификатов не прочитан:", error);
			setCertificates([]);
			setCertificatesLoaded(true);
			setFailureText(readableSigningFailure(error));
		} finally {
			setIsLoadingCerts(false);
		}
	};

	const handleSessionLock = async () => {
		if (lockInProgress) return;
		setFailureText(null);
		setIsSigning(true);
		try {
			await props.onLock("SESSION_SIGNATURE", "SHIFT_SESSION");
			setPinCode("");
			setAwaitingLockConfirmation(true);
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			logger.error("[ЭЦП] подписание сессией врача не выполнено:", error);
			setFailureText(readableSigningFailure(error));
		} finally {
			setIsSigning(false);
		}
	};

	const handleConfirmLock = async () => {
		if (lockInProgress) return;
		setFailureText(null);
		if (signatureType === "crypto") {
			if (!selectedCert) { setFailureText("Сначала выберите сертификат из списка."); return; }
			if (cryptoSigningUnavailable) { setFailureText(CRYPTO_SIGNING_UNAVAILABLE_TEXT); return; }
			if (needsTokenPin && pinCode.length === 0) { setFailureText("Введите ПИН-код носителя Рутокен."); return; }
			setIsSigning(true);
			try {
				const draft = await props.ensureDraftSaved();
				if (!draft?.id || !draft.hash) {
					setFailureText("Черновик не сохранился — отпечаток для подписи не получен. Нажмите «Сохранить черновик» и повторите подписание.");
					return;
				}
				const { signatureBase64 } = await signatureService.signData(selectedCert, draft.hash, pinCode, selectedCertInfo?.deviceId);
				await props.onLock(selectedCert, signatureBase64, draft.id);
				setPinCode("");
				setAwaitingLockConfirmation(true);
			} catch (error) {
				showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
				logger.error("[ЭЦП] подписание не выполнено:", error);
				setFailureText(readableSigningFailure(error));
			} finally {
				setIsSigning(false);
			}
			return;
		}
		if (pinCode.length === 0) { await handleSessionLock(); return; }
		if (pinCode.length !== 4) { setFailureText("ПИН-код сотрудника — четыре цифры. Введите все четыре или оставьте поле пустым для подписи в 1 клик."); return; }
		setIsSigning(true);
		try {
			await props.onLock("PIN_SIGNATURE", `PIN:${pinCode}`);
			setPinCode("");
			setAwaitingLockConfirmation(true);
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			logger.error("[ЭЦП] простое подписание не выполнено:", error);
			setFailureText(readableSigningFailure(error));
		} finally {
			setIsSigning(false);
		}
	};

	return { loadCertificates, handleSessionLock, handleConfirmLock };
}
