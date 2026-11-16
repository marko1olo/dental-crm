import React, { useState, useRef, useEffect } from "react";
import { Calendar, Check, Lightbulb, MessageCircle, MoreHorizontal, Phone, Send } from "lucide-react";
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
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMenuOpen]);

	const meta = CLINICAL_TASK_CALL_BY_TYPE[taskType];
	const btnSecondary =
		"recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium rounded-lg px-3.5 h-9 min-h-[36px] sm:min-h-[36px] text-sm gap-2 inline-flex items-center justify-center shrink-0 shadow-2xs transition-colors";
	const btnPrimary =
		"recall-action-btn recall-action-btn--book bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-medium rounded-lg px-3.5 h-9 min-h-[36px] sm:min-h-[36px] text-sm gap-2 inline-flex items-center justify-center shrink-0 shadow-xs transition-colors border-0";

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

			<div className="recall-task-call-card__actions flex items-center gap-2 relative">
				{/* ЕДИНЫЙ PRIMARY CTA: ЗАПИСАТЬ */}
				<button
					type="button"
					className={btnPrimary}
					onClick={() => onBook(candidate)}
					data-testid={`btn-call-book-${candidate.id}`}
					title="Записать на приём"
				>
					<Calendar size={15} className="shrink-0" />
					<span>Записать</span>
				</button>

				{/* SECONDARY: ПОЗВОНИТЬ */}
				{candidate.phone && (
					<a
						href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
						className={btnSecondary}
						style={{ textDecoration: "none" }}
						data-testid={`btn-call-phone-${candidate.id}`}
						title={`Позвонить: ${candidate.phone}`}
					>
						<Phone size={15} className="shrink-0" />
						<span>Позвонить</span>
					</a>
				)}

				{/* КОМПАКТНОЕ МЕНЮ ДЕЙСТВИЙ (WhatsApp, Telegram, Скрипт, Успех) */}
				<div className="relative inline-flex shrink-0" ref={menuRef}>
					<button
						type="button"
						className={`${btnSecondary} px-2 w-9 h-9 flex items-center justify-center ${isScriptActive ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
						onClick={() => setIsMenuOpen((prev) => !prev)}
						data-testid={`btn-call-more-${candidate.id}`}
						title="Дополнительные каналы связи и статус"
						aria-label="Дополнительные каналы связи и статус"
						aria-expanded={isMenuOpen}
					>
						<MoreHorizontal size={16} />
					</button>

					{isMenuOpen && (
						<div
							className="absolute right-0 bottom-full mb-1.5 z-50 min-w-[210px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-lg flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
								onClick={() => {
									setIsMenuOpen(false);
									void onWhatsApp(candidate);
								}}
								data-testid={`btn-call-wa-${candidate.id}`}
							>
								<MessageCircle size={15} className="text-[var(--success-ink,#10b981)] shrink-0" />
								<span>WhatsApp сообщение</span>
							</button>

							<button
								type="button"
								className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
								onClick={() => {
									setIsMenuOpen(false);
									void onTelegram(candidate);
								}}
								data-testid={`btn-call-tg-${candidate.id}`}
							>
								<Send size={15} className="text-[var(--info-ink,#0284c7)] shrink-0" />
								<span>Telegram сообщение</span>
							</button>

							<button
								type="button"
								className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
								onClick={() => {
									setIsMenuOpen(false);
									onToggleScript();
								}}
								data-testid={`btn-call-script-${candidate.id}`}
							>
								<Lightbulb size={15} className="text-[var(--warning-ink,#f59e0b)] shrink-0" />
								<span>{isScriptActive ? "Скрыть скрипт" : "Речевой скрипт"}</span>
							</button>

							<div className="h-px bg-[var(--line)] my-0.5" />

							<button
								type="button"
								className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--success-ink,#10b981)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-medium"
								onClick={() => {
									setIsMenuOpen(false);
									onStatusUpdate(candidate.id, "scheduled");
								}}
								data-testid={`btn-call-done-${candidate.id}`}
							>
								<Check size={15} className="shrink-0" />
								<span>Отметить успешный контакт</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
