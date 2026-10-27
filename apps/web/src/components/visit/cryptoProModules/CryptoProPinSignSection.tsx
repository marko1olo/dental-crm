import { UserCheck } from "lucide-react";

export interface CryptoProPinSignSectionProps {
	lockInProgress: boolean;
	handleSessionLock: () => void;
	pinCode: string;
	setPinCode: (pin: string) => void;
	setFailureText: (text: string | null) => void;
}

export function CryptoProPinSignSection({
	lockInProgress,
	pinCode,
	setPinCode,
	setFailureText,
}: CryptoProPinSignSectionProps) {
	return (
		<div className="mb-4">
			<div className="p-3.5 mb-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] leading-relaxed">
				<div className="font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5 text-sm">
					<UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Подписание активной сессией врача</span>
				</div>
				<p>
					Вы вошли в смену. Нажмите <strong>«Подписать дневник»</strong> внизу для заверения в 1 клик без лишних паролей.
				</p>
			</div>

			<label
				htmlFor="cryptopro-pincode"
				className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider"
			>
				ПИН-код сотрудника (опционально)
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
