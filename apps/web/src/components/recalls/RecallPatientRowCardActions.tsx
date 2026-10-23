import type React from "react";
import { CalendarCheck, ChevronRight, Eye, Lightbulb, MessageCircle, Phone, Send } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface RecallPatientRowCardActionsProps {
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

export const RecallPatientRowCardActions: React.FC<RecallPatientRowCardActionsProps> = ({
	candidate,
	isScriptActive = false,
	onBook,
	onToggleScript,
	onTogglePreview,
	onWhatsApp,
	onTelegram,
	onCopySms,
}) => {
	const btnSecondary = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--primary)] hover:bg-[var(--paper-hover)] transition-colors";
	const btnPrimary = "recall-action-btn recall-action-btn--book bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] font-bold rounded-xl px-3 py-1.5 shadow-xs transition-colors border-0 h-9 min-h-[36px] sm:min-h-[36px]";

	return (
		<div className="recall-patient-card__actions" role="group" aria-label="Действия вызова">
			<button
				type="button"
				className={btnPrimary}
				onClick={() => onBook(candidate)}
				data-testid={`recall-book-btn-${candidate.id}`}
				title="Запланировать осмотр"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<CalendarCheck size={15} />
				<span>Запланировать осмотр</span>
				<ChevronRight size={14} />
			</button>

			<a
				href={candidate.phone ? `tel:${candidate.phone}` : undefined}
				className={`${btnSecondary} recall-action-btn--phone`}
				data-testid={`recall-phone-btn-${candidate.id}`}
				title={candidate.phone ? `Позвонить: ${candidate.phone}` : "Телефон не указан"}
				style={{ minHeight: "36px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Phone size={15} />
				<span>Позвонить</span>
			</a>

			<button
				type="button"
				className={`${btnSecondary} recall-action-btn--whatsapp`}
				onClick={() => onWhatsApp(candidate)}
				data-testid={`recall-whatsapp-btn-${candidate.id}`}
				title="WhatsApp сообщение"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<MessageCircle size={15} />
				<span>WhatsApp</span>
			</button>

			<button
				type="button"
				className={`${btnSecondary} recall-action-btn--telegram`}
				onClick={() => onTelegram(candidate)}
				data-testid={`recall-telegram-btn-${candidate.id}`}
				title="Telegram сообщение"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Send size={14} />
				<span>TG</span>
			</button>

			<button
				type="button"
				className={`${btnSecondary} recall-action-btn--script ${isScriptActive ? "active" : ""}`}
				onClick={() => onToggleScript(candidate)}
				data-testid={`recall-script-btn-${candidate.id}`}
				title="Речевой скрипт для диалога"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Lightbulb size={15} />
				<span>Скрипт</span>
			</button>

			<button
				type="button"
				className={`${btnSecondary} recall-action-btn--subtle`}
				onClick={() => onCopySms(candidate)}
				data-testid={`recall-sms-btn-${candidate.id}`}
				title="Скопировать СМС"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Send size={14} />
				<span>СМС</span>
			</button>

			<button
				type="button"
				className={`${btnSecondary} recall-action-btn--preview`}
				onClick={() => onTogglePreview?.(candidate)}
				data-testid={`recall-quick-preview-btn-${candidate.id}`}
				title="Быстрый просмотр шаблона"
				style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Eye size={14} />
				<span>Превью</span>
			</button>
		</div>
	);
};
