import { Search, X } from "lucide-react";
import React from "react";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_SPECIALTIES,
	type OutpatientSpecialty,
} from "@dental/shared";
import { SPECIALTY_ICONS } from "./constants";

export interface SoapTemplatesFilterBarProps {
	readonly activeSpecialty: OutpatientSpecialty | "all";
	readonly onSelectSpecialty: (spec: OutpatientSpecialty | "all") => void;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
}

export const SoapTemplatesFilterBar: React.FC<SoapTemplatesFilterBarProps> = ({
	activeSpecialty,
	onSelectSpecialty,
	searchQuery,
	onSearchChange,
}) => {
	return (
		<>
			<div className="dente-filter-chips overflow-x-auto pb-2 scrollbar-none">
				<button
					type="button"
					onClick={() => onSelectSpecialty("all")}
					className={`dente-filter-chip ${activeSpecialty === "all" ? "active" : ""}`}
					data-active={activeSpecialty === "all"}
				>
					Все протоколы ({STOMX_ALL_448_TEMPLATES_INDEX.length})
				</button>
				{STOMX_SPECIALTIES.map((spec) => {
					const count = STOMX_ALL_448_TEMPLATES_INDEX.filter((p) => p.specialty === spec.id).length;
					const isActive = activeSpecialty === spec.id;
					return (
						<button
							key={spec.id}
							type="button"
							onClick={() => onSelectSpecialty(spec.id)}
							className={`dente-filter-chip ${isActive ? "active" : ""}`}
							data-active={isActive}
						>
							{SPECIALTY_ICONS[spec.id]}
							<span>{spec.shortLabel}</span>
							<span className="text-xs opacity-75">({count})</span>
						</button>
					);
				})}
			</div>

			<div className="dente-search-wrap w-full my-2">
				<Search className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по диагнозу, протоколу (кариес, пульпит, виниры, имплантация, кюретаж)..."
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
		</>
	);
};
