import React, { useCallback } from "react";
import type { ToothSurfaceKey } from "@dental/shared";
import type { Tooth46ContainerProps } from "./tooth46Types";
import { Tooth11Container } from "./teeth/tooth11/Tooth11Container";
import { Tooth12Container } from "./teeth/tooth12/Tooth12Container";
import { Tooth13Container } from "./teeth/tooth13/Tooth13Container";
import { Tooth14Container } from "./teeth/tooth14/Tooth14Container";
import { Tooth15Container } from "./teeth/tooth15/Tooth15Container";
import { Tooth16Container } from "./teeth/tooth16/Tooth16Container";
import { Tooth17Container } from "./teeth/tooth17/Tooth17Container";
import { Tooth18Container } from "./teeth/tooth18/Tooth18Container";
import { Tooth41Container } from "./teeth/tooth41/Tooth41Container";
import { Tooth42Container } from "./teeth/tooth42/Tooth42Container";
import { Tooth43Container } from "./teeth/tooth43/Tooth43Container";
import { Tooth44Container } from "./teeth/tooth44/Tooth44Container";
import { Tooth45Container } from "./teeth/tooth45/Tooth45Container";
import { Tooth46Container } from "./teeth/tooth46/Tooth46Container";
import { Tooth47Container } from "./teeth/tooth47/Tooth47Container";
import { Tooth48Container } from "./teeth/tooth48/Tooth48Container";
import {
	PediatricUpperIncisorContainer,
	PediatricUpperCanineContainer,
	PediatricUpperMolarContainer,
	PediatricLowerIncisorContainer,
	PediatricLowerCanineContainer,
	PediatricLowerMolarContainer,
} from "./teeth/pediatric/PediatricToothContainer";

export interface AnatomicalToothProps extends Omit<Tooth46ContainerProps, "onClick"> {
	toothNumber: number;
	onClick?: ((e: React.MouseEvent<SVGSVGElement>, toothNumber: number) => void) | undefined;
	onSurfaceSelect?: ((surface: ToothSurfaceKey) => void) | undefined;
}

type ToothComponentType = React.FC<Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }>;

const UPPER: readonly (ToothComponentType | undefined)[] = [
	undefined, Tooth11Container, Tooth12Container, Tooth13Container,
	Tooth14Container, Tooth15Container, Tooth16Container, Tooth17Container, Tooth18Container,
];

const LOWER: readonly (ToothComponentType | undefined)[] = [
	undefined, Tooth41Container, Tooth42Container, Tooth43Container,
	Tooth44Container, Tooth45Container, Tooth46Container, Tooth47Container, Tooth48Container,
];

// Молочные зубы (квадранты 5, 6, 7, 8):
// Резцы (51, 52, 61, 62, 71, 72, 81, 82) и клыки (53, 63, 73, 83)
// Верхние молочные моляры (54, 55, 64, 65) имеют 3 дивергирующих корня — PediatricUpperMolarContainer (PEDIATRIC_UPPER_MOLAR_GEOMETRY)!
// Нижние молочные моляры (74, 75, 84, 85) имеют 2 дивергирующих корня — PediatricLowerMolarContainer (PEDIATRIC_LOWER_MOLAR_GEOMETRY)!
const UPPER_PED: readonly (ToothComponentType | undefined)[] = [
	undefined,
	PediatricUpperIncisorContainer, // 51, 61: центральный молочный резец
	PediatricUpperIncisorContainer, // 52, 62: боковой молочный резец
	PediatricUpperCanineContainer, // 53, 63: молочный клык
	PediatricUpperMolarContainer, // 54, 64: первый верхний молочный моляр (3 корня, реальная детская геометрия)
	PediatricUpperMolarContainer, // 55, 65: второй верхний молочный моляр (3 корня, реальная детская геометрия)
];

const LOWER_PED: readonly (ToothComponentType | undefined)[] = [
	undefined,
	PediatricLowerIncisorContainer, // 71, 81: центральный молочный резец
	PediatricLowerIncisorContainer, // 72, 82: боковой молочный резец
	PediatricLowerCanineContainer, // 73, 83: молочный клык
	PediatricLowerMolarContainer, // 74, 84: первый нижний молочный моляр (2 корня, реальная детская геометрия)
	PediatricLowerMolarContainer, // 75, 85: второй нижний молочный моляр (2 корня, реальная детская геометрия)
];

function getToothComponent(num: number): ToothComponentType | undefined {
	if (num >= 11 && num <= 18) return UPPER[num - 10];
	if (num >= 21 && num <= 28) return UPPER[num - 20];
	if (num >= 31 && num <= 38) return LOWER[num - 30];
	if (num >= 41 && num <= 48) return LOWER[num - 40];
	if (num >= 51 && num <= 55) return UPPER_PED[num - 50];
	if (num >= 61 && num <= 65) return UPPER_PED[num - 60];
	if (num >= 71 && num <= 75) return LOWER_PED[num - 70];
	if (num >= 81 && num <= 85) return LOWER_PED[num - 80];
	return undefined;
}

export function areAnatomicalToothPropsEqual(prev: AnatomicalToothProps, next: AnatomicalToothProps): boolean {
	if (prev.toothNumber !== next.toothNumber || prev.isDark !== next.isDark || prev.zoom !== next.zoom) return false;
	if (prev.isFlipped !== next.isFlipped || prev.showBadge !== next.showBadge || prev.presetId !== next.presetId) return false;
	if (prev.className !== next.className || prev.badgeRadius !== next.badgeRadius || prev.badgeCy !== next.badgeCy) return false;
	if (prev.onClick !== next.onClick) return false;
	if (prev.onSurfaceSelect !== next.onSurfaceSelect) return false;
	if (prev.layers === next.layers) return true;
	const prevLayers = prev.layers;
	const nextLayers = next.layers;
	if (!prevLayers || !nextLayers) return false;
	const pK = Object.keys(prevLayers) as (keyof typeof prevLayers)[];
	const nK = Object.keys(nextLayers) as (keyof typeof nextLayers)[];
	if (pK.length !== nK.length) return false;
	return pK.every((k) => prevLayers[k] === nextLayers[k]);
}

export const AnatomicalTooth: React.FC<AnatomicalToothProps> = React.memo((props) => {
	const { toothNumber, onClick, onSurfaceSelect, isFlipped: isFlippedProp, badgeRadius, badgeCy, ...rest } = props;
	const Component = getToothComponent(toothNumber);
	if (!Component) return null;

	const isFlipped = isFlippedProp ?? ((toothNumber >= 21 && toothNumber <= 38) || (toothNumber >= 61 && toothNumber <= 75));
	const isUpper = toothNumber < 30 || (toothNumber >= 50 && toothNumber < 70);
	const effectiveBadgeRadius = badgeRadius ?? 14;
	const effectiveBadgeCy = badgeCy ?? (isUpper ? (effectiveBadgeRadius > 10 ? 24.0 : 20.0) : (effectiveBadgeRadius > 14 ? 194.5 : (effectiveBadgeRadius > 10 ? 176.0 : 160.0)));
	const handleClick = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			onClick?.(e, toothNumber);
		},
		[onClick, toothNumber],
	);
	return (
		<Component
			{...rest}
			toothNumber={toothNumber}
			isFlipped={isFlipped}
			badgeRadius={effectiveBadgeRadius}
			badgeCy={effectiveBadgeCy}
			onClick={onClick ? handleClick : undefined}
			onSurfaceSelect={onSurfaceSelect}
		/>
	);
}, areAnatomicalToothPropsEqual);
