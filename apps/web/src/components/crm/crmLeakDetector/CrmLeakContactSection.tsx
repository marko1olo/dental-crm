import type React from "react";
import { Phone, X } from "lucide-react";
import type { CrmLeakLeadItem } from "@dental/shared";

interface Props {
	lead: CrmLeakLeadItem;
	channel: "call" | "whatsapp" | "telegram" | "sms";
	onChannelChange: (channel: "call" | "whatsapp" | "telegram" | "sms") => void;
	notes: string;
	onNotesChange: (notes: string) => void;
	onSave: () => void;
	onClose: () => void;
}

export const CrmLeakContactSection: React.FC<Props> = ({
	lead,
	channel,
	onChannelChange,
	notes,
	onNotesChange,
	onSave,
	onClose,
}) => {
	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center justify-between mb-2">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<Phone size={15} className="text-[var(--teal)]" />
					<span>Фиксация контакта: {lead.patientFullName}</span>
				</h4>
				<button type="button" className="icon-button" onClick={onClose}>
					<X size={14} />
				</button>
			</div>
			<div className="space-y-3">
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Канал связи:
					</label>
					<select
						className="cld-filter-select w-full"
						value={channel}
						onChange={(e) => onChannelChange(e.target.value as any)}
					>
						<option value="call">Телефонный звонок</option>
						<option value="whatsapp">WhatsApp сообщение</option>
						<option value="telegram">Telegram</option>
						<option value="sms">SMS</option>
					</select>
				</div>
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Результат контакта:
					</label>
					<textarea
						rows={3}
						className="w-full p-2 border border-[var(--line)] rounded-lg text-xs bg-[var(--paper)] text-[var(--ink)]"
						placeholder="Дозвонились, пациент планирует гигиену в субботу..."
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
					/>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<button type="button" className="secondary-button" onClick={onClose}>
						Отмена
					</button>
					<button type="button" className="primary-button" onClick={onSave}>
						Сохранить контакт
					</button>
				</div>
			</div>
		</div>
	);
};
