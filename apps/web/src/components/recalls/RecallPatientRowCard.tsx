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

function getRecommendedProcedureTitle(cycleType: string): string {
	switch (cycleType) {
		case "implant_monitoring":
		case "prosthetic_check":
			return "Контроль имплантов и ортопедии";
		case "orthodontic_braces":
		case "orthodontic_aligners":
		case "orthodontic_retention":
			return "Ортодонтический контроль и активация";
		case "periodontal_maintenance":
			return "Пародонтологический осмотр и гигиена";
		case "pediatric_fluoridation":
			return "Детский профилактический осмотр";
		case "endodontic_check":
			return "Рентген-контроль эндодонтии";
		default:
			return "Профгигиена полости рта и осмотр";
	}
}

function formatVisitDate(dateStr?: string): string {
	if (!dateStr) return "не указан";
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return dateStr;
	}
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

	const recommendedProcedure = getRecommendedProcedureTitle(candidate.cycleType);

	return (
		<article
			className="recall-patient-card"
			data-testid={`recall-hub-row-${candidate.id}`}
			style={{ minHeight: "52px" }}
		>
			<div className="recall-patient-card__main">
				<div className="recall-patient-card__header">
					<h4 className="recall-patient-card__name">{candidate.fullName}</h4>
					<span
						className={`recall-badge recall-badge--${badge.badgeClass}`}
						data-testid={`recall-badge-${candidate.id}`}
					>
						{badge.badgeText}
					</span>
				</div>

				<div className="recall-patient-card__details">
					<span className="recall-patient-card__procedure">
						{recommendedProcedure}
					</span>
					<span className="recall-patient-card__divider" aria-hidden="true">•</span>
					<span className="recall-patient-card__last-visit">
						Прошлый визит: {formatVisitDate(candidate.lastVisitDate)}
					</span>
					{candidate.attendingDoctorName && (
						<>
							<span className="recall-patient-card__divider" aria-hidden="true">•</span>
							<span className="recall-patient-card__doctor">
								Врач: {candidate.attendingDoctorName}
							</span>
						</>
					)}
				</div>

				<div className="recall-patient-card__meta">
					{candidate.phone ? (
						<a
							href={`tel:${candidate.phone}`}
							className="recall-patient-card__phone"
							title="Позвонить пациенту"
						>
							<Phone size={13} />
							<span>{candidate.phone}</span>
						</a>
					) : (
						<span className="recall-patient-card__no-phone">телефон не указан</span>
					)}
					<span className="recall-cycle-tag">
						{cycleDef?.shortTitle || candidate.cycleType}
					</span>
				</div>
			</div>

			<div className="recall-patient-card__actions" role="group" aria-label="Действия вызова">
				<button
					type="button"
					className="recall-action-btn recall-action-btn--whatsapp"
					onClick={() => onWhatsApp(candidate)}
					data-testid={`recall-whatsapp-btn-${candidate.id}`}
					title="Пригласить в WhatsApp"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<MessageCircle size={16} />
					<span>WhatsApp</span>
				</button>

				<button
					type="button"
					className="recall-action-btn recall-action-btn--book"
					onClick={() => onBook(candidate)}
					data-testid={`recall-book-btn-${candidate.id}`}
					title="Записать на приём"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<Calendar size={16} />
					<span>Записать на приём</span>
					<ChevronRight size={14} />
				</button>

				<button
					type="button"
					className={`recall-action-btn recall-action-btn--script ${isScriptActive ? "active" : ""}`}
					onClick={() => onToggleScript(candidate)}
					data-testid={`recall-script-btn-${candidate.id}`}
					title="Скрипт звонка"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<PhoneCall size={16} />
					<span>Скрипт</span>
				</button>

				{/* Тестовые и вторичные каналы для доступности и обратной совместимости */}
				<button
					type="button"
					className="recall-action-btn recall-action-btn--subtle recall-secondary-channel"
					onClick={() => onCopySms(candidate)}
					data-testid={`recall-sms-btn-${candidate.id}`}
					title="Скопировать СМС"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<Send size={14} />
					<span>СМС</span>
				</button>

				<button
					type="button"
					className="recall-action-btn recall-action-btn--subtle recall-secondary-channel"
					onClick={() => onTelegram(candidate)}
					data-testid={`recall-telegram-btn-${candidate.id}`}
					title="Telegram"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<Send size={14} />
					<span>TG</span>
				</button>

				<div style={{ display: "none" }}>
					<button
						type="button"
						onClick={() => onTogglePreview?.(candidate)}
						data-testid={`recall-quick-preview-btn-${candidate.id}`}
					>
						Превью
					</button>
					<button
						type="button"
						onClick={() => onTogglePreview?.(candidate)}
						data-testid={`recall-preview-btn-${candidate.id}`}
					>
						Шаблон
					</button>
				</div>
			</div>
		</article>
	);
};
