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
			return <DentalCrown size={18} className="text-[var(--primary)] shrink-0" />;
		case "try_in":
			return <CheckCircle2 size={18} className="text-[var(--primary)] shrink-0" />;
		case "permanent_cementation":
			return <DentalVeneer size={18} className="text-[var(--primary)] shrink-0" />;
		case "removable_prosthetics":
			return <DentalBridge size={18} className="text-[var(--primary)] shrink-0" />;
		case "consultation_norm":
			return <ShieldCheck size={18} className="text-[var(--primary)] shrink-0" />;
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
				const isMasterPreset = proto.id === "ortho_standard_crown_complete";

				return (
					<div
						key={proto.id}
						className={`p-3 rounded-lg border transition-colors flex flex-col justify-between gap-2 ${
							isMasterPreset
								? "md:col-span-2 border-[var(--primary)]/50 bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/30 shadow-xs"
								: "border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)]"
						}`}
						data-testid={`ortho-protocol-card-${proto.id}`}
					>
						<div className="flex items-start gap-2">
							{getProtocolIcon(proto.category)}
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-1 flex-wrap">
									<div className="flex items-center gap-1.5 min-w-0">
										<h4 className="text-xs font-bold text-[var(--ink)] truncate">
											{proto.shortLabel}
										</h4>
										{isMasterPreset && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white shadow-2xs shrink-0">
												Полный цикл
											</span>
										)}
									</div>
									<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-subtle)] text-[var(--ink-muted)] border border-[var(--line)] shrink-0">
										{proto.defaultIcd10}
									</span>
								</div>
								<p className="text-xs text-[var(--ink-muted)] line-clamp-2 mt-0.5 leading-relaxed">
									{proto.treatment}
								</p>
								{isMasterPreset && (
									<div className="mt-1 text-[11px] text-[var(--primary)] font-medium">
										Расходные материалы визита: А-силикон прецизионный (VPS), бис-акрил (PMMA), цемент двойного отверждения / СИЦ.
									</div>
								)}
							</div>
						</div>

						<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line)] flex-wrap">
							<div className="text-[11px] font-medium text-[var(--ink-muted)]">
								Каталог процедур: <span className="font-mono text-[var(--ink)]">{proto.order804nServices.map((s) => s.code).join(", ")}</span>
							</div>

							<button
								type="button"
								onClick={() => onApplyProtocol(proto)}
								className={`min-h-[44px] sm:h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									isApplied
										? "dente-btn-secondary text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/10"
										: "dente-btn-secondary border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
								}`}
								data-testid={`apply-ortho-protocol-${proto.id}`}
								title={`Внести протокол «${proto.shortLabel}» в дневник приёма, смету визита и Этап 3 (Ортопедия)`}
							>
								{isApplied ? (
									<>
										<Check size={16} />
										<span>Внесено в дневник и смету</span>
									</>
								) : (
									<>
										<FileText size={16} />
										<span>{isMasterPreset ? "Внести полный протокол и смету" : "Внести в дневник и смету"}</span>
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
