import React from "react";
import { User, Calendar, Download, Printer } from "lucide-react";
import type { PayrollDoctorOption } from "./types";

export interface PayrollTabHeaderProps {
	readonly doctorsList: readonly PayrollDoctorOption[];
	readonly selectedDoctorId: string;
	readonly onSelectDoctorId: (id: string) => void;
	readonly periodStart: string;
	readonly onPeriodStartChange: (val: string) => void;
	readonly periodEnd: string;
	readonly onPeriodEndChange: (val: string) => void;
	readonly specialtyTitle: string;
	readonly onExportCsv: () => void;
	readonly onPrintPayslip: () => void;
}

export function PayrollTabHeader({
	doctorsList,
	selectedDoctorId,
	onSelectDoctorId,
	periodStart,
	onPeriodStartChange,
	periodEnd,
	onPeriodEndChange,
	specialtyTitle,
	onExportCsv,
	onPrintPayslip,
}: PayrollTabHeaderProps): React.JSX.Element {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs">
			<div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-wrap">
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-1.5">
						<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<select
							value={selectedDoctorId}
							onChange={(e) => onSelectDoctorId(e.target.value)}
							className="h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
							aria-label="Выбор врача"
						>
							{doctorsList.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.name}
								</option>
							))}
						</select>
					</div>

					<span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-subtle,rgba(13,148,136,0.2))] font-medium">
						{specialtyTitle}
					</span>
				</div>

				<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] flex-wrap">
					<Calendar className="w-3.5 h-3.5 shrink-0" />
					<input
						type="date"
						value={periodStart}
						onChange={(e) => onPeriodStartChange(e.target.value)}
						className="h-8 px-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs w-[125px]"
						aria-label="Начало расчетного периода"
					/>
					<span>—</span>
					<input
						type="date"
						value={periodEnd}
						onChange={(e) => onPeriodEndChange(e.target.value)}
						className="h-8 px-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs w-[125px]"
						aria-label="Конец расчетного периода"
					/>
				</div>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onExportCsv}
					className="secondary-button min-h-[44px] sm:min-h-0 sm:h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 hover:bg-[var(--paper-soft,#f8fafc)] active:scale-95 transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial"
					title="Выгрузить расчетную ведомость в формате CSV (1C:Предприятие)"
				>
					<Download className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="hidden sm:inline">Экспорт ведомости (CSV)</span>
					<span className="sm:hidden">Экспорт CSV</span>
				</button>

				<button
					type="button"
					onClick={onPrintPayslip}
					className="primary-button min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial"
					title="Печать официального расчетного листка (A4)"
				>
					<Printer className="w-3.5 h-3.5 shrink-0" />
					<span>Расчетный листок</span>
				</button>
			</div>
		</div>
	);
}
