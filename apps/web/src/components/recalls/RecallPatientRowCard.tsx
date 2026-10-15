import type React from "react";
import { Calendar, ChevronRight, Eye, MessageCircle, Phone, PhoneCall, Send } from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	formatHumanRecallBadge,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";

export interface RecallPatientRowCardProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive?: boolean | undefined;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const RecallPatientRowCard: React.FC<RecallPatientRowCardProps> = ({
	candidate,
	isScriptActive = false,
	onBook,
	onToggleScript,
	onTogglePreview,
	onWhatsApp,
	onTelegram,
	onCopySms,
}) => {
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
	const badge = formatHumanRecallBadge({
		urgencyStatus: candidate.urgencyStatus,
		daysOverdue: candidate.daysOverdue,
		dueDate: candidate.dueDate,
		status: candidate.status,
	});

	return (
		<article className="recall-patient-card" data-testid={`recall-hub-row-${candidate.id}`} style={{ minHeight: "44px" }}>
			<div className="recall-patient-card__main">
				<div className="recall-patient-card__header">
					<h4 className="recall-patient-card__name">{candidate.fullName}</h4>
					<span className={`recall-badge recall-badge--${badge.badgeClass}`} data-testid={`recall-badge-${candidate.id}`}>
						{badge.badgeText}
					</span>
				</div>
				<div className="recall-patient-card__meta">
					{candidate.phone ? (
						<a href={`tel:${candidate.phone}`} className="recall-patient-card__phone"><Phone size={13} /><span>{candidate.phone}</span></a>
					) : <span className="recall-patient-card__no-phone">телефон не указан</span>}
					<span className="recall-cycle-tag">{cycleDef?.shortTitle || candidate.cycleType}</span>
					{candidate.attendingDoctorName && <span className="recall-patient-card__doctor">Врач: {candidate.attendingDoctorName}</span>}
				</div>
			</div>
			<div className="recall-patient-card__actions" role="group" aria-label="Действия вызова">
				<button type="button" className="recall-action-btn recall-action-btn--whatsapp" onClick={() => onWhatsApp(candidate)} data-testid={`recall-whatsapp-btn-${candidate.id}`} title="WhatsApp" style={{ minHeight: "44px", minWidth: "44px" }}><MessageCircle size={16} /><span>WhatsApp</span></button>
				<button type="button" className="recall-action-btn recall-action-btn--book" onClick={() => onBook(candidate)} data-testid={`recall-book-btn-${candidate.id}`} title="Записать" style={{ minHeight: "44px", minWidth: "44px" }}><Calendar size={16} /><span>Записать</span><ChevronRight size={14} /></button>
				<button type="button" className={`recall-action-btn ${isScriptActive ? "active" : ""}`} onClick={() => onToggleScript(candidate)} data-testid={`recall-script-btn-${candidate.id}`} title="Скрипт звонка" style={{ minHeight: "44px", minWidth: "44px" }}><PhoneCall size={16} /><span>Скрипт</span></button>
				<button type="button" className="recall-action-btn" onClick={() => onTogglePreview?.(candidate)} data-testid={`recall-quick-preview-btn-${candidate.id}`} title="Быстрый предпросмотр" style={{ minHeight: "44px", minWidth: "44px" }}><Eye size={15} /><span>Превью</span></button>
				<button type="button" className="recall-action-btn recall-action-btn--subtle" onClick={() => onTogglePreview?.(candidate)} data-testid={`recall-preview-btn-${candidate.id}`} title="Шаблон" style={{ minHeight: "44px", minWidth: "44px" }}><Eye size={15} /><span>Шаблон</span></button>
				<button type="button" className="recall-action-btn recall-action-btn--subtle" onClick={() => onCopySms(candidate)} data-testid={`recall-sms-btn-${candidate.id}`} title="SMS" style={{ minHeight: "44px", minWidth: "44px" }}><Send size={15} /><span>SMS</span></button>
				<button type="button" className="recall-action-btn recall-action-btn--subtle" onClick={() => onTelegram(candidate)} data-testid={`recall-telegram-btn-${candidate.id}`} title="Telegram" style={{ minHeight: "44px", minWidth: "44px" }}><Send size={15} /><span>TG</span></button>
			</div>
		</article>
	);
};
