/**
 * apps/web/src/components/perio/PerioPsrSextantsGrid.tsx
 *
 * Сетка 6 секстантов экспресс-скрининга ВОЗ (PSR / CPITN) для DENTE Dental CRM.
 * Mandate 8b: < 80 строк.
 */

import React from "react";
import {
	PSR_CODES_CATALOG,
	PSR_SEXTANTS_CATALOG,
	type PsrCode,
	type PsrScreeningMap,
	type PsrSextantId,
} from "./perioCatalogData";

export interface PerioPsrSextantsGridProps {
	readonly screeningMap: PsrScreeningMap;
	readonly onUpdateSextant: (id: PsrSextantId, code: PsrCode, asterisk?: boolean) => void;
	readonly onToggleAsterisk: (id: PsrSextantId) => void;
}

export const PerioPsrSextantsGrid: React.FC<PerioPsrSextantsGridProps> = React.memo(({
	screeningMap,
	onUpdateSextant,
	onToggleAsterisk,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 perio-psr-grid">
			{PSR_SEXTANTS_CATALOG.map((s) => {
				const cur = screeningMap[s.id] ?? { code: 0, asterisk: false };
				const meta = PSR_CODES_CATALOG[cur.code];
				return (
					<div
						key={s.id}
						data-testid={`psr-sextant-card-${s.id}`}
						className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 hover:border-[var(--primary)]/40 transition-colors"
					>
						<div className="flex items-center justify-between gap-2">
							<div>
								<span className="font-bold text-xs text-[var(--ink)]">
									{s.name} ({s.teethRange})
								</span>
								<span className="text-[11px] text-[var(--muted)] block">{s.labelRu}</span>
							</div>
							<button
								type="button"
								onClick={() => onToggleAsterisk(s.id)}
								className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-md font-bold text-xs cursor-pointer transition-all border shrink-0 ${
									cur.asterisk
										? "bg-[var(--danger,#e11d48)] text-white border-[var(--danger,#e11d48)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--danger,#e11d48)]"
								}`}
								title="Символ *: вовлечение фуркаций, подвижность II–III ст., рецессия >= 3.5 мм"
							>
								{cur.asterisk ? "* Фуркация / Рецессия" : "*"}
							</button>
						</div>
						<div className="grid grid-cols-5 gap-2 sm:gap-1.5">
							{([0, 1, 2, 3, 4] as PsrCode[]).map((code) => (
								<button
									key={code}
									type="button"
									onClick={() => onUpdateSextant(s.id, code)}
									aria-pressed={cur.code === code}
									className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] rounded-xl text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${
										cur.code === code
											? "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)] ring-1 ring-[var(--primary)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
									}`}
								>
									<span className="text-sm font-extrabold">{code}</span>
								</button>
							))}
						</div>
						<div className="text-[11px] text-[var(--muted)] leading-tight pt-0.5" title={meta.criteriaRu}>
							{meta.labelRu}
						</div>
					</div>
				);
			})}
		</div>
	);
});

PerioPsrSextantsGrid.displayName = "PerioPsrSextantsGrid";
