/**
 * StaffRoleCommissionCard.tsx
 *
 * Карточки базовых ставок и моделей мотивации по ключевым ролям персонала клиники.
 * Соответствует Apple HIG & Delimited Tile Cards:
 * - Четкие границы 1px solid var(--line)
 * - Непрозрачная основа var(--paper)
 * - Типографическая иерархия без капслока
 */

import React from "react";
import { Award, Briefcase, Clock, Users } from "lucide-react";
import {
	STAFF_ROLE_BENCHMARKS,
	type StaffRoleBenchmark,
} from "./staffCommissionsTypes";

function getRoleIcon(roleKey: string) {
	switch (roleKey) {
		case "doctor":
			return <Award size={15} className="text-[var(--teal-dark)]" />;
		case "assistant":
			return <Clock size={15} className="text-blue-600 dark:text-blue-400" />;
		case "treatment_coordinator":
			return <Briefcase size={15} className="text-emerald-600 dark:text-emerald-400" />;
		default:
			return <Users size={15} className="text-amber-600 dark:text-amber-400" />;
	}
}

export const StaffRoleCommissionCard: React.FC = () => {
	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] mb-4"
			data-testid="staff-role-commission-benchmarks"
		>
			<div className="flex items-center justify-between gap-2 mb-2.5">
				<div>
					<h5 className="m-0 text-xs font-bold text-[var(--ink)]">
						Отраслевые стандарты оплаты труда стоматологического персонала
					</h5>
					<p className="m-0 text-[11px] text-[var(--muted)]">
						Рекомендуемые модели начисления вознаграждений по категориям сотрудников в РФ
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{STAFF_ROLE_BENCHMARKS.map((bench: StaffRoleBenchmark) => (
					<div
						key={bench.roleKey}
						className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[72px]"
						data-testid={`benchmark-card-${bench.roleKey}`}
					>
						<div>
							<div className="flex items-center justify-between gap-1.5 mb-1.5">
								<span className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
									{getRoleIcon(bench.roleKey)}
									{bench.title}
								</span>
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--teal-soft)] text-[var(--teal-dark)]">
									{bench.typicalRate}
								</span>
							</div>
							<span className="text-[11px] font-medium text-[var(--ink)] block">
								{bench.payModel}
							</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] block mt-1.5 leading-snug">
							{bench.note}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
