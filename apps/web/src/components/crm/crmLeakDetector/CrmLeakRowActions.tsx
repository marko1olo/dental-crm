import type React from "react";
import { Calendar, ExternalLink, FileText, MessageCircle, Phone, UserCheck } from "lucide-react";
import type { CrmLeakLeadItem } from "@dental/shared";

interface Props {
	lead: CrmLeakLeadItem;
	onOpenWhatsApp: (lead: CrmLeakLeadItem) => void;
	onBookAppointment: (lead: CrmLeakLeadItem) => void;
	onOpenPatientWorkspace: (patientId: string) => void;
	onOpenScript: (lead: CrmLeakLeadItem) => void;
	onOpenContact: (lead: CrmLeakLeadItem) => void;
}

export const CrmLeakRowActions: React.FC<Props> = ({
	lead,
	onOpenWhatsApp,
	onBookAppointment,
	onOpenPatientWorkspace,
	onOpenScript,
	onOpenContact,
}) => {
	const rawPhone = lead.phone || lead.patientPhone || "";
	const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<a href={`tel:${rawPhone.replace(/[^\d+]/g, "")}`} className="icon-button" title="Позвонить">
				<Phone size={12} className="text-[var(--teal)]" />
			</a>

			{cleanPhone && (
				<button type="button" className="icon-button" onClick={() => onOpenWhatsApp(lead)} title="WhatsApp">
					<MessageCircle size={12} className="text-emerald-600" />
				</button>
			)}

			<button
				type="button"
				className="secondary-button h-7 px-2 text-[11px]"
				onClick={() => onBookAppointment(lead)}
				title="Записать в расписание"
			>
				<Calendar size={11} />
				<span>Запись</span>
			</button>

			<button
				type="button"
				className="secondary-button h-7 px-2 text-[11px]"
				data-testid={`btn-open-workspace-${lead.id}`}
				onClick={() => onOpenPatientWorkspace(lead.patientId)}
				title="Открыть карту пациента"
			>
				<ExternalLink size={11} />
				<span>Карта</span>
			</button>

			{lead.aiReactivationSuggestion && (
				<button type="button" className="icon-button" onClick={() => onOpenScript(lead)} title="Скрипт звонка">
					<FileText size={12} />
				</button>
			)}

			<button type="button" className="icon-button" onClick={() => onOpenContact(lead)} title="Фиксация контакта">
				<UserCheck size={12} />
			</button>
		</div>
	);
};
