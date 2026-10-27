import { CheckCircle2 } from "lucide-react";
import { CRYPTO_SIGNING_UNAVAILABLE_TEXT } from "./cryptoProSigningTypes";

export interface CryptoProModalFooterActionsProps {
	lockInProgress: boolean;
	closeDialog: () => void;
	handleConfirmLock: () => void;
	signatureType: "crypto" | "pin";
	cryptoSigningUnavailable: boolean;
}

export function CryptoProModalFooterActions({
	lockInProgress,
	closeDialog,
	handleConfirmLock,
	signatureType,
	cryptoSigningUnavailable,
}: CryptoProModalFooterActionsProps) {
	return (
		<div className="sticky bottom-0 bg-[var(--paper)]/95 backdrop-blur-md pt-3 pb-safe border-t border-[var(--line)] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 pb-5 sm:pb-6 mt-4 flex gap-3">
			<button
				type="button"
				onClick={closeDialog}
				disabled={lockInProgress}
				title={
					lockInProgress
						? "Идёт подписание. Дождитесь подтверждения сервера или сообщения об отказе."
						: undefined
				}
				className="flex-1 px-4 h-[52px] min-h-[52px] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer text-sm sm:text-base flex items-center justify-center"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={handleConfirmLock}
				disabled={lockInProgress}
				data-testid="diary-one-click-session-sign-btn"
				title={
					signatureType === "crypto" && cryptoSigningUnavailable
						? CRYPTO_SIGNING_UNAVAILABLE_TEXT
						: undefined
				}
				className="flex-[1.5] px-5 h-[52px] min-h-[52px] bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
			>
				{lockInProgress ? (
					"Подписываю…"
				) : (
					<>
						<CheckCircle2 className="w-5 h-5 shrink-0" />
						<span>Подписать дневник</span>
					</>
				)}
			</button>
		</div>
	);
}
