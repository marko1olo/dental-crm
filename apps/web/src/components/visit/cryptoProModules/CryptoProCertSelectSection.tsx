import type { CertificateInfo } from "../../../lib/cryptopro";
import { CRYPTO_SIGNING_UNAVAILABLE_TEXT } from "./cryptoProSigningTypes";

export interface CryptoProCertSelectSectionProps {
	cryptoSigningUnavailable: boolean;
	selectedCert: string;
	setSelectedCert: (val: string) => void;
	setFailureText: (text: string | null) => void;
	isLoadingCerts: boolean;
	lockInProgress: boolean;
	certificates: CertificateInfo[];
	certificatesLoaded: boolean;
	loadCertificates: () => void;
	needsTokenPin: boolean;
	pinCode: string;
	setPinCode: (pin: string) => void;
}

export function CryptoProCertSelectSection({
	cryptoSigningUnavailable,
	selectedCert,
	setSelectedCert,
	setFailureText,
	isLoadingCerts,
	lockInProgress,
	certificates,
	certificatesLoaded,
	loadCertificates,
	needsTokenPin,
	pinCode,
	setPinCode,
}: CryptoProCertSelectSectionProps) {
	return (
		<div className="mb-6 space-y-4">
			{cryptoSigningUnavailable && (
				<p role="status" aria-live="polite" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
					{CRYPTO_SIGNING_UNAVAILABLE_TEXT}
				</p>
			)}
			<div>
				<label htmlFor="cryptopro-cert-select" className="block text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">
					Выберите сертификат
				</label>
				<select
					id="cryptopro-cert-select"
					className="w-full bg-[var(--paper-soft)] border border-[var(--line-strong)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-h-[44px]"
					value={selectedCert}
					onChange={(e) => { setSelectedCert(e.target.value); setFailureText(null); }}
					disabled={isLoadingCerts || lockInProgress}
				>
					{isLoadingCerts ? (
						<option>Читаем сертификаты…</option>
					) : certificates.length === 0 ? (
						<option value="">Сертификаты не найдены</option>
					) : (
						certificates.map((c) => (
							<option key={c.thumbprint} value={c.thumbprint}>
								{c.name} (до {new Date(c.validTo).toLocaleDateString("ru-RU")})
							</option>
						))
					)}
				</select>
				{!isLoadingCerts && certificatesLoaded && certificates.length === 0 && (
					<p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
						Ни одного сертификата не видно. Проверьте: носитель Рутокен вставлен, КриптоПро установлен, расширение браузера включено. Затем нажмите «Обновить список».
					</p>
				)}
				<button
					type="button"
					onClick={loadCertificates}
					disabled={isLoadingCerts || lockInProgress}
					className="mt-2 text-xs text-[var(--teal,var(--brand-primary))] hover:underline disabled:opacity-60 cursor-pointer"
				>
					{isLoadingCerts ? "Обновляю…" : "Обновить список"}
				</button>
			</div>
			{needsTokenPin && (
				<div>
					<label htmlFor="cryptopro-token-pin" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
						ПИН-код носителя Рутокен
					</label>
					<input
						id="cryptopro-token-pin"
						type="password"
						autoComplete="off"
						disabled={lockInProgress}
						className="w-full bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none disabled:opacity-60"
						value={pinCode}
						onChange={(e) => { setPinCode(e.target.value); setFailureText(null); }}
						placeholder="ПИН носителя"
					/>
				</div>
			)}
		</div>
	);
}
