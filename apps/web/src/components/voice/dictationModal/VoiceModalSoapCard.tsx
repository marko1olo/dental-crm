/**
 * VoiceModalSoapCard.tsx — Карточка автогенерации дневника приёма по стандарту SOAP.
 * Строго <= 120 строк по Мандату 8b.
 */

import { FileText } from "lucide-react";
import type { SoapAggregatedNote } from "./voiceModalTypes";

interface VoiceModalSoapCardProps {
	soapNote?: SoapAggregatedNote | null;
}

export function VoiceModalSoapCard({ soapNote }: VoiceModalSoapCardProps) {
	if (!soapNote || Object.keys(soapNote).length === 0) return null;

	return (
		<div className="dnt-voice-soap-card">
			<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px" }}>
				<FileText size={18} />
				<span>Дневник приёма</span>
			</div>

			<div className="dnt-voice-soap-grid">
				{soapNote.subjective && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">I. Жалобы и анамнез</div>
						<div className="dnt-voice-soap-item-text">{soapNote.subjective}</div>
					</div>
				)}
				{soapNote.objective && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">II. Осмотр и зубная формула</div>
						<div className="dnt-voice-soap-item-text">{soapNote.objective}</div>
					</div>
				)}
				{soapNote.plan && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">IV. Протокол лечения</div>
						<div className="dnt-voice-soap-item-text">{soapNote.plan}</div>
					</div>
				)}
				{soapNote.recommendations && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">Назначения и рекомендации</div>
						<div className="dnt-voice-soap-item-text">{soapNote.recommendations}</div>
					</div>
				)}
			</div>
		</div>
	);
}
