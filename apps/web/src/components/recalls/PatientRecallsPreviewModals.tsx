import type React from "react";
import { Calendar, Eye, MessageCircle, Send, X } from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	type PatientRecallRecord,
} from "./patientRecallEngine";
import { calculateSmsSegments, formatSmsSummary } from "./recallTemplates";

export interface PatientRecallsPreviewModalsProps {
	readonly activePreviewCandidate: PatientRecallRecord | null;
	readonly previewChannel: "sms" | "whatsapp" | "telegram";
	readonly onPreviewChannelChange: (channel: "sms" | "whatsapp" | "telegram") => void;
	readonly onClosePreview: () => void;
	readonly clinicName: string;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly activeScriptCandidate?: PatientRecallRecord | null;
	readonly onCloseScript?: () => void;
	readonly selectedObjectionId?: string;
	readonly onSelectObjectionId?: (id: string) => void;
	readonly copiedCandidateId?: string | null;
}

export const PatientRecallsPreviewModals: React.FC<PatientRecallsPreviewModalsProps> = ({
	activePreviewCandidate,
	previewChannel,
	onPreviewChannelChange,
	onClosePreview,
	clinicName,
	onCopySms,
	onWhatsApp,
	onTelegram,
	onBook,
}) => {
	if (!activePreviewCandidate) return null;
	const candidate = activePreviewCandidate;
	const smsText = generateSmsRecallMessage(candidate, { clinicName });
	const waText = generateWhatsAppRecallMessage(candidate, { clinicName });
	const tgText = generateTelegramRecallMessage(candidate, { clinicName });
	const activeText = previewChannel === "sms" ? smsText : previewChannel === "whatsapp" ? waText : tgText;
	const smsCalc = calculateSmsSegments(activeText);

	return (
		<aside className="recall-preview-drawer" aria-label="Предпросмотр сообщения" data-testid="recall-template-preview-drawer">
			<div className="recall-preview-drawer-header">
				<div className="recall-preview-title">
					<Eye size={18} />
					<span>Предпросмотр: {candidate.fullName} ({RECALL_CYCLE_CATALOG[candidate.cycleType]?.title})</span>
				</div>
				<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<button type="button" className={`recall-chip ${previewChannel === "sms" ? "active" : ""}`} onClick={() => onPreviewChannelChange("sms")}>SMS</button>
					<button type="button" className={`recall-chip ${previewChannel === "whatsapp" ? "active" : ""}`} onClick={() => onPreviewChannelChange("whatsapp")}>WhatsApp</button>
					<button type="button" className={`recall-chip ${previewChannel === "telegram" ? "active" : ""}`} onClick={() => onPreviewChannelChange("telegram")}>Telegram</button>
					<button type="button" className="recall-close-btn" onClick={onClosePreview} aria-label="Закрыть"><X size={16} /></button>
				</div>
			</div>
			<div className="recall-preview-drawer-body">
				<div className="recall-preview-bubble"><p>{activeText}</p></div>
				<div className="recall-preview-meta">
					<span>{formatSmsSummary(smsCalc)}</span>
					<span>Телефон: {candidate.phone || "не указан"}</span>
				</div>
			</div>
			<div className="recall-preview-drawer-footer">
				{previewChannel === "whatsapp" && (
					<button type="button" className="recall-action-btn recall-action-btn--whatsapp" onClick={() => onWhatsApp(candidate)} style={{ minHeight: "44px" }}>
						<MessageCircle size={15} /><span>Отправить в WhatsApp</span>
					</button>
				)}
				{previewChannel === "telegram" && (
					<button type="button" className="recall-action-btn recall-action-btn--telegram" onClick={() => onTelegram(candidate)} style={{ minHeight: "44px" }}>
						<Send size={15} /><span>Открыть Telegram</span>
					</button>
				)}
				{previewChannel === "sms" && (
					<button type="button" className="recall-action-btn" onClick={() => onCopySms(candidate)} style={{ minHeight: "44px" }}>
						<Send size={15} /><span>Скопировать SMS</span>
					</button>
				)}
				<button type="button" className="recall-action-btn recall-action-btn--book" onClick={() => onBook(candidate)} style={{ minHeight: "44px" }}>
					<Calendar size={15} /><span>Записать на приём</span>
				</button>
			</div>
		</aside>
	);
};
