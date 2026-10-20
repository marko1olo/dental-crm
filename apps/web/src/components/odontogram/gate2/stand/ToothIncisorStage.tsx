import type React from "react";
import { Tooth31Container, Tooth32Container } from "../lower";
import type { ToothLowerLayerFlags } from "../lower/toothLowerTypes";
import type { UpperIncisorLayerFlags } from "../types/upperIncisorTypes";
import { Tooth11Container } from "../upper/Tooth11Container";
import { Tooth12Container } from "../upper/Tooth12Container";
import type { IncisorStandLayers, IncisorToothNumber } from "./incisorStandTypes";

export interface ToothIncisorStageProps {
	toothNumber: IncisorToothNumber;
	zoom: number;
	isDark: boolean;
	layers: IncisorStandLayers;
}

export const ToothIncisorStage: React.FC<ToothIncisorStageProps> = ({
	toothNumber,
	zoom,
	isDark,
	layers,
}) => {
	const upperLayers: UpperIncisorLayerFlags = {
		roots: layers.roots,
		crown: layers.crown,
		cingulum: layers.cingulum,
		marginalRidges: layers.marginalRidges,
		lingualFossa: layers.lingualFossa,
		developmentalLobes: layers.developmentalLobes,
		pulp: layers.pulp,
		canal: layers.canals,
		guttaPercha: layers.guttaPercha,
		periapicalHalo: layers.periapicalHalo,
		veneer: layers.veneer,
		trauma: layers.trauma,
		wearDegree: layers.wearDegree,
		abfraction: layers.abfraction,
		fiberPost: layers.fiberPost,
		implant: layers.implant,
		missing: layers.missing,
		cej: layers.cej,
		grooves: layers.grooves,
	};

	const lowerLayers: ToothLowerLayerFlags = {
		crown: layers.crown,
		roots: layers.roots,
		mamelons: layers.mamelons,
		sulcusLongitudinalis: layers.sulcusLongitudinalis,
		cej: layers.cej,
		pulp: layers.pulp,
		canals: layers.canals,
		guttaPercha: layers.guttaPercha,
		wearDegree: layers.wearDegree,
		abfraction: layers.abfraction,
		splinting: layers.splinting,
		implant: layers.implant,
		missing: layers.missing,
	};

	if (toothNumber === 11 || toothNumber === 21) {
		return (
			<Tooth11Container
				toothNumber={toothNumber}
				zoom={zoom}
				isDark={isDark}
				layers={upperLayers}
			/>
		);
	}

	if (toothNumber === 12 || toothNumber === 22) {
		return (
			<Tooth12Container
				toothNumber={toothNumber}
				zoom={zoom}
				isDark={isDark}
				layers={upperLayers}
			/>
		);
	}

	if (toothNumber === 31 || toothNumber === 41) {
		return (
			<Tooth31Container
				toothNumber={toothNumber}
				zoom={zoom}
				isDark={isDark}
				layers={lowerLayers}
			/>
		);
	}

	return (
		<Tooth32Container
			toothNumber={toothNumber}
			zoom={zoom}
			isDark={isDark}
			layers={lowerLayers}
		/>
	);
};
