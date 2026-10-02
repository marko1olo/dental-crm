/**
 * PriceValidatorSummaryTab.tsx — Вкладка сводного экспертного заключения валидатора (DENTE CRM).
 *
 * Содержит:
 * 1. Финансово-ценовой аудит (сроки, подорожания, гарантийная абсорбция).
 * 2. Клинический аудит стандартов СтАР.
 * 3. Правовое обоснование сметы.
 */

import type React from "react";
import { FileCheck } from "lucide-react";
import type { PlanPricePolicyPreset } from "./planPriceValidationPresets";
import type { PlanPriceValidationReport } from "./planPriceValidationEngine";
import type { TreatmentPlanStarValidationReport } from "./starProtocolValidationEngine";

export interface PriceValidatorSummaryTabProps {
	readonly report: PlanPriceValidationReport;
	readonly starValidation: TreatmentPlanStarValidationReport;
	readonly activePreset: PlanPricePolicyPreset;
}

export const PriceValidatorSummaryTab: React.FC<PriceValidatorSummaryTabProps> = ({
	report,
	starValidation,
	activePreset,
}) => {
	return (
		<div className="space-y-4 text-xs">
			<div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
				<h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<FileCheck className="text-[var(--teal,var(--brand-primary))]" size={20} />
					<span>Сводное экспертное заключение по смете плана лечения</span>
				</h3>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
						<strong className="text-slate-900 dark:text-slate-100 block">
							1. Финансово-ценовой аудит:
						</strong>
						<ul className="space-y-1 text-slate-600 dark:text-slate-300">
							<li>• Срок действия сметы: {activePreset.validityDays} дней ({report.isPlanExpired ? "Истек" : "Действителен"})</li>
							<li>• Подорожавших позиций: {report.increasedItemsCount}</li>
							<li>• Архивных услуг: {report.archivedItemsCount}</li>
							<li>• Абсорбция клиникой (гарантия): {report.totalClinicAbsorptionRub.toLocaleString("ru-RU")} ₽</li>
							<li>• Итог к оплате: <strong>{report.resolvedNetRub.toLocaleString("ru-RU")} ₽</strong></li>
						</ul>
					</div>

					<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
						<strong className="text-slate-900 dark:text-slate-100 block">
							2. Клинический аудит стандартов:
						</strong>
						<ul className="space-y-1 text-slate-600 dark:text-slate-300">
							<li>• Общий индекс соответствия: <strong>{starValidation.complianceScorePercent}%</strong></li>
							<li>• Статус соответствия: {starValidation.overallStatus}</li>
							<li>• Замечаний и рекомендаций: {starValidation.warningsCount}</li>
							<li>• Критических дефектов: {starValidation.errorsCount}</li>
						</ul>
					</div>
				</div>

				<div className="p-3 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/20 text-[var(--teal-dark,var(--teal))] text-xs">
					<strong>Правовое основание:</strong> Смета составлена в соответствии с Гражданским кодексом РФ, правилами оказания платных медицинских услуг и клиническими рекомендациями СтАР.
				</div>
			</div>
		</div>
	);
};

export default PriceValidatorSummaryTab;
