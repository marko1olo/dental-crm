import {
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { Layers } from "lucide-react";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";
import { PerioToothCard } from "./PerioToothCard";

export type PerioArchFilterType =
	| "all"
	| "upper"
	| "lower"
	| "S1"
	| "S2"
	| "S3"
	| "S4"
	| "S5"
	| "S6";

export interface PerioArchGridProps {
	readonly isTier3ProbingExpanded: boolean;
	readonly onExpandTier3: () => void;
	readonly archFilter: PerioArchFilterType;
	readonly onSetArchFilter: (filter: PerioArchFilterType) => void;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly selectedToothNumber: number;
	readonly focusedSite: {
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null;
	readonly readOnly?: boolean | undefined;
	readonly onSelectTooth: (toothNumber: number) => void;
	readonly onFocusSite: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onCycleMobility: (toothNumber: number) => void;
	readonly onCycleFurcation: (toothNumber: number) => void;
	readonly onToggleBop: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onToggleSuppuration: (
		toothNumber: number,
		siteKey: PerioSiteKey,
	) => void;
	readonly onSetProbingDepth: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		depth: number,
	) => void;
	readonly onSetGingivalMargin: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		gm: number,
	) => void;
}

export const PerioArchGrid: React.FC<PerioArchGridProps> = React.memo(({
	isTier3ProbingExpanded,
	onExpandTier3,
	archFilter,
	onSetArchFilter,
	toothMap,
	selectedToothNumber,
	focusedSite,
	readOnly = false,
	onSelectTooth,
	onFocusSite,
	onCycleMobility,
	onCycleFurcation,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onSetProbingDepth,
	onSetGingivalMargin,
}) => {
	if (!isTier3ProbingExpanded) {
		return (
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/70 border border-dashed border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
						<Layers size={22} />
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-black text-[var(--ink)]">
							6 точек зондирования для Формы 043/у (Tier 3, по требованию)
						</span>
						<span className="text-xs text-[var(--muted)]">
							Изолированы в Tier 3 для углублённого пародонтологического приёма.
							На обычном терапевтическом приёме используйте 1-клик кнопки
							экспресс-скрининга (Норма / Патология / Профгигиена) выше.
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onExpandTier3}
					className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-black transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center gap-1.5"
					data-testid="expand-perio-chart-tier3-btn"
				>
					<PerioProbe size={16} />
					<span>Развернуть 6 точек зондирования (Tier 3)</span>
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 overflow-x-auto pb-2">
			{/* Compact Jaw & Sextant Switcher (Mandates 8d, 8e, Hick's Law: Strictly 1 Row 32-36px) */}
			<div className="flex items-center justify-between gap-2 overflow-x-auto h-9 min-h-[36px] max-h-9 py-0.5 px-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold shrink-0 select-none">
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() => onSetArchFilter("all")}
						className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
							archFilter === "all"
								? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="perio-arch-filter-all"
					>
						Обе челюсти (18–48)
					</button>
					<button
						type="button"
						onClick={() => onSetArchFilter("upper")}
						className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
							archFilter === "upper"
								? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="perio-arch-filter-upper"
					>
						Верхняя (18–28)
					</button>
					<button
						type="button"
						onClick={() => onSetArchFilter("lower")}
						className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
							archFilter === "lower"
								? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="perio-arch-filter-lower"
					>
						Нижняя (48–38)
					</button>
				</div>

				<div className="h-4 w-[1px] bg-[var(--line)] mx-0.5 shrink-0 hidden sm:block" />

				{/* Rapid Sextant Jump Chips (S1..S6 per Hick's Law) */}
				<div className="flex items-center gap-1 shrink-0">
					{(["S1", "S2", "S3", "S4", "S5", "S6"] as const).map((sName) => (
						<button
							key={sName}
							type="button"
							onClick={() => onSetArchFilter(archFilter === sName ? "all" : sName)}
							className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer h-7 flex items-center ${
								archFilter === sName
									? "bg-teal-600 text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-teal-300 border border-[var(--line)]"
							}`}
							title={`Секстант ${sName}: быстрый фокус на участке зубного ряда`}
						>
							{sName}
						</button>
					))}
				</div>

				<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 shrink-0 ml-auto pl-2">
					<span className="truncate">
						{archFilter === "all"
							? "32 зуба (6 точек на зуб)"
							: archFilter === "upper"
								? "Верхняя челюсть (16 зубов)"
								: archFilter === "lower"
									? "Нижняя челюсть (16 зубов)"
									: `Секстант ${archFilter}`}
					</span>
				</div>
			</div>

			{/* ─── UPPER ARCH (18..11 | 21..28) ────────────────────────────── */}
			{(archFilter === "all" ||
				archFilter === "upper" ||
				archFilter === "S1" ||
				archFilter === "S2" ||
				archFilter === "S3") && (
				<div className="flex flex-col gap-1 min-w-[760px]">
					<div className="flex items-center justify-between px-2 py-1 bg-[var(--paper-soft)] rounded-t-lg border-b border-[var(--line)] text-xs font-bold text-teal-400">
						<span>ВЕРХНЯЯ ЧЕЛЮСТЬ (МАКСИЛЛА) • 18–11 | 21–28</span>
						<span className="text-[10px] text-[var(--muted)]">
							Вестибулярно (DB • B • MB) / Небно (DL • L • ML)
						</span>
					</div>

					<div className="grid grid-cols-16 gap-1 bg-[var(--paper-soft)]/40 p-2 rounded-b-xl border border-[var(--line)]">
						{PERIO_UPPER_ARCH_TEETH.map((toothNumber) => {
							const tooth = toothMap.get(toothNumber);
							if (!tooth) return null;
							return (
								<PerioToothCard
									key={toothNumber}
									tooth={tooth}
									isUpper={true}
									isSelected={selectedToothNumber === toothNumber}
									focusedSiteKey={
										focusedSite?.toothNumber === toothNumber
											? focusedSite.siteKey
											: null
									}
									readOnly={readOnly}
									onSelectTooth={() => onSelectTooth(toothNumber)}
									onFocusSite={(siteKey) => onFocusSite(toothNumber, siteKey)}
									onCycleMobility={() => onCycleMobility(toothNumber)}
									onCycleFurcation={() => onCycleFurcation(toothNumber)}
									onToggleBop={(siteKey) => onToggleBop(toothNumber, siteKey)}
									onTogglePlaque={(siteKey) =>
										onTogglePlaque(toothNumber, siteKey)
									}
									onToggleSuppuration={(siteKey) =>
										onToggleSuppuration(toothNumber, siteKey)
									}
									onSetProbingDepth={(siteKey, depth) =>
										onSetProbingDepth(toothNumber, siteKey, depth)
									}
									onSetGingivalMargin={(siteKey, gm) =>
										onSetGingivalMargin(toothNumber, siteKey, gm)
									}
								/>
							);
						})}
					</div>
				</div>
			)}

			{/* ─── LOWER ARCH (48..41 | 31..38) ────────────────────────────── */}
			{(archFilter === "all" ||
				archFilter === "lower" ||
				archFilter === "S4" ||
				archFilter === "S5" ||
				archFilter === "S6") && (
				<div className="flex flex-col gap-1 min-w-[760px]">
					<div className="flex items-center justify-between px-2 py-1 bg-[var(--paper-soft)] rounded-t-lg border-b border-[var(--line)] text-xs font-bold text-teal-400">
						<span>НИЖНЯЯ ЧЕЛЮСТЬ (МАНДИБУЛА) • 48–41 | 31–38</span>
						<span className="text-[10px] text-[var(--muted)]">
							Вестибулярно (DB • B • MB) / Язычно (DL • L • ML)
						</span>
					</div>

					<div className="grid grid-cols-16 gap-1 bg-[var(--paper-soft)]/40 p-2 rounded-b-xl border border-[var(--line)]">
						{PERIO_LOWER_ARCH_TEETH.map((toothNumber) => {
							const tooth = toothMap.get(toothNumber);
							if (!tooth) return null;
							return (
								<PerioToothCard
									key={toothNumber}
									tooth={tooth}
									isUpper={false}
									isSelected={selectedToothNumber === toothNumber}
									focusedSiteKey={
										focusedSite?.toothNumber === toothNumber
											? focusedSite.siteKey
											: null
									}
									readOnly={readOnly}
									onSelectTooth={() => onSelectTooth(toothNumber)}
									onFocusSite={(siteKey) => onFocusSite(toothNumber, siteKey)}
									onCycleMobility={() => onCycleMobility(toothNumber)}
									onCycleFurcation={() => onCycleFurcation(toothNumber)}
									onToggleBop={(siteKey) => onToggleBop(toothNumber, siteKey)}
									onTogglePlaque={(siteKey) =>
										onTogglePlaque(toothNumber, siteKey)
									}
									onToggleSuppuration={(siteKey) =>
										onToggleSuppuration(toothNumber, siteKey)
									}
									onSetProbingDepth={(siteKey, depth) =>
										onSetProbingDepth(toothNumber, siteKey, depth)
									}
									onSetGingivalMargin={(siteKey, gm) =>
										onSetGingivalMargin(toothNumber, siteKey, gm)
									}
								/>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
});

PerioArchGrid.displayName = "PerioArchGrid";
