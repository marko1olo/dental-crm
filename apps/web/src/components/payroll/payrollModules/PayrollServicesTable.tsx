import React from "react";
import { FileText } from "lucide-react";
import type { DoctorCompletedServiceItem } from "../staffPayrollEngine";
import { PayrollServiceRowDesktop } from "./PayrollServiceRowDesktop";
import { PayrollServiceCardMobile } from "./PayrollServiceCardMobile";

export interface PayrollServicesTableProps {
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly isLoading: boolean;
	readonly baseCommissionPercent: number;
}

export const PayrollServicesTable: React.FC<PayrollServicesTableProps> = ({
	services,
	isLoading,
	baseCommissionPercent,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
				Детализация выполненных нарядов и приемов за период:
			</h3>

			{isLoading ? (
				<div
					className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
					data-testid="doctor-payroll-services-loading"
				>
					<div className="w-6 h-6 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin" />
					<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
						Загрузка подтвержденных нарядов и приемов из базы...
					</p>
				</div>
			) : services.length === 0 ? (
				<div
					className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
					data-testid="doctor-payroll-services-empty"
				>
					<FileText className="w-8 h-8 text-[var(--muted,#64748b)]/60" />
					<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
						Нет подтвержденных оказанных услуг за выбранный расчетный период
					</p>
					<p className="text-xs text-[var(--muted,#64748b)]">
						За выбранный диапазон дат у специалиста не зафиксировано выполненных приемов или закрытых нарядов
					</p>
				</div>
			) : (
				<>
					<div className="hidden sm:block border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
									<tr>
										<th className="p-2.5 font-semibold">Дата</th>
										<th className="p-2.5 font-semibold">Пациент</th>
										<th className="p-2.5 font-semibold">Услуга / Код / Зуб</th>
										<th className="p-2.5 font-semibold text-right">Оплачено в кассу</th>
										<th className="p-2.5 font-semibold text-right">Материалы</th>
										<th className="p-2.5 font-semibold text-right">ЗТЛ</th>
										<th className="p-2.5 font-semibold text-right">Начислено</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
									{services.map((srv) => (
										<PayrollServiceRowDesktop
											key={srv.id}
											srv={srv}
											baseCommissionPercent={baseCommissionPercent}
										/>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="block sm:hidden flex flex-col gap-2.5" data-testid="doctor-payroll-mobile-services">
						{services.map((srv) => (
							<PayrollServiceCardMobile
								key={srv.id}
								srv={srv}
								baseCommissionPercent={baseCommissionPercent}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default PayrollServicesTable;
