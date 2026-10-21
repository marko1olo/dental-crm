import { Activity, Camera, Eye, FileCheck, FileSpreadsheet, FileText, Gift, Pill, Printer, Receipt, Shield, UserCheck } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";

export interface PatientWorkspaceDocsDropdownProps {
	readonly patientId: string;
	readonly patientName?: string | null | undefined;
	readonly dashboard?: any;
	readonly appLogic?: any;
	readonly usePatientStoreState: any;
	readonly setIsCbctModalOpen: (v: boolean) => void;
	readonly setIsPhotoProtocolOpen: (v: boolean) => void;
	readonly setIsOrthoPhotoModalOpen: (v: boolean) => void;
	readonly setIsLoyaltyModalOpen: (v: boolean) => void;
	readonly setIsDmsLetterOpen: (v: boolean) => void;
	readonly setIsDmsRegistryOpen: (v: boolean) => void;
	readonly setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	readonly setIsTaxCertificateOpen?: ((v: boolean) => void) | undefined;
	readonly onClose: () => void;
}

export const PatientWorkspaceDocsDropdown: React.FC<PatientWorkspaceDocsDropdownProps> = ({
	patientId, patientName, dashboard, appLogic, usePatientStoreState,
	setIsCbctModalOpen, setIsPhotoProtocolOpen, setIsOrthoPhotoModalOpen,
	setIsLoyaltyModalOpen, setIsDmsLetterOpen, setIsDmsRegistryOpen,
	setIsPrescriptionModalOpen, setIsTaxCertificateOpen, onClose,
}) => {
	const selectPatient = () => { if (patientId) { appLogic?.setSelectedPatientId?.(patientId); usePatientStoreState.setSelectedPatientId(patientId); } };
	const itemCls = "w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors";

	return (
		<div className="absolute right-0 top-full mt-1.5 w-64 max-h-[75vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100" role="menu" data-testid="patient-docs-dms-dropdown">
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); selectPatient(); window.location.hash = "patients"; }} data-testid="patient-workspace-open-043u-btn"><FileText className="w-4 h-4 text-[var(--teal)] shrink-0" /><span>Медицинская карта</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); window.print(); showToast("Печать карты", "info"); }} data-testid="patient-workspace-print-043u-btn"><Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Печать медицинской карты</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); selectPatient(); window.location.hash = "finance"; }} data-testid="patient-workspace-open-finance-btn"><Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Счета и касса</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); showToast("Семейный баланс", "info"); }} data-testid="patient-workspace-family-balance-btn"><UserCheck className="w-4 h-4 text-indigo-600 shrink-0" /><span>Семейный баланс</span></button>
			<button type="button" role="menuitem" className={`${itemCls} text-cyan-700 dark:text-cyan-300`} onClick={() => { onClose(); selectPatient(); setIsCbctModalOpen(true); }} data-testid="patient-workspace-open-cbct-modal-btn"><Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" /><span>3D КТ / КЛКТ Студия</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); selectPatient(); window.location.hash = "imaging"; }} data-testid="patient-workspace-open-radiology-btn"><Camera className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Рентген и КТ снимки</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); setIsPhotoProtocolOpen(true); }} data-testid="patient-workspace-open-photo-protocol-btn"><Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Фотопротокол & До/После</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); setIsOrthoPhotoModalOpen(true); }} data-testid="patient-workspace-open-ortho-photo-btn"><Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>Орто-фотопротокол (8 проекций)</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); setIsLoyaltyModalOpen(true); }} data-testid="open-loyalty-program-modal-btn"><Gift className="w-4 h-4 text-amber-500 shrink-0" /><span>Программа лояльности</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); setIsDmsLetterOpen(true); }} data-testid="patient-dms-manager-btn"><Shield className="w-4 h-4 text-[var(--teal)] shrink-0" /><span>Управление ДМС</span></button>
			<button type="button" role="menuitem" className={itemCls} onClick={() => { onClose(); setIsDmsRegistryOpen(true); }} data-testid="patient-dms-registry-btn"><FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" /><span>Реестр ДМС</span></button>
			<button type="button" role="menuitem" className={`${itemCls} hover:bg-amber-500/10 text-amber-900 dark:text-amber-200`} onClick={() => { onClose(); void printBlankMedicalContract({ id: patientId, fullName: patientName }, { clinicName: dashboard?.clinicSettings?.profile?.legalName }); }} data-testid="patient-print-blank-contract-btn"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /><span>Бланк договора (_______)</span></button>
			<button type="button" role="menuitem" className={`${itemCls} hover:bg-teal-500/10 text-teal-900 dark:text-teal-200`} onClick={() => { onClose(); void printBlankMedicalConsent({ id: patientId, fullName: patientName }, { clinicName: dashboard?.clinicSettings?.profile?.legalName }); }} data-testid="patient-print-blank-consent-btn"><Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Бланк ИДС / согласий (_______)</span></button>
			<button type="button" role="menuitem" className={`${itemCls} text-teal-700 dark:text-teal-300`} onClick={() => { onClose(); setIsPrescriptionModalOpen?.(true); }} data-testid="btn-patient-prescriptions-modal"><Pill className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Выписать рецепт</span></button>
			<button type="button" role="menuitem" className={`${itemCls} text-emerald-700 dark:text-emerald-300`} onClick={() => { onClose(); setIsTaxCertificateOpen?.(true); }} data-testid="btn-patient-tax-deduction-modal"><FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Справка для вычета (13%)</span></button>
		</div>
	);
};
