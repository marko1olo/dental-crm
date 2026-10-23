import type React from "react";
import { CalendarCheck, ChevronDown, MessageCircle, Phone } from "lucide-react";
import {
	formatHumanRecallBadge, resolveCandidateTriggerType,
	type PatientRecallRecord, type RecallContactStatus,
} from "./patientRecallEngine";
import { PatientRecallsKanbanDropdownMenu } from "./PatientRecallsKanbanDropdownMenu";

export interface PatientRecallsKanbanCardProps {
	readonly candidate: PatientRecallRecord;
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: () => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsKanbanCard: React.FC<PatientRecallsKanbanCardProps> = ({
	candidate, isMenuOpen, onToggleMenu, onBook, onWhatsApp, onCopySms, onStatusUpdate, onPostpone,
}) => {
	const triggerType = resolveCandidateTriggerType(candidate);
	const triggerLabel =
		triggerType === "hygiene_6m" ? "Профгигиена 6 мес."
		: triggerType === "implant_prosthetic_12m" ? "Импланты/Ортопедия 12 мес."
		: triggerType === "ortho_activation_1m" ? "Орто-активация 1 мес."
		: triggerType === "endodontic_1m" ? "Эндодонтия 1 мес."
		: triggerType === "periodontal_3m" ? "Пародонтология 3 мес."
		: "Детский осмотр 3-4 мес.";

	const badge = formatHumanRecallBadge({
		urgencyStatus: candidate.urgencyStatus, daysOverdue: candidate.daysOverdue,
		dueDate: candidate.dueDate, status: candidate.status,
	});

	const btnCls = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--primary)] hover:bg-[var(--paper-hover)] transition-colors";

	return (
		<div className="recall-kanban-card" data-testid={`kanban-card-${candidate.id}`}>
			<div className="recall-kanban-card-patient">
				<div className="recall-kanban-card-name">{candidate.fullName}</div>
				{candidate.phone ? (
					<a href={`tel:${candidate.phone}`} className="recall-kanban-card-phone" style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", gap: "4px" }}>
						<Phone size={12} /> <span>{candidate.phone}</span>
					</a>
				) : (
					<div className="recall-kanban-card-phone">телефон не указан</div>
				)}
			</div>

			<div className="recall-kanban-card-meta">
				<span className="recall-cycle-tag" style={{ alignSelf: "flex-start" }}>{triggerLabel}</span>
				<div className="recall-kanban-card-doctor">Врач: {candidate.attendingDoctorName || "—"}</div>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span>План: {candidate.dueDate}</span>
					<span className={`recall-badge recall-badge--${badge.badgeClass}`} title={badge.badgeTitle} data-testid={`kanban-badge-status-${candidate.id}`}>
						{badge.badgeText}
					</span>
				</div>
			</div>

			<div className="recall-kanban-card-actions" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--rm-border)" }}>
				<button
					type="button"
					className="recall-action-btn recall-action-btn--book bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] font-bold rounded-xl px-2.5 py-1.5 shadow-xs transition-colors border-0"
					style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.75rem", flex: "1 1 0", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
					onClick={() => onBook(candidate)}
					data-testid={`kanban-book-btn-${candidate.id}`}
					title="Запланировать осмотр"
				>
					<CalendarCheck size={14} />
					<span>Запланировать</span>
				</button>

				<div style={{ position: "relative", flex: "1 1 0", display: "inline-flex" }}>
					<button
						type="button"
						className={`${btnCls} recall-action-btn--whatsapp`}
						style={{ minHeight: "32px", padding: "4px 6px", fontSize: "0.75rem", flex: "1 1 auto", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
						onClick={() => void onWhatsApp(candidate)}
						data-testid={`recall-whatsapp-btn-${candidate.id}`}
						title="Отправить в WhatsApp"
					>
						<MessageCircle size={13} />
						<span>WhatsApp</span>
					</button>
					<button
						type="button"
						className={btnCls}
						style={{ minHeight: "32px", padding: "4px 5px", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}
						onClick={onToggleMenu}
						data-testid={`kanban-actions-menu-btn-${candidate.id}`}
						title="Дополнительные действия (SMS, перенос, статус)"
						aria-expanded={isMenuOpen}
					>
						<ChevronDown size={13} />
					</button>

					<PatientRecallsKanbanDropdownMenu
						candidate={candidate} isOpen={isMenuOpen} onClose={onToggleMenu}
						onCopySms={onCopySms} onStatusUpdate={onStatusUpdate} onPostpone={onPostpone}
					/>
				</div>
			</div>
		</div>
	);
};
