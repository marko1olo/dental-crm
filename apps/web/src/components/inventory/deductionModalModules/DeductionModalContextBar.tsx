import { ShieldAlert } from "lucide-react";
import React from "react";

export interface DeductionModalContextBarProps {
	readonly doctorName: string;
	readonly patientName: string;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly overdraftCount: number;
}

export const DeductionModalContextBar: React.FC<DeductionModalContextBarProps> = ({
	doctorName,
	patientName,
	serviceCode,
	service804nCode,
	overdraftCount,
}) => {
	const code = serviceCode || service804nCode;
	return (
		<>
			<div className="px-4 py-2 border-b border-[var(--line-subtle)] bg-[var(--paper-soft)]/50 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)] shrink-0">
				<div className="flex items-center gap-3 flex-wrap">
					<span>Врач: <strong className="text-[var(--ink)]">{doctorName}</strong></span>
					<span>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span>
					{code && (
						<span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
							Код услуги: {code}
						</span>
					)}
				</div>
				<div className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
					Технологическая карта материалов
				</div>
			</div>
			{overdraftCount > 0 && (
				<div
					className="mx-4 mt-2.5 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 shrink-0"
					data-testid="overdraft-warning-badge"
				>
					<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<div className="min-w-0">
						<span className="font-semibold">Ожидается поставка (мягкий овердрафт): {overdraftCount} поз.</span>{" "}
						<span className="text-[11px] opacity-90">
							Списание разрешено. Нулевой остаток не блокирует приём пациента.
						</span>
					</div>
				</div>
			)}
		</>
	);
};
