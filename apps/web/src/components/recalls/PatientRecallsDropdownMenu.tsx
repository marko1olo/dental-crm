import type React from "react";
import { Check, Clock, Eye, MessageCircle, PhoneCall, Send } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface PatientRecallsDropdownMenuProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive: boolean;
	readonly isRealPreviewActive: boolean;
	readonly copiedCandidateId: string | null;
	readonly onToggleDropdown: () => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsDropdownMenu: React.FC<PatientRecallsDropdownMenuProps> = ({
	candidate,
	isScriptActive,
	isRealPreviewActive,
	copiedCandidateId,
	onToggleDropdown,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onTogglePreview,
	onToggleScript,
	onStatusUpdate,
	onPostpone,
}) => {
	const btnCls = "dente-btn recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";

	return (
		<div
			className="recall-contact-dropdown-menu"
			style={{
				display: "flex", position: "absolute", right: 0, top: "100%", zIndex: 50,
				flexDirection: "column", gap: "4px", padding: "6px", marginTop: "4px",
				background: "var(--rm-surface, var(--paper))", border: "1px solid var(--rm-border, var(--line))",
				borderRadius: "8px", boxShadow: "var(--shadow-3)", minWidth: "180px",
			}}
		>
			<button type="button" className={`${btnCls} recall-action-btn--whatsapp`} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { onToggleDropdown(); void onWhatsApp(candidate); }} data-testid={`recall-whatsapp-btn-${candidate.id}`}>
				<MessageCircle size={15} /> <span>WhatsApp</span>
			</button>
			<button type="button" className={`${btnCls} recall-action-btn--telegram`} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { onToggleDropdown(); void onTelegram(candidate); }} data-testid={`recall-telegram-btn-${candidate.id}`}>
				<Send size={15} /> <span>Telegram</span>
			</button>
			<button type="button" className={btnCls} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { onToggleDropdown(); onCopySms(candidate); }} data-testid={`recall-sms-btn-${candidate.id}`}>
				{copiedCandidateId === candidate.id ? <span><Check size={14} /> Скопировано</span> : <span>SMS</span>}
			</button>
			<button type="button" className={`${btnCls} ${isRealPreviewActive ? "active" : ""}`} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { onToggleDropdown(); onTogglePreview(candidate); }} data-testid={`recall-preview-btn-${candidate.id}`}>
				<Eye size={15} /> <span>Превью SMS / WA</span>
			</button>
			<button type="button" className={`${btnCls} recall-action-btn--script ${isScriptActive ? "active" : ""}`} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { onToggleDropdown(); onToggleScript(candidate); }} data-testid={`recall-script-btn-${candidate.id}`}>
				<PhoneCall size={15} /> <span>Скрипт</span>
			</button>
			<div style={{ height: "1px", background: "var(--rm-border, var(--line))", margin: "4px 0" }} />
			<button type="button" className={btnCls} style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }} onClick={() => { onToggleDropdown(); onPostpone ? onPostpone(candidate, "2_weeks") : onStatusUpdate(candidate.id, "declined"); }} data-testid={`recall-postpone-2w-btn-${candidate.id}`}>
				<Clock size={14} /> <span>Отложить на 2 недели</span>
			</button>
			<button type="button" className={btnCls} style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.8125rem" }} onClick={() => { onToggleDropdown(); onPostpone ? onPostpone(candidate, "1_month") : onStatusUpdate(candidate.id, "declined"); }} data-testid={`recall-postpone-1m-btn-${candidate.id}`}>
				<Clock size={14} /> <span>Отложить на 1 месяц</span>
			</button>
		</div>
	);
};
