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

const UPPER: readonly (React.FC<any> | undefined)[] = [
	undefined, Tooth11Container, Tooth12Container, Tooth13Container,
	Tooth14Container, Tooth15Container, Tooth16Container, Tooth17Container, Tooth18Container,
];

const LOWER: readonly (React.FC<any> | undefined)[] = [
	undefined, Tooth41Container, Tooth42Container, Tooth43Container,
	Tooth44Container, Tooth45Container, Tooth46Container, Tooth47Container, Tooth48Container,
];

function getToothComponent(num: number): React.FC<any> | undefined {
	if (num >= 11 && num <= 18) return UPPER[num - 10];
	if (num >= 21 && num <= 28) return UPPER[num - 20];
	if (num >= 31 && num <= 38) return LOWER[num - 30];
	if (num >= 41 && num <= 48) return LOWER[num - 40];
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
	const { toothNumber, onClick, isFlipped: isFlippedProp, badgeRadius, ...rest } = props;
	const Component = getToothComponent(toothNumber);
	if (!Component) return null;

	const isFlipped = isFlippedProp ?? (toothNumber >= 21 && toothNumber <= 38);
	const effectiveBadgeRadius = badgeRadius ?? 18.5;
	const handleClick = onClick ? (e: React.MouseEvent<SVGSVGElement>) => onClick(e, toothNumber) : undefined;
	const element = Component({
		...rest,
		toothNumber,
		isFlipped,
		badgeRadius: effectiveBadgeRadius,
		...(handleClick ? { onClick: handleClick } : {}),
	});

	if (handleClick && React.isValidElement(element)) {
		return React.cloneElement(element as React.ReactElement<{ onClick?: any }>, { onClick: handleClick });
	}
	return element;
}, areAnatomicalToothPropsEqual);
