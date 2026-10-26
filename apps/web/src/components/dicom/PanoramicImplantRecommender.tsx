/**
 * PanoramicImplantRecommender.tsx — Авто-подбор имплантата по плотности (Misch D1-D5)
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useMemo } from "react";
import { Cpu } from "lucide-react";
import { getImplantRecommendationForMisch, type MischImplantRecommendation } from "./PanoramicSafetyEngine.js";

export interface PanoramicImplantRecommenderProps {
	readonly probedHU: number | null;
	readonly className?: string | undefined;
}

const MISCH_BADGE_COLORS: Record<string, string> = {
	D1: "var(--red, #ef4444)",
	D2: "var(--teal, #0d9488)",
	D3: "var(--amber, #f59e0b)",
	D4: "var(--orange, #f97316)",
	D5: "var(--purple, #a855f7)",
};

export const PanoramicImplantRecommender: React.FC<PanoramicImplantRecommenderProps> = ({
	probedHU,
	className = "",
}) => {
	const recommendation: MischImplantRecommendation = useMemo(() => {
		return getImplantRecommendationForMisch(probedHU ?? 850);
	}, [probedHU]);

	const badgeColor = MISCH_BADGE_COLORS[recommendation.mischClass] ?? "#0d9488";

	return (
		<div
			className={`rounded-xl border p-2.5 text-xs select-none shadow-md ${className}`}
			style={{ background: "var(--paper-soft, rgba(15, 23, 42, 0.95))", borderColor: "var(--line, rgba(255, 255, 255, 0.1))", color: "var(--ink, #ffffff)" }}
			data-testid="panoramic-implant-recommender"
		>
			<div className="flex items-center justify-between border-b pb-1.5 mb-2" style={{ borderColor: "var(--line, rgba(255, 255, 255, 0.08))" }}>
				<div className="flex items-center gap-1.5 font-bold text-[11px] text-[var(--teal,#0d9488)]">
					<Cpu className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
					<span>Авто-подбор имплантата по плотности (Misch)</span>
				</div>
				<span className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white" style={{ background: badgeColor }}>
					{recommendation.mischClass} ({probedHU ?? 850} HU)
				</span>
			</div>

			<div className="space-y-1.5 text-[11px]">
				<div className="flex justify-between items-baseline gap-2">
					<span className="text-neutral-400">Форма тела:</span>
					<span className="font-semibold text-right text-neutral-200">{recommendation.bodyDesignRu}</span>
				</div>
				<div className="flex justify-between items-baseline gap-2">
					<span className="text-neutral-400">Тип резьбы:</span>
					<span className="font-semibold text-right text-neutral-200">{recommendation.threadTypeRu}</span>
				</div>
				<div className="flex justify-between items-baseline gap-2">
					<span className="text-neutral-400">Прогноз стабильности:</span>
					<span className="font-semibold text-right text-emerald-300">{recommendation.primaryStabilityExpectationRu}</span>
				</div>

				<div className="flex flex-wrap gap-1 pt-1">
					{recommendation.requiresCorticalTap && (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
							МЕТЧИК ОБЯЗАТЕЛЕН
						</span>
					)}
					{recommendation.requiresUnderDrilling && (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
							НЕДОСВЕРЛИВАНИЕ (-{recommendation.underDrillingMm} мм)
						</span>
					)}
					{recommendation.requiresBoneAugmentation && (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
							ПОКАЗАНА НКР / GBR
						</span>
					)}
				</div>

				<div className="pt-1.5 border-t" style={{ borderColor: "var(--line, rgba(255, 255, 255, 0.08))" }}>
					<span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
						Рекомендуемые системы из каталога:
					</span>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
						{recommendation.recommendedSystems.map((sys) => (
							<div key={`${sys.brand}-${sys.line}`} className="p-1 rounded bg-black/40 border border-white/5 flex flex-col text-[10px]">
								<span className="font-bold text-blue-400">{sys.brand} {sys.line}</span>
								<span className="text-neutral-400 text-[9px] line-clamp-1">{sys.reasonRu}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
