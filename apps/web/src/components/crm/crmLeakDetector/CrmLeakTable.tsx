import type React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import type { CrmLeakLeadItem } from "@dental/shared";
import { CrmLeakTableRow } from "./CrmLeakTableRow";

interface Props {
	loading: boolean;
	leads: CrmLeakLeadItem[];
	onSelectLead: (lead: CrmLeakLeadItem) => void;
	onOpenWhatsApp: (lead: CrmLeakLeadItem) => void;
	onBookAppointment: (lead: CrmLeakLeadItem) => void;
	onOpenPatientWorkspace: (patientId: string) => void;
	onOpenScript: (lead: CrmLeakLeadItem) => void;
	onOpenContact: (lead: CrmLeakLeadItem) => void;
}

export const CrmLeakTable: React.FC<Props> = ({
	loading,
	leads,
	onSelectLead,
	onOpenWhatsApp,
	onBookAppointment,
	onOpenPatientWorkspace,
	onOpenScript,
	onOpenContact,
}) => {
	if (loading) {
		return (
			<div className="cld-empty-state">
				<RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[var(--teal)]" />
				<span>Загрузка пациентов...</span>
			</div>
		);
	}

	if (leads.length === 0) {
		return (
			<div className="cld-empty-state">
				<CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
				<span>Утечек пациентов не обнаружено. Все пациенты с визитами.</span>
			</div>
		);
	}

	return (
		<table className="cld-table w-full text-xs">
			<thead>
				<tr>
					<th>Пациент и телефон</th>
					<th>Без визита</th>
					<th>Врач</th>
					<th>Клинический риск</th>
					<th>Действия</th>
				</tr>
			</thead>
			<tbody>
				{leads.map((lead) => (
					<CrmLeakTableRow
						key={lead.id}
						lead={lead}
						onSelectLead={onSelectLead}
						onOpenWhatsApp={onOpenWhatsApp}
						onBookAppointment={onBookAppointment}
						onOpenPatientWorkspace={onOpenPatientWorkspace}
						onOpenScript={onOpenScript}
						onOpenContact={onOpenContact}
					/>
				))}
			</tbody>
		</table>
	);
};
