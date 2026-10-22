import React from "react";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { CryptoProCertificate } from "../../../utils/cryptoPro";

interface UkepCertificateSelectorProps {
	certificates: CryptoProCertificate[];
	selectedThumbprint: string;
	onSelectThumbprint: (val: string) => void;
	isSigning: boolean;
	selectedCert?: CryptoProCertificate | undefined;
	isSelectedCertExpired: boolean;
	isSelectedCertNonGost: boolean;
}

export function UkepCertificateSelector({
	certificates,
	selectedThumbprint,
	onSelectThumbprint,
	isSigning,
	selectedCert,
	isSelectedCertExpired,
	isSelectedCertNonGost,
}: UkepCertificateSelectorProps) {
	return (
		<>
			<select
				id="ukep-cert-select"
				value={selectedThumbprint}
				onChange={(e) => onSelectThumbprint(e.target.value)}
				disabled={isSigning}
				className="w-full text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg px-2.5 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] text-[var(--ink,#0f172a)]"
			>
				{certificates.map((cert) => {
					const expiry = new Date(cert.validTo).toLocaleDateString("ru-RU");
					const cleanSubject =
						cert.subjectName
							.split(",")
							.find((part) => part.startsWith("CN="))
							?.replace("CN=", "") || cert.subjectName;
					const algBadge = cert.isGost ? "ГОСТ Р 34.10-2012" : "НЕ ГОСТ";
					return (
						<option key={cert.thumbprint} value={cert.thumbprint}>
							{cleanSubject} — {algBadge} (до {expiry})
						</option>
					);
				})}
			</select>

			{isSelectedCertExpired ? (
				<div className="p-2.5 mb-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
					<AlertCircle size={14} className="shrink-0 mt-0.5" />
					<div>
						<strong>Срок действия сертификата истек:</strong>{" "}
						{new Date(selectedCert!.validTo).toLocaleDateString("ru-RU")}
						. Подписание юридически ничтожно по ст. 14 63-ФЗ.
					</div>
				</div>
			) : isSelectedCertNonGost ? (
				<div className="p-2.5 mb-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
					<ShieldAlert size={14} className="shrink-0 mt-0.5" />
					<div>
						<strong>Несовместимый алгоритм ({selectedCert?.algorithmName || selectedCert?.algorithmOid || "RSA"}):</strong>{" "}
						Для медицинских документов 63-ФЗ требует квалифицированные сертификаты по ГОСТ Р 34.10-2012.
					</div>
				</div>
			) : (
				<div className="mb-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
					<CheckCircle2 size={12} className="shrink-0" />
					<span>
						Сертификат ГОСТ Р 34.10-2012 действителен до{" "}
						{selectedCert ? new Date(selectedCert.validTo).toLocaleDateString("ru-RU") : ""}
					</span>
				</div>
			)}
		</>
	);
}
