import React from "react";
import { Check, Sparkles } from "lucide-react";
import type { OrthoClinicalPresetsSectionProps } from "./types";
import { buildCanonicalPresets } from "./canonicalPresetsData";

export const CanonicalChairsidePresets: React.FC<OrthoClinicalPresetsSectionProps> = (props) => {
	const presets = buildCanonicalPresets(props);

	return (
		<div
			data-testid="ortho-canonical-chairside-presets"
			className="mt-2 pt-2 border-t border-[var(--line)] flex flex-col gap-2"
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={13} className="text-[var(--primary)]" />
					Канонические экспресс-протоколы (1 клик)
				</span>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Стандарты клинического приёма
				</span>
			</div>

			<div className="grid grid-cols-1 gap-1.5">
				{presets.map((preset) => {
					const isActive = props.activePreset === preset.id;
					return (
						<div
							key={preset.id}
							data-testid={preset.testId}
							onClick={preset.action}
							className={`min-h-[44px] p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
								isActive
									? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] shadow-2xs"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<div className="flex items-center gap-2.5 min-w-0 flex-1">
								<div
									className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
										isActive
											? "bg-[var(--primary)] text-white"
											: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
									}`}
								>
									{preset.icon}
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-[12.5px] font-bold leading-tight truncate">
										{preset.title}
									</div>
									<div className="text-[11px] text-[var(--muted)] leading-tight truncate">
										{preset.subtitle}
									</div>
								</div>
							</div>

							<button
								type="button"
								data-testid={`${preset.testId}-btn`}
								onClick={(e) => {
									e.stopPropagation();
									preset.action?.();
								}}
								className={`min-h-[44px] h-[44px] px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
									isActive ? "primary-button !rounded-xl" : "secondary-button !rounded-xl"
								}`}
							>
								{isActive ? (
									<>
										<Check size={13} />
										<span>Применено</span>
									</>
								) : (
									<span>Применить</span>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
};
