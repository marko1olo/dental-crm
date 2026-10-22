/**
 * EgiszSigningTab.tsx
 *
 * Tab 4: Qualified Electronic Signature (УКЭП) & Visual Stamps.
 * CryptoPro CSP / CAdES-BES detached signatures for Doctor and Medical Organization.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Clock,
	Download,
	FileCode2,
	Key,
	Printer,
	RefreshCcw,
	Send,
} from "lucide-react";
import type { CertificateInfo } from "../../../lib/cryptopro";
import {
	generateGostSignatureStampHtml,
	type EgiszClinicInfo,
	type EgiszDoctorInfo,
	type GostSignatureInfo,
} from "../egiszRemdEngine";

export interface EgiszSigningTabProps {
	readonly signaturePreviewMode: "print" | "xml";
	readonly onSignaturePreviewModeChange: (mode: "print" | "xml") => void;
	readonly selectedCert: CertificateInfo | null;
	readonly onSelectCert: (cert: CertificateInfo | null) => void;
	readonly availableCerts: readonly CertificateInfo[];
	readonly isSigning: boolean;
	readonly isSending: boolean;
	readonly isCheckingCerts: boolean;
	readonly doctorSig: GostSignatureInfo | null;
	readonly moSig: GostSignatureInfo | null;
	readonly onSignDocument: () => void;
	readonly onSignMoDocument: () => void;
	readonly onSignBothInOneClick?: () => void;
	readonly onSendToRegistry: () => void;
	readonly onQueueDeferred: () => void;
	readonly onUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onUploadDetachedMoSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onRefreshCerts: () => void;
	readonly onPrint: () => void;
	readonly onDownloadXml: () => void;
	readonly onValidateCdaXml: () => void;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
	readonly generatedXml: string;
	readonly form043uHtml: string;
}

export const EgiszSigningTab: React.FC<EgiszSigningTabProps> = ({
	signaturePreviewMode,
	onSignaturePreviewModeChange,
	selectedCert,
	onSelectCert,
	availableCerts,
	isSigning,
	isSending,
	isCheckingCerts,
	doctorSig,
	moSig,
	onSignDocument,
	onSignMoDocument,
	onSignBothInOneClick,
	onSendToRegistry,
	onQueueDeferred,
	onUploadDetachedSig,
	onUploadDetachedMoSig,
	onRefreshCerts,
	onPrint,
	onDownloadXml,
	onValidateCdaXml,
	doctor,
	clinic,
	generatedXml,
	form043uHtml,
}) => {
	const handleSignBoth = () => {
		if (onSignBothInOneClick) {
			onSignBothInOneClick();
		} else {
			onSignDocument();
			onSignMoDocument();
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", background: "var(--paper)" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						Электронная подпись документов (УКЭП)
					</div>
					<span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(0, 86, 179, 0.1)", color: "var(--primary-strong)" }}>
						КриптоПро CSP
					</span>
				</div>
				<div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>
					Усиленная квалифицированная электронная подпись (УКЭП ГОСТ Р 34.10-2012)
				</div>

				{/* View Submodes */}
				<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
					<button
						type="button"
						onClick={() => onSignaturePreviewModeChange("print")}
						style={{
							padding: "0.35rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: signaturePreviewMode === "print" ? "var(--paper-strong)" : "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						Медицинская карта приёма
					</button>
					<button
						type="button"
						onClick={() => onSignaturePreviewModeChange("xml")}
						style={{
							padding: "0.35rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: signaturePreviewMode === "xml" ? "var(--paper-strong)" : "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						HL7 CDA R2 XML
					</button>
				</div>

				{/* Certificate selection (when certificates available) */}
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
								width: "100%",
								maxWidth: "540px",
								padding: "0.55rem 0.75rem",
								borderRadius: "6px",
								border: "1px solid var(--line)",
								fontSize: "0.8125rem",
								background: "var(--paper)",
								color: "var(--ink)",
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

				{/* 1-Click Action Buttons: Primary + Autonomy + Auxiliary */}
				<div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
						<button
							type="button"
							onClick={handleSignBoth}
							data-testid="egisz-sign-both-one-click-btn"
							className="egisz-btn"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.45rem",
								padding: "0.6rem 1.1rem",
								minHeight: "44px",
								fontSize: "0.8125rem",
								fontWeight: 700,
								borderRadius: "6px",
								background: "var(--teal)",
								color: "var(--ink-inverse)",
								border: "none",
								cursor: isSigning ? "wait" : "pointer",
							}}
						>
							<Key size={16} />
							{isSigning ? "Выполняется подписание..." : "Подписать пакет (Врач + Клиника в 1 клик)"}
						</button>
						<button
							type="button"
							onClick={onSignDocument}
							data-testid="egisz-sign-doctor-btn"
							className="egisz-btn"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.5rem 0.9rem",
								minHeight: "44px",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								background: "var(--paper)",
								color: "var(--ink)",
								border: "1px solid var(--line)",
								cursor: isSigning ? "wait" : "pointer",
							}}
						>
							<Key size={16} />
							Подписать УКЭП врача
						</button>
						<button
							type="button"
							onClick={onSignMoDocument}
							data-testid="egisz-sign-mo-btn"
							className="egisz-btn"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.5rem 0.9rem",
								minHeight: "44px",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								background: "var(--paper)",
								color: "var(--ink)",
								border: "1px solid var(--line)",
								cursor: isSigning ? "wait" : "pointer",
							}}
						>
							<Building2 size={16} />
							Подписать УКЭП организации
						</button>
						<button
							type="button"
							onClick={onSendToRegistry}
							data-testid="egisz-send-remd-btn"
							className="egisz-btn egisz-btn-primary"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.5rem 0.9rem",
								minHeight: "44px",
								fontSize: "0.8125rem",
								fontWeight: 700,
								borderRadius: "6px",
								background: "var(--primary)",
								color: "var(--ink-inverse)",
								border: "none",
								cursor: isSending ? "wait" : "pointer",
							}}
						>
							<Send size={16} />
							Отправить в РЭМД ЕГИСЗ
						</button>
						<button
							type="button"
							onClick={onQueueDeferred}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.4rem 0.75rem",
								minHeight: "44px",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Clock size={14} />
							Отложить отправку (не блокировать приём)
						</button>
					</div>

					{/* Auxiliary Document Actions (Compact row) */}
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
						<button
							type="button"
							onClick={onPrint}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.35rem 0.75rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "6px",
								background: "var(--paper)",
								color: "var(--ink)",
								border: "1px solid var(--line)",
								cursor: "pointer",
							}}
						>
							<Printer size={14} />
							Печать со штампом
						</button>
						<button
							type="button"
							onClick={onDownloadXml}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.35rem 0.75rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "6px",
								background: "var(--paper)",
								color: "var(--ink)",
								border: "1px solid var(--line)",
								cursor: "pointer",
							}}
						>
							<Download size={14} />
							Скачать XML
						</button>
						<button
							type="button"
							onClick={onValidateCdaXml}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.35rem 0.75rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "6px",
								background: "var(--paper)",
								color: "var(--teal)",
								border: "1px solid var(--line)",
								cursor: "pointer",
							}}
						>
							<CheckCircle2 size={14} />
							Проверка XML
						</button>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.35rem 0.75rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<FileCode2 size={14} />
							Загрузить .sig / .p7s (врач)
							<input
								type="file"
								accept=".sig,.p7s,.sgn,.bin"
								style={{ display: "none" }}
								onChange={onUploadDetachedSig}
							/>
						</label>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.35rem 0.75rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Building2 size={14} />
							Загрузить .sig (клиника)
							<input
								type="file"
								accept=".sig,.p7s,.sgn,.bin"
								style={{ display: "none" }}
								onChange={onUploadDetachedMoSig}
							/>
						</label>
					</div>
				</div>

				{availableCerts.length === 0 && (
					<div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--warning)", fontSize: "0.875rem" }}>
							<AlertTriangle size={18} />
							Электронная подпись не обнаружена / Сертификат не выбран
						</div>
						<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.5 }}>
							Для подписания подключите токен с электронной подписью врача, либо загрузите открепленный файл подписи (.sig / .p7s).
						</p>
						<div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
							<button
								type="button"
								onClick={onRefreshCerts}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.4rem",
									padding: "0.5rem 1rem",
									minHeight: "44px",
									fontSize: "0.8125rem",
									fontWeight: 600,
									borderRadius: "6px",
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
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
									display: "flex",
									alignItems: "center",
									gap: "0.4rem",
									padding: "0.5rem 1rem",
									minHeight: "44px",
									fontSize: "0.8125rem",
									fontWeight: 600,
									borderRadius: "6px",
									border: "1px solid rgba(245, 158, 11, 0.4)",
									background: "rgba(245, 158, 11, 0.1)",
									color: "var(--ink)",
									cursor: "pointer",
								}}
							>
								<Clock size={14} />
								Отложить отправку (не блокировать приём)
							</button>
							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.4rem",
									padding: "0.5rem 1rem",
									minHeight: "44px",
									fontSize: "0.8125rem",
									fontWeight: 600,
									borderRadius: "6px",
									background: "var(--primary)",
									color: "var(--ink-inverse)",
									cursor: "pointer",
								}}
							>
								<FileCode2 size={14} />
								Загрузить открепленный файл (.sig / .p7s)
								<input
									type="file"
									accept=".sig,.p7s,.sgn,.bin"
									style={{ display: "none" }}
									onChange={onUploadDetachedSig}
								/>
							</label>
						</div>
					</div>
				)}
			</div>

			{/* Stamp Visualization */}
			{(doctorSig || moSig) && (
				<div className="gost-stamps-wrapper" style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", background: "var(--paper)", display: "flex", flexDirection: "column", gap: "1rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						Визуальный штамп электронной подписи
					</div>
					<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
						{doctorSig && (
							<div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>
									Подпись лечащего врача:
								</div>
								<div
									dangerouslySetInnerHTML={{
										__html: generateGostSignatureStampHtml({
											signerName: doctor.doctorFullName,
											certificateNumber: doctorSig.certificateSerialNumber,
											validFrom: doctorSig.validFrom || new Date().toISOString(),
											validTo: doctorSig.validTo || new Date().toISOString(),
											orgName: clinic.clinicName,
										}),
									}}
								/>
							</div>
						)}
						{moSig && (
							<div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>
									Подпись клиники (организации):
								</div>
								<div
									dangerouslySetInnerHTML={{
										__html: generateGostSignatureStampHtml({
											signerName: clinic.clinicName,
											certificateNumber: moSig.certificateSerialNumber,
											validFrom: moSig.validFrom || new Date().toISOString(),
											validTo: moSig.validTo || new Date().toISOString(),
											orgName: clinic.clinicName,
										}),
									}}
								/>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
