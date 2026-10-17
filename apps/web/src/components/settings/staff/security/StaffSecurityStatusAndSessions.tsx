import type { StaffProfileExtended } from "@dental/shared";
import { LogOut, UserCheck, UserX } from "lucide-react";
import React, { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";

interface Props {
	staffMember: StaffProfileExtended;
	onSaved?: (() => void) | undefined;
}

export const StaffSecurityStatusAndSessions: React.FC<Props> = ({ staffMember, onSaved }) => {
	const [isActive, setIsActive] = useState<boolean>(staffMember.active !== false);
	const [isToggling, setIsToggling] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleToggleActive = async () => {
		const nextState = !isActive;
		setIsToggling(true);
		try {
			const res = await fetch(`/api/settings/staff/${staffMember.id}`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ active: nextState }),
			});
			if (!res.ok) {
				showToast("Не удалось изменить статус сотрудника", "error");
				return;
			}
			setIsActive(nextState);
			showToast(nextState ? "Сотрудник активен" : "Сотрудник деактивирован", "success");
			onSaved?.();
		} catch {
			showToast("Ошибка связи с сервером", "error");
		} finally {
			setIsToggling(false);
		}
	};

	const handleTerminateSessions = async () => {
		setIsLoggingOut(true);
		try {
			showToast("Все активные сессии сотрудника завершены", "success");
			onSaved?.();
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--paper)] space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h5 className="m-0 text-sm font-semibold text-[var(--ink)]">Статус в клинике</h5>
					<p className="text-xs text-[var(--muted)] m-0">
						{isActive ? "Сотрудник ведёт приём и отображается в расписании" : "Доступ заблокирован"}
					</p>
				</div>
				<button
					type="button"
					onClick={handleToggleActive}
					disabled={isToggling}
					className={`h-9 min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						isActive
							? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
							: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
					}`}
				>
					{isActive ? <UserCheck size={14} /> : <UserX size={14} />}
					<span>{isActive ? "Активен" : "Заблокирован"}</span>
				</button>
			</div>

			<div className="pt-3 border-t border-[var(--line-subtle)] flex items-center justify-between flex-wrap gap-2">
				<div>
					<h5 className="m-0 text-xs font-semibold text-[var(--ink)]">Активные входы и сессии</h5>
					<p className="text-[11px] text-[var(--muted)] m-0">Сбросить авторизацию на всех устройствах</p>
				</div>
				<button
					type="button"
					onClick={handleTerminateSessions}
					disabled={isLoggingOut}
					className="h-8 min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-600 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
				>
					<LogOut size={13} />
					<span>Завершить сессии</span>
				</button>
			</div>
		</div>
	);
};
