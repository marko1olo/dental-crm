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
 * Автономия врача (Мандат 8e, 8am): Кнопка подписания ЭЦП является нейтральной
 * вторичной (secondary), строго подчиняясь правилу 1 Primary CTA на видимый контекст
 * (Primary CTA закреплен за «Завершить приём и счёт»). Кнопка никогда не блокируется
 * без клинической причины.
 */
export const CryptoProSigner: React.FC<CryptoProSignerProps> = (props) => {
	const { isLocked, lockedAt, onPrintDraft } = props;
	const state = useCryptoProSignerState(props);
	const { lockInProgress } = state;

	if (isLocked) {
		return <CryptoProLockedBanner lockedAt={lockedAt} />;
	}

	return (
		<>
			<button
				type="button"
				id="crypto-pro-sign-btn"
				data-testid="crypto-pro-sign-btn"
				disabled={lockInProgress}
				onClick={() => {
					state.setFailureText(null);
					state.setShowPinDialog(true);
				}}
				className="flex items-center gap-2 px-3.5 py-2 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--line-strong)] rounded-xl transition-colors shadow-2xs min-h-[44px] cursor-pointer font-medium text-xs sm:text-sm"
				title="Добровольное подписание дневника приёма ЭЦП (КЭП / ГОСТ)"
			>
				<Lock className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span>Подписать ЭЦП</span>
			</button>

			<CryptoProSignerModal state={state} onPrintDraft={onPrintDraft} />
		</>
	);
};

export default CryptoProSigner;
