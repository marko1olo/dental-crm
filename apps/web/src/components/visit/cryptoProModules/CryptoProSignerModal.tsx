import { createPortal } from "react-dom";
import { CryptoProCertSelectSection } from "./CryptoProCertSelectSection";
import { CryptoProModalFooterActions } from "./CryptoProModalFooterActions";
import { CryptoProModalHeaderAndDraft } from "./CryptoProModalHeaderAndDraft";
import { CryptoProPinSignSection } from "./CryptoProPinSignSection";
import { CryptoProTypeSelector } from "./CryptoProTypeSelector";
import type { useCryptoProSignerState } from "./useCryptoProSignerState";

export interface CryptoProSignerModalProps {
	state: ReturnType<typeof useCryptoProSignerState>;
	onPrintDraft?: (() => void) | undefined;
}

export function CryptoProSignerModal({ state, onPrintDraft }: CryptoProSignerModalProps) {
	if (!state.showPinDialog || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="crypto-signer-modal-title"
		>
			<div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden text-[var(--ink)]">
				<CryptoProModalHeaderAndDraft
					lockInProgress={state.lockInProgress}
					onPrintDraft={onPrintDraft}
				/>
				<CryptoProTypeSelector
					signatureType={state.signatureType}
					setSignatureType={state.setSignatureType}
					lockInProgress={state.lockInProgress}
					setFailureText={state.setFailureText}
					setPinCode={state.setPinCode}
					loadCertificates={state.loadCertificates}
				/>

				{state.signatureType === "pin" ? (
					<CryptoProPinSignSection
						lockInProgress={state.lockInProgress}
						handleSessionLock={state.handleSessionLock}
						pinCode={state.pinCode}
						setPinCode={state.setPinCode}
						setFailureText={state.setFailureText}
					/>
				) : (
					<CryptoProCertSelectSection
						cryptoSigningUnavailable={state.cryptoSigningUnavailable}
						selectedCert={state.selectedCert}
						setSelectedCert={state.setSelectedCert}
						setFailureText={state.setFailureText}
						isLoadingCerts={state.isLoadingCerts}
						lockInProgress={state.lockInProgress}
						certificates={state.certificates}
						certificatesLoaded={state.certificatesLoaded}
						loadCertificates={state.loadCertificates}
						needsTokenPin={state.needsTokenPin}
						pinCode={state.pinCode}
						setPinCode={state.setPinCode}
					/>
				)}

				{state.failureText && (
					<div
						role="alert"
						aria-live="assertive"
						className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs leading-relaxed"
					>
						{state.failureText}
					</div>
				)}

				{state.lockInProgress && (
					<div
						role="status"
						aria-live="polite"
						className="mb-4 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] text-xs leading-relaxed"
					>
						Отправили подпись и ждём подтверждения сервера — это пара секунд. Не закрывайте окно: пока подтверждения нет, запись НЕ подписана.
					</div>
				)}

				<CryptoProModalFooterActions
					lockInProgress={state.lockInProgress}
					closeDialog={state.closeDialog}
					handleConfirmLock={state.handleConfirmLock}
					signatureType={state.signatureType}
					cryptoSigningUnavailable={state.cryptoSigningUnavailable}
				/>
			</div>
		</div>,
		document.body,
	);
}
