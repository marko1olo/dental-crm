import React from "react";
import type { StaffMember } from "@dental/shared";
import { KeyRound, Phone, ShieldCheck, Users } from "lucide-react";
import { staffRoleTitle } from "../settingsInviteRoles";

interface MobileStaffListProps {
	staffMembers: StaffMember[];
	onOpenPinModal: (member: StaffMember) => void;
}

export const MobileStaffList: React.FC<MobileStaffListProps> = ({
	staffMembers,
	onOpenPinModal,
}) => {
	if (staffMembers.length === 0) {
		return (
			<div className="p-6 my-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs text-center flex flex-col items-center gap-3">
				<Users size={32} className="text-[var(--muted)]" />
				<h4 className="text-[16px] font-bold text-[var(--ink)]">Сотрудники не найдены</h4>
				<p className="text-[13px] text-[var(--muted)] max-w-xs">
					Добавьте нового врача или администратора клиники.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
			{staffMembers.map((member) => (
				<div
					key={member.id}
					className="p-3.5 flex flex-col gap-2.5 transition-colors"
					data-testid={`mobile-staff-row-${member.id}`}
				>
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div
								className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base text-white shrink-0 shadow-xs"
								style={{ backgroundColor: member.color || "var(--teal, #0d9488)" }}
							>
								{member.fullName ? member.fullName.charAt(0) : "S"}
							</div>

							<div className="min-w-0 flex-1">
								<h4 className="text-[15px] font-semibold text-[var(--ink)] truncate leading-tight">
									{member.fullName}
								</h4>
								<div className="flex items-center gap-2 mt-0.5">
									<span className="text-[12px] font-medium text-[var(--muted)]">
										{staffRoleTitle(String(member.role ?? ""))}
									</span>
									{member.role === "doctor" && (
										<span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300">
											<ShieldCheck size={10} /> Автономия
										</span>
									)}
								</div>
							</div>
						</div>

						{member.phone && (
							<a
								href={`tel:${String(member.phone).replace(/[^\d+]/g, "")}`}
								className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
								aria-label={`Позвонить ${member.fullName}`}
							>
								<Phone size={18} />
							</a>
						)}
					</div>

					<div className="flex items-center gap-2 pt-2 border-t border-[var(--line-subtle)]">
						<button
							type="button"
							onClick={() => onOpenPinModal(member)}
							className="flex-1 min-h-[38px] h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
						>
							<KeyRound size={13} className="text-[var(--teal)]" />
							<span>PIN-код планшета</span>
						</button>

						<span className="text-xs font-mono text-[var(--muted)] px-2">
							{member.phone || "телефон не указан"}
						</span>
					</div>
				</div>
			))}
		</div>
	);
};
