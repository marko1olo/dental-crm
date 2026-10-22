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
		<div className="flex gap-3 pt-2">
			<button
				type="button"
				onClick={closeDialog}
				disabled={lockInProgress}
				title={
					lockInProgress
						? "Идёт подписание. Дождитесь подтверждения сервера или сообщения об отказе."
						: undefined
				}
				className="flex-1 px-4 py-2.5 bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer min-h-[44px]"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={handleConfirmLock}
				disabled={lockInProgress}
				title={
					signatureType === "crypto" && cryptoSigningUnavailable
						? CRYPTO_SIGNING_UNAVAILABLE_TEXT
						: undefined
				}
				className="flex-1 px-4 py-2.5 bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-medium rounded-xl transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
			>
				{lockInProgress ? (
					"Подписываю…"
				) : (
					<>
						<CheckCircle2 className="w-4 h-4" /> Подписать
					</>
				)}
			</button>
		</div>
	);
}
