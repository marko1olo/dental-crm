import { Activity, Search, X } from "lucide-react";
import React from "react";

interface DoctorMaterialsSearchHeaderProps {
	searchQuery: string;
	onSearchChange: (q: string) => void;
}

export function DoctorMaterialsSearchHeader({
	searchQuery,
	onSearchChange,
}: DoctorMaterialsSearchHeaderProps) {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2">
			<div>
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Activity size={15} className="text-teal-600" />
					<span>Реестр клинических материалов (90% рынка РФ/СНГ) и изоляция</span>
				</label>
				<p className="m-0 text-[11px] text-[var(--muted)]">
					Выбор основного материала с автоматической подстановкой в протокол медицинской карты
				</p>
			</div>
			<div className="dente-search-wrap relative min-w-[240px]">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск материала (Filtek, Asteria, Kerr...)"
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						title="Очистить поиск"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>
		</div>
	);
}
