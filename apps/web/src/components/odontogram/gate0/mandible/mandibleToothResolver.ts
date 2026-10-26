/**
 * DENTE Dental CRM — Mandible Anatomical Component Resolver
 * Resolves 16 teeth (48..41 & 31..38) to Wheeler vector components (Mandate 8b <= 120 lines).
 */

import type React from "react";
import { Tooth41Container } from "../teeth/tooth41/index";
import { Tooth42Container } from "../teeth/tooth42/index";
import { Tooth43Container } from "../teeth/tooth43/index";
import { Tooth44Container } from "../teeth/tooth44/index";
import { Tooth45Container } from "../teeth/tooth45/index";
import { Tooth47Container } from "../teeth/tooth47/index";
import { Tooth48Container } from "../teeth/tooth48/index";
import { Tooth46Container } from "../Tooth46Container";
import type { Tooth46ContainerProps } from "../tooth46Types";

export function resolveMandibleToothComponent(
	toothNumber: number,
): React.FC<Tooth46ContainerProps> {
	const lastDigit = toothNumber % 10;
	if (lastDigit === 8) return Tooth48Container;
	if (lastDigit === 7) return Tooth47Container;
	if (lastDigit === 6) return Tooth46Container;
	if (lastDigit === 5) return Tooth45Container;
	if (lastDigit === 4) return Tooth44Container;
	if (lastDigit === 3) return Tooth43Container;
	if (lastDigit === 2) return Tooth42Container;
	if (lastDigit === 1) return Tooth41Container;
	return Tooth46Container;
}
