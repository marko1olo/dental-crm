/**
 * DENTE Dental CRM — Leads Conversion Consent Section
 * Mandate 8x & 8ap (Human Clinical Terminology), Mandate 8b (<= 120 lines)
 */

import { ShieldCheck } from "lucide-react";
import React from "react";

interface LeadConvertConsentSectionProps {
	borderColor: string;
	consentMedical: boolean;
	setConsentMedical: (val: boolean) => void;
	consentMarketing: boolean;
	setConsentMarketing: (val: boolean) => void;
}

export const LeadConvertConsentSection: React.FC<
	LeadConvertConsentSectionProps
> = ({
	borderColor,
	consentMedical,
	setConsentMedical,
	consentMarketing,
	setConsentMarketing,
}) => {
	return (
		<div
			style={{
				padding: "10px 12px",
				borderRadius: 10,
				background: "var(--paper-soft)",
				border: `1px solid ${borderColor}`,
				display: "flex",
				flexDirection: "column",
				gap: 8,
			}}
			data-testid="lead-convert-consent-section"
		>
			<div
				style={{
					fontSize: 11.5,
					fontWeight: 600,
					color: "var(--ink)",
					display: "flex",
					alignItems: "center",
					gap: 5,
				}}
			>
				<ShieldCheck size={13} style={{ color: "var(--teal)" }} />
				<span>Согласия и уведомления пациента</span>
			</div>

			<label
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: 8,
					fontSize: 11.5,
					color: "var(--ink)",
					cursor: "pointer",
				}}
				data-testid="consent-medical-label"
			>
				<input
					type="checkbox"
					checked={consentMedical}
					onChange={(e) => setConsentMedical(e.target.checked)}
					style={{ marginTop: 2, accentColor: "var(--teal)" }}
					data-testid="consent-medical-checkbox"
				/>
				<div>
					<span style={{ fontWeight: 600 }}>
						Согласие на ведение медицинской карты и обработку данных
					</span>
					<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
						Оформление амбулаторной карты приёма и согласия на осмотр.
					</p>
				</div>
			</label>

			<label
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: 8,
					fontSize: 11.5,
					color: "var(--ink)",
					cursor: "pointer",
				}}
				data-testid="consent-marketing-label"
			>
				<input
					type="checkbox"
					checked={consentMarketing}
					onChange={(e) => setConsentMarketing(e.target.checked)}
					style={{ marginTop: 2, accentColor: "var(--teal)" }}
					data-testid="consent-marketing-checkbox"
				/>
				<div>
					<span style={{ fontWeight: 600 }}>
						Сервисные напоминания о визитах
					</span>
					<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
						{consentMarketing
							? "Пациент согласен получать напоминания о записи и информацию о визитах."
							: "Отключено: отправляются только сервисные напоминания о времени приёма."}
					</p>
				</div>
			</label>
		</div>
	);
};
