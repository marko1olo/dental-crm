/**
 * apps/web/src/components/settings/insuranceModules/InsuranceDmsTariffTable.tsx
 *
 * Tariff coefficients and discounts table for DMS Insurance Contracts relative to 804n statutory pricelist.
 * Allows clinics to configure insurance price multipliers and category-specific co-pay rates.
 * Governed by Mandate 8b (<= 500 lines), Mandate 8e (Doctor Autonomy: non-blocking inline editing).
 */

import { Calculator, Percent } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { InsuranceContract } from "./insuranceContractsTypes";

interface InsuranceDmsTariffTableProps {
	contracts: InsuranceContract[];
	onUpdateContractMultiplier?: (contractId: string, multiplier: number) => void;
}

interface DefaultTariffRule {
	category: string;
	defaultCoveragePct: number;
	statutoryOrder804nSection: string;
}

const STATUTORY_804N_CATEGORIES: DefaultTariffRule[] = [
	{ category: "Терапевтическая стоматология (А16.07.002)", defaultCoveragePct: 100, statutoryOrder804nSection: "Кариес, пульпит, периодонтит" },
	{ category: "Хирургическая стоматология (А16.07.001)", defaultCoveragePct: 80, statutoryOrder804nSection: "Удаление, резекция, цистэктомия" },
	{ category: "Ортопедическая помощь (А16.07.004)", defaultCoveragePct: 50, statutoryOrder804nSection: "Коронки, вкладки, протезирование" },
	{ category: "Профессиональная гигиена (А16.07.051)", defaultCoveragePct: 100, statutoryOrder804nSection: "Air-Flow, ультразвук, фторирование" },
];

export const InsuranceDmsTariffTable: React.FC<InsuranceDmsTariffTableProps> = ({
	contracts,
}) => {
	const [activeContractId, setActiveContractId] = useState<string>(
		contracts[0]?.id ?? "",
	);

	if (contracts.length === 0) return null;

	const selectedContract =
		contracts.find((c) => c.id === activeContractId) ?? contracts[0]!;

	return (
		<div
			className="rounded-xl p-4 border mt-3"
			style={{
				borderColor: "var(--line)",
				background: "var(--surface)",
				color: "var(--ink)",
			}}
			data-testid="insurance-dms-tariff-table"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap mb-3">
				<div>
					<h3
						className="m-0 text-sm font-bold flex items-center gap-2"
						style={{ color: "var(--ink)" }}
					>
						<Calculator size={16} className="text-[var(--teal, #0d9488)] shrink-0" />
						<span>Тарифные сетки ДМС по каталогу услуг</span>
					</h3>
					<p className="m-0 mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
						Коэффициенты покрытия и гарантийные лимиты для автоматического расчёта смет
					</p>
				</div>

				{contracts.length > 1 && (
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-[var(--muted)]">Договор:</span>
						<select
							aria-label="Выбор договора для просмотра тарифов"
							value={activeContractId}
							onChange={(e) => setActiveContractId(e.target.value)}
							className="h-8 px-2 text-xs rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none"
							data-testid="select-tariff-contract"
						>
							{contracts.map((c) => (
								<option key={c.id} value={c.id}>
									{c.companyName}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-xs text-left border-collapse">
					<thead>
						<tr
							className="border-b text-[11px] font-semibold text-[var(--muted)]"
							style={{ borderColor: "var(--line)" }}
						>
							<th className="py-2 pr-3">Категория медпомощи</th>
							<th className="py-2 px-3">Раздел процедур</th>
							<th className="py-2 px-3 text-center">Франшиза</th>
							<th className="py-2 pl-3 text-right">Покрытие ДМС</th>
						</tr>
					</thead>
					<tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
						{STATUTORY_804N_CATEGORIES.map((cat, idx) => {
							const coveragePct =
								idx === 0
									? selectedContract.coverageTherapyPct
									: idx === 1
										? selectedContract.coverageSurgeryPct
										: idx === 2
											? selectedContract.coverageOrthoPct
											: selectedContract.coverageHygienePct;

							const franchise = selectedContract.patientFranchisePct ?? 0;

							return (
								<tr key={cat.category} className="hover:bg-[var(--paper-soft)]/50 transition-colors">
									<td className="py-2.5 pr-3 font-medium text-[var(--ink)]">
										{cat.category}
									</td>
									<td className="py-2.5 px-3 text-[var(--muted)]">
										{cat.statutoryOrder804nSection}
									</td>
									<td className="py-2.5 px-3 text-center">
										{franchise > 0 ? (
											<span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
												{franchise}%
											</span>
										) : (
											<span className="text-[var(--muted)] text-[11px]">0%</span>
										)}
									</td>
									<td className="py-2.5 pl-3 text-right">
										<span
											className="inline-flex items-center gap-1 font-bold text-xs"
											style={{
												color:
													coveragePct > 0
														? "var(--teal, #0d9488)"
														: "var(--muted)",
											}}
										>
											<Percent size={12} />
											<span>{coveragePct}%</span>
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};
