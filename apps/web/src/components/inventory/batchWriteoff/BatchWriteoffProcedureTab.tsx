import React from "react";

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
				<h4 className="font-bold text-sm text-[var(--ink)]">
					{procedureTitle || "Клиническая процедура приёма"}
				</h4>
				{serviceCode && (
					<p className="text-[11px] text-[var(--muted)] font-mono mt-0.5">Код: {serviceCode}</p>
				)}
				{patientName && (
					<p className="text-xs text-[var(--ink)] mt-1">Пациент: <strong>{patientName}</strong></p>
				)}
			</div>

			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-2">
				<div className="font-semibold text-[var(--muted)] uppercase text-[11px]">
					Материалы техкарты к списанию:
				</div>
				<div className="divide-y divide-[var(--line-subtle)]">
					<div className="py-1.5 flex items-center justify-between">
						<span>Композитный материал светового отверждения (Filtek Z250 / Estelite)</span>
						<strong className="font-mono">1 доза (0.3 г)</strong>
					</div>
					<div className="py-1.5 flex items-center justify-between">
						<span>Адгезивная система V поколения (OptiBond / Single Bond)</span>
						<strong className="font-mono">1 капля (0.05 мл)</strong>
					</div>
					<div className="py-1.5 flex items-center justify-between">
						<span>Травильный гель ортофосфорной кислоты 37%</span>
						<strong className="font-mono">0.2 мл</strong>
					</div>
					<div className="py-1.5 flex items-center justify-between">
						<span>Матрица секционная, клинья деревянные, полиры</span>
						<strong className="font-mono">1 комплект</strong>
					</div>
				</div>
			</div>
		</div>
	);
};
