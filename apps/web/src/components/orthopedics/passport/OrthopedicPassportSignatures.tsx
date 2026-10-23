import React from "react";

export interface OrthopedicPassportSignaturesProps {
	readonly doctorName: string;
	readonly technicianName: string;
	readonly patientName: string;
}

export function OrthopedicPassportSignatures({
	doctorName,
	technicianName,
	patientName,
}: OrthopedicPassportSignaturesProps) {
	return (
		<div className="border-t border-slate-300 dark:border-slate-700 pt-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
			<div>
				<span className="text-[10px] uppercase font-bold text-slate-400 block mb-5">Врач-ортопед</span>
				<div className="border-b border-slate-400 dark:border-slate-600 pb-0.5 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
					/ _____________________ / {doctorName}
				</div>
				<span className="text-[10px] text-slate-400">М.П. Клиники</span>
			</div>

			<div>
				<span className="text-[10px] uppercase font-bold text-slate-400 block mb-5">Зубной техник</span>
				<div className="border-b border-slate-400 dark:border-slate-600 pb-0.5 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
					/ _____________________ / {technicianName}
				</div>
				<span className="text-[10px] text-slate-400">Штамп лаборатории</span>
			</div>

			<div>
				<span className="text-[10px] uppercase font-bold text-slate-400 block mb-5">Пациент (с условиями ознакомлен)</span>
				<div className="border-b border-slate-400 dark:border-slate-600 pb-0.5 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
					/ _____________________ / {patientName}
				</div>
				<span className="text-[10px] text-slate-400">Подпись пациента</span>
			</div>
		</div>
	);
}
