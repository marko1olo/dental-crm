import React, { useState, useMemo, useCallback } from "react";
import { Activity, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import type { EmkSectionProps } from "./EmkTypes";
import { EmkPerioSummary } from "./EmkPerioSummary";
import { EmkPerioMeasurements } from "./EmkPerioMeasurements";

export interface EmkPerioSectionProps extends EmkSectionProps {
	readonly onOpenPerioModal?: (() => void) | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

/**
 * EmkPerioSection — Пародонтологический скрининг, экспресс-индексы гигиены (OHI-S)
 * и авто-формирование плана лечения (кюретаж A16.07.011 + профгигиена A16.07.051).
 *
 * Декомпозирован по Мандатам 8b и 8e на:
 * - EmkPerioSummary.tsx (1-клик норма, OHI-S в 3 клика, профгигиена) <= 300 строк
 * - EmkPerioMeasurements.tsx (скрининг патологии, карманы, BOP, кюретаж) <= 300 строк
 *
 * Мандаты:
 * - Мандат 8e (Автономия врача): физиологическая норма в 1 клик по умолчанию
 * - Чистый язык: никакой сырой «Формы 043/у» в UI, только «Пародонтологический скрининг»
 * - Эргономика: кнопки в стиле UI_STANDARDS, тач-таргеты >= 44px
 * - Мандат 8b: строго <= 300 строк
 */
export function EmkPerioSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked = false,
	activeTooth = 16,
	onOpenPerioModal,
	patientId,
	patientName,
}: EmkPerioSectionProps) {
	const [isExpanded, setIsExpanded] = useState<boolean>(true);
	const [perioStatus, setPerioStatus] = useState<
		"healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom"
	>("healthy");

	const [hygieneLevel, setHygieneLevel] = useState<"good" | "fair" | "poor" | null>(null);

	const defaultActiveTooth = useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([defaultActiveTooth]);
	const [pocketDepthMm, setPocketDepthMm] = useState<number>(4);
	const [hasBop, setHasBop] = useState<boolean>(true);
	const [mobilityLevel, setMobilityLevel] = useState<0 | 1 | 2 | 3>(0);

	const handleOpenModal = useCallback(() => {
		if (onOpenPerioModal) {
			onOpenPerioModal();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-perio-modal"));
		}
	}, [onOpenPerioModal]);

	return (
		<div
			className="w-full min-w-0 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-2xs my-2 transition-all"
			data-testid="emk-perio-section"
		>
			{/* Верхняя строка тулбара */}
			<div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<Activity size={16} />
					</div>
					<div>
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 leading-tight">
							Пародонтологический скрининг и гигиена полости рта
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0 hidden sm:block">
							1-клик физиологическая норма, индексы OHI-S и скрининг пародонтита
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleOpenModal}
						className="secondary-button min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[12px] font-semibold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors"
						title="Открыть подробную пародонтограмму (Florida Probe, 6 точек на зуб)"
						data-testid="emk-perio-open-chart-btn"
					>
						<BarChart2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">Подробная карта</span>
					</button>

					<button
						type="button"
						onClick={() => setIsExpanded((prev) => !prev)}
						className="min-h-[32px] w-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
						title={isExpanded ? "Свернуть блок" : "Развернуть блок"}
						aria-label="Свернуть/развернуть пародонтологический блок"
					>
						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="space-y-3.5 animate-in fade-in duration-150">
					{/* РАЗДЕЛ 1: Сводка, норма в 1 клик, гигиена OHI-S */}
					<EmkPerioSummary
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={activeTooth}
						perioStatus={perioStatus}
						setPerioStatus={setPerioStatus}
						hygieneLevel={hygieneLevel}
						setHygieneLevel={setHygieneLevel}
						setHasBop={setHasBop}
						setMobilityLevel={setMobilityLevel}
					/>

					{/* РАЗДЕЛ 2: Скрининг патологии и авто-план лечения */}
					<EmkPerioMeasurements
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={activeTooth}
						selectedTeeth={selectedTeeth}
						setSelectedTeeth={setSelectedTeeth}
						pocketDepthMm={pocketDepthMm}
						setPocketDepthMm={setPocketDepthMm}
						hasBop={hasBop}
						setHasBop={setHasBop}
						mobilityLevel={mobilityLevel}
						setMobilityLevel={setMobilityLevel}
						setPerioStatus={setPerioStatus}
					/>
				</div>
			)}
		</div>
	);
}

export { EmkPerioSummary } from "./EmkPerioSummary";
export { EmkPerioMeasurements } from "./EmkPerioMeasurements";
export default EmkPerioSection;
