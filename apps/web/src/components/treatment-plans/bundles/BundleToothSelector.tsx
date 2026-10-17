import React from "react";
import { Search, X } from "lucide-react";
import { COMMON_FDI_TEETH } from "./bundlesModalTypes";

export interface BundleToothSelectorProps {
	readonly selectedTooth: number;
	readonly onToothChange: (tooth: number) => void;
	readonly customToothInput: string;
	readonly onCustomToothChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
}

export const BundleToothSelector: React.FC<BundleToothSelectorProps> = ({
	selectedTooth,
	onToothChange,
	customToothInput,
	onCustomToothChange,
	searchQuery,
	onSearchChange,
}) => {
	return (
		<div className="flex items-center gap-2 shrink-0">
			<div className="flex items-center gap-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-2.5 h-9">
				<span className="text-xs font-bold text-[var(--muted)]">Зуб FDI:</span>
				<select
					value={selectedTooth}
					onChange={(e) => onToothChange(Number(e.target.value))}
					className="bg-transparent font-mono font-bold text-xs text-[var(--ink)] outline-none cursor-pointer"
					title="Выбрать номер зуба из частых"
					data-testid="tooth-quick-select"
				>
					{COMMON_FDI_TEETH.map((t) => (
						<option key={t} value={t}>
							#{t}
						</option>
					))}
				</select>
				<input
					type="text"
					value={customToothInput}
					onChange={onCustomToothChange}
					placeholder="FDI"
					maxLength={2}
					className="w-10 text-center font-mono font-bold text-xs text-[var(--teal)] outline-none border-l border-[var(--line)] px-1"
					title="Ввести номер зуба вручную (11-85)"
					data-testid="custom-tooth-input"
				/>
			</div>

			<div className="dente-search-wrap" style={{ width: "250px" }}>
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск пакета или кода..."
					className="dente-search-input"
					data-testid="bundles-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>
		</div>
	);
};
