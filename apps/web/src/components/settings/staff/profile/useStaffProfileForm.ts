import type { StaffProfileExtended, StaffRole } from "@dental/shared";
import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";

export function useStaffProfileForm(
	staffMember: StaffProfileExtended,
	onSaved: (updated: StaffProfileExtended) => void,
	onClose: () => void,
) {
	const [fullName, setFullName] = useState(staffMember.fullName || "");
	const [role, setRole] = useState<StaffRole>(staffMember.role || "doctor");
	const [phone, setPhone] = useState(staffMember.phone || "");
	const [email, setEmail] = useState(staffMember.email || "");
	const [color, setColor] = useState(staffMember.color || "#3b82f6");
	const [specialties, setSpecialties] = useState<string[]>(staffMember.specialties || ["universal"]);
	const [snils, setSnils] = useState(staffMember.snils || "");
	const [inn, setInn] = useState(staffMember.inn || "");
	const [medicalBookNumber, setMedicalBookNumber] = useState(staffMember.medicalBookNumber || "");
	const [medicalBookCheckupDate, setMedicalBookCheckupDate] = useState(staffMember.medicalBookCheckupDate || "");
	const [minzdravAccreditationDate, setMinzdravAccreditationDate] = useState(staffMember.minzdravAccreditationDate || "");
	const [minzdravAccreditationSpecialty, setMinzdravAccreditationSpecialty] = useState(staffMember.minzdravAccreditationSpecialty || "");
	const [clinicalNotes, setClinicalNotes] = useState(staffMember.clinicalNotes || "");
	const [managementNotes, setManagementNotes] = useState(staffMember.managementNotes || "");
	const [assignedBranches, setAssignedBranches] = useState<string[]>(staffMember.assignedBranches || []);
	const [assignedChairIds, setAssignedChairIds] = useState<string[]>(staffMember.assignedChairIds || []);
	const [priceCategory, setPriceCategory] = useState(staffMember.priceCategory || "standard");
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(staffMember.baseSalaryRub || 0);
	const [commissionPct, setCommissionPct] = useState<number>(staffMember.commissionPct || 0);
	const [materialCostDeductionPct, setMaterialCostDeductionPct] = useState<number>(staffMember.materialCostDeductionPct || 0);
	const [labCostDeductionPct, setLabCostDeductionPct] = useState<number>(staffMember.labCostDeductionPct || 0);
	const [canSignMedicalRecords, setCanSignMedicalRecords] = useState<boolean>(staffMember.canSignMedicalRecords ?? (staffMember.role === "doctor"));
	const [canManageMoney, setCanManageMoney] = useState<boolean>(staffMember.canManageMoney ?? (staffMember.role === "administrator" || staffMember.role === "owner"));
	const [canManageImports, setCanManageImports] = useState<boolean>(staffMember.canManageImports ?? true);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (!fullName.trim()) {
			showToast("Укажите ФИО сотрудника", "warning");
			return;
		}
		setIsSaving(true);
		try {
			const payload: Partial<StaffProfileExtended> = {
				fullName: fullName.trim(),
				role,
				phone: phone.trim() || null,
				email: email.trim() || null,
				color,
				specialties,
				snils: snils.trim() || null,
				inn: inn.trim() || null,
				medicalBookNumber: medicalBookNumber.trim() || null,
				medicalBookCheckupDate: medicalBookCheckupDate || null,
				minzdravAccreditationDate: minzdravAccreditationDate || null,
				minzdravAccreditationSpecialty: minzdravAccreditationSpecialty.trim() || null,
				clinicalNotes: clinicalNotes.trim() || null,
				managementNotes: managementNotes.trim() || null,
				assignedBranches,
				assignedChairIds,
				priceCategory,
				baseSalaryRub,
				commissionPct,
				materialCostDeductionPct,
				labCostDeductionPct,
				canSignMedicalRecords,
				canManageMoney,
				canManageImports,
			};
			const res = await fetch(`/api/settings/staff/${staffMember.id}`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить профиль", "error");
				return;
			}
			showToast("Карточка сотрудника сохранена", "success");
			onSaved({ ...staffMember, ...payload });
			onClose();
		} catch {
			showToast("Ошибка связи с сервером", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return {
		fullName, setFullName, role, setRole, phone, setPhone, email, setEmail, color, setColor,
		specialties, setSpecialties, snils, setSnils, inn, setInn,
		medicalBookNumber, setMedicalBookNumber, medicalBookCheckupDate, setMedicalBookCheckupDate,
		minzdravAccreditationDate, setMinzdravAccreditationDate, minzdravAccreditationSpecialty, setMinzdravAccreditationSpecialty,
		clinicalNotes, setClinicalNotes, managementNotes, setManagementNotes,
		assignedBranches, setAssignedBranches, assignedChairIds, setAssignedChairIds,
		priceCategory, setPriceCategory, baseSalaryRub, setBaseSalaryRub, commissionPct, setCommissionPct,
		materialCostDeductionPct, setMaterialCostDeductionPct, labCostDeductionPct, setLabCostDeductionPct,
		canSignMedicalRecords, setCanSignMedicalRecords, canManageMoney, setCanManageMoney,
		canManageImports, setCanManageImports, isSaving, handleSave,
	};
}
