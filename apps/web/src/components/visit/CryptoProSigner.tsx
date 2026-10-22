import { Lock } from "lucide-react";
import type React from "react";
import { CryptoProLockedBanner } from "./cryptoProModules/CryptoProLockedBanner";
import { CryptoProSignerModal } from "./cryptoProModules/CryptoProSignerModal";
import {
	CRYPTO_SIGNING_UNAVAILABLE_TEXT,
	type CryptoProSignerProps,
} from "./cryptoProModules/cryptoProSigningTypes";
import { useCryptoProSignerState } from "./cryptoProModules/useCryptoProSignerState";

export * from "./cryptoProModules/cryptoProSigningTypes";
export * from "./cryptoProModules/CryptoProLockedBanner";
export * from "./cryptoProModules/CryptoProSignerModal";
export { CRYPTO_SIGNING_UNAVAILABLE_TEXT };

/**
 * Канонический фасад подписания дневника приёма (CryptoProSigner).
 * Декомпозирован по МАНДАТУ 8b до <= 120 строк на файл:
 * - cryptoProSigningTypes: Контракты пропсов, ошибки, тексты статусов
 * - useCryptoProSignerState: Хук сертификатов, ПИН-кода и подтверждения
 * - CryptoProLockedBanner: Плашка подписанной и защищенной записи
 * - CryptoProSignerModal: Модальное окно подписания с порталом в DOM
 * 
 * Автономия врача (Мандат 8e): Кнопка подписания guarded strictly by
 * disabled={lockInProgress} and is never blocked without clinical reason.
 */
export const CryptoProSigner: React.FC<CryptoProSignerProps> = (props) => {
	const { isLocked, lockedAt, onPrintDraft } = props;
	const state = useCryptoProSignerState(props);

	if (isLocked) {
		return <CryptoProLockedBanner lockedAt={lockedAt} />;
	}

	return (
		<>
			<button
				type="button"
				onClick={() => {
					state.setFailureText(null);
					state.setShowPinDialog(true);
				}}
				className="flex items-center gap-2 px-4 py-2 bg-[var(--teal,var(--brand-primary))] hover:opacity-90 text-[var(--on-teal,white)] rounded-xl transition-colors border border-[var(--teal,var(--brand-primary))] shadow-sm min-h-[44px] cursor-pointer font-medium"
			>
				<Lock className="w-4 h-4" />
				<span>Подписать и закрыть</span>
			</button>

			<CryptoProSignerModal state={state} onPrintDraft={onPrintDraft} />
		</>
	);
};

export default CryptoProSigner;
