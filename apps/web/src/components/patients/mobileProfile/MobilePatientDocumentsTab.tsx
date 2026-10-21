/**
 * DENTE CRM — Mobile Patient Documents Tab (Официальные документы)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, Mandate 8b <= 120 lines)
 */

import type { Patient } from "@dental/shared";
import { ChevronRight, FileCheck, FileText, Printer, Shield } from "lucide-react";
import React from "react";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";

export interface MobilePatientDocumentsTabProps {
	patient: Patient;
	onOpenTaxModal: () => void;
}

export const MobilePatientDocumentsTab: React.FC<MobilePatientDocumentsTabProps> = ({
	patient,
	onOpenTaxModal,
}) => {
	const docItems = [
		{
			title: "Договор на оказание медицинских услуг",
			desc: "Печать чистого бланка договора со строками ______",
			icon: FileText,
			iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
			onClick: () => void printBlankMedicalContract(patient),
			testId: "mobile-doc-contract-btn",
		},
		{
			title: "Информированное согласие (ИДС)",
			desc: "Печать чистого бланка согласия со строками ______",
			icon: Shield,
			iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
			onClick: () => void printBlankMedicalConsent(patient),
			testId: "mobile-doc-consent-btn",
		},
		{
			title: "Справка для налогового вычета (13%)",
			desc: "Справка об оплате медицинских услуг (ФНС КНД 1151156)",
			icon: FileCheck,
			iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
			onClick: onOpenTaxModal,
			testId: "mobile-doc-tax-btn",
		},
		{
			title: "Печать медицинской карты",
			desc: "Полный экспорт карты приёма в PDF / печать",
			icon: Printer,
			iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
			onClick: () => { if (typeof window !== "undefined") window.print(); },
			testId: "mobile-doc-print-card-btn",
		},
	];

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-documents">
			<h3 className="text-xs font-bold text-[var(--muted)] m-0">Официальные документы и справки</h3>
			<div className="flex flex-col gap-2.5">
				{docItems.map((item) => {
					const Icon = item.icon;
					return (
						<button
							key={item.testId}
							type="button"
							onClick={item.onClick}
							className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
							data-testid={item.testId}
						>
							<div className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
									<Icon size={18} />
								</div>
								<div>
									<h4 className="text-xs font-bold text-[var(--ink)] m-0">{item.title}</h4>
									<p className="text-[11px] text-[var(--muted)] m-0">{item.desc}</p>
								</div>
							</div>
							<ChevronRight size={16} className="text-[var(--muted)]" />
						</button>
					);
				})}
			</div>
		</div>
	);
};
MobilePatientDocumentsTab.displayName = "MobilePatientDocumentsTab";
