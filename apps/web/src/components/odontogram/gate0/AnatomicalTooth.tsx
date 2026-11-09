import React from "react";
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

export interface AnatomicalToothProps extends Tooth46ContainerProps {
	toothNumber: number;
	onClick?: (e: React.MouseEvent<SVGSVGElement>, toothNumber: number) => void;
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
// Верхние молочные моляры (54, 55, 64, 65) обязаны иметь 3 корня (MB, DB, Palatal) — Tooth16/17Container!
// Нижние молочные моляры (74, 75, 84, 85) обязаны иметь 2 корня (M, D) — Tooth46/47Container!
const UPPER_PED: readonly (ToothComponentType | undefined)[] = [
	undefined,
	Tooth11Container, // 51, 61: центральный молочный резец
	Tooth12Container, // 52, 62: боковой молочный резец
	Tooth13Container, // 53, 63: молочный клык
	Tooth16Container, // 54, 64: первый верхний молочный моляр (3 корня)
	Tooth17Container, // 55, 65: второй верхний молочный моляр (3 корня)
];

const LOWER_PED: readonly (ToothComponentType | undefined)[] = [
	undefined,
	Tooth41Container, // 71, 81: центральный молочный резец
	Tooth42Container, // 72, 82: боковой молочный резец
	Tooth43Container, // 73, 83: молочный клык
	Tooth46Container, // 74, 84: первый нижний молочный моляр (2 корня)
	Tooth47Container, // 75, 85: второй нижний молочный моляр (2 корня)
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
	if (prev.layers === next.layers) return true;
	if (!prev.layers || !next.layers) return false;
	const pK = Object.keys(prev.layers) as (keyof typeof prev.layers)[];
	const nK = Object.keys(next.layers) as (keyof typeof next.layers)[];
	if (pK.length !== nK.length) return false;
	return pK.every((k) => prev.layers![k] === next.layers![k]);
}

export const AnatomicalTooth: React.FC<AnatomicalToothProps> = React.memo((props) => {
	const { toothNumber, onClick, isFlipped: isFlippedProp, badgeRadius, badgeCy, ...rest } = props;
	const Component = getToothComponent(toothNumber);
	if (!Component) return null;

	const isFlipped = isFlippedProp ?? ((toothNumber >= 21 && toothNumber <= 38) || (toothNumber >= 61 && toothNumber <= 75));
	const effectiveBadgeRadius = badgeRadius ?? 14;
	const effectiveBadgeCy = badgeCy ?? (effectiveBadgeRadius > 14 ? 194.5 : (effectiveBadgeRadius > 10 ? 176.0 : 160));
	const handleClick = onClick ? (e: React.MouseEvent<SVGSVGElement>) => onClick(e, toothNumber) : undefined;
	const element = Component({
		...rest,
		toothNumber,
		isFlipped,
		badgeRadius: effectiveBadgeRadius,
		badgeCy: effectiveBadgeCy,
		...(handleClick ? { onClick: handleClick } : {}),
	});

	if (handleClick && React.isValidElement(element)) {
		return React.cloneElement(element as React.ReactElement<{ onClick?: (e: React.MouseEvent<SVGSVGElement>) => void }>, { onClick: handleClick });
	}
	return element;
}, areAnatomicalToothPropsEqual);
