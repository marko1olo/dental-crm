import type React from "react";
import { Calendar, Check, Lightbulb, MessageCircle, Phone, Send } from "lucide-react";
import { CLINICAL_TASK_CALL_BY_TYPE, type ClinicalTaskCallType } from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface PatientRecallsTaskCallCardProps {
	readonly candidate: PatientRecallRecord;
	readonly taskType: ClinicalTaskCallType;
	readonly isScriptActive: boolean;
	readonly onToggleScript: () => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsTaskCallCard: React.FC<PatientRecallsTaskCallCardProps> = ({
	candidate,
	taskType,
	isScriptActive,
	onToggleScript,
	onWhatsApp,
	onTelegram,
	onBook,
	onStatusUpdate,
}) => {
	const meta = CLINICAL_TASK_CALL_BY_TYPE[taskType];
	const btnSecondary = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";
	const btnPrimary = "recall-action-btn recall-action-btn--book bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] font-bold rounded-lg px-3 py-1.5 shadow-xs transition-colors border-0";

	return (
		<div
			className="recall-task-call-card"
			data-testid={`task-call-card-${candidate.id}`}
		>
			<div className="recall-task-call-card__info">
				<div className="recall-task-call-card__title-row">
					<span className="recall-task-call-card__name">{candidate.fullName}</span>
					{candidate.phone && (
						<a href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`} className="recall-task-call-card__phone-link">
							{candidate.phone}
						</a>
					)}
					<span className="recall-badge recall-badge--task-type">
						{meta?.titleRu || "Сервисный звонок"}
					</span>
					{candidate.daysOverdue > 0 ? (
						<span className="recall-badge recall-badge--overdue">Просрочен на {candidate.daysOverdue} дн.</span>
					) : (
						<span className="recall-badge recall-badge--upcoming">Срок: {candidate.dueDate}</span>
					)}
				</div>
				<div className="recall-task-call-card__meta-row">
					{candidate.attendingDoctorName && (
						<span>Врач: <strong>{candidate.attendingDoctorName}</strong> • </span>
					)}
					<span>Последний визит: {candidate.lastVisitDate}</span>
					{candidate.clinicalNotes && <span> • {candidate.clinicalNotes}</span>}
				</div>
			</div>

			<div className="recall-task-call-card__actions">
				{candidate.phone && (
					<a
						href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
						className={btnSecondary}
						style={{ minHeight: "44px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
						data-testid={`btn-call-phone-${candidate.id}`}
					>
						<Phone size={16} /> <span>Позвонить</span>
					</a>
				)}
				<button type="button" className={`${btnSecondary} recall-action-btn--whatsapp`} style={{ minHeight: "44px" }} onClick={() => void onWhatsApp(candidate)} data-testid={`btn-call-wa-${candidate.id}`}>
					<MessageCircle size={16} /> <span>WhatsApp</span>
				</button>
				<button type="button" className={`${btnSecondary} recall-action-btn--telegram`} style={{ minHeight: "44px" }} onClick={() => void onTelegram(candidate)} data-testid={`btn-call-tg-${candidate.id}`}>
					<Send size={16} /> <span>TG</span>
				</button>
				<button
					type="button"
					className={`${btnSecondary} recall-action-btn--script ${isScriptActive ? "active" : ""}`}
					style={{ minHeight: "44px" }}
					onClick={onToggleScript}
					data-testid={`btn-call-script-${candidate.id}`}
					title="Показать речевой скрипт для этой задачи"
				>
					<Lightbulb size={16} /> <span>Скрипт</span>
				</button>
				<button type="button" className={btnPrimary} style={{ minHeight: "44px" }} onClick={() => onBook(candidate)} data-testid={`btn-call-book-${candidate.id}`}>
					<Calendar size={16} /> <span>Записать</span>
				</button>
				<button type="button" className={btnSecondary} style={{ minHeight: "44px", color: "var(--ok-fg)" }} onClick={() => onStatusUpdate(candidate.id, "scheduled")} data-testid={`btn-call-done-${candidate.id}`} title="Отметить успешный контакт">
					<Check size={16} /> <span>Успех</span>
				</button>
			</div>
		</div>
	);
};
