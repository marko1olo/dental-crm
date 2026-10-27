import type { Patient } from "@dental/shared";
import {
	Archive,
	Calendar,
	Camera,
	Check,
	FileText,
	Gift,
	Receipt,
	ShieldCheck,
} from "lucide-react";
import React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";
import { ActionMenuItem } from "./ActionMenuItem";

interface SecondaryActionsDropdownListProps {
	readonly selectedPatient: Patient | null | undefined;
	readonly patientBalance: number;
	readonly onClose: () => void;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly executePatientSomaticNorm: () => void;
	readonly executeBookAppointment: () => void;
}

export function SecondaryActionsDropdownList({
	selectedPatient,
	patientBalance,
	onClose,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	executePatientSomaticNorm,
	executeBookAppointment,
}: SecondaryActionsDropdownListProps) {
	const handleFinanceClick = () => {
		onClose();
		if (selectedPatient?.id) {
			usePatientStore.getState().setSelectedPatientId(selectedPatient.id);
		}
		useAppStore.getState().setCurrentView("finance");
		showToast(`Открыты счета и касса: ${selectedPatient?.fullName || ""}`, "info");
	};

	const handleImagingClick = () => {
		onClose();
		if (selectedPatient?.id) {
			usePatientStore.getState().setSelectedPatientId(selectedPatient.id);
		}
		useAppStore.getState().setCurrentView("imaging");
		showToast(`Рентген и КТ снимки: ${selectedPatient?.fullName || ""}`, "info");
	};

	const handleArchiveClick = () => {
		onClose();
		if (!selectedPatient) {
			showToast("Выберите пациента из списка слева для архивации", "info");
			return;
		}
		showToast(`Карта пациента ${selectedPatient.fullName} перемещена в архив`, "success");
	};

	const balanceBadge = (
		<span
			data-testid="patient-quick-balance-btn"
			className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
				patientBalance > 0
					? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
					: patientBalance < 0
						? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
						: "text-[var(--muted)]"
			}`}
		>
			{patientBalance > 0 ? `+${patientBalance.toLocaleString("ru-RU")} ₽` : patientBalance < 0 ? `-${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽` : "0 ₽"}
		</span>
	);

	return (
		<div
			className="patient-actions-dropdown absolute left-0 top-[calc(100%+4px)] z-50 min-w-[250px] shadow-xl bg-[var(--paper)] border border-[var(--line)] rounded-xl p-1 flex flex-col gap-0.5"
		>
			<ActionMenuItem icon={<Check size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Соматически здоров (Норма)" onClick={() => { onClose(); executePatientSomaticNorm(); }} testId="patient-card-somatic-norm-btn" />
			<ActionMenuItem icon={<Calendar size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Записать в расписание" onClick={() => { onClose(); executeBookAppointment(); }} testId="patient-card-book-appointment-btn" />
			<ActionMenuItem icon={<FileText size={14} className="text-[var(--muted)] shrink-0" />} label="Печать договора" onClick={() => { onClose(); void printBlankMedicalContract(selectedPatient); }} testId="patient-card-print-contract-btn" />
			<ActionMenuItem icon={<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Печать согласия на лечение" onClick={() => { onClose(); void printBlankMedicalConsent(selectedPatient); }} testId="patient-card-print-consent-btn" />
			<ActionMenuItem icon={<FileText size={14} className="text-[var(--teal)] shrink-0" />} label="Медицинская карта" onClick={() => { onClose(); onOpenPatientCardModal(); }} testId="open-patient-card-modal-btn" />
			<ActionMenuItem icon={<Receipt size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Счета и касса" onClick={handleFinanceClick} testId="patient-card-finance-btn" badge={balanceBadge} />
			<ActionMenuItem icon={<Camera size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Рентген и КТ снимки" onClick={handleImagingClick} testId="patient-card-radiology-btn" />
			<ActionMenuItem icon={<Gift size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />} label="Программа лояльности" onClick={() => { onClose(); onOpenLoyaltyModal(); }} testId="open-loyalty-program-modal-btn" />
			<ActionMenuItem icon={<Archive size={14} className="text-[var(--muted)] shrink-0" />} label="В архив" onClick={handleArchiveClick} testId="archive-patient-card-btn" />
		</div>
	);
}
