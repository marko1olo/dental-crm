/**
 * ClinicalDrillAdviceCard.tsx — Клинические рекомендации по препарированию и подбору имплантата (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Activity } from "lucide-react";
import type { BoneDensityRecommendation } from "../panoramicMprMath";
import { getImplantRecommendationForMisch } from "../PanoramicSafetyEngine";

interface ClinicalDrillAdviceCardProps {
	activeClass: string;
	recommendation: BoneDensityRecommendation;
	meanHU: number;
}

export const ClinicalDrillAdviceCard: React.FC<ClinicalDrillAdviceCardProps> = ({
	activeClass,
	recommendation,
	meanHU,
}) => {
	const impRec = getImplantRecommendationForMisch(meanHU);

	return (
		<>
			<div
				className="p-2.5 rounded-lg text-xs leading-relaxed border space-y-1.5"
				style={{ background: "var(--paper-soft)", borderColor: "var(--line)", color: "var(--ink)" }}
			>
				<div className="font-semibold flex items-center gap-1.5" style={{ color: "var(--amber, #f59e0b)" }}>
					<Activity className="w-3.5 h-3.5 shrink-0" />
					Клинические рекомендации по препарированию ({activeClass}):
				</div>
				<div className="text-[11px]" style={{ color: "var(--ink)" }}>
					{recommendation.clinicalAdvice}
				</div>
				<div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
					<span className="px-2 py-0.5 rounded font-medium border" style={{ background: "var(--paper-soft)", borderColor: "var(--line)", color: "var(--ink)" }}>
						Обороты: {recommendation.drillingRpm}
					</span>
					<span className="px-2 py-0.5 rounded font-medium border" style={{ background: "var(--paper-soft)", borderColor: "var(--line)", color: "var(--ink)" }}>
						Торк: {recommendation.torqueNcm}
					</span>
					{recommendation.corticalTap && (
						<span className="px-2 py-0.5 rounded font-bold border" style={{ background: "var(--danger-soft, rgba(239, 68, 68, 0.15))", borderColor: "var(--danger-border, rgba(239, 68, 68, 0.3))", color: "var(--danger-ink, var(--ink))" }}>
							КОРТИКАЛЬНЫЙ МЕТЧИК
						</span>
					)}
					{recommendation.underDrilling && (
						<span className="px-2 py-0.5 rounded font-bold border" style={{ background: "var(--warning-soft, rgba(245, 158, 11, 0.15))", borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))", color: "var(--warning-ink, var(--ink))" }}>
							НЕДОСВЕРЛИВАНИЕ (-{recommendation.underDrillingMm} мм)
						</span>
					)}
					{recommendation.osteotomeCondensation && (
						<span className="px-2 py-0.5 rounded font-bold border" style={{ background: "var(--purple-soft, rgba(168, 85, 247, 0.15))", borderColor: "var(--purple-border, rgba(168, 85, 247, 0.3))", color: "var(--purple-ink, var(--ink))" }}>
							ОСТЕОТОМНАЯ КОМПРЕССИЯ
						</span>
					)}
				</div>
			</div>

			<div className="p-2.5 rounded-lg text-xs border space-y-1" style={{ background: "var(--paper-soft)", borderColor: "var(--line)" }}>
				<div className="font-semibold flex items-center justify-between text-[11px]" style={{ color: "var(--teal)" }}>
					<span>Рекомендуемый тип имплантата:</span>
					<span className="font-bold">{impRec.bodyDesignRu}</span>
				</div>
				<div className="text-[11px] text-neutral-400">
					Резьба: <span className="text-neutral-200">{impRec.threadTypeRu}</span>
				</div>
				<div className="text-[10px] text-neutral-400">
					Системы из каталога:{" "}
					<span className="font-semibold text-neutral-300">
						{impRec.recommendedSystems.map((s) => `${s.brand} ${s.line}`).join(" • ")}
					</span>
				</div>
			</div>
		</>
	);
};
