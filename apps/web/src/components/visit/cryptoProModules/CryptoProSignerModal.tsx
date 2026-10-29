import { CheckCircle2 } from "lucide-react";
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
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity"
			role="dialog"
			aria-modal="true"
			aria-labelledby="crypto-signer-modal-title"
		>
			<div className="bg-[var(--paper)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[92vh] sm:max-h-none overflow-y-auto overflow-x-hidden text-[var(--ink)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
				{/* Apple HIG: Mobile Drag Handle for Bottom Sheet */}
				<div className="sm:hidden w-9 h-1 bg-[var(--line)] rounded-full mx-auto mb-3 shrink-0" aria-hidden="true" />

				<CryptoProModalHeaderAndDraft
					lockInProgress={state.lockInProgress}
					onPrintDraft={onPrintDraft}
				/>

				{/* Крупная статусная плашка «Готов к подписанию» (Параграф 4) */}
				<div
					data-testid="diary-ready-for-signing-banner"
					className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-sm font-semibold mb-4 shrink-0"
				>
					<CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span>Готов к подписанию</span>
				</div>

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
