import type React from "react";
import { Calendar, Check, Lightbulb, MessageCircle, Phone, Send } from "lucide-react";
import { STOMX_TASK_CALL_BY_TYPE, type StomxTaskCallType } from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface PatientRecallsTaskCallCardProps {
	readonly candidate: PatientRecallRecord;
	readonly taskType: StomxTaskCallType;
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
	const meta = STOMX_TASK_CALL_BY_TYPE[taskType];
	const btnCls = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";

	return (
		<div
			data-testid={`task-call-card-${candidate.id}`}
			style={{
				padding: "16px", borderRadius: "10px", backgroundColor: "var(--paper)", border: "1px solid var(--line)",
				display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "16px",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>{candidate.fullName}</span>
					{candidate.phone && (
						<a href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`} style={{ fontSize: "0.8125rem", color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}>
							{candidate.phone}
						</a>
					)}
					<span className="recall-badge" style={{ backgroundColor: "var(--teal-surface)", color: "var(--teal)", fontWeight: 700 }}>
						{meta?.titleRu || "Сервисный звонок"}
					</span>
					{candidate.daysOverdue > 0 ? (
						<span className="recall-badge recall-badge--overdue">Просрочен на {candidate.daysOverdue} дн.</span>
					) : (
						<span className="recall-badge recall-badge--upcoming">Срок: {candidate.dueDate}</span>
					)}
				</div>
				<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
					{candidate.attendingDoctorName && (
						<span>Врач: <strong>{candidate.attendingDoctorName}</strong> • </span>
					)}
					<span>Последний визит: {candidate.lastVisitDate}</span>
					{candidate.clinicalNotes && <span> • {candidate.clinicalNotes}</span>}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				{candidate.phone && (
					<a
						href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
						className={btnCls}
						style={{ minHeight: "44px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
						data-testid={`btn-call-phone-${candidate.id}`}
					>
						<Phone size={16} /> <span>Позвонить</span>
					</a>
				)}
				<button type="button" className={`${btnCls} recall-action-btn--whatsapp`} style={{ minHeight: "44px" }} onClick={() => void onWhatsApp(candidate)} data-testid={`btn-call-wa-${candidate.id}`}>
					<MessageCircle size={16} /> <span>WhatsApp</span>
				</button>
				<button type="button" className={`${btnCls} recall-action-btn--telegram`} style={{ minHeight: "44px" }} onClick={() => void onTelegram(candidate)} data-testid={`btn-call-tg-${candidate.id}`}>
					<Send size={16} /> <span>TG</span>
				</button>
				<button
					type="button"
					className={`${btnCls} recall-action-btn--script ${isScriptActive ? "active" : ""}`}
					style={{ minHeight: "44px" }}
					onClick={onToggleScript}
					data-testid={`btn-call-script-${candidate.id}`}
					title="Показать речевой скрипт для этой задачи"
				>
					<Lightbulb size={16} /> <span>Скрипт</span>
				</button>
				<button type="button" className={`${btnCls} recall-action-btn--book`} style={{ minHeight: "44px" }} onClick={() => onBook(candidate)} data-testid={`btn-call-book-${candidate.id}`}>
					<Calendar size={16} /> <span>Записать</span>
				</button>
				<button type="button" className={btnCls} style={{ minHeight: "44px", color: "var(--ok-fg)" }} onClick={() => onStatusUpdate(candidate.id, "scheduled")} data-testid={`btn-call-done-${candidate.id}`} title="Отметить успешный контакт">
					<Check size={16} /> <span>Успех</span>
				</button>
			</div>
		</div>
	);
};
