/**
 * DENTE Dental CRM — Leads Conversion Consent Section (152-FZ & FZ-38)
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

interface LeadConvertConsentSectionProps {
	borderColor: string;
	consentMedical: boolean;
	setConsentMedical: (val: boolean) => void;
	consentMarketing: boolean;
	setConsentMarketing: (val: boolean) => void;
}

export const LeadConvertConsentSection: React.FC<LeadConvertConsentSectionProps> = ({
	borderColor,
	consentMedical,
	setConsentMedical,
	consentMarketing,
	setConsentMarketing,
}) => {
	return (
		<div
			style={{
				padding: "10px 12px", borderRadius: 10, background: "var(--paper-soft)",
				border: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", gap: 8,
			}}
			data-testid="lead-convert-consent-section"
		>
			<div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
				<ShieldCheck size={13} style={{ color: "var(--teal)" }} />
				<span>Разделение согласий (152-ФЗ и ст. 18 ФЗ «О рекламе»)</span>
			</div>

			<label
				style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: "var(--ink)", cursor: "pointer" }}
				data-testid="consent-medical-label"
			>
				<input
					type="checkbox"
					checked={consentMedical}
					onChange={(e) => setConsentMedical(e.target.checked)}
					style={{ marginTop: 2 }}
					data-testid="consent-medical-checkbox"
				/>
				<div>
					<span style={{ fontWeight: 600 }}>Согласие на обработку персданных (152-ФЗ)</span>
					<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
						Обязательно для оказания медицинской помощи, амбулаторной карты и договора.
					</p>
				</div>
			</label>

			<label
				style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: "var(--ink)", cursor: "pointer" }}
				data-testid="consent-marketing-label"
			>
				<input
					type="checkbox"
					checked={consentMarketing}
					onChange={(e) => setConsentMarketing(e.target.checked)}
					style={{ marginTop: 2 }}
					data-testid="consent-marketing-checkbox"
				/>
				<div>
					<span style={{ fontWeight: 600 }}>Согласие на рекламные рассылки и акции (ФЗ-38)</span>
					<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
						{consentMarketing
							? "Пациент дал согласие на рекламные SMS и маркетинговые спецпредложения."
							: "Отказ от рекламы: пациент исключается из промо-рассылок (защита от штрафов ФАС). Сервисные напоминания сохраняются."}
					</p>
				</div>
			</label>
		</div>
	);
};
