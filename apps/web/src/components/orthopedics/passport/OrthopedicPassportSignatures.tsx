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
		<div className="border-t border-[var(--line)] pt-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
			<div>
				<span className="text-[10px] font-bold text-[var(--ink-muted)] block mb-5">Врач-ортопед</span>
				<div className="border-b border-[var(--line)] pb-0.5 mb-1 text-[11px] font-mono text-[var(--ink)]">
					/ _____________________ / {doctorName}
				</div>
				<span className="text-[10px] text-[var(--ink-muted)]">М.П. Клиники</span>
			</div>

			<div>
				<span className="text-[10px] font-bold text-[var(--ink-muted)] block mb-5">Зубной техник</span>
				<div className="border-b border-[var(--line)] pb-0.5 mb-1 text-[11px] font-mono text-[var(--ink)]">
					/ _____________________ / {technicianName}
				</div>
				<span className="text-[10px] text-[var(--ink-muted)]">Штамп лаборатории</span>
			</div>

			<div>
				<span className="text-[10px] font-bold text-[var(--ink-muted)] block mb-5">Пациент (с условиями ознакомлен)</span>
				<div className="border-b border-[var(--line)] pb-0.5 mb-1 text-[11px] font-mono text-[var(--ink)]">
					/ _____________________ / {patientName}
				</div>
				<span className="text-[10px] text-[var(--ink-muted)]">Подпись пациента</span>
			</div>
		</div>
	);
}
