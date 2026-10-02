/**
 * DENTE Dental CRM — Anatomical Tooth Surfaces Layer & Interactive Targets
 *
 * Renders anatomical surface shading overlays (O, V, L/P, M, D, C)
 * and interactive 6-surface click polygons directly on the tooth crown.
 */

import React from "react";
import {
	ANATOMICAL_SURFACE_LABELS_RU,
	type AnatomicalSurfaceKey,
	type AnatomicalToothGeometry,
	isSurfaceActive,
	type SurfaceShadingProperties,
} from "./anatomicalToothGeometries";
import type { ToothState } from "./ToothChart";
import { BOTTOM_SURFACE_KEYS, TOP_SURFACE_KEYS } from "./AnatomicalToothColors";

export interface AnatomicalToothSurfacesLayerProps {
	geom: AnatomicalToothGeometry;
	surfaces?: readonly string[] | undefined;
	surfaceShading: SurfaceShadingProperties;
}

export const AnatomicalToothSurfacesLayer: React.FC<AnatomicalToothSurfacesLayerProps> = React.memo(
	({ geom, surfaces, surfaceShading }) => {
		const surfaceKeys: readonly AnatomicalSurfaceKey[] = ["O", "V", "L", "M", "D", "C"];

		return (
			<g className="tooth-active-surfaces-layer">
				{surfaceKeys.map((sKey) => {
					if (!isSurfaceActive(sKey, surfaces)) return null;
					const sPath = geom.surfaces[sKey];
					if (!sPath) return null;
					return (
						<g key={`surf-overlay-${sKey}`} className={`active-surface-group surface-${sKey.toLowerCase()}`}>
							<path
								d={sPath}
								fill={surfaceShading.fill}
								fillOpacity={surfaceShading.opacity}
								stroke={surfaceShading.stroke}
								strokeWidth={surfaceShading.strokeWidth}
								strokeLinejoin="round"
								className="active-surface-path"
							/>
							{surfaceShading.pattern && (
								<path
									d={sPath}
									fill={surfaceShading.pattern}
									opacity="0.42"
									pointerEvents="none"
									className="active-surface-pattern"
								/>
							)}
						</g>
					);
				})}
			</g>
		);
	},
);
AnatomicalToothSurfacesLayer.displayName = "AnatomicalToothSurfacesLayer";

export interface AnatomicalInteractiveSurfacesProps {
	number: number;
	geom: AnatomicalToothGeometry;
	isTop: boolean;
	surfaces?: readonly string[] | undefined;
	state: ToothState;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	useSurfaces?: boolean | undefined;
}

export const AnatomicalInteractiveSurfaces: React.FC<AnatomicalInteractiveSurfacesProps> = React.memo(
	({ number, geom, isTop, surfaces, state, onClick, useSurfaces }) => {
		const handleSurfaceClick = React.useCallback(
			(e: React.MouseEvent<SVGGElement>) => {
				const target = (e.target as Element).closest("[data-surface]");
				if (target) {
					const surf = target.getAttribute("data-surface");
					// Передача конкретной поверхности допустима ТОЛЬКО если активен специальный
					// режим разметки поверхностей (useSurfaces === true) и/или зажат модификатор (Shift / Alt).
					// При обычном клике без модификатора всегда выбирается зуб ЦЕЛИКОМ (surface: undefined).
					const isModifierPressed = Boolean(e.shiftKey || e.altKey);
					const isSurfaceIntent = Boolean(useSurfaces || isModifierPressed);

					e.stopPropagation();
					if (surf && isSurfaceIntent) {
						onClick(e, number, surf);
					} else {
						onClick(e, number, undefined);
					}
				}
			},
			[onClick, number, useSurfaces],
		);

		const handleSurfaceKeyDown = React.useCallback(
			(e: React.KeyboardEvent<SVGGElement>) => {
				if (e.key === "Enter" || e.key === " ") {
					const target = (e.target as Element).closest("[data-surface]");
					if (target) {
						const surf = target.getAttribute("data-surface");
						const isModifierPressed = Boolean(e.shiftKey || e.altKey);
						const isSurfaceIntent = Boolean(useSurfaces || isModifierPressed);

						e.preventDefault();
						e.stopPropagation();
						if (surf && isSurfaceIntent) {
							onClick(e as unknown as React.MouseEvent, number, surf);
						} else {
							onClick(e as unknown as React.MouseEvent, number, undefined);
						}
					}
				}
			},
			[onClick, number, useSurfaces],
		);

		const surfaceKeyList = isTop ? TOP_SURFACE_KEYS : BOTTOM_SURFACE_KEYS;

		return (
			<g
				className="tooth-surface-interactive-group"
				onClick={handleSurfaceClick}
				onKeyDown={handleSurfaceKeyDown}
			>
				{surfaceKeyList.map((surfKey) => {
					const geomKey = surfKey === "P" ? "L" : surfKey;
					const surfPath = geom.surfaces[geomKey as AnatomicalSurfaceKey];
					if (!surfPath) return null;
					const isHighlighted = isSurfaceActive(geomKey as AnatomicalSurfaceKey, surfaces);
					const labelInfo = ANATOMICAL_SURFACE_LABELS_RU[geomKey as AnatomicalSurfaceKey];
					return (
						<path
							key={surfKey}
							d={surfPath}
							role="tab"
							tabIndex={0}
							data-surface={surfKey}
							aria-label={`${labelInfo?.nameRu ?? `Поверхность ${surfKey}`} зуба ${number}`}
							fill={
								isHighlighted
									? state === "Filled"
										? "#10b981"
										: state === "Healthy"
											? "#3b82f6"
											: "#ef4444"
									: "transparent"
							}
							fillOpacity={isHighlighted ? 0.65 : 0}
							stroke={isHighlighted ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.3)"}
							strokeWidth="0.8"
							className={`tooth-surface-target surface-${geomKey.toLowerCase()} ${
								isHighlighted ? "surface-active" : ""
							}`}
							style={{ cursor: "pointer", transition: "fill 0.2s, fill-opacity 0.2s, stroke 0.2s" }}
						>
							<title>{`${labelInfo?.nameRu ?? surfKey} — Зуб ${number}`}</title>
						</path>
					);
				})}
			</g>
		);
	},
);
AnatomicalInteractiveSurfaces.displayName = "AnatomicalInteractiveSurfaces";
