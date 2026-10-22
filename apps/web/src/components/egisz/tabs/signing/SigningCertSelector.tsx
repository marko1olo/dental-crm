/**
 * SigningCertSelector.tsx — Certificate dropdown selector & non-blocking CryptoPro status banner
 */

import React from "react";
import { AlertTriangle, Clock, FileCode2, RefreshCcw } from "lucide-react";
import type { CertificateInfo } from "../../../../lib/cryptopro";

export interface SigningCertSelectorProps {
	readonly selectedCert: CertificateInfo | null;
	readonly onSelectCert: (cert: CertificateInfo | null) => void;
	readonly availableCerts: readonly CertificateInfo[];
	readonly isCheckingCerts: boolean;
	readonly onRefreshCerts: () => void;
	readonly onQueueDeferred: () => void;
	readonly onUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SigningCertSelector: React.FC<SigningCertSelectorProps> = ({
	selectedCert,
	onSelectCert,
	availableCerts,
	isCheckingCerts,
	onRefreshCerts,
	onQueueDeferred,
	onUploadDetachedSig,
}) => {
	return (
		<>
			{availableCerts.length > 0 && (
				<div style={{ marginBottom: "1rem" }}>
					<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
						Сертификат УКЭП для подписания:
					</label>
					<select
						value={selectedCert?.thumbprint || ""}
						onChange={(e) => {
							const found = availableCerts.find((c) => c.thumbprint === e.target.value);
							onSelectCert(found || null);
						}}
						style={{
							width: "100%", maxWidth: "540px", padding: "0.55rem 0.75rem", borderRadius: "6px",
							border: "1px solid var(--line)", fontSize: "0.8125rem", background: "var(--paper)", color: "var(--ink)",
						}}
					>
						{availableCerts.map((c) => (
							<option key={c.thumbprint} value={c.thumbprint}>
								{c.name} (действителен до {c.validTo.slice(0, 10)})
							</option>
						))}
					</select>
				</div>
			)}

			{availableCerts.length === 0 && (
				<div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--warning)", fontSize: "0.875rem" }}>
						<AlertTriangle size={18} />
						Электронная подпись не обнаружена / Сертификат не выбран
					</div>
					<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.5 }}>
						Криптопровайдер не обнаружен, документ сохранен в черновики бэкофиса. Для прямого подписания подключите токен с УКЭП врача, либо загрузите открепленный файл подписи (.sig / .p7s).
					</p>
					<div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
						<button
							type="button"
							onClick={onRefreshCerts}
							style={{
								display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem",
								minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
								border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)",
								cursor: isCheckingCerts ? "wait" : "pointer",
							}}
						>
							<RefreshCcw size={14} className={isCheckingCerts ? "animate-spin" : ""} />
							{isCheckingCerts ? "Проверка..." : "Проверить плагин КриптоПро"}
						</button>
						<button
							type="button"
							onClick={onQueueDeferred}
							style={{
								display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem",
								minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
								border: "1px solid rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.1)",
								color: "var(--ink)", cursor: "pointer",
							}}
						>
							<Clock size={14} />
							Отложить отправку (не блокировать приём)
						</button>
						<label
							style={{
								display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem",
								minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
								background: "var(--primary)", color: "var(--ink-inverse)", cursor: "pointer",
							}}
						>
							<FileCode2 size={14} />
							Загрузить открепленный файл (.sig / .p7s)
							<input type="file" accept=".sig,.p7s,.sgn,.bin" style={{ display: "none" }} onChange={onUploadDetachedSig} />
						</label>
					</div>
				</div>
			)}
		</>
	);
};
