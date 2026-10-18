import { User } from "lucide-react";
import type React from "react";
import { settingsTabTitle } from "../settingsDeepLink";
import { staffRoleTitle } from "../settingsInviteRoles";
import type { StaffProfile } from "../settingsProfileLoad";

interface Props {
	profile: StaffProfile;
}

export const ProfilePersonalDataSection: React.FC<Props> = ({ profile }) => {
	return (
		<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
			<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
				<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
					<User size={18} aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">Личные данные</h3>
					<p className="text-xs text-[var(--muted)] m-0">Основные сведения учетной записи сотрудника</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="flex flex-col gap-1.5 md:col-span-2">
					<label className="text-xs font-semibold text-[var(--muted)]">ФИО сотрудника</label>
					<input
						type="text"
						value={profile.fullName}
						disabled
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Электронная почта</label>
					<input
						type="email"
						value={profile.email || "Не указан"}
						disabled
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Роль в клинике</label>
					<input
						type="text"
						value={staffRoleTitle(profile.role)}
						disabled
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
					/>
				</div>
			</div>

			<p className="mt-3.5 text-xs text-[var(--muted)] m-0">
				Изменить ФИО или почту может владелец клиники на вкладке «{settingsTabTitle("staff")}».
			</p>
		</section>
	);
};
