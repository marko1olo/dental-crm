import { Edit3 } from "lucide-react";
import React from "react";
import type { Chair } from "@dental/shared";

interface ClinicChairCardHeaderProps {
	chair: Chair;
	specialtyLabels: Record<string, string>;
	onEditChair?: ((chair: Chair) => void) | undefined;
	onToggleActive: () => void;
}

export function ClinicChairCardHeader({
	chair,
	specialtyLabels,
	onEditChair,
	onToggleActive,
}: ClinicChairCardHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
			<div className="flex items-center gap-2.5">
				<div
					className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
					style={{
						backgroundColor: (chair as any).color ? `${(chair as any).color}22` : "rgba(13, 148, 136, 0.1)",
						color: (chair as any).color || "var(--primary)",
					}}
				>
					<span
						className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-white/50"
						style={{ backgroundColor: (chair as any).color || "#AEA7D3" }}
						title={`Цветовой маркер в расписании: ${(chair as any).color || "Лаванда (#AEA7D3)"}`}
					/>
				</div>
				<div>
					<div className="flex items-center gap-2">
						<strong className="text-sm font-bold text-[var(--ink)] block">{chair.name}</strong>
						{onEditChair && (
							<button
								type="button"
								onClick={() => onEditChair(chair)}
								className="text-[var(--muted)] hover:text-teal-600 cursor-pointer p-0.5 rounded transition-colors"
								title="Редактировать параметры кресла"
								aria-label={`Редактировать ${chair.name}`}
							>
								<Edit3 size={13} />
							</button>
						)}
					</div>
					<p className="text-xs text-[var(--muted)] m-0">
						{chair.room ?? "кабинет не указан"} ·{" "}
						{chair.specialization ? specialtyLabels[chair.specialization] : "универсально"}
						{(chair as any).defaultDoctorId && " · Врач закреплён"}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2.5 flex-wrap">
				<div className="flex items-center gap-1.5 flex-wrap">
					{chair.hasXraySensor && (
						<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
							RVG
						</span>
					)}
					{chair.hasMicroscope && (
						<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
							Микроскоп
						</span>
					)}
					{chair.hasSurgeryKit && (
						<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
							Хирургия
						</span>
					)}
					{!chair.hasXraySensor && !chair.hasMicroscope && !chair.hasSurgeryKit && (
						<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-[var(--muted)]">
							Базовое
						</span>
					)}
				</div>

				<label
					className="relative inline-flex items-center cursor-pointer shrink-0 ml-1"
					title={chair.active ? "Кресло активно в расписании" : "Кресло отключено"}
				>
					<input
						type="checkbox"
						checked={chair.active}
						onChange={onToggleActive}
						className="sr-only peer"
						aria-label={`Активность кресла ${chair.name}`}
					/>
					<div className="w-[51px] h-[31px] bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-teal-600"></div>
				</label>
			</div>
		</div>
	);
}
