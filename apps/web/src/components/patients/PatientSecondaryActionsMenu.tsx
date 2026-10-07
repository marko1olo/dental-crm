import type { Patient } from "@dental/shared";
import {
	Archive,
	Calendar,
	Camera,
	Check,
	FileText,
	Gift,
	MoreHorizontal,
	Receipt,
	ShieldCheck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "./blankContractPrint";

export interface PatientSecondaryActionsMenuProps {
	readonly selectedPatient: Patient | null | undefined;
	readonly patientBalance: number;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly executePatientSomaticNorm: () => void;
	readonly executeBookAppointment: () => void;
}

export function PatientSecondaryActionsMenu({
	selectedPatient,
	patientBalance,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	executePatientSomaticNorm,
	executeBookAppointment,
}: PatientSecondaryActionsMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div ref={menuRef} className="relative inline-block shrink-0">
			<button
				type="button"
				className="patient-card-more-btn min-h-[44px] sm:min-h-[36px] sm:h-9 sm:w-9 w-9 h-9 p-0 rounded-lg text-xs font-bold inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] hover:border-[var(--teal)] text-[var(--ink)] border border-[var(--line)]"
				onClick={() => setIsOpen((v) => !v)}
				title="Дополнительные действия с пациентом"
				aria-label="Дополнительные действия с пациентом"
				aria-haspopup="true"
				aria-expanded={isOpen}
				data-testid="patient-card-more-actions-btn"
			>
				<MoreHorizontal size={16} aria-hidden="true" />
			</button>

			{isOpen && (
				<div
					className="patient-actions-dropdown"
					style={{
						position: "absolute",
						left: 0,
						top: "calc(100% + 4px)",
						zIndex: 100,
						minWidth: "250px",
						boxShadow: "var(--shadow-3, 0 10px 25px -5px rgba(0,0,0,0.15))",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "10px",
						padding: "4px",
						display: "flex",
						flexDirection: "column",
						gap: "2px",
					}}
				>
					{/* 1. Соматическая норма */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							executePatientSomaticNorm();
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Установить соматическую норму"
						data-testid="patient-card-somatic-norm-btn"
					>
						<Check
							size={14}
							className="text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span>Соматически здоров (Норма)</span>
					</button>

					{/* 2. Записать в расписание */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							executeBookAppointment();
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Записать выбранного пациента в расписание"
						data-testid="patient-card-book-appointment-btn"
					>
						<Calendar
							size={14}
							className="text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span>Записать в расписание</span>
					</button>

					{/* 3. Печать договора */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							void printBlankMedicalContract(selectedPatient);
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Распечатать бланк договора"
						data-testid="patient-card-print-contract-btn"
					>
						<FileText
							size={14}
							className="text-[var(--muted)] shrink-0"
							aria-hidden="true"
						/>
						<span>Печать договора</span>
					</button>

					{/* 3b. Печать бланка ИДС */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							void printBlankMedicalConsent(selectedPatient);
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Распечатать бланк ИДС / согласий"
						data-testid="patient-card-print-consent-btn"
					>
						<ShieldCheck
							size={14}
							className="text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span>Бланк ИДС / согласий</span>
					</button>

					{/* 4. Медицинская карта */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							onOpenPatientCardModal();
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Открыть медицинскую карту"
						data-testid="open-patient-card-modal-btn"
					>
						<FileText
							size={14}
							className="text-[var(--teal)] shrink-0"
							aria-hidden="true"
						/>
						<span>Медицинская карта</span>
					</button>

					{/* 5. Счета и касса */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							if (selectedPatient?.id) {
								usePatientStore
									.getState()
									.setSelectedPatientId(selectedPatient.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(
								`Открыты счета и касса: ${selectedPatient?.fullName || ""}`,
								"info",
							);
						}}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Счета, акты и касса"
						data-testid="patient-card-finance-btn"
					>
						<span className="flex items-center gap-2">
							<Receipt
								size={14}
								className="text-teal-600 dark:text-teal-400 shrink-0"
								aria-hidden="true"
							/>
							<span>Счета и касса</span>
						</span>
						<span
							data-testid="patient-quick-balance-btn"
							className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
								patientBalance > 0
									? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
									: patientBalance < 0
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
										: "text-[var(--muted)]"
							}`}
						>
							{patientBalance > 0
								? `+${patientBalance.toLocaleString("ru-RU")} ₽`
								: patientBalance < 0
									? `-${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
									: "0 ₽"}
						</span>
					</button>

					{/* 6. Рентген и КТ */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							if (selectedPatient?.id) {
								usePatientStore
									.getState()
									.setSelectedPatientId(selectedPatient.id);
							}
							useAppStore.getState().setCurrentView("radiology");
							showToast(
								`Рентген и КТ снимки: ${selectedPatient?.fullName || ""}`,
								"info",
							);
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Рентгенологические и КТ исследования пациента"
						data-testid="patient-card-radiology-btn"
					>
						<Camera
							size={14}
							className="text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span>Рентген и КТ снимки</span>
					</button>

					{/* 7. Программа лояльности */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							onOpenLoyaltyModal();
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Программа лояльности и бонусы"
						data-testid="open-loyalty-program-modal-btn"
					>
						<Gift
							size={14}
							className="text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span>Программа лояльности</span>
					</button>

					{/* 8. В архив */}
					<button
						type="button"
						className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)]"
						onClick={() => {
							setIsOpen(false);
							if (!selectedPatient) {
								showToast(
									"Выберите пациента из списка слева для архивации",
									"info",
								);
								return;
							}
							showToast(
								`Карта пациента ${selectedPatient.fullName} перемещена в архив`,
								"success",
							);
						}}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "8px 12px",
							minHeight: "36px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: "transparent",
							borderRadius: "6px",
							cursor: "pointer",
							textAlign: "left",
						}}
						title="Архивировать карту пациента"
						data-testid="archive-patient-card-btn"
					>
						<Archive
							size={14}
							className="text-[var(--muted)] shrink-0"
							aria-hidden="true"
						/>
						<span>В архив</span>
					</button>
				</div>
			)}
		</div>
	);
}
