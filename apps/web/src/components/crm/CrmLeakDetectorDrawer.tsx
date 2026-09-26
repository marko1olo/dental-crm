import type React from "react";
import { Check, Copy, MessageCircle, Phone, X } from "lucide-react";
import {
	type CrmDeclineReason,
	type CrmLeakLeadItem,
	DECLINE_REASON_LABELS_RU,
} from "@dental/shared";

interface Props {
	activeScriptLead: CrmLeakLeadItem | null;
	copiedScript: boolean;
	onCopyScript: (text: string) => void;
	onCloseScript: () => void;

	contactModalLead: CrmLeakLeadItem | null;
	contactChannel: "call" | "whatsapp" | "telegram" | "sms";
	onSetContactChannel: (
		channel: "call" | "whatsapp" | "telegram" | "sms",
	) => void;
	contactNotes: string;
	onSetContactNotes: (notes: string) => void;
	onSaveContact: () => void;
	onCloseContact: () => void;

	declineModalLead: CrmLeakLeadItem | null;
	declineReason: CrmDeclineReason;
	onSetDeclineReason: (reason: CrmDeclineReason) => void;
	declineComment: string;
	onSetDeclineComment: (comment: string) => void;
	onSaveDecline: () => void;
	onCloseDecline: () => void;
}

export const CrmLeakDetectorDrawer: React.FC<Props> = ({
	activeScriptLead,
	copiedScript,
	onCopyScript,
	onCloseScript,
	contactModalLead,
	contactChannel,
	onSetContactChannel,
	contactNotes,
	onSetContactNotes,
	onSaveContact,
	onCloseContact,
	declineModalLead,
	declineReason,
	onSetDeclineReason,
	declineComment,
	onSetDeclineComment,
	onSaveDecline,
	onCloseDecline,
}) => {
	if (!activeScriptLead && !contactModalLead && !declineModalLead) {
		return null;
	}

	return (
		<div className="cld-drawer-backdrop" role="region" aria-label="Панель действий">
			{/* Drawer: Script Preview */}
			{activeScriptLead && (
				<div className="cld-drawer-card">
					<div className="cld-header">
						<h3 className="cld-title">
							<MessageCircle size={16} className="text-blue-600" />
							Скрипт реактивации: {activeScriptLead.patientFullName}
						</h3>
						<button
							type="button"
							className="cld-btn-close"
							onClick={onCloseScript}
						>
							<X size={16} />
						</button>
					</div>
					<div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
						<div className="text-xs text-slate-500 mb-2 font-medium">
							Персонализированный текст для администратора / сообщения:
						</div>
						<div
							style={{
								whiteSpace: "pre-wrap",
								background: "var(--paper-strong, #f8fafc)",
								padding: "12px",
								borderRadius: "6px",
								border: "1px solid var(--border, #e2e8f0)",
								fontSize: "13px",
								lineHeight: "1.5",
							}}
						>
							{activeScriptLead.aiReactivationSuggestion}
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<button
								type="button"
								className="cld-btn-sync"
								onClick={() =>
									onCopyScript(activeScriptLead.aiReactivationSuggestion)
								}
							>
								{copiedScript ? <Check size={14} /> : <Copy size={14} />}
								{copiedScript ? "Скопировано!" : "Скопировать текст"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Drawer: Contact Recording */}
			{contactModalLead && (
				<div className="cld-drawer-card">
					<div className="cld-header">
						<h3 className="cld-title">
							<Phone size={16} className="text-blue-600" />
							Зафиксировать контакт: {contactModalLead.patientFullName}
						</h3>
						<button
							type="button"
							className="cld-btn-close"
							onClick={onCloseContact}
						>
							<X size={16} />
						</button>
					</div>
					<div
						style={{
							padding: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
							flex: 1,
						}}
					>
						<div>
							<label className="text-xs font-semibold text-slate-600 block mb-1">
								Канал связи:
							</label>
							<select
								className="cld-filter-select w-full"
								value={contactChannel}
								onChange={(e) => onSetContactChannel(e.target.value as any)}
							>
								<option value="call">Телефонный звонок</option>
								<option value="whatsapp">WhatsApp сообщение</option>
								<option value="telegram">Telegram</option>
								<option value="sms">SMS</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-semibold text-slate-600 block mb-1">
								Результат контакта (заметка администратора):
							</label>
							<textarea
								rows={4}
								className="w-full p-2 border border-slate-300 rounded text-sm"
								placeholder="Дозвонились, пациент думает над датой / предложена гигиена в субботу..."
								value={contactNotes}
								onChange={(e) => onSetContactNotes(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2 mt-auto pt-4">
							<button
								type="button"
								className="cld-action-btn"
								onClick={onCloseContact}
							>
								Отмена
							</button>
							<button
								type="button"
								className="cld-btn-sync"
								onClick={onSaveContact}
							>
								Сохранить результат
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Drawer: Decline Confirmation */}
			{declineModalLead && (
				<div className="cld-drawer-card">
					<div className="cld-header">
						<h3 className="cld-title text-red-600">
							<X size={16} />
							Причина отказа: {declineModalLead.patientFullName}
						</h3>
						<button
							type="button"
							className="cld-btn-close"
							onClick={onCloseDecline}
						>
							<X size={16} />
						</button>
					</div>
					<div
						style={{
							padding: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
							flex: 1,
						}}
					>
						<div>
							<label className="text-xs font-semibold text-slate-600 block mb-1">
								Регламентированная причина отказа:
							</label>
							<select
								className="cld-filter-select w-full"
								value={declineReason}
								onChange={(e) => onSetDeclineReason(e.target.value as any)}
							>
								{Object.entries(DECLINE_REASON_LABELS_RU).map(
									([code, label]) => (
										<option key={code} value={code}>
											{label}
										</option>
									),
								)}
							</select>
						</div>
						<div>
							<label className="text-xs font-semibold text-slate-600 block mb-1">
								Комментарий (детали отказа):
							</label>
							<textarea
								rows={3}
								className="w-full p-2 border border-slate-300 rounded text-sm"
								placeholder="Пояснение пациента..."
								value={declineComment}
								onChange={(e) => onSetDeclineComment(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2 mt-auto pt-4">
							<button
								type="button"
								className="cld-action-btn"
								onClick={onCloseDecline}
							>
								Отмена
							</button>
							<button
								type="button"
								className="cld-btn-sync"
								style={{ background: "#dc2626" }}
								onClick={onSaveDecline}
							>
								Подтвердить отказ
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
