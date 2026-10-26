import React from "react";
import { CheckCircle2, FileText } from "lucide-react";

interface BatchWriteoffProcedureTabProps {
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly patientName?: string | undefined;
}

export const BatchWriteoffProcedureTab: React.FC<BatchWriteoffProcedureTabProps> = ({
	procedureTitle,
	serviceCode,
	patientName,
}) => {
	return (
		<div className="space-y-3 text-xs">
			<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-1.5 font-bold text-sm text-[var(--ink)]">
					<FileText size={16} className="text-teal-600" />
					<span>{procedureTitle || "Клиническая процедура приёма"}</span>
				</div>
				{serviceCode && (
					<p className="text-[11px] text-[var(--muted)] font-mono mt-0.5">Код услуги: {serviceCode}</p>
				)}
				{patientName && (
					<p className="text-xs text-[var(--ink)] mt-1">Пациент: <strong>{patientName}</strong></p>
				)}
			</div>

			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-2">
				<div className="font-semibold text-[var(--muted)] uppercase text-[11px]">
					Расходные материалы по протоколу приёма:
				</div>
				<div className="divide-y divide-[var(--line-subtle)]">
					<div className="py-2 flex items-center justify-between">
						<span className="font-medium text-[var(--ink)]">Композит светового отверждения (Filtek Z250 / Estelite)</span>
						<strong className="font-mono text-teal-700 dark:text-teal-300">1 доза (0.3 г)</strong>
					</div>
					<div className="py-2 flex items-center justify-between">
						<span className="font-medium text-[var(--ink)]">Адгезивная система V поколения (OptiBond / Single Bond)</span>
						<strong className="font-mono text-teal-700 dark:text-teal-300">1 капля (0.05 мл)</strong>
					</div>
					<div className="py-2 flex items-center justify-between">
						<span className="font-medium text-[var(--ink)]">Травильный гель ортофосфорной кислоты 37%</span>
						<strong className="font-mono text-teal-700 dark:text-teal-300">0.2 мл</strong>
					</div>
					<div className="py-2 flex items-center justify-between">
						<span className="font-medium text-[var(--ink)]">Матрица секционная, клинья деревянные, полировочные головки</span>
						<strong className="font-mono text-teal-700 dark:text-teal-300">1 комплект</strong>
					</div>
				</div>
			</div>

			<div className="p-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs text-[var(--ink)] flex items-center gap-2.5">
				<CheckCircle2 size={16} className="text-teal-600 shrink-0" />
				<span>Списание производится по факту оказания услуги без блокировки врача</span>
			</div>
		</div>
	);
};
