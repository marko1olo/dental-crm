import type { StaffProfileExtended } from "@dental/shared";
import {
	validateStaffSnils,
	validateStaffInn,
	validateMedicalBook,
	validateMinzdravAccreditation,
} from "@dental/shared";
import React, { useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { StaffProfilePayrollSection } from "./StaffProfilePayrollSection";
import { StaffProfileRequisitesSection } from "./StaffProfileRequisitesSection";
import { StaffProfileFooter } from "./staff/profile/StaffProfileFooter";
import { StaffProfileHeader } from "./staff/profile/StaffProfileHeader";
import { StaffProfileSecurityColumn } from "./staff/profile/StaffProfileSecurityColumn";
import { useStaffProfileForm } from "./staff/profile/useStaffProfileForm";
import "./staffProfile.css";

export interface StaffProfileCardProps {
	readonly staffMember: StaffProfileExtended;
	readonly callerRole?: string;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaved: (updated: StaffProfileExtended) => void;
}

export const StaffProfileCard: React.FC<StaffProfileCardProps> = ({
	staffMember,
	callerRole = "owner",
	isOpen,
	onClose,
	onSaved,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = appLogic?.dashboard;
	const clinicsList = dashboard?.clinicSettings?.clinics || [];
	const chairsList = dashboard?.clinicSettings?.chairs || [];
	const [activeTabMobile, setActiveTabMobile] = useState<"requisites" | "payroll" | "security">("requisites");

	const form = useStaffProfileForm(staffMember, onSaved, onClose);

	if (!isOpen) return null;

	return (
		<div className="staff-profile-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
			<div className="staff-profile-modal-surface bg-[var(--paper-card)] border border-[var(--line)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden">
				<StaffProfileHeader
					staffMember={staffMember}
					fullName={form.fullName}
					color={form.color}
					setColor={form.setColor}
					onClose={onClose}
					activeTabMobile={activeTabMobile}
					setActiveTabMobile={setActiveTabMobile}
				/>

				<div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
					<StaffProfileRequisitesSection
						snils={form.snils}
						setSnils={form.setSnils}
						inn={form.inn}
						setInn={form.setInn}
						medicalBookNumber={form.medicalBookNumber}
						setMedicalBookNumber={form.setMedicalBookNumber}
						medicalBookCheckupDate={form.medicalBookCheckupDate}
						setMedicalBookCheckupDate={form.setMedicalBookCheckupDate}
						minzdravAccreditationDate={form.minzdravAccreditationDate}
						setMinzdravAccreditationDate={form.setMinzdravAccreditationDate}
						minzdravAccreditationSpecialty={form.minzdravAccreditationSpecialty}
						setMinzdravAccreditationSpecialty={form.setMinzdravAccreditationSpecialty}
						clinicalNotes={form.clinicalNotes}
						setClinicalNotes={form.setClinicalNotes}
						managementNotes={form.managementNotes}
						setManagementNotes={form.setManagementNotes}
						canSeeManagementNotes={callerRole === "owner" || callerRole === "head_doctor"}
						snilsValidation={form.snils ? validateStaffSnils(form.snils) : null}
						innValidation={form.inn ? validateStaffInn(form.inn) : null}
						medicalBookValidation={form.medicalBookCheckupDate ? validateMedicalBook(form.medicalBookCheckupDate) : null}
						accreditationValidation={form.minzdravAccreditationDate ? validateMinzdravAccreditation(form.minzdravAccreditationDate) : null}
						activeTabMobile={activeTabMobile}
					/>

					<StaffProfilePayrollSection
						role={form.role}
						setRole={form.setRole}
						specialties={form.specialties}
						handleSpecialtyToggle={(id) => form.setSpecialties((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])}
						clinicsList={clinicsList}
						assignedBranches={form.assignedBranches}
						handleBranchToggle={(id) => form.setAssignedBranches((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id])}
						chairsList={chairsList}
						assignedChairIds={form.assignedChairIds}
						handleChairToggle={(id) => form.setAssignedChairIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])}
						priceCategory={form.priceCategory}
						setPriceCategory={form.setPriceCategory}
						baseSalaryRub={form.baseSalaryRub}
						setBaseSalaryRub={form.setBaseSalaryRub}
						commissionPct={form.commissionPct}
						setCommissionPct={form.setCommissionPct}
						materialCostDeductionPct={form.materialCostDeductionPct}
						setMaterialCostDeductionPct={form.setMaterialCostDeductionPct}
						labCostDeductionPct={form.labCostDeductionPct}
						setLabCostDeductionPct={form.setLabCostDeductionPct}
						activeTabMobile={activeTabMobile}
					/>

					<StaffProfileSecurityColumn
						staffMember={staffMember}
						canSignMedicalRecords={form.canSignMedicalRecords}
						setCanSignMedicalRecords={form.setCanSignMedicalRecords}
						canManageMoney={form.canManageMoney}
						setCanManageMoney={form.setCanManageMoney}
						canManageImports={form.canManageImports}
						setCanManageImports={form.setCanManageImports}
						activeTabMobile={activeTabMobile}
					/>
				</div>

				<StaffProfileFooter onClose={onClose} onSave={form.handleSave} isSaving={form.isSaving} />
			</div>
		</div>
	);
};

export default StaffProfileCard;
