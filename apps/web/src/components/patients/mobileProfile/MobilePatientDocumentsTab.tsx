/**
 * DENTE CRM — Mobile Patient Documents Tab (Официальные документы)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Catalog of Legal Contracts, Consents (ИДС),
 * Tax Deduction Certificates (13%), and Medical Records Print.
 */

import type { Patient } from "@dental/shared";
import { ChevronRight, FileCheck, FileText, Printer, Shield } from "lucide-react";
import React from "react";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "../blankContractPrint";

export interface MobilePatientDocumentsTabProps {
	patient: Patient;
	onOpenTaxModal: () => void;
}

export const MobilePatientDocumentsTab: React.FC<MobilePatientDocumentsTabProps> = ({
	patient,
	onOpenTaxModal,
}) => {
	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-documents">
			<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
				Официальные документы и справки
			</h3>

			<div className="flex flex-col gap-2.5">
				{/* 1. Бланк договора */}
				<button
					type="button"
					onClick={() => void printBlankMedicalContract(patient)}
					className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
					data-testid="mobile-doc-contract-btn"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<FileText size={18} />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">
								Договор на оказание медицинских услуг
							</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Печать чистого бланка договора со строками ______
							</p>
						</div>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				{/* 2. Бланк ИДС */}
				<button
					type="button"
					onClick={() => void printBlankMedicalConsent(patient)}
					className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
					data-testid="mobile-doc-consent-btn"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<Shield size={18} />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">
								Информированное согласие (ИДС)
							</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Печать чистого бланка согласия со строками ______
							</p>
						</div>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				{/* 3. Справка для налогового вычета 13% */}
				<button
					type="button"
					onClick={onOpenTaxModal}
					className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
					data-testid="mobile-doc-tax-btn"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
							<FileCheck size={18} />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">
								Справка для налогового вычета (13%)
							</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Справка об оплате медицинских услуг (ФНС КНД 1151156)
							</p>
						</div>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				{/* 4. Медицинская карта (Печать) */}
				<button
					type="button"
					onClick={() => {
						if (typeof window !== "undefined") window.print();
					}}
					className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
					data-testid="mobile-doc-print-card-btn"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
							<Printer size={18} />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">
								Печать медицинской карты
							</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Полный экспорт карты приёма в PDF / печать
							</p>
						</div>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>
			</div>
		</div>
	);
};
