import type { StaffRole } from "@dental/shared";
import { Check, Link as LinkIcon, Mail } from "lucide-react";
import type React from "react";
import {
	INVITABLE_STAFF_ROLES,
	inviteRoleTitle,
} from "../settingsInviteRoles";
import { useInviteStaffForm } from "./useInviteStaffForm";

export const InviteStaffCard: React.FC = () => {
	const {
		inviteEmail,
		setInviteEmail,
		inviteRole,
		setInviteRole,
		inviteLink,
		loading,
		copied,
		handleGenerateInvite,
		handleCopy,
	} = useInviteStaffForm();

	return (
		<article className="p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
			<div className="mb-4">
				<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 m-0">
					<Mail size={18} className="text-[var(--teal)]" /> Пригласить сотрудника
				</h3>
				<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 m-0">
					Сгенерируйте ссылку для регистрации нового врача, ассистента или администратора.
				</p>
			</div>
			<form onSubmit={handleGenerateInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2.5 items-center">
				<input
					type="email"
					placeholder="email@example.com"
					value={inviteEmail}
					onChange={(e) => setInviteEmail(e.target.value)}
					className="w-full px-3.5 py-2 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
				/>
				<select
					id="invite-role"
					aria-label="Роль нового сотрудника"
					value={inviteRole}
					onChange={(e) => setInviteRole(e.target.value as StaffRole)}
					className="w-full sm:w-auto px-3.5 py-2 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 min-w-[160px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
				>
					{INVITABLE_STAFF_ROLES.map((role) => (
						<option key={role} value={role}>{inviteRoleTitle(role)}</option>
					))}
				</select>
				<button
					type="submit"
					className="w-full sm:w-auto px-4 py-2 min-h-[44px] rounded-lg bg-[var(--teal)] hover:bg-[#0f766e] text-white font-semibold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 touch-manipulation shadow-xs"
				>
					{loading ? "Создание..." : "Сгенерировать"}
				</button>
			</form>

			{inviteLink && (
				<div
					className="mt-4 p-3 rounded-lg border flex items-center justify-between"
					style={{
						borderColor: "var(--teal-ring, var(--line-strong))",
						background: "var(--teal-surface, var(--paper-soft))",
						color: "var(--ink)",
					}}
				>
					<span className="font-mono text-xs break-all" style={{ color: "var(--teal-dark, var(--teal))" }}>
						{inviteLink}
					</span>
					<button
						type="button"
						onClick={handleCopy}
						className="secondary-button ml-3 shrink-0 flex items-center gap-1"
						style={{ minHeight: "36px", fontSize: "12px" }}
					>
						{copied ? (
							<span className="flex items-center gap-1">
								<Check size={14} className="text-emerald-500" /> Скопировано
							</span>
						) : (
							<span className="flex items-center gap-1">
								<LinkIcon size={14} /> Копировать
							</span>
						)}
					</button>
				</div>
			)}
		</article>
	);
};
