/**
 * apps/web/src/components/settings/StaffProfileRequisitesSection.tsx
 *
 * Column 1 of StaffProfileCard: Personal details, HR requisites, SNILS/INN validation,
 * medical books, accreditation, clinical & management notes.
 *
 * Mandate 8b: Strictly <= 800 lines.
 * Mandate 8f: Fully tokenized theme variables (zero hardcoded slate/white).
 */

import React from "react";
import { User, FileText, CheckCircle2, X, AlertCircle, Lock } from "lucide-react";
import type {
	validateStaffSnils,
	validateStaffInn,
	validateMedicalBook,
	validateMinzdravAccreditation,
} from "@dental/shared";

export interface StaffProfileRequisitesSectionProps {
	readonly fullName: string;
	readonly setFullName: (v: string) => void;
	readonly phone: string;
	readonly setPhone: (v: string) => void;
	readonly email: string;
	readonly setEmail: (v: string) => void;
	readonly snils: string;
	readonly setSnils: (v: string) => void;
	readonly inn: string;
	readonly setInn: (v: string) => void;
	readonly medicalBookNumber: string;
	readonly setMedicalBookNumber: (v: string) => void;
	readonly medicalBookCheckupDate: string;
	readonly setMedicalBookCheckupDate: (v: string) => void;
	readonly minzdravAccreditationDate: string;
	readonly setMinzdravAccreditationDate: (v: string) => void;
	readonly clinicalNotes: string;
	readonly setClinicalNotes: (v: string) => void;
	readonly managementNotes: string;
	readonly setManagementNotes: (v: string) => void;
	readonly canSeeManagementNotes: boolean;
	readonly snilsValidation: ReturnType<typeof validateStaffSnils> | null;
	readonly innValidation: ReturnType<typeof validateStaffInn> | null;
	readonly medicalBookValidation: ReturnType<typeof validateMedicalBook> | null;
	readonly accreditationValidation: ReturnType<typeof validateMinzdravAccreditation> | null;
	readonly activeTabMobile: "requisites" | "payroll" | "security";
}

export const StaffProfileRequisitesSection: React.FC<StaffProfileRequisitesSectionProps> = ({
	fullName,
	setFullName,
	phone,
	setPhone,
	email,
	setEmail,
	snils,
	setSnils,
	inn,
	setInn,
	medicalBookNumber,
	setMedicalBookNumber,
	medicalBookCheckupDate,
	setMedicalBookCheckupDate,
	minzdravAccreditationDate,
	setMinzdravAccreditationDate,
	clinicalNotes,
	setClinicalNotes,
	managementNotes,
	setManagementNotes,
	canSeeManagementNotes,
	snilsValidation,
	innValidation,
	medicalBookValidation,
	accreditationValidation,
	activeTabMobile,
}) => {
	return (
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
								className={`text-[11px] font-medium inline-flex items-center ${
									snilsValidation.isValid
										? "text-emerald-600 dark:text-emerald-400"
										: "text-rose-600 dark:text-rose-400"
								}`}
							>
								{snilsValidation.isValid ? (
									<>
										<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
										<span>Контрольное число совпадает</span>
									</>
								) : (
									<>
										<X size={13} className="inline mr-1 shrink-0" />
										<span>Ошибка</span>
									</>
								)}
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
								className={`text-[11px] font-medium inline-flex items-center ${
									innValidation.isValid
										? "text-emerald-600 dark:text-emerald-400"
										: "text-rose-600 dark:text-rose-400"
								}`}
							>
								{innValidation.isValid ? (
									<>
										<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
										<span>Валиден (ФНС)</span>
									</>
								) : (
									<>
										<X size={13} className="inline mr-1 shrink-0" />
										<span>Неверный ИНН</span>
									</>
								)}
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
					<div className="text-xs text-[var(--muted)] italic p-2.5 bg-[var(--paper-soft)] rounded-lg border border-[var(--line)] flex items-center gap-2">
						<Lock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
						<span>Заметки руководства скрыты (доступны только руководству и директору).</span>
					</div>
				)}
			</section>
		</div>
	);
};
