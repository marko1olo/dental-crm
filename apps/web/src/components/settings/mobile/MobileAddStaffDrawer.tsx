import React, { useState } from "react";
import type { StaffRole } from "@dental/shared";
import { X } from "lucide-react";
import { staffRoleTitle, CREATABLE_STAFF_ROLES } from "../settingsInviteRoles";

interface MobileAddStaffDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	isSubmitting: boolean;
	onAddStaff: (data: { fullName: string; role: StaffRole; phone?: string; snils?: string }) => void;
}

export const MobileAddStaffDrawer: React.FC<MobileAddStaffDrawerProps> = ({
	isOpen,
	onClose,
	isSubmitting,
	onAddStaff,
}) => {
	const [newName, setNewName] = useState("");
	const [newRole, setNewRole] = useState<StaffRole>("doctor");
	const [newPhone, setNewPhone] = useState("");
	const [newSnils, setNewSnils] = useState("");

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onAddStaff({ fullName: newName, role: newRole, phone: newPhone, snils: newSnils });
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
			<div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
			<div className="relative z-10 w-full max-h-[90dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
				<div className="flex justify-center pt-3 pb-2 cursor-grab" onClick={onClose}>
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				<div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line-subtle)] shrink-0">
					<h3 className="text-[17px] font-semibold text-[var(--ink)]">Новый сотрудник</h3>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--muted)]">ФИО сотрудника *</label>
						<input
							type="text"
							required
							placeholder="Иванов Алексей Владимирович"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--muted)]">Должность / Роль</label>
						<select
							value={newRole}
							onChange={(e) => setNewRole(e.target.value as StaffRole)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
						>
							{CREATABLE_STAFF_ROLES.map((r) => (
								<option key={r} value={r}>{staffRoleTitle(r)}</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--muted)]">Телефон сотрудника</label>
						<input
							type="tel"
							inputMode="tel"
							placeholder="+7 (999) 000-00-00"
							value={newPhone}
							onChange={(e) => setNewPhone(e.target.value)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--muted)]">СНИЛС (для электронных карт)</label>
						<input
							type="text"
							placeholder="000-000-000 00"
							value={newSnils}
							onChange={(e) => setNewSnils(e.target.value)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>

					<div className="pt-2">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
						>
							<span>{isSubmitting ? "Добавление..." : "Добавить сотрудника"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
