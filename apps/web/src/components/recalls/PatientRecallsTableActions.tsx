import type React from "react";
import { Calendar, Check, ChevronDown, Eye, MessageCircle, Phone } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import { PatientRecallsDropdownMenu } from "./PatientRecallsDropdownMenu";

export interface PatientRecallsTableActionsProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive: boolean;
	readonly isRealPreviewActive: boolean;
	readonly isOpen: boolean;
	readonly copiedCandidateId: string | null;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
	readonly onToggleDropdown: () => void;
}

export const PatientRecallsTableActions: React.FC<PatientRecallsTableActionsProps> = ({
	candidate, isScriptActive, isRealPreviewActive, isOpen, copiedCandidateId,
	onBook, onTogglePreview, onToggleScript, onWhatsApp, onTelegram, onCopySms,
	onStatusUpdate, onPostpone, onToggleDropdown,
}) => {
	const isScheduled = candidate.status === "scheduled";
	const btnCls = "dente-btn recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";

	return (
		<div className="recall-actions-cell" style={{ display: "flex", alignItems: "center", gap: "6px", position: "relative" }}>
			<a
				href={candidate.phone ? `tel:${candidate.phone}` : undefined}
				className={`${btnCls} recall-action-btn--phone`}
				data-testid={`recall-phone-btn-${candidate.id}`}
				title={candidate.phone ? `Позвонить: ${candidate.phone}` : "Телефон не указан"}
				style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
			>
				<Phone size={14} />
				<span>Позвонить</span>
			</a>

			<button
				type="button"
				className={`${btnCls} recall-action-btn--whatsapp`}
				title="WhatsApp шаблон"
				onClick={() => onWhatsApp(candidate)}
				data-testid={`recall-whatsapp-btn-${candidate.id}`}
			>
				<MessageCircle size={14} />
				<span>WhatsApp</span>
			</button>

			<button
				type="button"
				className={`${btnCls} recall-action-btn--book`}
				title="Записать пациента на прием в расписание"
				onClick={() => onBook(candidate)}
				data-testid={`recall-book-btn-${candidate.id}`}
			>
				<Calendar size={14} />
				<span>Записать</span>
			</button>

			<button
				type="button"
				className={btnCls}
				title="Связались — пациент уже записан на прием"
				style={{
					background: isScheduled ? "var(--color-success-bg, #ecfdf5)" : undefined,
					color: isScheduled ? "var(--color-success, #059669)" : undefined,
					borderColor: isScheduled ? "var(--color-success, #059669)" : undefined,
				}}
				onClick={() => onStatusUpdate(candidate.id, "scheduled")}
				data-testid={`recall-fast-scheduled-btn-${candidate.id}`}
			>
				<Check size={14} />
				<span>Записан</span>
			</button>

			<button
				type="button"
				className={`${btnCls} ${isRealPreviewActive ? "recall-action-btn--script active" : ""}`}
				title="Предпросмотр SMS и WhatsApp сообщений"
				onClick={() => onTogglePreview(candidate)}
				data-testid={`recall-quick-preview-btn-${candidate.id}`}
			>
				<Eye size={14} />
				<span>Превью</span>
			</button>

			<div style={{ position: "relative", display: "inline-block" }}>
				<button
					type="button"
					className={btnCls}
					title="Каналы связи и отложить визит"
					style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
					onClick={onToggleDropdown}
					data-testid={`recall-contact-menu-btn-${candidate.id}`}
					aria-expanded={isOpen}
				>
					<ChevronDown size={14} />
				</button>

				{isOpen && (
					<PatientRecallsDropdownMenu
						candidate={candidate} isScriptActive={isScriptActive}
						isRealPreviewActive={isRealPreviewActive} copiedCandidateId={copiedCandidateId}
						onToggleDropdown={onToggleDropdown} onWhatsApp={onWhatsApp} onTelegram={onTelegram}
						onCopySms={onCopySms} onTogglePreview={onTogglePreview} onToggleScript={onToggleScript}
						onStatusUpdate={onStatusUpdate} onPostpone={onPostpone}
					/>
				)}
			</div>
		</div>
	);
};
