import { Check, Syringe } from "lucide-react";
import React from "react";
import {
	DENTAL_NEEDLE_OPTIONS,
	type DentalNeedleOption,
	type DentalNeedleType,
} from "../../../../store/doctorPreferencesStore";

interface DoctorNeedleSelectorProps {
	selectedNeedleKey: DentalNeedleType;
	onSelectNeedle: (key: DentalNeedleType) => void;
}

export function DoctorNeedleSelector({
	selectedNeedleKey,
	onSelectNeedle,
}: DoctorNeedleSelectorProps) {
	return (
		<div className="space-y-3 pt-2 border-t border-[var(--line)]">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Syringe size={14} className="text-teal-600" />
					<span>Любимый тип карпульных игл:</span>
				</label>
				<span className="text-[11px] text-[var(--muted)]">
					Автоматически списывается со склада в приёме
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{DENTAL_NEEDLE_OPTIONS.map((needle: DentalNeedleOption) => {
					const isSelected = selectedNeedleKey === needle.key;
					return (
						<button
							key={needle.key}
							type="button"
							onClick={() => onSelectNeedle(needle.key)}
							className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
								isSelected
									? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
							}`}
							data-testid={`needle-option-${needle.key}`}
						>
							<div className="flex items-start justify-between gap-1.5 w-full">
								<div className="min-w-0">
									<span className="text-xs font-bold text-[var(--ink)] leading-snug block">
										{needle.title}
									</span>
									<span className="text-[10px] text-[var(--muted)] block mt-0.5">
										{needle.manufacturer}
									</span>
								</div>
								{isSelected ? (
									<span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
										<Check size={12} className="stroke-[3]" />
									</span>
								) : (
									<span className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0" />
								)}
							</div>
							<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">
								{needle.description}
							</p>
							<div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--line)]/50 text-[10px]">
								<span className="font-mono font-bold text-teal-700 dark:text-teal-300">
									{needle.gauge} • {needle.length}
								</span>
								<span className="font-medium text-[var(--muted)]">{needle.badge}</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
