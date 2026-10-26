import React from "react";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { formatKopecksRu, type PlanToInvoiceValidationReport } from "@dental/shared";

export interface InvoiceGenerationFooterProps {
	readonly report: PlanToInvoiceValidationReport;
	readonly adminOverrideAuthorized: boolean;
	readonly adminStaffName: string;
	readonly onDoctorClinicalOverride: () => void;
	readonly onOpenAdminPinDrawer?: (() => void) | undefined;
	readonly onCreateInvoice: () => void;
	readonly isSubmitting: boolean;
	readonly isCreatingAddendum: boolean;
	readonly unapprovedItemsCount: number;
	readonly documentType: "invoice" | "work_order" | "completed_act";
}

export const InvoiceGenerationFooter: React.FC<InvoiceGenerationFooterProps> = ({
	report, adminOverrideAuthorized, adminStaffName, onDoctorClinicalOverride,
	onCreateInvoice, isSubmitting, isCreatingAddendum,
	unapprovedItemsCount, documentType,
}) => {
	return (
		<footer className="flex items-center justify-between px-6 py-4 bg-[var(--paper)] border-t border-[var(--line)]">
			<div className="flex items-center gap-6">
				<div>
					<div className="text-[11px] text-[var(--ink-muted)]">Стоимость по смете:</div>
					<div className="text-sm font-medium text-[var(--ink)]">{formatKopecksRu(report.originalPlanNetKopecks)}</div>
				</div>
				{report.totalClinicAbsorptionKopecks > 0 && (
					<div>
						<div className="text-[11px] text-emerald-600 dark:text-emerald-400">Гарантия клиники:</div>
						<div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">-{formatKopecksRu(report.totalClinicAbsorptionKopecks)}</div>
					</div>
				)}
				<div>
					<div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-wider font-semibold">Итого к списанию:</div>
					<div className="text-xl font-black text-teal-600 dark:text-teal-400">{formatKopecksRu(report.effectiveInvoiceNetKopecks)}</div>
				</div>
			</div>
			<div className="flex items-center gap-3">
				{!adminOverrideAuthorized ? (
					<button type="button" onClick={onDoctorClinicalOverride} data-testid="doctor-override-footer-btn" className="px-3.5 py-2 min-h-[36px] sm:min-h-[44px] rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer" title="Согласовать цены под личную клиническую ответственность врача (Мандат 8e)">
						<ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" /> Согласовать врачом (1 клик)
					</button>
				) : (
					<span data-testid="override-authorized-badge" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
						<CheckCircle2 size={14} /> Согласовано: {adminStaffName}
					</span>
				)}
				<button type="button" onClick={onCreateInvoice} data-testid="create-invoice-submit-btn" disabled={isSubmitting || isCreatingAddendum} className="px-6 py-2.5 min-h-[36px] sm:min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95 cursor-pointer">
					<FileText size={16} />
					{isSubmitting || isCreatingAddendum ? "Формирование..." : documentType === "work_order" ? "Оформить наряд-заказ" : documentType === "completed_act" ? "Сформировать акт" : "Выписать счет на оплату"}
				</button>
			</div>
		</footer>
	);
};
