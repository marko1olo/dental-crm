import React from "react";
import { AlertTriangle, Eye, FileCheck, ShieldCheck, Smartphone } from "lucide-react";
import type { PatientPersonalCabinetData, PatientStatutoryConsent } from "../../patientCabinetEngine";
import { generateConsentPrintHtml, openPrintWindow } from "../../patientCabinetEngine";

export interface DocumentsConsentsSectionProps {
	readonly consents: PatientPersonalCabinetData["consents"];
	readonly data: PatientPersonalCabinetData;
	readonly onStartConsentSigning: (consent: PatientStatutoryConsent) => void;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsConsentsSection: React.FC<DocumentsConsentsSectionProps> = ({
	consents,
	data,
	onStartConsentSigning,
	onShowToast,
}) => {
	const handlePrintSigned = (consent: PatientStatutoryConsent) => {
		openPrintWindow(generateConsentPrintHtml(consent, data));
		onShowToast(`Печатная форма согласия «${consent.titleRu}» готова!`);
	};

	return (
		<section className="pc-section-card">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<FileCheck size={20} className="pc-icon-primary" />
					<span>Информированные согласия (ИДС)</span>
				</div>
				<span className="pc-section-hint">Юридическая сила по 63-ФЗ ст. 6</span>
			</div>
			<div className="pc-consents-list">
				{consents.map((consent) => {
					const isSigned = consent.status === "signed";
					return (
						<div
							key={consent.id}
							className={`pc-consent-card ${isSigned ? "signed" : "pending"}`}
							data-testid={`consent-card-${consent.id}`}
						>
							<div className="pc-consent-head">
								<div>
									<div className="pc-consent-code-row">
										<span className="pc-consent-code-badge">{consent.code}</span>
										<strong className="pc-consent-title">{consent.titleRu}</strong>
									</div>
									<p className="pc-consent-summary">{consent.summaryTextRu}</p>
								</div>
								<div>
									<span className={`pc-status-badge ${isSigned ? "paid" : "unpaid"}`}>
										{isSigned ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
										<span>{isSigned ? "Подписано по 63-ФЗ" : "Ожидает подписи"}</span>
									</span>
								</div>
							</div>
							{isSigned && consent.signatureAudit && (
								<div className="pc-audit-hash-badge">
									<span className="pc-hash-text">
										Криптографический хеш ПЭП (SHA-256): <code>{consent.signatureAudit.integrityHash}</code>
									</span>
									<button
										type="button"
										className="pc-btn-secondary pc-btn-compact"
										data-testid={`print-signed-consent-btn-${consent.id}`}
										data-legacy-testid={`view-consent-btn-${consent.id}`}
										onClick={() => handlePrintSigned(consent)}
									>
										<Eye size={13} />
										<span>Бланк со штампом ПЭП</span>
									</button>
								</div>
							)}
							{!isSigned && (
								<div className="pc-consent-actions-row">
									<button
										type="button"
										className="pc-btn-primary pc-sign-btn"
										onClick={() => onStartConsentSigning(consent)}
										data-testid={`sign-consent-btn-${consent.id}`}
										data-legacy-testid={`sign-sms-btn-${consent.id}`}
									>
										<Smartphone size={16} />
										<span>Подписать по SMS (63-ФЗ ПЭП)</span>
									</button>
									<button
										type="button"
										className="pc-btn-secondary pc-btn-compact"
										data-testid={`preview-consent-btn-${consent.id}`}
										onClick={() => openPrintWindow(generateConsentPrintHtml(consent, data))}
									>
										<Eye size={13} />
										<span>Печатный бланк</span>
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
};
