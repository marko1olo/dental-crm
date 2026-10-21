import { Activity, Camera, Eye, FileCheck, FileSpreadsheet, FileText, Gift, MoreVertical, Pill, Plus, Printer, Receipt, Shield, UserCheck } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";
import type { WorkspaceTabKey } from "./types";

export interface PatientWorkspaceToolbarProps {
	readonly patientId: string;
	readonly patientName?: string | null | undefined;
	readonly dashboard?: any;
	readonly onOpenPlan?: ((planId: string) => void) | undefined;
	readonly handleCreateNewPlanCallback: () => void;
	readonly setActiveTab: (tab: WorkspaceTabKey) => void;
	readonly setIsCbctModalOpen: (v: boolean) => void;
	readonly setIsPhotoProtocolOpen: (v: boolean) => void;
	readonly setIsOrthoPhotoModalOpen: (v: boolean) => void;
	readonly setIsLoyaltyModalOpen: (v: boolean) => void;
	readonly setIsDmsLetterOpen: (v: boolean) => void;
	readonly setIsDmsRegistryOpen: (v: boolean) => void;
	readonly setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	readonly setIsTaxCertificateOpen?: ((v: boolean) => void) | undefined;
}

export const PatientWorkspaceToolbar: React.FC<PatientWorkspaceToolbarProps> = React.memo(({
	patientId, patientName, dashboard, onOpenPlan, handleCreateNewPlanCallback, setActiveTab,
	setIsCbctModalOpen, setIsPhotoProtocolOpen, setIsOrthoPhotoModalOpen, setIsLoyaltyModalOpen,
	setIsDmsLetterOpen, setIsDmsRegistryOpen, setIsPrescriptionModalOpen, setIsTaxCertificateOpen,
}) => {
	const appLogic = useAppLogicContext();
	const [isDocsMenuOpen, setIsDocsMenuOpen] = useState(false);
	const docsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (docsMenuRef.current && !docsMenuRef.current.contains(e.target as Node)) setIsDocsMenuOpen(false);
		};
		if (isDocsMenuOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isDocsMenuOpen]);

	const selectPatient = () => { if (patientId) { appLogic?.setSelectedPatientId?.(patientId); usePatientStore.getState().setSelectedPatientId(patientId); } };

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Single Primary CTA Mandate: Toolbar buttons use secondary neutral styling, leaving [Начать приём] as sole primary CTA */}
			<button
				type="button"
				className="secondary-button min-h-[34px] h-9 px-3.5 text-xs font-semibold rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-2xs"
				style={{ background: "var(--paper)", backgroundImage: "none", color: "var(--ink)", borderColor: "var(--line)", boxShadow: "none" }}
				onClick={() => { selectPatient(); window.location.hash = "visit"; }}
				title="Создать новый визит"
				data-testid="btn-patient-create-visit"
			>
				<Plus className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
				<span>Новый визит</span>
			</button>
			<button
				type="button"
				className="secondary-button min-h-[34px] h-9 px-3.5 text-xs font-semibold rounded-xl border border-[var(--line)] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-2xs hover:bg-[var(--paper-soft)]"
				style={{ backgroundColor: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
				onClick={() => { setActiveTab("plans"); if (onOpenPlan) onOpenPlan("new"); else handleCreateNewPlanCallback(); }}
				title="Составить план лечения"
				data-testid="btn-patient-create-treatment-plan"
			>
				<Plus className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
				<span>План лечения</span>
			</button>
			<div className="relative inline-block text-left" ref={docsMenuRef}>
				<button type="button" className="secondary-button min-h-[34px] h-9 px-3 text-xs font-semibold rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-2xs" onClick={() => setIsDocsMenuOpen((p) => !p)} title="Документы и ДМС" aria-haspopup="true" aria-expanded={isDocsMenuOpen} data-testid="btn-patient-docs-dms-menu">
					<MoreVertical className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">Документы и ДМС</span>
				</button>
				{isDocsMenuOpen && (
					<div className="absolute right-0 top-full mt-1.5 w-64 max-h-[75vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100" role="menu" data-testid="patient-docs-dms-dropdown">
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); selectPatient(); window.location.hash = "patients"; }} data-testid="patient-workspace-open-043u-btn"><FileText className="w-4 h-4 text-[var(--teal)] shrink-0" /><span>Медицинская карта</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); window.print(); showToast("Печать медицинской карты", "info"); }} data-testid="patient-workspace-print-043u-btn"><Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Печать медицинской карты</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); selectPatient(); window.location.hash = "finance"; }} data-testid="patient-workspace-open-finance-btn"><Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Счета и касса</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); showToast("Семейный баланс", "info"); }} data-testid="patient-workspace-family-balance-btn"><UserCheck className="w-4 h-4 text-indigo-600 shrink-0" /><span>Семейный баланс</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors text-cyan-700 dark:text-cyan-300" onClick={() => { setIsDocsMenuOpen(false); selectPatient(); setIsCbctModalOpen(true); }} data-testid="patient-workspace-open-cbct-modal-btn"><Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" /><span>3D КТ / КЛКТ Студия</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); selectPatient(); window.location.hash = "imaging"; }} data-testid="patient-workspace-open-radiology-btn"><Camera className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Рентген и КТ снимки</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); setIsPhotoProtocolOpen(true); }} data-testid="patient-workspace-open-photo-protocol-btn"><Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Фотопротокол & До/После</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); setIsOrthoPhotoModalOpen(true); }} data-testid="patient-workspace-open-ortho-photo-btn"><Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>Орто-фотопротокол (8 проекций)</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); setIsLoyaltyModalOpen(true); }} data-testid="open-loyalty-program-modal-btn"><Gift className="w-4 h-4 text-amber-500 shrink-0" /><span>Программа лояльности</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); setIsDmsLetterOpen(true); }} data-testid="patient-dms-manager-btn"><Shield className="w-4 h-4 text-[var(--teal)] shrink-0" /><span>Управление ДМС</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); setIsDmsRegistryOpen(true); }} data-testid="patient-dms-registry-btn"><FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" /><span>Реестр ДМС</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); void printBlankMedicalContract({ id: patientId, fullName: patientName }, { clinicName: dashboard?.clinicSettings?.profile?.legalName }); }} data-testid="patient-print-blank-contract-btn"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /><span>Бланк договора (_______)</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-teal-500/10 text-teal-900 dark:text-teal-200 flex items-center gap-2 cursor-pointer transition-colors" onClick={() => { setIsDocsMenuOpen(false); void printBlankMedicalConsent({ id: patientId, fullName: patientName }, { clinicName: dashboard?.clinicSettings?.profile?.legalName }); }} data-testid="patient-print-blank-consent-btn"><Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Бланк ИДС / согласий (_______)</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors text-teal-700 dark:text-teal-300" onClick={() => { setIsDocsMenuOpen(false); setIsPrescriptionModalOpen?.(true); }} data-testid="btn-patient-prescriptions-modal"><Pill className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /><span>Выписать рецепт</span></button>
						<button type="button" role="menuitem" className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors text-emerald-700 dark:text-emerald-300" onClick={() => { setIsDocsMenuOpen(false); setIsTaxCertificateOpen?.(true); }} data-testid="btn-patient-tax-deduction-modal"><FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Справка для вычета (13%)</span></button>
					</div>
				)}
			</div>
		</div>
	);
});
PatientWorkspaceToolbar.displayName = "PatientWorkspaceToolbar";
