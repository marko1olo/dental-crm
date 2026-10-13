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
			<div className="p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-4">
				<h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
					<FileCheck className="text-[var(--teal,var(--brand-primary))]" size={20} />
					<span>Сводное экспертное заключение по смете плана лечения</span>
				</h3>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<strong className="text-[var(--ink)] block font-bold">
							1. Финансово-ценовой аудит:
						</strong>
						<ul className="space-y-1.5 text-[var(--ink-muted)]">
							<li>• Срок действия сметы: <span className="text-[var(--ink)] font-medium">{activePreset.validityDays} дней ({report.isPlanExpired ? "Истек" : "Действителен"})</span></li>
							<li>• Подорожавших позиций: <span className="text-[var(--ink)] font-medium">{report.increasedItemsCount}</span></li>
							<li>• Архивных услуг: <span className="text-[var(--ink)] font-medium">{report.archivedItemsCount}</span></li>
							<li>• Абсорбция клиникой (гарантия): <span className="text-[var(--teal,var(--brand-primary))] font-semibold">{report.totalClinicAbsorptionRub.toLocaleString("ru-RU")} ₽</span></li>
							<li>• Итог к оплате: <strong className="text-[var(--ink)] font-bold">{report.resolvedNetRub.toLocaleString("ru-RU")} ₽</strong></li>
						</ul>
					</div>

					<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<strong className="text-[var(--ink)] block font-bold">
							2. Клинический аудит стандартов:
						</strong>
						<ul className="space-y-1.5 text-[var(--ink-muted)]">
							<li>• Общий индекс соответствия: <strong className="text-[var(--teal,var(--brand-primary))] font-bold">{starValidation.complianceScorePercent}%</strong></li>
							<li>• Статус соответствия: <span className="text-[var(--ink)] font-medium">{starValidation.overallStatus}</span></li>
							<li>• Замечаний и рекомендаций: <span className="text-[var(--ink)] font-medium">{starValidation.warningsCount}</span></li>
							<li>• Критических дефектов: <span className="text-[var(--ink)] font-medium">{starValidation.errorsCount}</span></li>
						</ul>
					</div>
				</div>

				<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] text-xs">
					<strong className="text-[var(--teal,var(--brand-primary))]">Правовое основание:</strong> Смета составлена в соответствии с Гражданским кодексом РФ, правилами оказания платных медицинских услуг и клиническими рекомендациями СтАР.
				</div>
			</div>
		</div>
	);
};

export default PriceValidatorSummaryTab;
