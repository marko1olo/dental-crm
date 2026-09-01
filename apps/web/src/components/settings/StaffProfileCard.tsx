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
	dentalSpecialtySchema,
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
	AlertTriangle,
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
import { DoctorSnilsValidationWidget } from "./DoctorSnilsValidationWidget";
import { StaffSecurityTab } from "./StaffSecurityTab";
import { CREATABLE_STAFF_ROLES, staffRoleTitle } from "./settingsInviteRoles";
import "./staffProfile.css";

const DENTAL_SPECIALTIES_LIST = [
	{ id: "universal", label: "Стоматолог общей практики" },
	{ id: "therapist", label: "Терапевт" },
	{ id: "surgeon", label: "Хирург" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "periodontist", label: "Пародонтолог" },
	{ id: "implantologist", label: "Имплантолог" },
	{ id: "pediatric", label: "Детский стоматолог" },
	{ id: "hygienist", label: "Гигиенист" },
	{ id: "radiologist", label: "Рентгенолог" },
];

const PRICE_CATEGORIES = [
	{ id: "standard", label: "Стандартная категория" },
	{ id: "first", label: "Первая категория" },
	{ id: "highest", label: "Высшая категория" },
	{ id: "vip", label: "Ведущий специалист / VIP" },
];

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
						className="staff-touch-target-button staff-btn-secondary p-2 min-w-[36px] min-h-[36px]"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Mobile Segmented Control */}
				<div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
					<button
						type="button"
						onClick={() => setActiveTabMobile("requisites")}
						className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
							activeTabMobile === "requisites"
								? "bg-white dark:bg-slate-800 text-teal-600 shadow-sm"
								: "text-slate-500"
						}`}
					>
						1. Реквизиты
					</button>
					<button
						type="button"
						onClick={() => setActiveTabMobile("payroll")}
						className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
							activeTabMobile === "payroll"
								? "bg-white dark:bg-slate-800 text-teal-600 shadow-sm"
								: "text-slate-500"
						}`}
					>
						2. Ставки и филиалы
					</button>
					<button
						type="button"
						onClick={() => setActiveTabMobile("security")}
						className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
							activeTabMobile === "security"
								? "bg-white dark:bg-slate-800 text-teal-600 shadow-sm"
								: "text-slate-500"
						}`}
					>
						3. Безопасность
					</button>
				</div>

				{/* Body (3-Column Grid) */}
				<form onSubmit={handleSave} className="staff-profile-modal-body">
					<div className="staff-profile-3col-grid">
						{/* КОЛОНКА 1: Персональные данные, контакты, реквизиты */}
						<div
							className={`staff-profile-column ${
								activeTabMobile !== "requisites" ? "hidden md:flex" : ""
							}`}
						>
							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<User className="w-4 h-4" />
										<span>Персональные данные</span>
									</span>
								</h4>

								<div className="staff-profile-form-group">
									<label htmlFor="staff-fullname">ФИО сотрудника *</label>
									<input
										id="staff-fullname"
										type="text"
										value={fullName}
										onChange={(e) => setFullName(e.target.value)}
										placeholder="Иванов Иван Иванович"
										required
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="staff-profile-form-group">
										<label htmlFor="staff-phone">Телефон</label>
										<input
											id="staff-phone"
											type="tel"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder="+7 (999) 000-00-00"
										/>
									</div>
									<div className="staff-profile-form-group">
										<label htmlFor="staff-email">Email (Логин)</label>
										<input
											id="staff-email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="doctor@clinic.ru"
										/>
									</div>
								</div>
							</section>

							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<FileText className="w-4 h-4" />
										<span>Реквизиты и документы РФ</span>
									</span>
								</h4>

								{/* СНИЛС */}
								<div className="staff-profile-form-group">
									<label htmlFor="staff-snils">
										<span>СНИЛС (ЕГИСЗ / ФРМР)</span>
										{snilsValidation && (
											<span
												className={`text-[11px] font-medium ${
													snilsValidation.isValid
														? "text-emerald-600 dark:text-emerald-400"
														: "text-rose-600 dark:text-rose-400"
												}`}
											>
												{snilsValidation.isValid
													? "✓ Контрольное число совпадает"
													: "✕ Ошибка"}
											</span>
										)}
									</label>
									<input
										id="staff-snils"
										type="text"
										value={snils}
										onChange={(e) => setSnils(e.target.value)}
										placeholder="000-000-000 00"
										maxLength={14}
									/>
								</div>

								{/* ИНН */}
								<div className="staff-profile-form-group">
									<label htmlFor="staff-inn">
										<span>ИНН (ФНС)</span>
										{innValidation && (
											<span
												className={`text-[11px] font-medium ${
													innValidation.isValid
														? "text-emerald-600 dark:text-emerald-400"
														: "text-rose-600 dark:text-rose-400"
												}`}
											>
												{innValidation.isValid
													? "✓ Валиден (ФНС)"
													: "✕ Неверный ИНН"}
											</span>
										)}
									</label>
									<input
										id="staff-inn"
										type="text"
										value={inn}
										onChange={(e) => setInn(e.target.value)}
										placeholder="12-значный ИНН физлица"
										maxLength={12}
									/>
								</div>

								{/* Медкнижка ЛМК */}
								<div className="grid grid-cols-2 gap-2">
									<div className="staff-profile-form-group">
										<label htmlFor="staff-medbook">№ Медкнижки (ЛМК)</label>
										<input
											id="staff-medbook"
											type="text"
											value={medicalBookNumber}
											onChange={(e) => setMedicalBookNumber(e.target.value)}
											placeholder="ЛМК-000000"
										/>
									</div>
									<div className="staff-profile-form-group">
										<label htmlFor="staff-medbook-date">Медосмотр до</label>
										<input
											id="staff-medbook-date"
											type="date"
											value={medicalBookCheckupDate}
											onChange={(e) =>
												setMedicalBookCheckupDate(e.target.value)
											}
										/>
									</div>
								</div>

								{medicalBookValidation && (
									<div
										className={`staff-compliance-status-box ${
											medicalBookValidation.status === "valid"
												? "valid"
												: medicalBookValidation.status === "expiring_soon"
													? "expiring"
													: "expired"
										}`}
									>
										{medicalBookValidation.status === "valid" ? (
											<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
										) : (
											<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
										)}
										<span>{medicalBookValidation.message}</span>
									</div>
								)}

								{/* Периодическая аккредитация Минздрава */}
								<div className="staff-profile-form-group">
									<label htmlFor="staff-accreditation-date">
										Дата аккредитации Минздрава РФ
									</label>
									<input
										id="staff-accreditation-date"
										type="date"
										value={minzdravAccreditationDate}
										onChange={(e) =>
											setMinzdravAccreditationDate(e.target.value)
										}
									/>
								</div>

								{accreditationValidation && (
									<div
										className={`staff-compliance-status-box ${
											accreditationValidation.status === "valid"
												? "valid"
												: accreditationValidation.status === "expiring_soon"
													? "expiring"
													: "expired"
										}`}
									>
										{accreditationValidation.status === "valid" ? (
											<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
										) : (
											<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
										)}
										<span>{accreditationValidation.message}</span>
									</div>
								)}
							</section>

							{/* Заметки и разграничение доступа */}
							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<FileText className="w-4 h-4" />
										<span>Клинические и внутренние заметки</span>
									</span>
								</h4>

								<div className="staff-profile-form-group">
									<label htmlFor="staff-clinical-notes">
										Общие клинические заметки (видны администраторам)
									</label>
									<textarea
										id="staff-clinical-notes"
										value={clinicalNotes}
										onChange={(e) => setClinicalNotes(e.target.value)}
										placeholder="График стажировок, особенности ассистирования..."
									/>
								</div>

								{canSeeManagementNotes ? (
									<div className="staff-management-notes-box">
										<div className="staff-management-notes-header">
											<Lock className="w-3.5 h-3.5" />
											<span>Заметки руководства (Главврач / Директор)</span>
										</div>
										<textarea
											value={managementNotes}
											onChange={(e) => setManagementNotes(e.target.value)}
											placeholder="Конфиденциальные HR-заметки, испытательный срок, персональные условия..."
											className="text-xs"
										/>
									</div>
								) : (
									<div className="text-xs text-slate-400 dark:text-slate-500 italic p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-2">
										<Lock className="w-3.5 h-3.5 text-slate-400" />
										<span>Заметки руководства скрыты (доступны только начмеду и директору).</span>
									</div>
								)}
							</section>
						</div>

						{/* КОЛОНКА 2: Роль, филиалы, кабинеты, тарификация */}
						<div
							className={`staff-profile-column ${
								activeTabMobile !== "payroll" ? "hidden md:flex" : ""
							}`}
						>
							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<Stethoscope className="w-4 h-4" />
										<span>Роль и специальности</span>
									</span>
								</h4>

								<div className="staff-profile-form-group">
									<label htmlFor="staff-role-select">Должность в клинике</label>
									<select
										id="staff-role-select"
										value={role}
										onChange={(e) => setRole(e.target.value as StaffRole)}
									>
										{CREATABLE_STAFF_ROLES.map((r) => (
											<option key={r} value={r}>
												{staffRoleTitle(r)}
											</option>
										))}
									</select>
								</div>

								<div className="staff-profile-form-group">
									<label>Специализации врача</label>
									<div className="flex flex-wrap gap-1.5 mt-1">
										{DENTAL_SPECIALTIES_LIST.map((spec) => {
											const isSelected = specialties.includes(spec.id);
											return (
												<button
													key={spec.id}
													type="button"
													onClick={() => handleSpecialtyToggle(spec.id)}
													className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 font-medium"
															: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500"
													}`}
												>
													{spec.label}
												</button>
											);
										})}
									</div>
								</div>
							</section>

							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<Building2 className="w-4 h-4" />
										<span>Привязка филиалов и кабинетов</span>
									</span>
								</h4>

								<div className="staff-profile-form-group">
									<label>Филиалы клиники</label>
									{clinicsList.length === 0 ? (
										<span className="text-xs text-slate-400">
											Филиалы не настроены (основной филиал)
										</span>
									) : (
										<div className="flex flex-col gap-1.5">
											{clinicsList.map((clinic: any) => {
												const checked = assignedBranches.includes(clinic.id);
												return (
													<label
														key={clinic.id}
														className="flex items-center gap-2 text-xs font-normal cursor-pointer"
													>
														<input
															type="checkbox"
															checked={checked}
															onChange={() => handleBranchToggle(clinic.id)}
															className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
														/>
														<span>{clinic.name || "Филиал"}</span>
													</label>
												);
											})}
										</div>
									)}
								</div>

								<div className="staff-profile-form-group">
									<label>Рабочие кабинеты и кресла</label>
									{chairsList.length === 0 ? (
										<span className="text-xs text-slate-400">
											Кресла клиники не настроены
										</span>
									) : (
										<div className="grid grid-cols-2 gap-1.5">
											{chairsList.map((chair: any) => {
												const checked = assignedChairIds.includes(chair.id);
												return (
													<label
														key={chair.id}
														className="flex items-center gap-2 text-xs font-normal cursor-pointer p-1.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
													>
														<input
															type="checkbox"
															checked={checked}
															onChange={() => handleChairToggle(chair.id)}
															className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
														/>
														<span className="truncate">
															{chair.name || "Кресло"}
														</span>
													</label>
												);
											})}
										</div>
									)}
								</div>
							</section>

							<section className="staff-profile-card-section">
								<h4 className="staff-profile-section-title">
									<span className="staff-profile-section-title-left">
										<DollarSign className="w-4 h-4" />
										<span>Тарификация и ставки ЗП</span>
									</span>
								</h4>

								<div className="staff-profile-form-group">
									<label htmlFor="staff-price-category">Прайс-категория</label>
									<select
										id="staff-price-category"
										value={priceCategory}
										onChange={(e) => setPriceCategory(e.target.value)}
									>
										{PRICE_CATEGORIES.map((cat) => (
											<option key={cat.id} value={cat.id}>
												{cat.label}
											</option>
										))}
									</select>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="staff-profile-form-group">
										<label htmlFor="staff-salary-rub">Окладная часть (₽)</label>
										<input
											id="staff-salary-rub"
											type="number"
											min={0}
											step={1000}
											value={baseSalaryRub}
											onChange={(e) =>
												setBaseSalaryRub(Number(e.target.value) || 0)
											}
											placeholder="50 000"
										/>
									</div>
									<div className="staff-profile-form-group">
										<label htmlFor="staff-commission-pct">Ставка ЗП (%)</label>
										<input
											id="staff-commission-pct"
											type="number"
											min={0}
											max={100}
											step={0.5}
											value={commissionPct}
											onChange={(e) =>
												setCommissionPct(Number(e.target.value) || 0)
											}
											placeholder="25 %"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="staff-profile-form-group">
										<label htmlFor="staff-mat-deduction">
											Удержание расходников (%)
										</label>
										<input
											id="staff-mat-deduction"
											type="number"
											min={0}
											max={100}
											value={materialCostDeductionPct}
											onChange={(e) =>
												setMaterialCostDeductionPct(Number(e.target.value) || 0)
											}
											placeholder="0 %"
										/>
									</div>
									<div className="staff-profile-form-group">
										<label htmlFor="staff-lab-deduction">
											Удержание ЗТЛ (%)
										</label>
										<input
											id="staff-lab-deduction"
											type="number"
											min={0}
											max={100}
											value={labCostDeductionPct}
											onChange={(e) =>
												setLabCostDeductionPct(Number(e.target.value) || 0)
											}
											placeholder="0 %"
										/>
									</div>
								</div>
							</section>
						</div>

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
											className="rounded mt-0.5 text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-slate-900 dark:text-slate-100 block">
												Подпись медицинской документации (ЭМК / 804н)
											</span>
											<span className="text-slate-500 dark:text-slate-400 text-[11px]">
												Право завершать приём, ставить диагнозы МКБ-10 и подписывать дневники 043/у.
											</span>
										</div>
									</label>

									<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-800">
										<input
											type="checkbox"
											checked={canManageMoney}
											onChange={(e) => setCanManageMoney(e.target.checked)}
											className="rounded mt-0.5 text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-slate-900 dark:text-slate-100 block">
												Касса, приём оплат и чеки 54-ФЗ
											</span>
											<span className="text-slate-500 dark:text-slate-400 text-[11px]">
												Пробитие чеков на онлайн-кассе, наличные/безналичные оплаты и возвраты.
											</span>
										</div>
									</label>

									<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-800">
										<input
											type="checkbox"
											checked={canManageImports}
											onChange={(e) => setCanManageImports(e.target.checked)}
											className="rounded mt-0.5 text-teal-600 focus:ring-teal-500"
										/>
										<div>
											<span className="font-semibold text-slate-900 dark:text-slate-100 block">
												Управление переносом данных и прайсом
											</span>
											<span className="text-slate-500 dark:text-slate-400 text-[11px]">
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
						<span>152-ФЗ • Защита персональных данных и аудит сессий активны</span>
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
