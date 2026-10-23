import type React from "react";
import { AlertTriangle, Phone, XCircle } from "lucide-react";
import { type CrmDeclineReason, type CrmLeakLeadItem, DECLINE_REASON_LABELS_RU } from "@dental/shared";
import { CrmLeakRowActions } from "./CrmLeakRowActions";

interface Props {
	lead: CrmLeakLeadItem;
	onSelectLead: (lead: CrmLeakLeadItem) => void;
	onOpenWhatsApp: (lead: CrmLeakLeadItem) => void;
	onBookAppointment: (lead: CrmLeakLeadItem) => void;
	onOpenPatientWorkspace: (patientId: string) => void;
	onOpenScript: (lead: CrmLeakLeadItem) => void;
	onOpenContact: (lead: CrmLeakLeadItem) => void;
}

export const CrmLeakTableRow: React.FC<Props> = ({
	lead,
	onSelectLead,
	onOpenWhatsApp,
	onBookAppointment,
	onOpenPatientWorkspace,
	onOpenScript,
	onOpenContact,
}) => {
	return (
		<tr>
			<td>
				<button
					type="button"
					className="cld-patient-title-btn text-left font-bold text-[var(--ink)] hover:text-[var(--teal)] hover:underline cursor-pointer"
					data-testid={`lead-patient-link-${lead.id}`}
					onClick={() => onSelectLead(lead)}
					title={`Карточка утечки: ${lead.patientFullName}`}
				>
					{lead.patientFullName}
				</button>
				<div className="cld-phone-row text-[11px] text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
					<Phone size={11} />
					<span>{lead.phone}</span>
				</div>
			</td>

			<td>
				<span className="font-bold text-amber-600">{lead.daysSinceLastVisit} дн.</span>
			</td>

			<td>
				<span className="font-medium text-[var(--ink)]">{lead.lastDoctorName || "—"}</span>
			</td>

			<td>
				<div className="text-[11.5px] leading-snug text-[var(--ink)]">
					{lead.clinicalRiskReason}
				</div>
				{lead.declineReason && (
					<div className="cld-decline-badge mt-1 inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
						<XCircle size={11} />
						<span>Срыв: {DECLINE_REASON_LABELS_RU[lead.declineReason as CrmDeclineReason] || lead.declineReason}</span>
					</div>
				)}
				{lead.hasUncompletedPlan && (
					<div className="cld-plan-alert mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600">
						<AlertTriangle size={11} />
						<span>{lead.uncompletedPlanSumRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
			</td>

			<td>
				<CrmLeakRowActions
					lead={lead}
					onOpenWhatsApp={onOpenWhatsApp}
					onBookAppointment={onBookAppointment}
					onOpenPatientWorkspace={onOpenPatientWorkspace}
					onOpenScript={onOpenScript}
					onOpenContact={onOpenContact}
				/>
			</td>
		</tr>
	);
};
