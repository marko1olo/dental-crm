/**
 * DENTE Dental CRM — Chairside Canal Row
 * apps/web/src/components/endo/ChairsideCanalRow.tsx
 *
 * Строка параметров отдельного корневого канала зуба (Мандаты 8e, 8n, 8am).
 * Рабочая длина, показания апекслокатора, MAF, конусность, силер и склероз.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { QuickCanalState } from "./endodonticsCatalogData";

export interface ChairsideCanalRowProps {
	readonly canal: QuickCanalState;
	readonly activeTooth: number;
	readonly canalsCount: number;
	readonly quickLengthChips: readonly number[];
	readonly quickMafOptions: readonly {
		label: string;
		maf: string;
		taper: string;
		system: string;
	}[];
	readonly onUpdate: (id: string, patch: Partial<QuickCanalState>) => void;
	readonly onAdjustLength: (id: string, delta: number) => void;
	readonly onRemove: (id: string) => void;
}

export function ChairsideCanalRow({
	canal: c,
	activeTooth,
	canalsCount,
	quickLengthChips,
	quickMafOptions,
	onUpdate,
	onAdjustLength,
	onRemove,
}: ChairsideCanalRowProps) {
	return (
		<div className="pt-2 first:pt-0 space-y-2">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-bold text-xs text-[var(--ink)]">Канал {c.name}</span>
					<span className="text-[11px] font-semibold text-[var(--primary)]">
						{c.isObliterated ? "Облитерирован" : `${c.workingLengthMm.toFixed(1)} мм`}
					</span>
					<div className="flex items-center gap-1">
						<span className="text-[10px] font-mono text-[var(--success)] font-semibold" title="Apex 0.0">Apex 0.0</span>
						{(["-0.5", "0.0", "+0.5"] as const).map((ap) => (
							<button
								key={ap}
								type="button"
								onClick={() => onUpdate(c.id, { apexLocatorReading: `${ap} Apex` })}
								className={`min-h-[44px] min-w-[44px] sm:min-h-[22px] sm:min-w-0 px-2.5 py-1 sm:px-1.5 sm:py-0.5 rounded text-xs sm:text-[10px] font-mono border transition-all cursor-pointer inline-flex items-center justify-center ${(c.apexLocatorReading || "0.0 Apex").startsWith(ap) ? "bg-[var(--success)] text-white border-[var(--success)] font-bold" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
							>
								{ap}
							</button>
						))}
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<label className="flex items-center gap-1 text-[11px] text-[var(--muted)] cursor-pointer">
						<input
							type="checkbox"
							checked={Boolean(c.isObliterated)}
							onChange={(e) => onUpdate(c.id, {
								isObliterated: e.target.checked,
								workingLengthMm: e.target.checked ? 0 : c.workingLengthMm,
							})}
							className="rounded text-[var(--primary)]"
						/>
						<span>Склероз</span>
					</label>
					{canalsCount > 1 && (
						<button
							type="button"
							onClick={() => onRemove(c.id)}
							className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 rounded-lg text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-transparent hover:border-[var(--danger)]/20 flex items-center justify-center cursor-pointer transition-colors"
							title="Удалить канал"
						>
							<Trash2 size={13} />
						</button>
					)}
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--muted)] font-medium">Длина:</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => onAdjustLength(c.id, -0.5)}
						className="min-h-[44px] min-w-[44px] sm:min-h-[24px] sm:min-w-[24px] sm:w-6 sm:h-6 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm sm:text-xs font-bold flex items-center justify-center hover:bg-[var(--paper-strong)] cursor-pointer"
					>
						-
					</button>
					<button
						type="button"
						onClick={() => onAdjustLength(c.id, 0.5)}
						className="min-h-[44px] min-w-[44px] sm:min-h-[24px] sm:min-w-[24px] sm:w-6 sm:h-6 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm sm:text-xs font-bold flex items-center justify-center hover:bg-[var(--paper-strong)] cursor-pointer"
					>
						+
					</button>
				</div>
				{quickLengthChips.map((len) => (
					<button
						key={len}
						type="button"
						onClick={() => onUpdate(c.id, { workingLengthMm: len, isObliterated: false })}
						className={`chip-length-${c.name}-${len} ${c.name === "MB1" ? `chip-length-MB-${len}` : ""} min-h-[44px] sm:min-h-[24px] px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs sm:text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${c.workingLengthMm === len && !c.isObliterated ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
					>
						{len}
					</button>
				))}
			</div>

			<div className="flex items-center gap-2 flex-wrap text-[11px]">
				<div className="flex items-center gap-1 flex-wrap">
					<span className="text-[var(--muted)] font-medium">MAF:</span>
					{quickMafOptions.map((opt) => {
						const cleanKey = `${opt.maf.replace("#", "")}${opt.taper.replace(".", "")}`;
						const isSelected = c.masterApicalFile === opt.maf && c.taper === opt.taper;
						return (
							<button
								key={opt.label}
								type="button"
								onClick={() => onUpdate(c.id, { masterApicalFile: opt.maf, taper: opt.taper })}
								className={`chip-maf-${c.name}-${cleanKey} ${c.name === "MB1" ? `chip-maf-MB-${cleanKey}` : ""} min-h-[44px] sm:min-h-[24px] px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs sm:text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${isSelected ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
							>
								{opt.label}
							</button>
						);
					})}
				</div>
				<div className="flex items-center gap-1 flex-wrap">
					<span className="text-[var(--muted)] font-medium">Силер:</span>
					<button
						type="button"
						onClick={() => onUpdate(c.id, { obturationType: "gutta_sealer", sealer: "AH Plus" })}
						className={`chip-obturation-gutta-${c.name} ${c.name === "MB1" ? `chip-obturation-gutta-MB` : ""} min-h-[44px] sm:min-h-[24px] px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs sm:text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${c.obturationType === "gutta_sealer" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}
					>
						AH Plus
					</button>
					<button
						type="button"
						onClick={() => onUpdate(c.id, { obturationType: "bioceramic", sealer: "BioRoot" })}
						className={`chip-obturation-bio-${c.name} ${c.name === "MB1" ? `chip-obturation-bio-MB` : ""} min-h-[44px] sm:min-h-[24px] px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs sm:text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${c.obturationType === "bioceramic" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}
					>
						Биокерамика
					</button>
					<button
						type="button"
						onClick={() => onUpdate(c.id, { obturationType: "temp_caoh2", sealer: "Каласепт (Ca(OH)2)" })}
						className={`chip-obturation-caoh2-${c.name} ${c.name === "MB1" ? `chip-obturation-caoh2-MB` : ""} min-h-[44px] sm:min-h-[24px] px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs sm:text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${c.obturationType === "temp_caoh2" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}
					>
						Ca(OH)2
					</button>
				</div>
			</div>
		</div>
	);
}
export default ChairsideCanalRow;
