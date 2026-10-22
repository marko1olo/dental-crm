import React from "react";

interface GeneralCleaningExposureFieldsProps {
	exposureMinutes: number;
	setExposureMinutes: (m: number) => void;
	uvMinutes: number;
	setUvMinutes: (m: number) => void;
	ventilationMinutes: number;
	setVentilationMinutes: (m: number) => void;
	operatorStaffName: string;
	setOperatorStaffName: (n: string) => void;
	nextPlannedDate: string;
}

export function GeneralCleaningExposureFields(p: GeneralCleaningExposureFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Экспозиция (мин)
					</label>
					<input
						type="number"
						min="5"
						max="240"
						value={p.exposureMinutes}
						onChange={(e) => p.setExposureMinutes(parseInt(e.target.value) || 0)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
						required
					/>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						УФ-облучение (мин)
					</label>
					<input
						type="number"
						min="0"
						max="240"
						value={p.uvMinutes}
						onChange={(e) => p.setUvMinutes(parseInt(e.target.value) || 0)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
						required
					/>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Проветривание (мин)
					</label>
					<input
						type="number"
						min="0"
						max="120"
						value={p.ventilationMinutes}
						onChange={(e) => p.setVentilationMinutes(parseInt(e.target.value) || 0)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
						required
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						ФИО ответственного исполнителя
					</label>
					<input
						type="text"
						value={p.operatorStaffName}
						onChange={(e) => p.setOperatorStaffName(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-medium"
						required
					/>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div>
						<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Следующая плановая уборка:</div>
						<div className="text-sm font-extrabold text-[var(--ink,#0f172a)]">{p.nextPlannedDate}</div>
					</div>
					<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
						Интервал 7 дней
					</span>
				</div>
			</div>
		</>
	);
}
