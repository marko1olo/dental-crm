/**
 * DENTE Dental CRM — Leads Conversion Patient Fields (Layer 4)
 * Mandate 8l (Zero Attribution Loss) & 152-FZ / FZ-38 Consent Separation, Mandate 8b (<= 120 lines)
 */

import React from "react";
import { FileText, Globe, ShieldCheck, Tag, User, UserCheck } from "lucide-react";
import { CHANNEL_BADGE_COLORS } from "../../telephony/telephonyAttribution";
import { extractLeadAttribution } from "../leadsFunnelEngine";
import type { LeadConvertPatientFieldsProps } from "./leadConvertTypes";
import { LeadConvertConsentSection } from "./LeadConvertConsentSection";

export const LeadConvertPatientFields: React.FC<LeadConvertPatientFieldsProps> = ({
	lead, borderColor, consentMedical, setConsentMedical, consentMarketing, setConsentMarketing,
}) => {
	const attribution = lead ? extractLeadAttribution(lead) : null;
	const channelBadge = attribution && CHANNEL_BADGE_COLORS[attribution.channelKey]
		? CHANNEL_BADGE_COLORS[attribution.channelKey]
		: { bg: "var(--teal-soft)", color: "var(--teal-dark, var(--teal))", border: "var(--teal)" };

	return (
		<>
			{lead && (
				<div
					style={{
						padding: "10px 12px", borderRadius: 10, background: "var(--paper-soft)",
						border: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", gap: 6,
					}}
					data-testid="lead-convert-attribution-card"
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
						<span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
							<User size={13} style={{ color: "var(--teal)" }} />
							{lead.name}
						</span>
						{lead.phone && <span style={{ fontSize: 12, color: "var(--muted)" }}>{lead.phone}</span>}
					</div>

					{lead.existingPatient && (
						<div
							style={{
								display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
								background: "var(--ok-bg, rgba(16, 185, 129, 0.1))", color: "var(--ok-fg, #059669)",
								border: "1px solid var(--ok-border, var(--line))", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
							}}
							data-testid="lead-convert-existing-patient-alert"
						>
							<UserCheck size={14} className="shrink-0" />
							<span>Постоянный пациент: {lead.existingPatient.fullName} (новая карта не создается, приём привяжется к существующей)</span>
						</div>
					)}

					<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
						<div
							style={{
								display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
								color: channelBadge.color, background: channelBadge.bg, border: `1px solid ${channelBadge.border}`,
								padding: "2px 7px", borderRadius: 5,
							}}
							data-testid="lead-convert-channel-badge"
							title={`Рекламный канал: ${attribution?.channelLabel || lead.source || "Прямое обращение"}`}
						>
							<Globe size={11} className="shrink-0" />
							<span>Канал: {attribution?.channelLabel || lead.source || "Прямое обращение"}</span>
						</div>

						{attribution?.hasUtmTags && (
							<span
								style={{
									fontSize: 10, fontWeight: 600, background: "var(--teal-soft)", color: "var(--teal)",
									border: "1px solid var(--teal)", padding: "1px 6px", borderRadius: 4,
									display: "inline-flex", alignItems: "center", gap: 3,
								}}
								title={`UTM Campaign: ${attribution.utm.utm_campaign || "активна"}`}
								data-testid="lead-convert-utm-badge"
							>
								<Tag size={10} />
								<span>UTM сохранены</span>
							</span>
						)}
					</div>

					{attribution?.primaryInquiry && (
						<div
							style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: 5, marginTop: 2 }}
							data-testid="lead-convert-primary-inquiry"
						>
							<FileText size={12} className="shrink-0" style={{ color: "var(--teal)", marginTop: 2 }} />
							<span><strong>Первичный запрос:</strong> {attribution.primaryInquiry}</span>
						</div>
					)}

					<div style={{ fontSize: 10.5, color: "var(--ok-fg)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
						<ShieldCheck size={12} className="shrink-0" />
						<span>Zero Attribution Loss: источник и запрос сохраняются в карте</span>
					</div>
				</div>
			)}

			<LeadConvertConsentSection
				borderColor={borderColor}
				consentMedical={consentMedical}
				setConsentMedical={setConsentMedical}
				consentMarketing={consentMarketing}
				setConsentMarketing={setConsentMarketing}
			/>
		</>
	);
};
