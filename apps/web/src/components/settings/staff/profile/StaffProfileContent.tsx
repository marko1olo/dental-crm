import React from "react";
import type { StaffProfileExtended, ClinicBranch, Chair } from "@dental/shared";
import {
	validateStaffSnils,
	validateStaffInn,
	validateMedicalBook,
	validateMinzdravAccreditation,
} from "@dental/shared";
import { StaffProfileRequisitesSection } from "../../StaffProfileRequisitesSection";
import { StaffProfilePayrollSection } from "../../StaffProfilePayrollSection";
import { StaffProfileSecurityColumn } from "./StaffProfileSecurityColumn";
import type { useStaffProfileForm } from "./useStaffProfileForm";

export interface StaffProfileContentProps {
	readonly form: ReturnType<typeof useStaffProfileForm>;
	readonly staffMember: StaffProfileExtended;
	readonly callerRole: string;
	readonly clinicsList: ClinicBranch[];
	readonly chairsList: Chair[];
	readonly activeTabMobile: "requisites" | "payroll" | "security";
}

export const StaffProfileContent: React.FC<StaffProfileContentProps> = ({
	form,
	staffMember,
	callerRole,
	clinicsList,
	chairsList,
	activeTabMobile,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
			<StaffProfileRequisitesSection
				fullName={form.fullName}
				setFullName={form.setFullName}
				phone={form.phone}
				setPhone={form.setPhone}
				email={form.email}
				setEmail={form.setEmail}
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
	);
};
