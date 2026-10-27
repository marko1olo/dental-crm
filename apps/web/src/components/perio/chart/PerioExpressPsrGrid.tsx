/**
 * PerioExpressPsrGrid.tsx — Интерактивная сетка 6 секстантов экспресс-скрининга ВОЗ / PSR.
 * Архитектурный слой Layer 4: PSR Sextants Grid (Мандат 8b, <= 120 строк).
 */

import { PSR_SEXTANTS, type PsrSextantResult } from "@dental/shared";
import { Layers } from "lucide-react";
import React from "react";
import { PSR_CODE_DEFINITIONS, type PsrCode } from "../perioMath";

export interface PerioExpressPsrGridProps {
	readonly readOnly?: boolean | undefined;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly onApplySextantCode: (sextantName: string, code: PsrCode, asterisk?: boolean) => void;
}

export const PerioExpressPsrGrid: React.FC<PerioExpressPsrGridProps> = React.memo(({
	readOnly = false, psrSummaryText, psrSextants, onApplySextantCode,
}) => {
	return (
		<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
					<Layers size={14} className="text-teal-600 dark:text-teal-400" />
					Секстанты PSR (по 6 участкам зубного ряда):
				</span>
				<span className="font-mono text-xs font-bold text-teal-900 dark:text-teal-300 bg-[var(--paper)] px-2 py-0.5 rounded border border-teal-500/30">
					{psrSummaryText}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
				{PSR_SEXTANTS.map((sextant) => {
					const res = psrSextants[sextant.name];
					const currentCode = res?.code ?? 0;
					const hasAsterisk = res?.asterisk ?? false;
					const badgeCls = currentCode === 0 ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
						: currentCode === 1 ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
						: currentCode === 2 ? "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30"
						: currentCode === 3 ? "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30"
						: "bg-rose-500/25 text-rose-800 dark:text-rose-300 border-rose-500/40";

					return (
						<div key={sextant.name} className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-2xs min-w-0" data-testid={`psr-sextant-card-${sextant.name}`}>
							<div className="flex items-center justify-between min-w-0 gap-1">
								<span className="font-bold text-xs text-[var(--ink)] truncate">
									{sextant.name} ({sextant.teeth[0]}-{sextant.teeth[sextant.teeth.length - 1]})
								</span>
								<span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border shrink-0 ${badgeCls}`}>
									Код {currentCode}{hasAsterisk ? "*" : ""}
								</span>
							</div>

							<div className="grid grid-cols-6 gap-1">
								{([0, 1, 2, 3, 4] as const).map((codeVal) => {
									const isSelected = currentCode === codeVal;
									const def = PSR_CODE_DEFINITIONS[codeVal];
									return (
										<button
											key={codeVal} type="button" aria-disabled={readOnly}
											onClick={() => !readOnly && onApplySextantCode(sextant.name, codeVal, hasAsterisk)}
											className={`h-8 min-w-[32px] sm:min-w-[34px] rounded-lg font-bold text-[12.5px] flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
												isSelected ? def.badgeClass + " ring-1 ring-white/50 scale-105" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
											}`}
											title={`${def.labelRu}: ${def.descriptionRu}`}
											data-testid={`psr-${sextant.name}-code-${codeVal}`}
										>
											{codeVal}
										</button>
									);
								})}
								<button
									type="button" aria-disabled={readOnly}
									onClick={() => !readOnly && onApplySextantCode(sextant.name, currentCode, !hasAsterisk)}
									className={`h-8 min-w-[32px] sm:min-w-[34px] rounded-lg font-bold text-[13px] flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
										hasAsterisk ? "bg-rose-500 text-white border-rose-400 ring-1 ring-white/50" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-rose-600 border-[var(--line)]"
									}`}
									title="Астериск (*): патологическая подвижность >= II ст. или поражение фуркации"
									data-testid={`psr-${sextant.name}-code-asterisk`}
								>
									*
								</button>
							</div>

							<span className="text-[11.5px] text-[var(--muted)] leading-tight truncate">
								{PSR_CODE_DEFINITIONS[currentCode]?.shortTitleRu ?? ""}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
});

PerioExpressPsrGrid.displayName = "PerioExpressPsrGrid";
