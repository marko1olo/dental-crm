/**
 * OrthopedicsProtocolsGrid.tsx — Сетка канонических ортопедических протоколов (1 клик).
 *
 * Декомпозиция монолита OrthopedicsChairsidePanel (Мандат 8b: строго <= 800 строк).
 * Тач-таргеты min-h-[48px] (Мандат 8e, Apple HIG).
 */

import React from "react";
import { Check, FileText, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { DentalCrown, DentalVeneer, DentalBridge } from "../icons/DentalIcons.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	type OrthopedicProtocolPreset,
} from "./orthopedicProtocols.js";

export interface OrthopedicsProtocolsGridProps {
	readonly appliedProtocolId: string | null;
	readonly onApplyProtocol: (protocol: OrthopedicProtocolPreset) => void;
}

export function getProtocolIcon(category: OrthopedicProtocolPreset["category"]) {
	switch (category) {
		case "prep_crown":
			return <DentalCrown size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />;
		case "try_in":
			return <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />;
		case "permanent_cementation":
			return <DentalVeneer size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
		case "removable_prosthetics":
			return <DentalBridge size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />;
		case "consultation_norm":
			return <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
	}
}

export function OrthopedicsProtocolsGrid({
	appliedProtocolId,
	onApplyProtocol,
}: OrthopedicsProtocolsGridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
			{ORTHOPEDIC_CANONICAL_PROTOCOLS.map((proto) => {
				const isApplied = appliedProtocolId === proto.id;

				return (
					<div
						key={proto.id}
						className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors flex flex-col justify-between gap-2"
					>
						<div className="flex items-start gap-2">
							{getProtocolIcon(proto.category)}
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-1">
									<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
										{proto.shortLabel}
									</h4>
									<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
										{proto.defaultIcd10}
									</span>
								</div>
								<p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
									{proto.treatment}
								</p>
							</div>
						</div>

						<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
							<div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
								Номенклатура: {proto.order804nServices.map((s) => s.code).join(", ")}
							</div>

							<button
								type="button"
								onClick={() => onApplyProtocol(proto)}
								className={`min-h-[48px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
									isApplied
										? "bg-emerald-600 text-white"
										: "bg-teal-600 hover:bg-teal-700 text-white"
								}`}
								data-testid={`apply-ortho-protocol-${proto.id}`}
								title={`Внести протокол «${proto.shortLabel}» в дневник 043/у, смету визита и Этап 3 (Ортопедия)`}
							>
								{isApplied ? (
									<>
										<Check size={16} />
										<span>Внесено в 043/у и смету</span>
									</>
								) : (
									<>
										<FileText size={16} />
										<span>Внести в 043/у и смету</span>
										<ArrowRight size={14} />
									</>
								)}
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
