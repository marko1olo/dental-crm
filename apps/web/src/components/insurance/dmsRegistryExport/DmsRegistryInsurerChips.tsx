/**
 * DmsRegistryInsurerChips.tsx — Полоска 1-клик выбора страховой компании
 */

import React from "react";
import { RUSSIAN_DMS_INSURERS } from "../insuranceMath.js";

export interface DmsRegistryInsurerChipsProps {
	readonly selectedInsurer: string;
	readonly onSelectInsurer: (insurer: string) => void;
}

export function DmsRegistryInsurerChips({ selectedInsurer, onSelectInsurer }: DmsRegistryInsurerChipsProps) {
	return (
		<div className="mb-3.5 flex items-center gap-2 overflow-x-auto">
			<span className="text-xs font-semibold text-[var(--muted,#64748b)] whitespace-nowrap shrink-0">
				1-Клик фильтр:
			</span>
			<div className="dente-filter-chips flex-nowrap">
				<button
					type="button"
					className={`dente-filter-chip ${selectedInsurer === "all" ? "active" : ""}`}
					data-active={selectedInsurer === "all"}
					onClick={() => onSelectInsurer("all")}
					title="Сводный отчет по всем страховым компаниям"
				>
					Все компании
				</button>
				{RUSSIAN_DMS_INSURERS.map((ins) => {
					const isActive = selectedInsurer === ins.shortName;
					return (
						<button
							key={ins.key}
							type="button"
							className={`dente-filter-chip ${isActive ? "active" : ""}`}
							data-active={isActive}
							onClick={() => onSelectInsurer(ins.shortName)}
							title={`Отфильтровать реестр по компании ${ins.shortName}`}
						>
							{ins.shortName}
						</button>
					);
				})}
			</div>
		</div>
	);
}
