import { AlertCircle, ExternalLink } from "lucide-react";
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
					<div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs leading-relaxed space-y-2">
						<div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
							<AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
							<span>КриптоПро CSP плагин не обнаружен или сертификаты не найдены</span>
						</div>
						<p className="text-amber-800 dark:text-amber-300">
							Для сертифицированного подписания УКЭП по ГОСТ Р 34.10-2012 установите плагин и вставьте носитель Рутокен.
						</p>
						<div className="pt-0.5">
							<a
								href="https://cryptopro.ru/products/cades/plugin"
								target="_blank"
								rel="noreferrer noopener"
								className="inline-flex items-center gap-1 text-[var(--teal,var(--brand-primary))] font-semibold hover:underline"
							>
								<span>Установить плагин КриптоПро ЭЦП Browser plug-in</span>
								<ExternalLink className="w-3.5 h-3.5" />
							</a>
						</div>
						<p className="text-[var(--muted)] text-[11px] pt-1 border-t border-amber-500/20">
							По Мандату 8e вы можете сохранить приём как подписанный врачом черновик или распечатать его для личной подписи на бумаге. Кнопки сохранения и печати никогда не блокируются.
						</p>
					</div>
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
						ПИН-код токена или контейнера (опционально)
					</label>
					<input
						id="cryptopro-token-pin"
						type="password"
						autoComplete="off"
						disabled={lockInProgress}
						className="w-full bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none disabled:opacity-60"
						value={pinCode}
						onChange={(e) => { setPinCode(e.target.value); setFailureText(null); }}
						placeholder="ПИН токена / пароль контейнера"
					/>
				</div>
			)}
		</div>
	);
}
