/**
 * HygieneHomeCareCard.tsx — Персональная карта и памятка домашнего ухода за полостью рта
 * (Curaprox Ultra Soft 5460, монопучковая щетка, калибр межзубных ершиков, ирригатор, паста RDA < 50).
 *
 * Архитектурная декомпозиция по Mandate 8b (Layer 5 Facade, <= 120 строк).
 */

import React, { memo } from "react";
import { Sparkles } from "lucide-react";
import {
	type HygieneHomeCareRecommendations,
	DEFAULT_STANDARD_HOME_CARE,
	CROWDING_ORTHO_HOME_CARE,
	PERIODONTITIS_HOME_CARE,
} from "./homeCarePresets";
import { HomeCareQuickSelectors } from "./HomeCareQuickSelectors";
import { HomeCareActionsToolbar } from "./HomeCareActionsToolbar";
import { HomeCareRecommendationsGrid } from "./HomeCareRecommendationsGrid";
import { useHygieneHomeCare } from "./useHygieneHomeCare";

export {
	type HygieneHomeCareRecommendations,
	DEFAULT_STANDARD_HOME_CARE,
	CROWDING_ORTHO_HOME_CARE,
	PERIODONTITIS_HOME_CARE,
};

export interface HygieneHomeCareCardProps {
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export const HygieneHomeCareCard: React.FC<HygieneHomeCareCardProps> = memo(
	({ patientName = "Пациент", doctorName = "Врач-стоматолог", onInsertToProtocol, readOnly = false }) => {
		const {
			care,
			setCare,
			activePreset,
			copyStatus,
			insertStatus,
			handleSelectPreset,
			handleCopy,
			handleInsertTo043,
			handleWhatsApp,
			handlePrint,
		} = useHygieneHomeCare(patientName, doctorName, onInsertToProtocol);

		return (
			<div
				data-testid="hygiene-home-care-card"
				className="w-full flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] shadow-2xs"
			>
				{/* Шапка карточки */}
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
							<Sparkles className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)] leading-snug">
								Персональная карта домашнего ухода (Curaprox / Монопучок / Ершики)
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Персональный подбор средств гигиены и экспорт пациенту в WhatsApp
							</p>
						</div>
					</div>
				</div>

				{/* Тулбар пресетов и действий */}
				<HomeCareActionsToolbar
					activePreset={activePreset}
					copyStatus={copyStatus}
					insertStatus={insertStatus}
					readOnly={readOnly}
					onSelectPreset={handleSelectPreset}
					onCopy={handleCopy}
					onInsertTo043={handleInsertTo043}
					onWhatsApp={handleWhatsApp}
					onPrint={handlePrint}
				/>

				{/* 1-клик быстрый выбор щетки и ершиков */}
				{!readOnly && (
					<HomeCareQuickSelectors
						activePreset={activePreset}
						onSelectPreset={handleSelectPreset}
						onUpdateCare={setCare}
					/>
				)}

				{/* Сетка элементов ухода (Щетка, Монопучок, Ершики, Флосс, Ирригатор, Паста) */}
				<HomeCareRecommendationsGrid care={care} />

				{/* Нижняя строчка: контрольный осмотр */}
				<div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--line)]/60 flex-wrap gap-2">
					<span className="text-[11px] text-[var(--muted)]">
						Рекомендованный интервал профгигиены:
					</span>
					<span className="font-bold text-teal-700 dark:text-teal-400">
						через {care.hygieneRecallMonths} месяцев (напоминание в CRM)
					</span>
				</div>
			</div>
		);
	},
);

HygieneHomeCareCard.displayName = "HygieneHomeCareCard";
