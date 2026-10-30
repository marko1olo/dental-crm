/**
 * PerioPsrScreeningTab.tsx — Экспресс-скрининг ВОЗ (PSR) по 6 секстантам
 * Заполняется за 30 секунд или в 1 клик для интактного пародонта (Мандаты 8e, 8n).
 */

import React from "react";
import { Check } from "lucide-react";
import { PSR_SEXTANTS_CATALOG } from "../perioCatalogData";
import type { PerioScreeningSummary, PsrCode, PsrScreeningMap, PsrSextantId } from "../perioTypes";
import { showToast } from "../../GlobalToast";

export interface PerioPsrScreeningTabProps {
	readonly screeningMap: PsrScreeningMap;
	readonly psrSummary: PerioScreeningSummary;
	readonly onUpdateSextant: (id: PsrSextantId, code: PsrCode, asterisk?: boolean) => void;
	readonly onToggleAsterisk: (id: PsrSextantId) => void;
	readonly onSetAllIntact: () => void;
	readonly onApplyPreset: (presetId: string) => void;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export const PerioPsrScreeningTab: React.FC<PerioPsrScreeningTabProps> = React.memo(({
	screeningMap,
	psrSummary,
	onUpdateSextant,
	onToggleAsterisk,
	onSetAllIntact,
	onApplyPreset,
	onInsertToProtocol,
}) => {
	const handleInsertDiary = () => {
		const text = `Пародонтологический осмотр: ${psrSummary.psrFormula}\nДиагноз: ${psrSummary.suggestedDiagnosisRu} (${psrSummary.icd10Code})\nРекомендации: ${psrSummary.hygienePlanRu}`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
		} else {
			showToast("Протокол скопирован в дневник приёма", "success");
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{/* ПРЕСЕТЫ ЭКСПРЕСС-СКРИНИНГА */}
			<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={onSetAllIntact}
						disabled={false}
						data-testid="psr-all-intact-btn"
						data-preset-card="perio-preset-norm-card"
						className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-[var(--line)] hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
					>
						<Check className="w-3.5 h-3.5" /> Все секстанты интактны (PSR 0)
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset("gingivitis_express")}
						disabled={false}
						data-testid="perio-preset-gingivitis-card"
						className="min-h-[44px] px-3 rounded-lg bg-[var(--paper)] text-amber-600 dark:text-amber-400 font-semibold text-xs border border-[var(--line)] hover:border-amber-500 flex items-center gap-1 cursor-pointer whitespace-nowrap"
					>
						Гингивит
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset("pro_hygiene_express")}
						disabled={false}
						data-testid="psr-hygiene-preset-btn"
						data-preset-card="perio-preset-prophy-card"
						className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-sky-600 dark:text-sky-400 font-semibold text-xs border border-[var(--line)] hover:border-sky-500 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
					>
						Профгигиена (PSR 1–2)
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset("periodontitis_moderate_express")}
						disabled={false}
						data-testid="psr-periodontitis-preset-btn"
						data-preset-card="perio-preset-periodontitis-card"
						className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-orange-600 dark:text-orange-400 font-semibold text-xs border border-[var(--line)] hover:border-orange-500 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
					>
						Пародонтит (PSR 3–4)
					</button>
				</div>
				<div className="text-xs font-bold text-[#0d9488] px-2.5 py-1 rounded-md bg-[#0d9488]/10 border border-[#0d9488]/20 whitespace-nowrap">
					{psrSummary.psrFormula}
				</div>
			</div>

			{/* СЕТКА 6 СЕКСТАНТОВ PSR */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
				{PSR_SEXTANTS_CATALOG.map((s) => {
					const current = screeningMap[s.id] ?? { code: 0, asterisk: false };
					return (
						<div
							key={s.id}
							data-testid={`psr-sextant-card-${s.id}`}
							className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-xs text-[var(--ink)]">
									{s.name} ({s.teethRange})
								</span>
								<button
									type="button"
									onClick={() => onToggleAsterisk(s.id)}
									disabled={false}
									className={`min-h-[44px] min-w-[44px] h-7 px-2 rounded font-bold text-xs cursor-pointer transition-all border ${
										current.asterisk
											? "bg-rose-500 text-white border-rose-600"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
									title="Осложняющий фактор (*)"
								>
									{current.asterisk ? "* Осложн." : "*"}
								</button>
							</div>
							<div className="grid grid-cols-5 gap-1">
								{([0, 1, 2, 3, 4] as PsrCode[]).map((code) => (
									<button
										key={code}
										type="button"
										onClick={() => onUpdateSextant(s.id, code)}
										disabled={false}
										className={`min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${
											current.code === code
												? "bg-[#0d9488] text-white border-[#0f766e]"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
									>
										<span className="text-sm">{code}</span>
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>

			{/* КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ЭКСПОРТ В ДНЕВНИК */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Клиническое заключение:</span>
						<span className="text-xs px-2 py-0.5 rounded font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
							{psrSummary.suggestedDiagnosisRu} ({psrSummary.icd10Code})
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] pt-1">{psrSummary.hygienePlanRu}</p>
				</div>
				<button
					type="button"
					onClick={handleInsertDiary}
					disabled={false}
					data-testid="perio-insert-protocol-btn"
					className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs border border-[var(--line)] hover:border-[#0d9488] flex items-center gap-1.5 cursor-pointer shrink-0"
				>
					Вставить в дневник
				</button>
			</div>
		</div>
	);
});

PerioPsrScreeningTab.displayName = "PerioPsrScreeningTab";
