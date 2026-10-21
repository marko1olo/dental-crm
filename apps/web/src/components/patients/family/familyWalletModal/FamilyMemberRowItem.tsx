/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyMemberRowItem.tsx
 * Individual family member row in wallet modal with balance and permission toggles.
 * Mandate 8b: strictly <= 120 lines.
 */

import { UserCheck, UserX } from "lucide-react";
import React from "react";
import { money } from "../../../../AppHelpers";
import type { FamilyMemberItem } from "./types";

export interface FamilyMemberRowItemProps {
	readonly member: FamilyMemberItem;
	readonly isCurrent: boolean;
	readonly isHead: boolean;
	readonly canSpend: boolean;
	readonly onTogglePermission: (memberId: string) => void;
}

export const FamilyMemberRowItem: React.FC<FamilyMemberRowItemProps> =
	React.memo(function FamilyMemberRowItem({
		member,
		isCurrent,
		isHead,
		canSpend,
		onTogglePermission,
	}) {
		const initialLetter =
			member.fullName?.trim().charAt(0).toUpperCase() || "П";

		return (
			<div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--paper-soft)] transition-colors">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
						{initialLetter}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs font-semibold text-[var(--ink)] truncate">
								{member.fullName}
							</span>
							{isHead && (
								<span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
									Глава
								</span>
							)}
							{isCurrent && (
								<span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300">
									Текущий
								</span>
							)}
							{member.roleRu && (
								<span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
									{member.roleRu}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
							{member.phone && <span>{member.phone}</span>}
							{member.personalBalanceRub !== undefined && (
								<span>Личный баланс: {money(member.personalBalanceRub)}</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
					<div className="text-left sm:text-right">
						<span className="text-xs font-semibold text-[var(--ink)] block">
							{canSpend ? "Доступ к общему счету" : "Списание ограничено"}
						</span>
						<span
							className={`text-[10px] block font-medium ${canSpend ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
						>
							{canSpend ? "✓ 100% покрытие" : "Списание ограничено"}
						</span>
					</div>

					<button
						type="button"
						onClick={() => onTogglePermission(member.id)}
						title={
							canSpend
								? "Запретить списание с общего счета"
								: "Разрешить списание с общего счета"
						}
						aria-label={`Переключить права списания для ${member.fullName}`}
						className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
							canSpend
								? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
								: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						{canSpend ? (
							<>
								<UserCheck className="w-3.5 h-3.5" />
								<span>Списание разрешено</span>
							</>
						) : (
							<>
								<UserX className="w-3.5 h-3.5" />
								<span>Списание закрыто</span>
							</>
						)}
					</button>
				</div>
			</div>
		);
	});
