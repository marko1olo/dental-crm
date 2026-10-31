/**
 * PrescriptionWorkspaceModal.tsx — Canonical SSOT Outpatient Prescription Workspace
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y, 8am, 8ze & Apple HIG).
 * Strictly 140–190 lines Sweet Spot (Mandate 8b). Exactly ONE Primary CTA button #0d9488. Zero decree numbers.
 */

import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PrescriptionPrintSheet } from "./PrescriptionPrintSheet";
import {
	usePrescriptionWorkspaceState,
	PrescriptionWorkspaceHeader,
	PrescriptionDrugSelector,
	PrescriptionActiveItemsList,
	PrescriptionWorkspaceFooter,
} from "./workspace";

export interface PrescriptionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly name?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly cardNumber?: string | undefined;
		readonly medicalCardNumber?: string | undefined;
		readonly allergies?: readonly string[] | string | undefined;
		readonly chronicDiseases?: readonly string[] | string | undefined;
	} | null | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly diary?: {
		readonly diagnosisIcd10?: string | undefined;
		readonly anamnesisVitae?: string | undefined;
		readonly notes?: string | undefined;
	} | undefined;
	readonly allergies?: readonly string[] | string | undefined;
	readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly onInsertToDiary?: ((rxText: string) => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onSave?: ((savedRx: unknown) => void) | undefined;
	readonly disablePortal?: boolean | undefined;
}

export const PrescriptionWorkspaceModal: React.FC<PrescriptionModalProps> = ({
	isOpen,
	onClose,
	patient,
	patientName: propPatientName,
	doctorName = "Д-р Соколов А. В.",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	clinicName = "Стоматологическая клиника «ДЕНТЕ»",
	clinicAddress = "г. Москва, ул. Большая Полянка, д. 28, стр. 1",
	clinicPhone = "+7 (495) 215-55-40",
	clinicOgrn = "ОГРН 1157746123456",
	diary,
	allergies,
	initialSelectedDrugIds,
	onInsertToDiary,
	onPrint,
	onSave,
	disablePortal = false,
}) => {
	const state = usePrescriptionWorkspaceState({
		patient,
		patientName: propPatientName,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicOgrn,
		diary,
		allergies,
		initialSelectedDrugIds,
		onInsertToDiary,
		onPrint,
		onSave,
		onClose,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Рецептурный бланк на лекарственные препараты"
			data-testid="prescription-print-modal"
			data-modal="prescription-modal"
			id="prescription-modal"
		>
			<div
				data-testid="prescription-modal"
				className="flex flex-col w-full max-w-6xl h-[94vh] sm:h-[820px] max-h-[96vh] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden min-h-0"
			>
				{/* Header Bar */}
				<PrescriptionWorkspaceHeader
					patientName={state.patientName}
					patientCard={state.patientCard}
					doctorName={state.doctorName}
					diagnosisIcd10={diary?.diagnosisIcd10}
					patientAllergiesText={state.patientAllergiesText}
					formType={state.formType}
					onFormTypeChange={state.setFormType}
					onClose={onClose}
				/>

				{/* Mobile Segmented Tab Bar */}
				<div className="flex lg:hidden px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="grid grid-cols-2 w-full p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-xs font-semibold gap-1">
						<button
							type="button"
							onClick={() => state.setMobileTab("catalog")}
							className={`min-h-[40px] rounded-lg border-0 cursor-pointer ${
								state.mobileTab === "catalog"
									? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--muted)]"
							}`}
						>
							Каталог и наборы ({state.selectedDrugs.length})
						</button>
						<button
							type="button"
							onClick={() => state.setMobileTab("preview")}
							className={`min-h-[40px] rounded-lg border-0 cursor-pointer ${
								state.mobileTab === "preview"
									? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--muted)]"
							}`}
						>
							Предпросмотр бланка
						</button>
					</div>
				</div>

				{/* Passive Warning Strip: Allergy notice (Mandate 8y) */}
				{((state.hasPenicillinAllergy && state.isPenicillinSelected) ||
					(state.hasNsaidAllergy && state.isNsaidSelected)) && (
					<div
						data-testid="prescription-allergy-modal-banner"
						className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-950 dark:text-amber-100 flex flex-col gap-1.5 shrink-0"
					>
						{state.hasPenicillinAllergy && state.isPenicillinSelected && (
							<div
								data-testid="allergy-conflict-penicillin"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
								<span>
									Внимание: у пациента аллергия на пенициллины в анамнезе.
									Автономия врача (Печать доступна).
								</span>
							</div>
						)}
						{state.hasNsaidAllergy && state.isNsaidSelected && (
							<div
								data-testid="allergy-conflict-nsaid"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
								<span>
									Внимание: у пациента аллергия на НПВС/аспирин в анамнезе.
									Автономия врача (Печать доступна).
								</span>
							</div>
						)}
					</div>
				)}

				{/* Two-Column Workbench */}
				<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
					{/* Left: 1-Click Fast Sets + Pharmacopeia Catalog + Selected List */}
					<div
						className={`lg:col-span-6 xl:col-span-7 border-r border-[var(--line)] flex flex-col min-h-0 ${
							state.mobileTab === "preview" ? "hidden lg:flex" : "flex"
						}`}
					>
						<PrescriptionDrugSelector
							selectedDrugs={state.selectedDrugs}
							onSelectFastSet={state.handleSelectFastSet}
							onAddDrug={state.handleAddDrug}
							onRemoveDrug={state.handleRemoveDrug}
							hasPenicillinAllergy={state.hasPenicillinAllergy}
							hasNsaidAllergy={state.hasNsaidAllergy}
							className="flex-1 border-b border-[var(--line)]"
						/>
						<PrescriptionActiveItemsList
							selectedDrugs={state.selectedDrugs}
							onRemoveDrug={state.handleRemoveDrug}
							onClearDrugs={state.handleClearDrugs}
							hasPenicillinAllergy={state.hasPenicillinAllergy}
							hasNsaidAllergy={state.hasNsaidAllergy}
							className="p-4 max-h-[260px]"
						/>
					</div>

					{/* Right: Live A5 Sheet Preview */}
					<div
						className={`lg:col-span-6 xl:col-span-5 flex flex-col min-h-0 bg-[var(--paper-soft)] p-4 overflow-y-auto ${
							state.mobileTab === "catalog" ? "hidden lg:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between mb-3 shrink-0">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Предпросмотр бланка А5
							</span>
							<span className="text-[11px] text-[var(--muted)] flex items-center gap-1 font-mono">
								<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
								Электронный рецепт
							</span>
						</div>
						<div
							data-testid="patient-prescription-memo-card"
							className="mb-4 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs text-xs flex flex-col gap-1.5"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-[var(--ink)]">
									Памятка пациенту (WhatsApp/Telegram):
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									Человеческий язык
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								Напоминание о приеме препаратов после приёма формируется
								автоматически без латыни и сложных аббревиатур.
							</p>
						</div>
						<PrescriptionPrintSheet
							formType={state.formType}
							isSpecial={state.formType === "special"}
							clinicName={state.clinicName}
							clinicAddress={state.clinicAddress}
							clinicPhone={state.clinicPhone}
							clinicOgrn={state.clinicOgrn}
							patientName={state.patientName}
							patientBirthDate={state.patientBirthDate}
							medicalCardNumber={state.patientCard}
							doctorName={state.doctorName}
							doctorSpecialty={state.doctorSpecialty}
							items={state.selectedDrugs}
							isMemoMode={false}
							className="shadow-md"
						/>
					</div>
				</div>

				{/* Action Footer: Exactly ONE Primary CTA #0d9488 (Mandate 8am & Apple HIG) */}
				<PrescriptionWorkspaceFooter
					isMemoCopied={state.isMemoCopied}
					isInsertedToDiary={state.isInsertedToDiary}
					onCopyPatientMemo={state.handleCopyPatientMemo}
					onPrint={state.handlePrint}
					onIssueAndInsert={state.handleIssueAndInsert}
				/>
			</div>
		</div>
	);

	return disablePortal || typeof document === "undefined"
		? modalContent
		: createPortal(modalContent, document.body);
};

PrescriptionWorkspaceModal.displayName = "PrescriptionWorkspaceModal";
