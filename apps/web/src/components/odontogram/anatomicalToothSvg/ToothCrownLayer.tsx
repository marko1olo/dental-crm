/**
 * DENTE Dental CRM — Anatomical Tooth Crown & Surfaces Layer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { ToothState, ToothVisualProps } from "../ToothChart";
import type { AnatomicalToothGeometry, RestorativeMaterialKey } from "../anatomicalGeometriesTypes";
import { AnatomicalToothSurfacesLayer, AnatomicalInteractiveSurfaces } from "../AnatomicalToothSurfacesLayer";
import { AnatomicalRestorativeAccents } from "../AnatomicalRestorativeAccents";

export interface ToothCrownLayerProps {
	geom: AnatomicalToothGeometry;
	colors: ToothVisualProps;
	state: ToothState;
	material?: RestorativeMaterialKey | undefined;
	hasFracture?: boolean | undefined;
	isTop: boolean;
	useSurfaces?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	onSurfaceClick?: ((surfaceKey: string) => void) | undefined;
	number?: number | undefined;
}

export const ToothCrownLayer: React.FC<ToothCrownLayerProps> = ({
	geom,
	colors,
	state,
	material,
	hasFracture,
	isTop,
	useSurfaces,
	surfaces,
	onSurfaceClick,
	number,
}) => {
	return (
		<g className="tooth-crown-group">
			<path
				d={geom.crownPath}
				fill={colors.crownFill}
				stroke={colors.stroke}
				strokeWidth="2.0"
				strokeLinejoin="round"
				className="tooth-crown-path transition-colors duration-200"
			/>
			{geom.cejPath && (
				<path d={geom.cejPath} fill="none" stroke={colors.stroke} strokeWidth="1.2" opacity={0.65} />
			)}
			{geom.fissurePath && (
				<path d={geom.fissurePath} fill="none" stroke={colors.stroke} strokeWidth="1.2" opacity={0.7} />
			)}
			{hasFracture && (
				<path
					d={isTop ? "M 20 120 L 45 135 L 50 148 L 75 140" : "M 20 40 L 45 25 L 50 12 L 75 20"}
					stroke="#dc2626"
					strokeWidth="2.2"
					fill="none"
					strokeLinecap="round"
				/>
			)}
			<AnatomicalRestorativeAccents
				state={state}
				material={material}
				isTop={isTop}
				colors={colors}
				geom={geom}
				hasActiveSurfaces={Boolean(surfaces && surfaces.length > 0)}
			/>
			{useSurfaces ? (
				<AnatomicalInteractiveSurfaces
					number={number ?? 11}
					geom={geom}
					isTop={isTop}
					surfaces={surfaces}
					state={state}
					onClick={(_e, _num, surf) => onSurfaceClick?.(surf ?? "")}
					useSurfaces={useSurfaces}
				/>
			) : (
				<AnatomicalToothSurfacesLayer
					geom={geom}
					surfaces={surfaces}
					surfaceShading={{
						fill: colors.fill,
						opacity: Number.parseFloat(colors.opacity) || 1,
						stroke: colors.stroke,
						strokeWidth: 1.5,
					}}
				/>
			)}
		</g>
	);
};
