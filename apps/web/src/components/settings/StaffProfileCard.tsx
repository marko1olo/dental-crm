/**
 * StaffProfileCard.tsx — 3-колоночная расширенная карточка сотрудника (Фича №51).
 *
 * 3 Колонки:
 *  1. Персональные данные, контакты, реквизиты (СНИЛС, ИНН, медкнижка, аккредитация Минздрава РФ, раздельные заметки).
 *  2. Роль, филиалы, привязка кабинетов, прайс-категория и ставки ЗП (% и оклад).
 *  3. Безопасность, шкала надежности пароля (энтропия бит), история сессий, права доступа.
 *
 * Защита от дубликатов по СНИЛС, ИНН, email и телефону.
 * Разграничение заметок руководства (видны только Главврачу и Директору).
 * Тач-таргеты >= 44x44px.
 */

import {
	canViewManagementNotes,
	formatStaffInn,
	formatStaffSnils,
	type StaffProfileExtended,
	type StaffRole,
	validateMedicalBook,
	validateMinzdravAccreditation,
	validateStaffInn,
	validateStaffSnils,
} from "@dental/shared";
import {
	AlertCircle,
	Building2,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	DollarSign,
	FileText,
	KeyRound,
	Lock,
	Mail,
	Percent,
	Phone,
	RefreshCw,
	Save,
	Shield,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { StaffSecurityTab } from "./StaffSecurityTab";
import { StaffProfileRequisitesSection } from "./StaffProfileRequisitesSection";
import { StaffProfilePayrollSection } from "./StaffProfilePayrollSection";
import { CREATABLE_STAFF_ROLES, staffRoleTitle } from "./settingsInviteRoles";
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

	const canSeeManagementNotes = canViewManagementNotes(callerRole);

	// Editable form state
	const [fullName, setFullName] = useState(staffMember.fullName || "");
	const [role, setRole] = useState<StaffRole>(staffMember.role || "doctor");
	const [phone, setPhone] = useState(staffMember.phone || "");
	const [email, setEmail] = useState(staffMember.email || "");
	const [color, setColor] = useState(staffMember.color || "#3b82f6");
	const [specialties, setSpecialties] = useState<string[]>(
		staffMember.specialties || ["universal"],
	);

	// Column 1: HR & Requisites
	const [snils, setSnils] = useState(staffMember.snils || "");
	const [inn, setInn] = useState(staffMember.inn || "");
	const [medicalBookNumber, setMedicalBookNumber] = useState(
		staffMember.medicalBookNumber || "",
	);
	const [medicalBookCheckupDate, setMedicalBookCheckupDate] = useState(
		staffMember.medicalBookCheckupDate || "",
	);
	const [minzdravAccreditationDate, setMinzdravAccreditationDate] = useState(
		staffMember.minzdravAccreditationDate || "",
	);
	const [minzdravAccreditationSpecialty, setMinzdravAccreditationSpecialty] =
		useState(staffMember.minzdravAccreditationSpecialty || "");
	const [clinicalNotes, setClinicalNotes] = useState(
		staffMember.clinicalNotes || "",
	);
	const [managementNotes, setManagementNotes] = useState(
		staffMember.managementNotes || "",
	);

	// Column 2: Assignments & Payroll
	const [assignedBranches, setAssignedBranches] = useState<string[]>(
		staffMember.assignedBranches || [],
	);
	const [assignedChairIds, setAssignedChairIds] = useState<string[]>(
		staffMember.assignedChairIds || [],
	);
	const [priceCategory, setPriceCategory] = useState(
		staffMember.priceCategory || "standard",
	);
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(
		staffMember.baseSalaryRub || 0,
	);
	const [commissionPct, setCommissionPct] = useState<number>(
		staffMember.commissionPct ?? 25,
	);
	const [materialCostDeductionPct, setMaterialCostDeductionPct] = useState<number>(
		staffMember.materialCostDeductionPct ?? 0,
	);
	const [labCostDeductionPct, setLabCostDeductionPct] = useState<number>(
		staffMember.labCostDeductionPct ?? 0,
	);

	// Column 3: Permissions
	const [canSignMedicalRecords, setCanSignMedicalRecords] = useState(
		staffMember.canSignMedicalRecords ?? false,
	);
	const [canManageMoney, setCanManageMoney] = useState(
		staffMember.canManageMoney ?? false,
	);
	const [canManageImports, setCanManageImports] = useState(
		staffMember.canManageImports ?? false,
	);

	const [isSaving, setIsSaving] = useState(false);
	const [activeTabMobile, setActiveTabMobile] = useState<
		"requisites" | "payroll" | "security"
	>("requisites");

	// Synchronize on open or change
	useEffect(() => {
		setFullName(staffMember.fullName || "");
		setRole(staffMember.role || "doctor");
		setPhone(staffMember.phone || "");
		setEmail(staffMember.email || "");
		setColor(staffMember.color || "#3b82f6");
		setSpecialties(staffMember.specialties || ["universal"]);
		setSnils(staffMember.snils || "");
		setInn(staffMember.inn || "");
		setMedicalBookNumber(staffMember.medicalBookNumber || "");
		setMedicalBookCheckupDate(staffMember.medicalBookCheckupDate || "");
		setMinzdravAccreditationDate(staffMember.minzdravAccreditationDate || "");
		setMinzdravAccreditationSpecialty(
			staffMember.minzdravAccreditationSpecialty || "",
		);
		setClinicalNotes(staffMember.clinicalNotes || "");
		setManagementNotes(staffMember.managementNotes || "");
		setAssignedBranches(staffMember.assignedBranches || []);
		setAssignedChairIds(staffMember.assignedChairIds || []);
		setPriceCategory(staffMember.priceCategory || "standard");
		setBaseSalaryRub(staffMember.baseSalaryRub || 0);
		setCommissionPct(staffMember.commissionPct ?? 25);
		setMaterialCostDeductionPct(staffMember.materialCostDeductionPct ?? 0);
		setLabCostDeductionPct(staffMember.labCostDeductionPct ?? 0);
		setCanSignMedicalRecords(staffMember.canSignMedicalRecords ?? false);
		setCanManageMoney(staffMember.canManageMoney ?? false);
		setCanManageImports(staffMember.canManageImports ?? false);
	}, [staffMember]);

	// Live validation derivations
	const snilsValidation = useMemo(() => {
		if (!snils) return null;
		return validateStaffSnils(snils);
	}, [snils]);

	const innValidation = useMemo(() => {
		if (!inn) return null;
		return validateStaffInn(inn);
	}, [inn]);

	const medicalBookValidation = useMemo(() => {
		if (!medicalBookNumber) return null;
		return validateMedicalBook(medicalBookNumber, medicalBookCheckupDate);
	}, [medicalBookNumber, medicalBookCheckupDate]);

	const accreditationValidation = useMemo(() => {
		if (!minzdravAccreditationDate) return null;
		return validateMinzdravAccreditation(minzdravAccreditationDate);
	}, [minzdravAccreditationDate]);

	if (!isOpen) return null;

	const handleSpecialtyToggle = (specId: string) => {
		if (specialties.includes(specId)) {
			if (specialties.length === 1) return; // Must have at least 1
			setSpecialties(specialties.filter((s) => s !== specId));
		} else {
			setSpecialties([...specialties, specId]);
		}
	};

	const handleBranchToggle = (branchId: string) => {
		if (assignedBranches.includes(branchId)) {
			setAssignedBranches(assignedBranches.filter((b) => b !== branchId));
		} else {
			setAssignedBranches([...assignedBranches, branchId]);
		}
	};

	const handleChairToggle = (chairId: string) => {
		if (assignedChairIds.includes(chairId)) {
			setAssignedChairIds(assignedChairIds.filter((c) => c !== chairId));
		} else {
			setAssignedChairIds([...assignedChairIds, chairId]);
		}
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fullName.trim()) {
			showToast("Укажите ФИО сотрудника", "warning");
			return;
		}

		if (snils && snilsValidation && !snilsValidation.isValid) {
			showToast(
				snilsValidation.error || "Неверный формат или контрольное число СНИЛС.",
				"error",
			);
			return;
		}

		if (inn && innValidation && !innValidation.isValid) {
			showToast(
				innValidation.error || "Неверный формат или контрольная сумма ИНН.",
				"error",
			);
			return;
		}

		setIsSaving(true);
		const headers = denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
		});

		try {
			// 1. Пре-чек на дубликаты
			const duplicateCheckRes = await fetch("/api/staff/validate-duplicates", {
				method: "POST",
				headers,
				body: JSON.stringify({
					id: staffMember.id,
					fullName: fullName.trim(),
					snils: snils || null,
					inn: inn || null,
					email: email.trim() || null,
					phone: phone.trim() || null,
				}),
			});

			if (duplicateCheckRes.ok) {
				const dupData = await duplicateCheckRes.json();
				if (dupData.isDuplicate && dupData.conflict) {
					showToast(dupData.conflict.message, "error");
					setIsSaving(false);
					return;
				}
			}

			// 2. Отправка обновления профиля
			const payload = {
				fullName: fullName.trim(),
				role,
				specialties,
				phone: phone.trim() || null,
				email: email.trim() || null,
				color,
				snils: snils.trim() || null,
				inn: inn.trim() || null,
				medicalBookNumber: medicalBookNumber.trim() || null,
				medicalBookCheckupDate: medicalBookCheckupDate || null,
				minzdravAccreditationDate: minzdravAccreditationDate || null,
				minzdravAccreditationSpecialty:
					minzdravAccreditationSpecialty.trim() || null,
				clinicalNotes: clinicalNotes.trim() || null,
				managementNotes: canSeeManagementNotes
					? managementNotes.trim() || null
					: undefined,
				assignedBranches,
				assignedChairIds,
				priceCategory,
				baseSalaryRub: Number(baseSalaryRub) || 0,
				commissionPct: Number(commissionPct) || 25,
				materialCostDeductionPct: Number(materialCostDeductionPct) || 0,
				labCostDeductionPct: Number(labCostDeductionPct) || 0,
				canSignMedicalRecords,
				canManageMoney,
				canManageImports,
			};

			const saveRes = await fetch(`/api/staff/${staffMember.id}/profile`, {
				method: "PUT",
				headers,
				body: JSON.stringify(payload),
			});

			if (saveRes.ok) {
				const updatedProfile: StaffProfileExtended = await saveRes.json();
				showToast(
					`Карточка сотрудника «${updatedProfile.fullName}» успешно сохранена.`,
					"success",
				);
				onSaved(updatedProfile);
				onClose();
			} else {
				const errData = await saveRes.json().catch(() => ({}));
				showToast(
					errData.message || "Не удалось сохранить карточку сотрудника.",
					"error",
				);
			}
		} catch (_err) {
			showToast("Сбой сети при сохранении карточки сотрудника.", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div
			className="staff-profile-modal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="staff-profile-modal-window" role="dialog" aria-modal="true">
				{/* Header */}
				<header className="staff-profile-modal-header">
					<div className="staff-profile-modal-header-left">
						<div
							className="staff-profile-avatar-large"
							style={{ backgroundColor: color }}
						>
							{fullName.charAt(0).toUpperCase() || "S"}
						</div>
						<div className="staff-profile-header-meta">
							<h3>{fullName || "Карточка сотрудника"}</h3>
							<p>
								<span className="staff-profile-badge-role">
									{staffRoleTitle(role)}
								</span>
								<span>•</span>
								<span>
									{staffMember.active ? (
										<span className="staff-profile-badge-status active">
											Активен
										</span>
									) : (
										<span className="staff-profile-badge-status inactive">
											Заблокирован
										</span>
									)}
								</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="staff-touch-target-button staff-btn-secondary p-2 min-w-[44px] min-h-[44px] w-11 h-11 inline-flex items-center justify-center cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Mobile Segmented Control (Mandate 8c: >= 44x44px touch targets) */}
				<div className="md:hidden flex border-b border-[var(--line)] bg-[var(--paper-soft)] p-1 gap-1">
					<button
						type="button"
						onClick={() => setActiveTabMobile("requisites")}
						className={`flex-1 min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
							activeTabMobile === "requisites"
								? "bg-[var(--paper)] text-teal-600 shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						1. Реквизиты
					</button>
					<button
						type="button"
						onClick={() => setActiveTabMobile("payroll")}
						className={`flex-1 min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
							activeTabMobile === "payroll"
								? "bg-[var(--paper)] text-teal-600 shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						2. Ставки и филиалы
					</button>
					<button
						type="button"
						onClick={() => setActiveTabMobile("security")}
						className={`flex-1 min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
							activeTabMobile === "security"
								? "bg-[var(--paper)] text-teal-600 shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						3. Безопасность
					</button>
				</div>

				{/* Body (3-Column Grid) */}
				<form onSubmit={handleSave} className="staff-profile-modal-body">
					<div className="staff-profile-3col-grid">
						<StaffProfileRequisitesSection
							fullName={fullName}
							setFullName={setFullName}
							phone={phone}
							setPhone={setPhone}
							email={email}
							setEmail={setEmail}
							snils={snils}
							setSnils={setSnils}
							inn={inn}
							setInn={setInn}
							medicalBookNumber={medicalBookNumber}
							setMedicalBookNumber={setMedicalBookNumber}
							medicalBookCheckupDate={medicalBookCheckupDate}
							setMedicalBookCheckupDate={setMedicalBookCheckupDate}
							minzdravAccreditationDate={minzdravAccreditationDate}
							setMinzdravAccreditationDate={setMinzdravAccreditationDate}
							clinicalNotes={clinicalNotes}
							setClinicalNotes={setClinicalNotes}
							managementNotes={managementNotes}
							setManagementNotes={setManagementNotes}
							canSeeManagementNotes={canSeeManagementNotes}
							snilsValidation={snilsValidation}
							innValidation={innValidation}
							medicalBookValidation={medicalBookValidation}
							accreditationValidation={accreditationValidation}
							activeTabMobile={activeTabMobile}
						/>

						<StaffProfilePayrollSection
							role={role}
							setRole={setRole}
							specialties={specialties}
							handleSpecialtyToggle={handleSpecialtyToggle}
							clinicsList={clinicsList}
							assignedBranches={assignedBranches}
							handleBranchToggle={handleBranchToggle}
							chairsList={chairsList}
							assignedChairIds={assignedChairIds}
							handleChairToggle={handleChairToggle}
							priceCategory={priceCategory}
							setPriceCategory={setPriceCategory}
							baseSalaryRub={baseSalaryRub}
							setBaseSalaryRub={setBaseSalaryRub}
							commissionPct={commissionPct}
							setCommissionPct={setCommissionPct}
							materialCostDeductionPct={materialCostDeductionPct}
							setMaterialCostDeductionPct={setMaterialCostDeductionPct}
							labCostDeductionPct={labCostDeductionPct}
							setLabCostDeductionPct={setLabCostDeductionPct}
							activeTabMobile={activeTabMobile}
						/>

						{/* КОЛОНКА 3: Безопасность, шкала энтропии, сессии и права */}
						<div
							className={`staff-profile-column ${
								activeTabMobile !== "security" ? "hidden md:flex" : ""
							}`}
						>
							<StaffSecurityTab
								staffMember={staffMember}
								onSaved={() => {
									// Trigger parent reload
								}}
							/>

							{/* Персональные полномочия */}
							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<ShieldCheck className="w-4 h-4" />
										<span>Персональные полномочия</span>
									</span>
								</h4>

								<div className="flex flex-col gap-2">
									<label className="flex items-start gap-2.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={canSignMedicalRecords}
											onChange={(e) =>
												setCanSignMedicalRecords(e.target.checked)
											}
											className="rounded mt-0.5 border-[var(--line)] text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-[var(--ink)] block">
												Подпись медицинской документации (ЭМК)
											</span>
											<span className="text-[var(--muted)] text-[11px]">
												Право завершать приём, ставить диагнозы и подписывать дневники ЭМК.
											</span>
										</div>
									</label>

									<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-[var(--line)]">
										<input
											type="checkbox"
											checked={canManageMoney}
											onChange={(e) => setCanManageMoney(e.target.checked)}
											className="rounded mt-0.5 border-[var(--line)] text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-[var(--ink)] block">
												Касса, приём оплат и чеки
											</span>
											<span className="text-[var(--muted)] text-[11px]">
												Пробитие чеков на онлайн-кассе, наличные/безналичные оплаты и возвраты.
											</span>
										</div>
									</label>

									<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-[var(--line)]">
										<input
											type="checkbox"
											checked={canManageImports}
											onChange={(e) => setCanManageImports(e.target.checked)}
											className="rounded mt-0.5 border-[var(--line)] text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-[var(--ink)] block">
												Управление переносом данных и прайсом
											</span>
											<span className="text-[var(--muted)] text-[11px]">
												Импорт картотеки пациентов из сторонних программ и правка прейскуранта.
											</span>
										</div>
									</label>
								</div>
							</section>
						</div>
					</div>
				</form>

				{/* Modal Footer */}
				<footer className="staff-profile-modal-footer">
					<div className="staff-profile-footer-left">
						<Shield className="w-4 h-4 text-emerald-500" />
						<span>Защита персональных данных и аудит сессий активны</span>
					</div>

					<div className="staff-profile-footer-actions">
						<button
							type="button"
							onClick={onClose}
							className="staff-touch-target-button staff-btn-secondary"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving}
							className="staff-touch-target-button staff-btn-primary"
						>
							{isSaving ? (
								<RefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<Save className="w-4 h-4" />
							)}
							<span>Сохранить карточку</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
