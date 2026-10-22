import type React from "react";
import { AlertTriangle, ExternalLink, User, X } from "lucide-react";
import type { CrmLeakLeadItem } from "@dental/shared";

interface Props {
	lead: CrmLeakLeadItem;
	onClose: () => void;
	onOpenPatientWorkspace: (patientId: string) => void;
}

export const CrmLeakInspectionCard: React.FC<Props> = ({
	lead,
	onClose,
	onOpenPatientWorkspace,
}) => {
	const rawPhone = lead.phone || lead.patientPhone || "";
	return (
		<div
			className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]"
			data-testid="cld-drawer-inspection-card"
		>
			<div className="flex items-center justify-between mb-3">
				<h3 className="m-0 text-base font-bold text-[var(--ink)] flex items-center gap-2">
					<User size={16} className="text-[var(--teal)]" />
					<span>Карточка утечки: {lead.patientFullName}</span>
				</h3>
				<button
					type="button"
					className="icon-button"
					onClick={onClose}
					title="Закрыть"
				>
					<X size={15} />
				</button>
			</div>

			<div className="space-y-2.5 text-xs">
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
					<span className="text-[var(--muted)] font-semibold">Телефон:</span>
					<a
						href={`tel:${rawPhone.replace(/[^\d+]/g, "")}`}
						className="font-bold text-[var(--teal)] hover:underline"
					>
						{rawPhone || "Не указан"}
					</a>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
						<span className="text-[var(--muted)] block font-semibold mb-0.5">Без визита:</span>
						<span className="text-sm font-bold text-amber-600">
							{lead.daysSinceLastVisit} дн.
						</span>
					</div>
					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
						<span className="text-[var(--muted)] block font-semibold mb-0.5">Лечащий врач:</span>
						<span className="font-semibold text-[var(--ink)] block">
							{lead.lastDoctorName || "Не назначен"}
						</span>
					</div>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block font-semibold mb-0.5">Клинический риск:</span>
					<p className="m-0 text-[var(--ink)] leading-relaxed">
						{lead.clinicalRiskReason}
					</p>
					{lead.hasUncompletedPlan && (
						<div className="cld-plan-alert mt-2">
							<AlertTriangle size={12} />
							<span>Брошенный план: {lead.uncompletedPlanSumRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-2">
					<button type="button" className="secondary-button" onClick={onClose}>
						Закрыть
					</button>
					<button
						type="button"
						className="primary-button"
						data-testid="cld-drawer-open-patient-workspace-btn"
						onClick={() => onOpenPatientWorkspace(lead.patientId)}
					>
						<ExternalLink size={14} />
						<span>Открыть карту пациента</span>
					</button>
				</div>
			</div>
		</div>
	);
};
