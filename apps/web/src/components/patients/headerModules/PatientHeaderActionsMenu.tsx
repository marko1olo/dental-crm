import { Archive, CreditCard, Edit3, FileText, GitMerge, HeartPulse, MessageSquare, Printer, Sparkles, UserCheck } from "lucide-react";
import React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";

export interface PatientHeaderActionsMenuProps {
	readonly resolvedPatient: any;
	readonly fullName: string;
	readonly phone: string;
	readonly clinicLegalName?: string | undefined;
	readonly onOpenAnamnesis?: (() => void) | undefined;
	readonly onEditPatient?: (() => void) | undefined;
	readonly onOpenFamilyWallet: () => void;
	readonly onClose: () => void;
}

export const PatientHeaderActionsMenu: React.FC<PatientHeaderActionsMenuProps> = ({
	resolvedPatient, fullName, phone, clinicLegalName, onOpenAnamnesis, onEditPatient, onOpenFamilyWallet, onClose,
}) => {
	const pid = resolvedPatient?.id;
	const openPlan = () => { onClose(); window.dispatchEvent(new CustomEvent("dente:open-treatment-plan", { bubbles: true, detail: { patientId: pid } })); showToast(`План лечения: ${fullName}`, "info"); };
	const printCard = () => { onClose(); window.print(); showToast("Печать карты", "info"); };
	const openCash = () => { onClose(); if (pid) usePatientStore.getState().setSelectedPatientId(pid); window.dispatchEvent(new CustomEvent("dente:open-payment-modal", { detail: { patientId: pid, patientName: fullName, patientPhone: resolvedPatient?.phone, amountRub: 15400 } })); };
	const mergeDuplicates = () => { onClose(); window.dispatchEvent(new CustomEvent("dente-open-duplicate-merge-modal", { detail: { patientId: pid } })); showToast("Проверка слияния дубликатов", "info"); };
	const sendWhatsApp = () => { onClose(); openWhatsAppChat(phone, `Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`); };

	const items = [
		{ testId: "header-treatment-plan-btn", Icon: Sparkles, cls: "text-teal-600 dark:text-teal-400", label: "План лечения", action: openPlan },
		{ testId: "header-export-043u-btn", Icon: Printer, cls: "text-teal-600 dark:text-teal-400", label: "Печать карты", action: printCard },
		{ testId: "header-finance-btn", Icon: CreditCard, cls: "text-emerald-600", label: "Принять оплату (Касса)", action: openCash },
		{ testId: "header-family-balance-btn", Icon: UserCheck, cls: "text-indigo-600", label: "Семейный баланс", action: () => { onClose(); onOpenFamilyWallet(); } },
		{ testId: "header-print-blank-contract-btn", Icon: FileText, cls: "text-amber-600", label: "Бланк договора (_______)", action: () => { onClose(); void printBlankMedicalContract(resolvedPatient, { clinicName: clinicLegalName }); } },
		{ testId: "header-print-blank-consent-btn", Icon: FileText, cls: "text-teal-600", label: "Бланк ИДС / согласий (_______)", action: () => { onClose(); void printBlankMedicalConsent(resolvedPatient, { clinicName: clinicLegalName }); } },
		...(onOpenAnamnesis ? [{ testId: "header-anamnesis-btn", Icon: HeartPulse, cls: "text-rose-500", label: "Анамнез", action: () => { onClose(); onOpenAnamnesis(); } }] : []),
		{ testId: "header-merge-duplicates-btn", Icon: GitMerge, cls: "text-indigo-600 dark:text-indigo-400", label: "Объединить дубликаты", action: mergeDuplicates },
		...(phone ? [{ testId: "header-whatsapp-btn", Icon: MessageSquare, cls: "text-emerald-600 dark:text-emerald-400", label: "WhatsApp", action: sendWhatsApp }] : []),
		...(onEditPatient ? [{ testId: "header-edit-patient-btn", Icon: Edit3, cls: "text-[var(--muted)]", label: "Изменить", action: () => { onClose(); onEditPatient(); } }] : []),
		{ testId: "header-archive-btn", Icon: Archive, cls: "text-rose-500", label: "В архив / Деактивация", action: () => { onClose(); showToast(`Карта пациента ${fullName} перемещена в архив`, "info"); } },
	];

	return (
		<div className="absolute right-0 top-full mt-1.5 w-64 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-95 duration-100" data-testid="header-actions-menu-popover">
			{items.map((it) => (
				<button key={it.testId} type="button" onClick={it.action} data-testid={it.testId} className="w-full h-8 px-2.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left">
					<it.Icon size={14} className={`${it.cls} shrink-0`} />
					<span className="truncate">{it.label}</span>
				</button>
			))}
		</div>
	);
};
