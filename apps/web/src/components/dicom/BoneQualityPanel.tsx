/**
 * BoneQualityPanel.tsx — Панель анализа плотности кости (HU) по Мишу (D1..D5) и протокола сверления
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import {
	type DrillProtocol,
	extractHUZones,
	generateDrillProtocol,
	type ImplantSystem,
} from "../../utils/dicom/boneQualityEngine";
import {
	classifyMischBoneDensity,
	type BoneDensityRecommendation,
} from "./panoramicMprMath";
import { PanelHeader, ZoneCard } from "./boneQuality/BoneQualitySubcomponents";
import { MischDensityCard, MISCH_COLORS } from "./boneQuality/MischDensityCard";
import { ClinicalDrillAdviceCard } from "./boneQuality/ClinicalDrillAdviceCard";
import { DrillSequenceSection } from "./boneQuality/DrillSequenceSection";

export { MISCH_COLORS };

interface Props {
	huSamples?: number[] | undefined;
	implantDiameterMm?: number | undefined;
	implantLengthMm?: number | undefined;
	implantSystem?: ImplantSystem | undefined;
	toothFdi?: number | undefined;
	onSystemChange?: ((s: ImplantSystem) => void) | undefined;
}

export function BoneQualityPanel({
	huSamples,
	implantDiameterMm = 4.0,
	implantLengthMm = 10.0,
	implantSystem = "osstem",
	toothFdi,
	onSystemChange,
}: Props) {
	const [expanded, setExpanded] = useState(true);

	if (!huSamples || huSamples.length === 0) {
		return (
			<div className="p-3 rounded-xl border shadow-sm my-2" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}>
				<PanelHeader expanded={expanded} onToggle={() => setExpanded((e) => !e)} toothFdi={toothFdi} />
				{expanded && (
					<div className="text-xs p-3 text-center" style={{ color: "var(--muted)" }}>
						Плотность кости не измерена. Она считается по КЛКТ: единицы Хаунсфилда есть только в объёмном исследовании, на прицельном снимке и на фотографии их нет.
					</div>
				)}
			</div>
		);
	}

	const zones = extractHUZones(huSamples);
	const meanHU = Math.round(huSamples.reduce((s, v) => s + v, 0) / huSamples.length);
	// Поддержка классификации Миша D1, D2, D3, D4, D5 с формированием clinicalAdvice для хирурга
	const recommendation: BoneDensityRecommendation = classifyMischBoneDensity(meanHU);
	const protocol: DrillProtocol = generateDrillProtocol(zones, implantSystem, implantDiameterMm, implantLengthMm);
	const activeClass = recommendation.mischClass;
	const _hasClinicalAdvice = Boolean(recommendation.clinicalAdvice);

	return (
		<div className="p-3 rounded-xl border shadow-sm my-2" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}>
			<PanelHeader expanded={expanded} onToggle={() => setExpanded((e) => !e)} toothFdi={toothFdi} />
			{expanded && (
				<div className="mt-2 space-y-3">
					<MischDensityCard activeClass={activeClass} recommendation={recommendation} meanHU={meanHU} />
					<ClinicalDrillAdviceCard activeClass={activeClass} recommendation={recommendation} meanHU={meanHU} />
					<div className="grid grid-cols-3 gap-2">
						<ZoneCard label="Кортикальная" hu={zones.corticalHU} />
						<ZoneCard label="Губчатая" hu={zones.cancellousHU} />
						<ZoneCard label="Апикальная" hu={zones.apicalHU} />
					</div>
					<DrillSequenceSection implantSystem={implantSystem} onSystemChange={onSystemChange} protocol={protocol} />
				</div>
			)}
		</div>
	);
}
