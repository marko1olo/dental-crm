import React from "react";
import type { DocumentKind } from "@dental/shared";
import { FileCheck, FileText, Receipt, ShieldCheck } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";

export function MobileDocumentItemIcon({ kind }: { kind: DocumentKind }) {
	if (kind === "paid_medical_services_contract") {
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
				<FileText size={18} aria-hidden="true" />
			</div>
		);
	}
	if (kind === "informed_consent" || kind === "procedure_specific_consent_packet" || kind === "personal_data_processing_consent") {
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600 dark:text-teal-400">
				<ShieldCheck size={18} aria-hidden="true" />
			</div>
		);
	}
	if (kind === "completed_works_act") {
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
				<FileCheck size={18} aria-hidden="true" />
			</div>
		);
	}
	if (kind === "tax_deduction_certificate" || kind === "payment_invoice" || kind === "payment_receipt") {
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
				<Receipt size={18} aria-hidden="true" />
			</div>
		);
	}
	if (kind === "dental_medical_card_043u" || kind === "orthodontic_medical_card_043_1u") {
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
				<DentalForm043 size={18} aria-hidden="true" />
			</div>
		);
	}
	return (
		<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-slate-500/10 text-slate-600 dark:text-slate-400">
			<FileText size={18} aria-hidden="true" />
		</div>
	);
}
