import { FileText } from "lucide-react";
import type React from "react";
import { ALL_FDI_ADULT_TEETH } from "./constants";

export interface SoapToolbarContextSelectorsProps {
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (tooth: number | null) => void;
	readonly selectedSurfaces: string;
	readonly onChangeSurfaces: (val: string) => void;
}

export const SoapToolbarContextSelectors: React.FC<
	SoapToolbarContextSelectorsProps
> = ({ selectedTooth, onSelectTooth, selectedSurfaces, onChangeSurfaces }) => {
	return (
		<div className="flex items-center gap-2 shrink-0">
			<div
				className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted)]"
				title="Медицинская карта • Дневник приёма"
			>
				<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
				<span>Медицинская карта • Дневник приёма</span>
			</div>

			<div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--line)]">
				<label
					htmlFor="soap-select-tooth"
					className="text-xs font-semibold text-[var(--muted)]"
				>
					Зуб:
				</label>
				<select
					id="soap-select-tooth"
					value={selectedTooth ?? ""}
					onChange={(e) => {
						const t = e.target.value ? Number(e.target.value) : null;
						onSelectTooth(t);
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--teal,var(--brand-primary))] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
				>
					<option value="">Без зуба</option>
					{ALL_FDI_ADULT_TEETH.map((t) => (
						<option key={t} value={t}>
							{t} зуб
						</option>
					))}
				</select>
			</div>

			<input
				type="text"
				value={selectedSurfaces}
				onChange={(e) => onChangeSurfaces(e.target.value)}
				placeholder="Поверхности (MOD, вест...)"
				aria-label="Поверхности зуба"
				className="min-h-[44px] sm:min-h-0 sm:h-7 w-32 px-2 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
			/>
		</div>
	);
};
