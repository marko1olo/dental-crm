import { CheckCircle2 } from "lucide-react";

export interface CryptoProPinSignSectionProps {
	lockInProgress: boolean;
	handleSessionLock: () => void;
	pinCode: string;
	setPinCode: (pin: string) => void;
	setFailureText: (text: string | null) => void;
}

export function CryptoProPinSignSection({
	lockInProgress,
	handleSessionLock,
	pinCode,
	setPinCode,
	setFailureText,
}: CryptoProPinSignSectionProps) {
	return (
		<div className="mb-6">
			<button
				type="button"
				onClick={handleSessionLock}
				disabled={lockInProgress}
				data-testid="diary-one-click-session-sign-btn"
				className="w-full mb-4 px-4 py-3 bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0" />
				<span>Подписать и закрыть приём (1 клик)</span>
			</button>

			<label
				htmlFor="cryptopro-pincode"
				className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider"
			>
				Или подтвердите ПИН-кодом смены (опционально)
			</label>
			<input
				id="cryptopro-pincode"
				type="password"
				inputMode="numeric"
				autoComplete="off"
				maxLength={4}
				disabled={lockInProgress}
				className="w-full bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--ink)] text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none disabled:opacity-60 min-h-[44px]"
				value={pinCode}
				onChange={(e) => {
					setPinCode(e.target.value.replace(/\D/g, ""));
					setFailureText(null);
				}}
				placeholder="••••"
			/>
			<p className="mt-2 text-xs text-[var(--muted)]">
				Четыре цифры — для подтверждения на общем компьютере в кабинете.
			</p>
		</div>
	);
}
