/**
 * RadiologyPatientResultsList.tsx — Layer 4: Список визитов и найденных снимков визиографа
 * Хронологическая группировка исследований пациента с номерами зубов и предпросмотром.
 */

import React from "react";
import { Layers, User } from "lucide-react";
import type { ClinicalVisiographyVisit } from "./types";

export interface RadiologyPatientResultsListProps {
	readonly filteredVisits: readonly ClinicalVisiographyVisit[];
	readonly onSelectVisit: (visit: ClinicalVisiographyVisit) => void;
	readonly onShowAll: () => void;
}

export const RadiologyPatientResultsList: React.FC<RadiologyPatientResultsListProps> = ({
	filteredVisits,
	onSelectVisit,
	onShowAll,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
					<Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					Визиты и приёмы со снимками ({filteredVisits.length})
				</span>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					Кликните на визит для моментального фильтра
				</span>
			</div>

			{filteredVisits.length === 0 ? (
				<div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#101b2f] border border-slate-200 dark:border-slate-800 rounded-xl text-center">
					<Layers className="w-8 h-8 text-slate-400 mb-2 stroke-1" />
					<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
						Снимков за выбранный период не найдено
					</p>
					<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
						Попробуйте выбрать «Все снимки» или изменить строку поиска
					</p>
					<button
						type="button"
						onClick={onShowAll}
						className="mt-3 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
					>
						Показать все снимки пациента
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-2" data-testid="radiology-visits-list">
					{filteredVisits.map((visit) => {
						const isToday = visit.dateStr === "2026-10-03";
						return (
							<div
								key={visit.id}
								onClick={() => onSelectVisit(visit)}
								className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
									isToday
										? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/40 hover:border-emerald-500 shadow-xs"
										: "bg-slate-50 dark:bg-[#101b2f] border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
								}`}
								data-testid={`visit-item-${visit.id}`}
							>
								<div className="flex items-start sm:items-center gap-3 min-w-0">
									{/* Дата и статус приёма */}
									<div className="flex flex-col items-start shrink-0">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
												{visit.displayDate}
											</span>
											<span
												className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
													isToday
														? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30"
														: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
												}`}
											>
												{visit.relativeLabel}
											</span>
										</div>
										<span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
											<User className="w-3 h-3" />
											{visit.doctorName} • {visit.specialty}
										</span>
									</div>

									{/* Зубы и клиническая заметка */}
									<div className="flex flex-col min-w-0">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
												Зубы:
											</span>
											{visit.teeth.map((t) => (
												<span
													key={t}
													className="px-1.5 py-0.2 text-[10px] font-bold font-mono rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25"
												>
													{t}
												</span>
											))}
										</div>
										<span className="text-[11px] text-slate-700 dark:text-slate-300 truncate mt-0.5" title={visit.clinicalNote}>
											{visit.clinicalNote}
										</span>
									</div>
								</div>

								{/* Количество снимков и кнопка действия */}
								<div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
									<span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
										{visit.shotCount} {visit.shotCount === 1 ? "RVG снимок" : "RVG снимка"}
									</span>
									<button
										type="button"
										className="px-3 py-1 text-[11px] font-bold rounded-lg text-white transition-all cursor-pointer shadow-2xs hover:opacity-90 active:scale-95"
										style={{ backgroundColor: "#059669", color: "#ffffff", border: "none" }}
									>
										Выбрать
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
