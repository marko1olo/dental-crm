import { Wallet } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import { formatRub as shortRub } from "../../../pages/analyticsDoctorMetrics.js";
import type { ReportsSummary } from "../ManagerReportsTypes";

export interface ReportsKpiReceivablesCardProps {
	readonly summary: ReportsSummary | null;
}

export const ReportsKpiReceivablesCard: React.FC<ReportsKpiReceivablesCardProps> = ({
	summary,
}) => {
	const totalDebtRub = summary?.receivables?.totalDebtRub ?? 0;
	const debtors = summary?.receivables?.debtors ?? 0;
	const totalPrepaidRub = summary?.receivables?.totalPrepaidRub ?? 0;

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
				<span className="font-semibold uppercase tracking-wider">
					4. Баланс и долги
				</span>
				<Wallet className="w-4 h-4 text-[var(--teal,#0d9488)]" />
			</div>
			<div
				className="text-2xl font-extrabold text-[var(--ink)]"
				title={`Долг: ${money(totalDebtRub)}, авансы: ${money(totalPrepaidRub)}`}
			>
				{shortRub(totalDebtRub)}
			</div>
			<div className="text-xs text-[var(--muted)] mt-1 flex items-center justify-between">
				<span>Должников: {debtors}</span>
				{totalPrepaidRub > 0 && (
					<span className="text-[11px] text-[var(--teal,#0d9488)]">
						Авансы: {shortRub(totalPrepaidRub)}
					</span>
				)}
			</div>
		</div>
	);
};
