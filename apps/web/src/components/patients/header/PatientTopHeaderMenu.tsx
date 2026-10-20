import React, { useEffect, useRef } from "react";
import { Check, Edit3, FileText, Gift, Save, ShieldCheck, Users } from "lucide-react";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";

export interface PatientTopHeaderMenuProps {
	readonly selectedPatient: any;
	readonly onClose: () => void;
	readonly onSave: () => void;
	readonly onOpenCard: () => void;
	readonly onOpenLoyalty: () => void;
	readonly onSomaticNorm: () => void;
}

export function PatientTopHeaderMenu({
	selectedPatient,
	onClose,
	onSave,
	onOpenCard,
	onOpenLoyalty,
	onSomaticNorm,
}: PatientTopHeaderMenuProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [onClose]);

	const handleOpenFamily = () => {
		onClose();
		if (selectedPatient?.id) {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", { detail: { patientId: selectedPatient.id } }),
			);
		}
	};

	const itemCls = "w-full px-2.5 py-2.5 min-h-[44px] sm:min-h-[36px] sm:py-2 rounded-lg text-left font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors";

	return (
		<div
			ref={ref}
			className="absolute right-0 top-full mt-1.5 w-60 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
			data-testid="header-actions-menu-popover"
		>
			<button type="button" onClick={() => { onClose(); onSave(); }} className={itemCls} data-testid="patient-core-save-btn">
				<Save size={13} className="text-[var(--teal)] shrink-0" />
				<span>Сохранить изменения</span>
			</button>
			<button type="button" onClick={() => { onClose(); onSomaticNorm(); }} className={itemCls} data-testid="patient-card-somatic-norm-btn">
				<Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>✓ Соматически здоров (Норма)</span>
			</button>
			<button type="button" onClick={() => { onClose(); onOpenCard(); }} className={itemCls} data-testid="header-edit-patient-btn">
				<Edit3 size={13} className="text-[var(--teal)] shrink-0" />
				<span>Медицинская карта приёма</span>
			</button>
			<button type="button" onClick={() => { onClose(); onOpenLoyalty(); }} className={itemCls}>
				<Gift size={13} className="text-amber-500 shrink-0" />
				<span>Программа лояльности</span>
			</button>
			<button type="button" onClick={handleOpenFamily} className={itemCls} data-testid="header-open-family-btn">
				<Users size={13} className="text-indigo-500 shrink-0" />
				<span>Семейный счёт и баланс</span>
			</button>
			<div className="h-px bg-[var(--line)] my-0.5" />
			<button type="button" onClick={() => { onClose(); void printBlankMedicalContract(selectedPatient); }} className={itemCls} data-testid="header-print-blank-contract-btn">
				<FileText size={13} className="text-[var(--muted)] shrink-0" />
				<span>Печать договора</span>
			</button>
			<button type="button" onClick={() => { onClose(); void printBlankMedicalConsent(selectedPatient); }} className={itemCls} data-testid="header-print-blank-consent-btn">
				<ShieldCheck size={13} className="text-[var(--muted)] shrink-0" />
				<span>Печать согласия ИДС</span>
			</button>
		</div>
	);
}
