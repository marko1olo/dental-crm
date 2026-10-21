import type { StaffRole } from "@dental/shared";
import { ShieldCheck, UserPlus } from "lucide-react";
import type React from "react";
import { DoctorSnilsValidationWidget } from "../DoctorSnilsValidationWidget";
import { CREATABLE_STAFF_ROLES, staffRoleTitle } from "../settingsInviteRoles";
import type { SettingsAccessHeaders } from "../staffMutationRequest";
import { useStaffAddForm } from "./useStaffAddForm";

interface StaffAddFormProps {
	accessHeaders?: SettingsAccessHeaders | undefined;
	loadDashboard?: (() => Promise<unknown>) | undefined;
}

export const StaffAddForm: React.FC<StaffAddFormProps> = ({ accessHeaders, loadDashboard }) => {
	const { loading, name, setName, role, setRole, phone, setPhone, email, setEmail, snils, setSnils, handleSubmit } =
		useStaffAddForm(accessHeaders, loadDashboard);

	return (
		<article className="settings-card" data-testid="staff-add-form-card">
			<div className="settings-card-header">
				<h4 className="flex items-center gap-2 m-0 text-sm font-semibold text-[var(--ink)]">
					<UserPlus size={18} className="text-[var(--teal)]" /> Добавить сотрудника
				</h4>
			</div>
			<form onSubmit={handleSubmit} className="settings-card-body space-y-3">
				<label className="block text-xs font-medium text-[var(--muted)]">
					ФИО
					<input
						type="text"
						placeholder="Иванов Иван Иванович"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full mt-1 h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
				</label>
				<label className="block text-xs font-medium text-[var(--muted)]">
					Должность
					<select
						value={role}
						onChange={(e) => setRole(e.target.value as StaffRole)}
						className="w-full mt-1 h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					>
						{CREATABLE_STAFF_ROLES.map((r) => (
							<option key={r} value={r}>{staffRoleTitle(r)}</option>
						))}
					</select>
				</label>
				<label className="block text-xs font-medium text-[var(--muted)]">
					Телефон
					<input
						type="tel"
						inputMode="tel"
						placeholder="+7 (999) 000-00-00"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						className="w-full mt-1 h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
				</label>
				<label className="block text-xs font-medium text-[var(--muted)]">
					Email (логин)
					<input
						type="email"
						placeholder="doctor@clinic.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full mt-1 h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
				</label>
				{role === "doctor" && (
					<DoctorSnilsValidationWidget initialSnils={snils} onValidSnils={(val) => setSnils(val)} />
				)}
				<div className="pt-2">
					<button
						className="primary-button w-full h-10 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
						type="submit"
						disabled={loading}
					>
						<ShieldCheck size={16} /> Создать сотрудника
					</button>
				</div>
			</form>
		</article>
	);
};
