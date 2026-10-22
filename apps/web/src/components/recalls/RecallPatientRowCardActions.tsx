import type React from "react";
import { Calendar, ChevronRight, Eye, Lightbulb, MessageCircle, Phone, Send } from "lucide-react";
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
	const btnSecondary = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";
	const btnPrimary = "recall-action-btn recall-action-btn--book bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] font-bold rounded-lg px-3 py-1.5 shadow-xs transition-colors border-0";

	return (
		<div className="recall-patient-card__actions" role="group" aria-label="Действия вызова">
			<button
				type="button"
				className={btnPrimary}
				onClick={() => onBook(candidate)}
				data-testid={`recall-book-btn-${candidate.id}`}
				title="Записать на приём"
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Calendar size={15} />
				<span>Записать на приём</span>
				<ChevronRight size={14} />
			</button>

			<a
				href={candidate.phone ? `tel:${candidate.phone}` : undefined}
				className={`${btnSecondary} recall-action-btn--phone`}
				data-testid={`recall-phone-btn-${candidate.id}`}
				title={candidate.phone ? `Позвонить: ${candidate.phone}` : "Телефон не указан"}
				style={{ minHeight: "44px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<Eye size={14} />
				<span>Превью</span>
			</button>

			<button
				type="button"
				className={btnSecondary}
				onClick={() => onTogglePreview?.(candidate)}
				data-testid={`recall-preview-btn-${candidate.id}`}
				title="Шаблон приглашения"
				style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
			>
				<span>Шаблон</span>
			</button>
		</div>
	);
};
