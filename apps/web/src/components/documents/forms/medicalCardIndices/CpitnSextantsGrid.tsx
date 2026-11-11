import React from "react";
import type { CpitnIndex, CpitnSextantCode } from "@dental/shared";
import { CPITN_SEXTANT_OPTIONS } from "./cpitnOptions.js";

export interface CpitnSextantsGridProps {
	readonly cpitn: CpitnIndex;
	readonly setCpitn: React.Dispatch<React.SetStateAction<CpitnIndex>>;
	readonly effectiveDisabled?: boolean;
}

interface SextantItemConfig {
	readonly key: keyof Omit<CpitnIndex, "treatmentNeedCategory">;
	readonly label: string;
	readonly range: string;
}

const MAXILLARY_SEXTANTS: readonly SextantItemConfig[] = [
	{ key: "sextant18_14", label: "Верхний правый", range: "18–14" },
	{ key: "sextant13_23", label: "Верхний фронтальный", range: "13–23" },
	{ key: "sextant24_28", label: "Верхний левый", range: "24–28" },
];

const MANDIBULAR_SEXTANTS: readonly SextantItemConfig[] = [
	{ key: "sextant48_44", label: "Нижний правый", range: "48–44" },
	{ key: "sextant43_33", label: "Нижний фронтальный", range: "43–33" },
	{ key: "sextant34_38", label: "Нижний левый", range: "34–38" },
];

const CODE_LABELS: Record<
	CpitnSextantCode,
	{ badge: string; colorClass: string }
> = {
	"0_healthy": { badge: "0", colorClass: "bg-emerald-600 text-white" },
	"1_bleeding": { badge: "1", colorClass: "bg-amber-500 text-white" },
	"2_calculus": { badge: "2", colorClass: "bg-orange-600 text-white" },
	"3_pocket_4_5mm": { badge: "3", colorClass: "bg-red-500 text-white" },
	"4_pocket_6mm_plus": { badge: "4", colorClass: "bg-rose-700 text-white" },
	"x_excluded": { badge: "X", colorClass: "bg-slate-500 text-white" },
};

function SextantCard({
	config,
	currentCode,
	onSelect,
}: {
	readonly config: SextantItemConfig;
	readonly currentCode: CpitnSextantCode;
	readonly onSelect: (code: CpitnSextantCode) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold text-[var(--text)]">
					{config.label}
				</span>
				<span className="text-[11px] font-mono text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-[var(--paper-soft)]">
					{config.range}
				</span>
			</div>
			{/* Segmented Control Touch-Chips (Apple HIG >= 44x44px target) */}
			<div
				role="radiogroup"
				aria-label={`Секстант ${config.range}`}
				className="grid grid-cols-6 gap-1 p-1 bg-[var(--paper-soft)] rounded-lg border border-[var(--line-subtle)]"
			>
				{CPITN_SEXTANT_OPTIONS.map((opt) => {
					const isSelected = currentCode === opt.value;
					const meta = CODE_LABELS[opt.value] || {
						badge: opt.value,
						colorClass: "bg-teal-600 text-white",
					};
					return (
						<button
							key={opt.value}
							type="button"
							role="radio"
							aria-checked={isSelected}
							title={`${opt.label}: ${opt.hint}`}
							onClick={() => onSelect(opt.value)}
							className={`min-h-[44px] min-w-[36px] flex items-center justify-center rounded-md text-xs font-bold transition-all select-none ${
								isSelected
									? `${meta.colorClass} shadow-xs ring-2 ring-offset-1 ring-[var(--line)]`
									: "bg-[var(--paper)] text-[var(--text-secondary)] hover:bg-[var(--paper-hover)] hover:text-[var(--text)] border border-[var(--line-subtle)]"
							}`}
						>
							{meta.badge}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export const CpitnSextantsGrid: React.FC<CpitnSextantsGridProps> = React.memo(
	function CpitnSextantsGrid({ cpitn, setCpitn }) {
		return (
			<div className="p-3.5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] mb-4">
				<h6 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
					Верхняя челюсть
				</h6>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3.5">
					{MAXILLARY_SEXTANTS.map((cfg) => (
						<SextantCard
							key={cfg.key}
							config={cfg}
							currentCode={cpitn[cfg.key]}
							onSelect={(code) =>
								setCpitn((prev) => ({ ...prev, [cfg.key]: code }))
							}
						/>
					))}
				</div>

				<h6 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
					Нижняя челюсть
				</h6>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					{MANDIBULAR_SEXTANTS.map((cfg) => (
						<SextantCard
							key={cfg.key}
							config={cfg}
							currentCode={cpitn[cfg.key]}
							onSelect={(code) =>
								setCpitn((prev) => ({ ...prev, [cfg.key]: code }))
							}
						/>
					))}
				</div>
			</div>
		);
	},
);
