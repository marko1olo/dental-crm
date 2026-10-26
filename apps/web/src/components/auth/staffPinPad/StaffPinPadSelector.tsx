import React from "react";
import { LogOut, Users, Zap } from "lucide-react";
import { panelStateText } from "../../../lib/panelStateText";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { DEMO_CHIEF_DOCTOR, STAFF_UNLOCK_LIST_SUBJECT } from "../staffUnlockState";
import { getDemoShowcaseStaff } from "../../../utils/demoModeEngine";
import { StaffPinPadCard } from "./StaffPinPadCards";
import type { StaffUser } from "./staffPinPadTypes";

interface StaffPinPadSelectorProps {
	listPhase: "loading" | "failed" | "empty" | "ready";
	activeStaff: StaffUser[];
	selectedUser: StaffUser | null;
	staffListStatus: number | null;
	onSelectUser: (staff: StaffUser) => void;
	onRetryStaffList: () => void;
	onClinicLogout: () => void;
}

export function StaffPinPadSelector({
	listPhase,
	activeStaff,
	selectedUser,
	staffListStatus,
	onSelectUser,
	onRetryStaffList,
	onClinicLogout,
}: StaffPinPadSelectorProps) {
	return (
		<div className="auth-modal-left">
			<div className="auth-header">
				<h3 className="auth-title">
					<Users size={18} className="auth-icon-inline" />
					Сотрудники клиники
				</h3>
				<p className="auth-subtitle">Выберите свой профиль для разблокировки смены</p>
			</div>

			<div className="auth-staff-grid">
				{listPhase === "loading" && (
					<div className="col-span-full flex flex-col gap-2.5">
						<div
							className="p-2.5 text-center rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] text-xs text-[var(--muted)] bg-[var(--paper-soft)] flex items-center justify-center gap-2"
							role="status"
							aria-live="polite"
						>
							<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
							<span>{panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "loading" }).title}</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<div className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1.5 px-0.5">
								<Zap size={12} className="text-[var(--teal,#0d9488)]" />
								<span>Быстрый вход / Демо-профиль:</span>
							</div>
							{(getDemoShowcaseStaff() as unknown as StaffUser[]).slice(0, 4).map((staff) => (
								<StaffPinPadCard
									key={staff.id}
									staff={staff}
									isSelected={selectedUser?.id === staff?.id}
									pinHint="PIN: 1111"
									onSelect={onSelectUser}
								/>
							))}
						</div>
					</div>
				)}

				{listPhase === "failed" && (
					<div className="col-span-full flex flex-col gap-3">
						<PanelLoadFailure subject={STAFF_UNLOCK_LIST_SUBJECT} status={staffListStatus} onRetry={onRetryStaffList} className="col-span-full" />
						<div className="p-3 rounded-xl bg-[rgba(13,148,136,0.06)] dark:bg-[rgba(13,148,136,0.12)] border border-[var(--teal,#0d9488)]/25 flex flex-col gap-2">
							<div className="text-xs text-[var(--teal,#0d9488)] font-semibold flex items-center gap-1.5">
								<Zap size={14} /> <span>Автономный режим / Вход без сервера:</span>
							</div>
							<StaffPinPadCard staff={DEMO_CHIEF_DOCTOR as StaffUser} isSelected={selectedUser?.id === DEMO_CHIEF_DOCTOR.id} pinHint="Резервный доступ (PIN: 1111)" onSelect={onSelectUser} />
						</div>
					</div>
				)}

				{listPhase === "empty" && (
					<div className="col-span-full flex flex-col gap-3">
						<div className="p-4 text-center rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] text-xs text-[var(--muted)] bg-[var(--paper-soft)]">
							{panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "empty" }).title}. {panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "empty" }).hint}
						</div>
						<div className="p-3 rounded-xl bg-[rgba(13,148,136,0.06)] dark:bg-[rgba(13,148,136,0.12)] border border-[var(--teal,#0d9488)]/25 flex flex-col gap-2">
							<div className="text-xs text-[var(--teal,#0d9488)] font-semibold flex items-center gap-1.5">
								<Zap size={14} /> <span>Резервный профиль для начала работы:</span>
							</div>
							<StaffPinPadCard staff={DEMO_CHIEF_DOCTOR as StaffUser} isSelected={selectedUser?.id === DEMO_CHIEF_DOCTOR.id} pinHint="Резервный доступ (PIN: 1111)" onSelect={onSelectUser} />
						</div>
					</div>
				)}

				{listPhase === "ready" &&
					(activeStaff ?? []).map((staff) => (
						<StaffPinPadCard
							key={staff?.id}
							staff={staff}
							isSelected={selectedUser?.id === staff?.id}
							onSelect={onSelectUser}
						/>
					))}
			</div>

			<div className="auth-footer-actions">
				<button type="button" className="auth-link-btn auth-link-btn--muted" onClick={onClinicLogout}>
					<LogOut size={14} /> Выйти из аккаунта клиники
				</button>
			</div>
		</div>
	);
}
