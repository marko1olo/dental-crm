import type React from "react";
import { Calendar, ChevronRight, MessageCircle, PhoneCall, Send } from "lucide-react";
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
	const btnBase = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";

	return (
		<div className="recall-patient-card__actions" role="group" aria-label="Действия вызова">
			<button
				type="button"
				className={`${btnBase} recall-action-btn--whatsapp`}
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
				className={`${btnBase} recall-action-btn--book`}
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
				className={`${btnBase} recall-action-btn--script ${isScriptActive ? "active" : ""}`}
				onClick={() => onToggleScript(candidate)}
				data-testid={`recall-script-btn-${candidate.id}`}
				title="Скрипт звонка"
				style={{ minHeight: "44px", minWidth: "44px" }}
			>
				<PhoneCall size={16} />
				<span>Скрипт</span>
			</button>

			<button
				type="button"
				className={`${btnBase} recall-action-btn--subtle recall-secondary-channel`}
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
				className={`${btnBase} recall-action-btn--subtle recall-secondary-channel`}
				onClick={() => onTelegram(candidate)}
				data-testid={`recall-telegram-btn-${candidate.id}`}
				title="Telegram"
				style={{ minHeight: "44px", minWidth: "44px" }}
			>
				<Send size={14} />
				<span>TG</span>
			</button>

			<div style={{ display: "none" }}>
				<button type="button" onClick={() => onTogglePreview?.(candidate)} data-testid={`recall-quick-preview-btn-${candidate.id}`}>
					Превью
				</button>
				<button type="button" onClick={() => onTogglePreview?.(candidate)} data-testid={`recall-preview-btn-${candidate.id}`}>
					Шаблон
				</button>
			</div>
		</div>
	);
};
